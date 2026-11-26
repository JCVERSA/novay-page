import type { NoaChatMessage, NoaEmotion, QuotaSnapshot } from './noaAgentEngine';

export interface NoaChatController {
  isOpen: () => boolean;
  open: (anchorX?: number) => void;
  close: () => void;
  toggle: (anchorX?: number) => boolean;
  getPanelHeight: () => number;
  getSide: () => 'left' | 'right';
  destroy: () => void;
}

export interface NoaChatCallbacks {
  onOpenChange?: (open: boolean, side: 'left' | 'right', panelHeight: number) => void;
  onEmotion?: (emotion: NoaEmotion, durationMs?: number) => void;
}

interface SessionResponse extends QuotaSnapshot {
  recognized?: boolean;
  appVersion?: string;
  messages: NoaChatMessage[];
  error?: string;
}

interface ChatResponse extends QuotaSnapshot {
  reply?: string;
  emotion?: NoaEmotion;
  messages?: NoaChatMessage[];
  error?: string;
}

const STARTER_PROMPTS: ReadonlyArray<{ label: string; prompt: string }> = [
  {
    label: 'Installer pas à pas',
    prompt: 'Guide-moi étape par étape pour installer NoVaY sur Android.',
  },
  {
    label: 'Erreur APK / Sources inconnues',
    prompt:
      'J’ai une erreur « Application non installée » ou « Sources inconnues », comment la résoudre ?',
  },
  {
    label: 'Téléchargement bloqué',
    prompt:
      'Mon téléchargement reste en attente ou affiche une erreur STATE_FAILED, comment faire ?',
  },
  {
    label: 'Infos & version v3.3.0',
    prompt:
      'Quelle est la version actuelle de NoVaY et quelles sont ses fonctionnalités principales ?',
  },
];

