import crypto from 'node:crypto';

export const NOA_COOKIE_NAME = 'novay_noa_sid';
export const MAX_REQUESTS_PER_USER = 100;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_STORED_MESSAGES = 60;

export type ChatRole = 'user' | 'model';
export type NoaEmotion = 'neutral' | 'happy' | 'excited' | 'surprised' | 'wink' | 'sleepy' | 'focused';

export interface NoaChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  emotion?: NoaEmotion;
  createdAt: number;
}

export interface NoaUserSession {
  id: string;
  requestCount: number;
  messages: NoaChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface QuotaSnapshot {
  used: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
}

export interface PromptValidationResult {
  ok: boolean;
  text: string;
  error?: string;
}

export function getQuotaSnapshot(session: Pick<NoaUserSession, 'requestCount'>): QuotaSnapshot {
  const used = Math.max(0, Math.min(MAX_REQUESTS_PER_USER, Math.floor(session.requestCount)));
  const remaining = Math.max(0, MAX_REQUESTS_PER_USER - used);
  return {
    used,
    limit: MAX_REQUESTS_PER_USER,
    remaining,
    limitReached: used >= MAX_REQUESTS_PER_USER,
  };
}

export function createEmptySession(sessionId: string, now: number = Date.now()): NoaUserSession {
  return {
    id: sessionId,
    requestCount: 0,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function canConsumeQuota(session: Pick<NoaUserSession, 'requestCount'>): boolean {
  return session.requestCount < MAX_REQUESTS_PER_USER;
}

export function recordExchange(
  session: NoaUserSession,
  userText: string,
  modelText: string,
  emotion: NoaEmotion = 'happy',
  now: number = Date.now()
): NoaUserSession {
  const userMsg: NoaChatMessage = {
    id: `u_${now}_${Math.random().toString(36).slice(2, 7)}`,
    role: 'user',
    text: userText,
    createdAt: now,
  };
  const modelMsg: NoaChatMessage = {
    id: `m_${now}_${Math.random().toString(36).slice(2, 7)}`,
    role: 'model',
    text: modelText,
    emotion,
    createdAt: now + 1,
  };

  const combined = [...session.messages, userMsg, modelMsg];
  const trimmed =
    combined.length > MAX_STORED_MESSAGES
      ? combined.slice(combined.length - MAX_STORED_MESSAGES)
      : combined;

  return {
    ...session,
    requestCount: Math.min(MAX_REQUESTS_PER_USER, session.requestCount + 1),
    messages: trimmed,
    updatedAt: now,
  };
}

export function clearConversationKeepQuota(
  session: NoaUserSession,
  now: number = Date.now()
): NoaUserSession {
  return {
    ...session,
    messages: [],
    updatedAt: now,
  };
}

export function validateChatPrompt(raw: unknown): PromptValidationResult {
  if (typeof raw !== 'string') {
    return { ok: false, text: '', error: 'Le message doit être du texte.' };
  }
  const cleaned = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!cleaned) {
    return { ok: false, text: '', error: 'Écris une question pour Noa avant d’envoyer.' };
  }
  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      text: '',
      error: `Ton message est trop long (maximum ${MAX_MESSAGE_LENGTH} caractères).`,
    };
  }
  return { ok: true, text: cleaned };
}

const SESSION_ID_RE = /^[a-f0-9-]{24,64}$/i;

export function signSessionId(sessionId: string, secret: string): string {
  const sig = crypto.createHmac('sha256', secret).update(sessionId).digest('base64url');
  return `${sessionId}.${sig}`;
}

export function verifySignedSessionCookie(
  rawCookie: string | undefined,
  secret: string
): string | null {
  if (!rawCookie || typeof rawCookie !== 'string') return null;
  const dotIdx = rawCookie.indexOf('.');
  if (dotIdx <= 0) return null;

  const sessionId = rawCookie.slice(0, dotIdx);
  const providedSig = rawCookie.slice(dotIdx + 1);
  if (!SESSION_ID_RE.test(sessionId) || !providedSig) return null;

  const expectedFull = signSessionId(sessionId, secret);
  const expectedSig = expectedFull.slice(sessionId.length + 1);

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(a, b) ? sessionId : null;
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = pair.slice(0, eqIdx).trim();
    const rawVal = pair.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(rawVal);
    } catch {
      out[key] = rawVal;
    }
  }
  return out;
}

export function inferNoaEmotion(replyText: string, isError: boolean = false): NoaEmotion {
  if (isError) return 'surprised';
  const lower = replyText.toLowerCase();
  if (/3\.3\.0|bravo|prêt|c’est parti|parfait|super|félicitations/.test(lower)) {
    return 'excited';
  }
  if (/étape|paramètres|sources inconnues|zarchiver|sha-256|permission|erreur|solution/.test(lower)) {
    return 'focused';
  }
  if (/astuce|conseil|secret|clin|easter/.test(lower)) {
    return 'wink';
  }
  return 'happy';
}
