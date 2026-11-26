import fs from 'node:fs';
import path from 'node:path';
import {
  type NoaUserSession,
  createEmptySession,
} from '../lib/noaAgentEngine.ts';

const DATA_ROOT = path.resolve(process.cwd(), '.novay-data');
const STORE_PATH = path.resolve(DATA_ROOT, 'noa-sessions.json');
const MAX_CACHED_SESSIONS = 2000;

if (!STORE_PATH.startsWith(DATA_ROOT + path.sep)) {
  throw new Error('Invalid session store path configuration');
}

export class NoaSessionStore {
  private readonly sessions = new Map<string, NoaUserSession>();
  private loaded = false;

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [id, entry] of Object.entries(parsed as Record<string, unknown>)) {
          if (
            entry &&
            typeof entry === 'object' &&
            typeof (entry as NoaUserSession).id === 'string' &&
            typeof (entry as NoaUserSession).requestCount === 'number' &&
            Array.isArray((entry as NoaUserSession).messages)
          ) {
            this.sessions.set(id, entry as NoaUserSession);
          }
        }
      }
    } catch {
      // Corrupt or unreadable store starts fresh in memory
    }
  }

  private persist(): void {
    try {
      fs.mkdirSync(DATA_ROOT, { recursive: true });
      if (this.sessions.size > MAX_CACHED_SESSIONS) {
        const sorted = Array.from(this.sessions.values()).sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
        this.sessions.clear();
        for (const s of sorted.slice(0, MAX_CACHED_SESSIONS)) {
          this.sessions.set(s.id, s);
        }
      }
      const serialized = JSON.stringify(Object.fromEntries(this.sessions.entries()));
      const tmpPath = `${STORE_PATH}.tmp`;
      if (!tmpPath.startsWith(DATA_ROOT + path.sep)) return;
      fs.writeFileSync(tmpPath, serialized, 'utf8');
      fs.renameSync(tmpPath, STORE_PATH);
    } catch {
      // Persistence errors should not crash chat responses
    }
  }

  get(sessionId: string): NoaUserSession | undefined {
    this.ensureLoaded();
    return this.sessions.get(sessionId);
  }

  getOrCreate(sessionId: string): NoaUserSession {
    this.ensureLoaded();
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    const created = createEmptySession(sessionId);
    this.sessions.set(sessionId, created);
    this.persist();
    return created;
  }

  save(session: NoaUserSession): void {
    this.ensureLoaded();
    this.sessions.set(session.id, session);
    this.persist();
  }
}
