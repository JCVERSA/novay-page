import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import {
  MAX_REQUESTS_PER_USER,
  NOA_COOKIE_NAME,
  canConsumeQuota,
  clearConversationKeepQuota,
  getQuotaSnapshot,
  inferNoaEmotion,
  parseCookies,
  recordExchange,
  signSessionId,
  validateChatPrompt,
  verifySignedSessionCookie,
} from './src/lib/noaAgentEngine.ts';
import { NOVAY_APP_SPEC } from './src/lib/novayKnowledge.ts';
import { NoaSessionStore } from './src/server/sessionStore.ts';
import { NoaUpstreamError, generateNoaReply } from './src/server/noaGemini.ts';

function resolveSessionSecret(): string {
  const fromEnv = (process.env.SESSION_SECRET || '').trim();
  if (fromEnv) return fromEnv;

  const dataDir = path.resolve(process.cwd(), '.novay-data');
  const secretPath = path.resolve(dataDir, '.session-secret');
  if (secretPath.startsWith(dataDir + path.sep)) {
    try {
      if (fs.existsSync(secretPath)) {
        const existing = fs.readFileSync(secretPath, 'utf8').trim();
        if (existing.length >= 32) return existing;
      }
      fs.mkdirSync(dataDir, { recursive: true });
      const generated = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(secretPath, generated, { encoding: 'utf8', mode: 0o600 });
      return generated;
    } catch {
      // Fall back to process-scoped secret if filesystem write fails
    }
  }
  return crypto.randomBytes(32).toString('hex');
}

const isProd = process.env.NODE_ENV === 'production';
const PORT = isProd ? Number(process.env.PORT) || 3000 : 3000;
const SESSION_SECRET = resolveSessionSecret();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));

const sessionStore = new NoaSessionStore();
const inFlightSessions = new Set<string>();

function issueSessionCookie(res: Response, sessionId: string): void {
  const signed = signSessionId(sessionId, SESSION_SECRET);
  const cookieAttrs = [
    `${NOA_COOKIE_NAME}=${encodeURIComponent(signed)}`,
    'Path=/',
    'Max-Age=2592000',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
  ].join('; ');
  res.setHeader('Set-Cookie', cookieAttrs);
}

function resolveUserSession(req: Request, res: Response) {
  const cookies = parseCookies(req.headers.cookie);
  const verifiedId = verifySignedSessionCookie(cookies[NOA_COOKIE_NAME], SESSION_SECRET);
  if (verifiedId) {
    const existing = sessionStore.getOrCreate(verifiedId);
    return { session: existing, recognized: true };
  }

  const freshId = crypto.randomUUID();
  const created = sessionStore.getOrCreate(freshId);
  issueSessionCookie(res, freshId);
  return { session: created, recognized: false };
}

function isSameOriginMutation(req: Request): boolean {
  const requestedWith = req.get('x-requested-with');
  if (requestedWith !== 'NoVaY-WebChat') {
    return false;
  }
  const originHeader = req.get('origin');
  if (!originHeader) {
    return true;
  }
  try {
    const originHost = new URL(originHeader).host;
    const expectedHost = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0]?.trim();
    return Boolean(expectedHost) && originHost === expectedHost;
  } catch {
    return false;
  }
}

app.get('/api/noa/session', (req: Request, res: Response) => {
  const { session, recognized } = resolveUserSession(req, res);
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    recognized,
    appVersion: NOVAY_APP_SPEC.versionName,
    messages: session.messages,
    ...getQuotaSnapshot(session),
  });
});

app.post('/api/noa/chat', async (req: Request, res: Response) => {
  if (!isSameOriginMutation(req)) {
    res.status(403).json({
      error: 'Requête refusée (origine ou en-tête de sécurité invalide).',
    });
    return;
  }

  const { session } = resolveUserSession(req, res);
  const quota = getQuotaSnapshot(session);
  if (!canConsumeQuota(session)) {
    res.status(429).json({
      error: `Tu as atteint la limite de ${MAX_REQUESTS_PER_USER} requêtes avec Noa. Retrouve le guide complet dans la FAQ ou sur GitHub.`,
      ...quota,
    });
    return;
  }

  const validation = validateChatPrompt((req.body as { message?: unknown } | undefined)?.message);
  if (!validation.ok) {
    res.status(400).json({
      error: validation.error,
      ...quota,
    });
    return;
  }

  if (inFlightSessions.has(session.id)) {
    res.status(429).json({
      error: 'Noa termine déjà ta requête précédente, patiente une seconde.',
      ...quota,
    });
    return;
  }

  inFlightSessions.add(session.id);
  try {
    const reply = await generateNoaReply(session.messages, validation.text);
    const emotion = inferNoaEmotion(reply, false);
    const updated = recordExchange(session, validation.text, reply, emotion);
    sessionStore.save(updated);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      reply,
      emotion,
      messages: updated.messages,
      ...getQuotaSnapshot(updated),
    });
  } catch (err) {
    const upstream =
      err instanceof NoaUpstreamError
        ? err
        : new NoaUpstreamError('Impossible de joindre Noa pour le moment.', 502, 'UPSTREAM_ERROR');
    res.status(upstream.status).json({
      error: upstream.message,
      code: upstream.code,
      ...getQuotaSnapshot(session),
    });
  } finally {
    inFlightSessions.delete(session.id);
  }
});

app.post('/api/noa/reset', (req: Request, res: Response) => {
  if (!isSameOriginMutation(req)) {
    res.status(403).json({
      error: 'Requête refusée (origine ou en-tête de sécurité invalide).',
    });
    return;
  }

  const { session } = resolveUserSession(req, res);
  const updated = clearConversationKeepQuota(session);
  sessionStore.save(updated);
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    messages: updated.messages,
    ...getQuotaSnapshot(updated),
  });
});

async function startServer(): Promise<void> {
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: 'index.html' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`NoVaY server running on http://0.0.0.0:${PORT} (${isProd ? 'prod' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NoVaY server:', err);
  process.exit(1);
});
