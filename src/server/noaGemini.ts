import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { NoaChatMessage } from '../lib/noaAgentEngine.ts';
import { buildNoaSystemInstruction } from '../lib/novayKnowledge.ts';

export class NoaUpstreamError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey = '';

function getAiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new NoaUpstreamError(
      'Le service IA de Noa n’est pas encore configuré (clé GEMINI_API_KEY manquante dans Settings > Secrets).',
      503,
      'MISSING_API_KEY'
    );
  }
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = apiKey;
  }
  return cachedClient;
}

function classifyGeminiError(err: unknown): NoaUpstreamError {
  if (err instanceof NoaUpstreamError) return err;
  const errStatus =
    typeof (err as { status?: unknown })?.status === 'number'
      ? (err as { status: number }).status
      : undefined;
  const rawMessage = err instanceof Error ? err.message : String(err);
  const sanitizedMsg = rawMessage.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_KEY]');
  console.error('[Noa Gemini error]', errStatus ?? 'no-status', sanitizedMsg);

  const lower = sanitizedMsg.toLowerCase();

  if (
    errStatus === 401 ||
    errStatus === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated') ||
    (errStatus === 400 && (lower.includes('api key') || lower.includes('api_key')))
  ) {
    return new NoaUpstreamError(
      'Clé GEMINI_API_KEY invalide ou accès refusé. Vérifie-la dans Settings > Secrets.',
      503,
      'UPSTREAM_AUTH'
    );
  }
  if (errStatus === 429 || lower.includes('resource_exhausted') || lower.includes('429')) {
    return new NoaUpstreamError(
      'Noa reçoit beaucoup de demandes en ce moment. Réessaie dans quelques secondes.',
      429,
      'UPSTREAM_RATE_LIMIT'
    );
  }
  if (errStatus === 404 || lower.includes('not_found')) {
    return new NoaUpstreamError(
      'Modèle Gemini introuvable côté serveur.',
      502,
      'MODEL_NOT_FOUND'
    );
  }
  return new NoaUpstreamError(
    'Impossible de joindre Noa pour le moment. Réessaie dans un instant.',
    502,
    'UPSTREAM_UNAVAILABLE'
  );
}

const MAX_HISTORY_TURNS = 16;

export async function generateNoaReply(
  history: readonly NoaChatMessage[],
  userMessage: string
): Promise<string> {
  const ai = getAiClient();
  const recent = history.slice(-MAX_HISTORY_TURNS);

  const contents = [
    ...recent.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    })),
    {
      role: 'user' as const,
      parts: [{ text: userMessage }],
    },
  ];

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: buildNoaSystemInstruction(),
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      const reply = (response.text ?? '').trim();
      if (!reply) {
        throw new NoaUpstreamError(
          'Noa n’a pas pu formuler de réponse. Reformule ta question !',
          502,
          'EMPTY_REPLY'
        );
      }
      return reply;
    } catch (err) {
      lastErr = err;
      const classified = classifyGeminiError(err);
      if (classified.status === 502 && classified.code === 'UPSTREAM_UNAVAILABLE' && attempt === 0) {
        await new Promise((r) => setTimeout(r, 450));
        continue;
      }
      throw classified;
    }
  }

  throw classifyGeminiError(lastErr);
}