function appendInlineSegments(container: HTMLElement, text: string): void {
  const tokenRe = /(\*\*[^*]+\*\*|\*[^*\n]+?\*|`[^`]+`|https:\/\/[^\s)]+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > cursor) {
      container.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      const strong = document.createElement('strong');
      strong.textContent = token.slice(2, -2);
      container.appendChild(strong);
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      const em = document.createElement('em');
      em.textContent = token.slice(1, -1);
      container.appendChild(em);
    } else if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      const code = document.createElement('code');
      code.className = 'noa-inline-code';
      code.textContent = token.slice(1, -1);
      container.appendChild(code);
    } else if (token.startsWith('https://')) {
      const cleanUrl = token.replace(/[.,;:!?]+$/, '');
      const trailing = token.slice(cleanUrl.length);
      try {
        const parsed = new URL(cleanUrl);
        if (parsed.protocol === 'https:') {
          const link = document.createElement('a');
          link.href = parsed.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.className = 'noa-chat-link';
          link.textContent = cleanUrl;
          container.appendChild(link);
          if (trailing) {
            container.appendChild(document.createTextNode(trailing));
          }
        } else {
          container.appendChild(document.createTextNode(token));
        }
      } catch {
        container.appendChild(document.createTextNode(token));
      }
    } else {
      container.appendChild(document.createTextNode(token));
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    container.appendChild(document.createTextNode(text.slice(cursor)));
  }
}

export function renderFormattedChatText(target: HTMLElement, rawText: string): void {
  target.textContent = '';
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  let activeList: HTMLUListElement | HTMLOListElement | null = null;
  let activeListType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (activeList) {
      target.appendChild(activeList);
      activeList = null;
      activeListType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    const orderedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);

    if (bulletMatch) {
      if (activeListType !== 'ul') {
        flushList();
        activeList = document.createElement('ul');
        activeList.className = 'noa-chat-list';
        activeListType = 'ul';
      }
      const li = document.createElement('li');
      appendInlineSegments(li, bulletMatch[1]!);
      activeList!.appendChild(li);
      continue;
    }

    if (orderedMatch) {
      if (activeListType !== 'ol') {
        flushList();
        activeList = document.createElement('ol');
        activeList.className = 'noa-chat-list is-ordered';
        activeListType = 'ol';
      }
      const li = document.createElement('li');
      appendInlineSegments(li, orderedMatch[2]!);
      activeList!.appendChild(li);
      continue;
    }

    flushList();
    const p = document.createElement('p');
    p.className = 'noa-chat-p';
    appendInlineSegments(p, line);
    target.appendChild(p);
  }

  flushList();
}

export function mountNoaChatWidget(callbacks: NoaChatCallbacks = {}): NoaChatController {
  const panel = document.createElement('section');
  panel.id = 'noa-chat-panel';
  panel.className = 'noa-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-label', 'Assistant Noa pour NoVaY');
  panel.dataset.side = 'right';
  panel.hidden = true;

  panel.innerHTML = `
    <header class="noa-chat-head">
      <div class="noa-chat-identity">
        <span class="noa-chat-avatar" aria-hidden="true">
          <svg viewBox="0 0 256 256" fill="currentColor" width="18" height="18">
            <path d="M 155.95 23.68 A 108 108 0 0 1 221.53 182 L 212.87 177 A 98 98 0 0 0 153.36 33.34 Z" />
            <path d="M 100.05 232.32 A 108 108 0 0 1 34.47 74 L 43.13 79 A 98 98 0 0 0 102.64 222.66 Z" />
            <path d="M 64 64 H 88 V 178 L 64 192 Z" />
            <path d="M 168 78 L 192 64 V 192 H 168 Z" />
            <path d="M 98 64 H 120 L 158 148 V 192 H 136 L 98 108 Z" />
          </svg>
        </span>
        <div>
          <h2 class="noa-chat-title">Noa · Guide NoVaY</h2>
          <p class="noa-chat-subtitle">v3.3.0 · Installation &amp; dépannage</p>
        </div>
      </div>
      <div class="noa-chat-head-actions">
        <span
          class="noa-quota-pill"
          id="noa-quota-badge"
          data-testid="noa-quota-badge"
          title="Requêtes utilisées sur votre quota de 100"
        >0 / 100</span>
        <button
          type="button"
          class="noa-head-btn"
          id="noa-chat-reset"
          aria-label="Nouvelle conversation"
          title="Effacer les messages (quota conservé)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <button
          type="button"
          class="noa-head-btn"
          id="noa-chat-close"
          aria-label="Fermer le chat de Noa"
          title="Fermer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </header>

    <div class="noa-chat-body" id="noa-chat-messages" role="log" aria-live="polite" aria-label="Historique de discussion avec Noa"></div>

    <div class="noa-chat-error" id="noa-chat-error" role="alert" hidden></div>

    <footer class="noa-chat-foot">
      <div class="noa-chat-chips" id="noa-chat-chips" aria-label="Questions rapides"></div>
      <form class="noa-chat-form" id="noa-chat-form">
        <textarea
          id="noa-chat-input"
          class="noa-chat-input"
          rows="1"
          maxlength="1000"
          placeholder="Pose une question sur NoVaY, l'APK ou une erreur…"
          aria-label="Message pour Noa"
        ></textarea>
        <button
          type="submit"
          class="noa-chat-send"
          id="noa-chat-send"
          aria-label="Envoyer le message"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </form>
      <div class="noa-chat-meta">
        <span id="noa-quota-remaining">100 requêtes restantes</span>
        <span aria-hidden="true">·</span>
        <span>Historique repris via cookie</span>
      </div>
    </footer>
  `;

  document.body.appendChild(panel);

  const messagesEl = panel.querySelector<HTMLElement>('#noa-chat-messages')!;
  const chipsEl = panel.querySelector<HTMLElement>('#noa-chat-chips')!;
  const errorEl = panel.querySelector<HTMLElement>('#noa-chat-error')!;
  const quotaBadge = panel.querySelector<HTMLElement>('#noa-quota-badge')!;
  const quotaRemainingEl = panel.querySelector<HTMLElement>('#noa-quota-remaining')!;
  const resetBtn = panel.querySelector<HTMLButtonElement>('#noa-chat-reset')!;
  const closeBtn = panel.querySelector<HTMLButtonElement>('#noa-chat-close')!;
  const formEl = panel.querySelector<HTMLFormElement>('#noa-chat-form')!;
  const inputEl = panel.querySelector<HTMLTextAreaElement>('#noa-chat-input')!;
  const sendBtn = panel.querySelector<HTMLButtonElement>('#noa-chat-send')!;

  let open = false;
  let side: 'left' | 'right' = 'right';
  let messages: NoaChatMessage[] = [];
  let quota: QuotaSnapshot = { used: 0, limit: 100, remaining: 100, limitReached: false };
  let sending = false;
  let sessionLoaded = false;

  const setError = (msg: string | null) => {
    if (!msg) {
      errorEl.hidden = true;
      errorEl.textContent = '';
      return;
    }
    errorEl.textContent = msg;
    errorEl.hidden = false;
  };

  const renderQuota = () => {
    quotaBadge.textContent = `${quota.used} / ${quota.limit}`;
    quotaBadge.classList.toggle('is-warn', quota.remaining <= 20 && quota.remaining > 0);
    quotaBadge.classList.toggle('is-exhausted', quota.limitReached);
    quotaRemainingEl.textContent = quota.limitReached
      ? 'Limite atteinte (100/100)'
      : `${quota.remaining} requête${quota.remaining > 1 ? 's' : ''} restante${quota.remaining > 1 ? 's' : ''}`;

    inputEl.disabled = quota.limitReached;
    if (quota.limitReached) {
      inputEl.placeholder = 'Limite de 100 requêtes atteinte pour cet utilisateur.';
    } else {
      inputEl.placeholder = "Pose une question sur NoVaY, l'APK ou une erreur…";
    }
    sendBtn.disabled = sending || quota.limitReached;
  };

  const renderChips = () => {
    chipsEl.textContent = '';
    const hasMessages = messages.length > 0;
    chipsEl.hidden = quota.limitReached;
    chipsEl.classList.toggle('is-compact', hasMessages);

    const subset = hasMessages ? STARTER_PROMPTS.slice(0, 2) : STARTER_PROMPTS;
    for (const item of subset) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'noa-chip-btn';
      btn.textContent = item.label;
      btn.disabled = sending || quota.limitReached;
      btn.addEventListener('click', () => {
        void submitPrompt(item.prompt);
      });
      chipsEl.appendChild(btn);
    }
  };

  const renderMessages = () => {
    messagesEl.textContent = '';

    if (messages.length === 0) {
      const welcome = document.createElement('div');
      welcome.className = 'noa-welcome-card';

      const heading = document.createElement('p');
      heading.className = 'noa-welcome-title';
      heading.textContent = 'Salut ! Moi c’est Noa.';

      const body = document.createElement('p');
      body.className = 'noa-welcome-copy';
      body.textContent =
        'Je connais NoVaY v3.3.0 par cœur : installation Android pas à pas, dépannage d’erreurs APK/téléchargements, lecteur et nouveautés.';

      welcome.appendChild(heading);
      welcome.appendChild(body);
      messagesEl.appendChild(welcome);
    } else {
      for (const msg of messages) {
        const row = document.createElement('div');
        row.className = `noa-msg-row ${msg.role === 'user' ? 'is-user' : 'is-model'}`;

        const bubble = document.createElement('div');
        bubble.className = 'noa-msg-bubble';
        if (msg.role === 'user') {
          bubble.textContent = msg.text;
        } else {
          renderFormattedChatText(bubble, msg.text);
        }
        row.appendChild(bubble);
        messagesEl.appendChild(row);
      }
    }

    if (sending) {
      const typingRow = document.createElement('div');
      typingRow.className = 'noa-msg-row is-model';
      typingRow.id = 'noa-chat-typing';

      const bubble = document.createElement('div');
      bubble.className = 'noa-msg-bubble is-typing';
      bubble.setAttribute('aria-label', 'Noa rédige une réponse');
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.className = 'noa-typing-dot';
        bubble.appendChild(dot);
      }
      typingRow.appendChild(bubble);
      messagesEl.appendChild(typingRow);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const getPanelHeight = () => {
    if (!open || panel.hidden) return 0;
    const rect = panel.getBoundingClientRect();
    return rect.height > 0 ? rect.height : 460;
  };

  const notifyLayout = () => {
    callbacks.onOpenChange?.(open, side, getPanelHeight());
  };

  const applySessionPayload = (payload: SessionResponse) => {
    messages = Array.isArray(payload.messages) ? payload.messages : [];
    quota = {
      used: typeof payload.used === 'number' ? payload.used : 0,
      limit: typeof payload.limit === 'number' ? payload.limit : 100,
      remaining: typeof payload.remaining === 'number' ? payload.remaining : 100,
      limitReached: Boolean(payload.limitReached),
    };
    renderQuota();
    renderChips();
    renderMessages();
    if (open) {
      requestAnimationFrame(notifyLayout);
    }
  };

  const loadSession = async (): Promise<void> => {
    try {
      const res = await fetch('/api/noa/session', {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = (await res.json()) as SessionResponse;
      sessionLoaded = true;
      applySessionPayload(data);
    } catch {
      // Non-fatal on boot; user can still retry on send
    }
  };

  void loadSession();

  const submitPrompt = async (overrideText?: string): Promise<void> => {
    if (sending) return;
    if (quota.limitReached) {
      setError('Limite de 100 requêtes atteinte pour cet utilisateur.');
      callbacks.onEmotion?.('surprised', 2000);
      return;
    }

    const raw = overrideText ?? inputEl.value;
    const text = raw.trim();
    if (!text) return;

    setError(null);
    if (!overrideText) {
      inputEl.value = '';
      inputEl.style.height = 'auto';
    }

    const optimisticUserMsg: NoaChatMessage = {
      id: `opt_${Date.now()}`,
      role: 'user',
      text,
      createdAt: Date.now(),
    };
    messages = [...messages, optimisticUserMsg];
    sending = true;
    renderQuota();
    renderChips();
    renderMessages();
    callbacks.onEmotion?.('focused', 8000);
    if (open) requestAnimationFrame(notifyLayout);

    try {
      const res = await fetch('/api/noa/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'NoVaY-WebChat',
        },
        body: JSON.stringify({ message: text }),
      });

      const data = (await res.json().catch(() => ({}))) as ChatResponse;
      if (!res.ok) {
        // Remove optimistic user message if request failed before recording
        messages = messages.filter((m) => m.id !== optimisticUserMsg.id);
        if (typeof data.used === 'number') {
          quota = {
            used: data.used,
            limit: data.limit ?? 100,
            remaining: data.remaining ?? Math.max(0, 100 - data.used),
            limitReached: Boolean(data.limitReached),
          };
        }
        setError(data.error || 'Une erreur est survenue lors de la réponse de Noa.');
        callbacks.onEmotion?.('surprised', 2200);
        if (!overrideText && !quota.limitReached) {
          inputEl.value = text;
        }
        return;
      }

      if (Array.isArray(data.messages)) {
        messages = data.messages;
      } else if (data.reply) {
        messages = [
          ...messages,
          {
            id: `m_${Date.now()}`,
            role: 'model',
            text: data.reply,
            emotion: data.emotion,
            createdAt: Date.now(),
          },
        ];
      }

      quota = {
        used: typeof data.used === 'number' ? data.used : quota.used + 1,
        limit: typeof data.limit === 'number' ? data.limit : 100,
        remaining: typeof data.remaining === 'number' ? data.remaining : Math.max(0, quota.remaining - 1),
        limitReached: Boolean(data.limitReached),
      };
      sessionLoaded = true;
      callbacks.onEmotion?.(data.emotion ?? 'happy', 2600);
    } catch {
      messages = messages.filter((m) => m.id !== optimisticUserMsg.id);
      setError('Connexion impossible au serveur NoVaY. Vérifie le réseau et réessaie.');
      callbacks.onEmotion?.('surprised', 2200);
      if (!overrideText) {
        inputEl.value = text;
      }
    } finally {
      sending = false;
      renderQuota();
      renderChips();
      renderMessages();
      if (open) {
        requestAnimationFrame(notifyLayout);
      }
    }
  };

  const resetConversation = async () => {
    if (sending) return;
    setError(null);
    try {
      const res = await fetch('/api/noa/reset', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'NoVaY-WebChat',
        },
      });
      if (res.ok) {
        const data = (await res.json()) as SessionResponse;
        applySessionPayload(data);
        callbacks.onEmotion?.('wink', 1600);
      }
    } catch {
      setError('Impossible de réinitialiser la discussion.');
    }
  };

  const openPanel = (anchorX?: number) => {
    if (typeof anchorX === 'number') {
      side = anchorX < window.innerWidth * 0.5 ? 'left' : 'right';
    }
    panel.dataset.side = side;
    open = true;
    panel.hidden = false;
    setError(null);
    renderQuota();
    renderChips();
    renderMessages();

    if (!sessionLoaded) {
      void loadSession();
    }

    requestAnimationFrame(() => {
      panel.classList.add('is-open');
      notifyLayout();
      if (!quota.limitReached) {
        inputEl.focus({ preventScroll: true });
      }
    });
    callbacks.onEmotion?.('happy', 1800);
  };

  let closeTimer: number | null = null;
  const closePanel = () => {
    if (!open) return;
    open = false;
    panel.classList.remove('is-open');
    notifyLayout();
    if (closeTimer !== null) window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (!open) {
        panel.hidden = true;
      }
    }, 220);
  };

  const onFormSubmit = (e: Event) => {
    e.preventDefault();
    void submitPrompt();
  };

  const onInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitPrompt();
    }
  };

  const onInputAutoSize = () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = `${Math.min(84, inputEl.scrollHeight)}px`;
  };

  const onDocumentKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      closePanel();
    }
  };

  const onWindowResize = () => {
    if (open) {
      notifyLayout();
    }
  };

  formEl.addEventListener('submit', onFormSubmit);
  inputEl.addEventListener('keydown', onInputKeyDown);
  inputEl.addEventListener('input', onInputAutoSize);
  resetBtn.addEventListener('click', () => void resetConversation());
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', onDocumentKeyDown);
  window.addEventListener('resize', onWindowResize, { passive: true });

  renderQuota();
  renderChips();
  renderMessages();

  return {
    isOpen: () => open,
    open: openPanel,
    close: closePanel,
    toggle: (anchorX?: number) => {
      if (open) {
        closePanel();
      } else {
        openPanel(anchorX);
      }
      return open;
    },
    getPanelHeight,
    getSide: () => side,
    destroy: () => {
      if (closeTimer !== null) window.clearTimeout(closeTimer);
      formEl.removeEventListener('submit', onFormSubmit);
      inputEl.removeEventListener('keydown', onInputKeyDown);
      inputEl.removeEventListener('input', onInputAutoSize);
      document.removeEventListener('keydown', onDocumentKeyDown);
      window.removeEventListener('resize', onWindowResize);
      panel.remove();
    },
  };
}
