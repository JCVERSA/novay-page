import {
  COUNTDOWN_STEPS,
  CatalogEntry,
  CollectionGenre,
  LanguageFilter,
  LibraryDisplay,
  LibraryFilter,
  LibrarySort,
  NovayAppState,
  PHONE_TABS,
  PhoneAccentPreset,
  PhoneTab,
  RESUME_START_SECONDS,
  RESUME_TOTAL_SECONDS,
  VideoQuality,
  clearWatchHistory,
  closeShowDetail,
  createInitialState,
  formatDeviceClock,
  formatDeviceStatusLabel,
  formatPlaybackTime,
  getEntryDownloadedCount,
  getFilteredCatalog,
  getGenreLabel,
  getHistoryGroups,
  getInstallProgressPercent,
  getLatestResumeEntry,
  getLibraryItems,
  getLoaderStepProgress,
  getOfflineCount,
  getPlaybackProgressPercent,
  getQualityDescription,
  getTotalNewEpisodes,
  getUpdatesEntries,
  openShowDetail,
  playEpisodeEntry,
  refreshUpdatesFeed,
  resolveDeviceBatteryPercent,
  resolveInitialTheme,
  selectCollectionGenre,
  setActiveShowLang,
  setBrowseQuery,
  setFeatureLanguage,
  setLanguageFilter,
  setLibraryDisplay,
  setLibraryFilter,
  setLibrarySort,
  setPhoneAccentPreset,
  setPhoneTab,
  setVideoQuality,
  shouldSkipIntroLoader,
  toggleDisplaySheet,
  toggleDownloadedEntry,
  toggleEpisodeDownload,
  toggleFaqItem,
  toggleFavoriteEntry,
  toggleInstallStep,
  toggleTheme,
  toggleWifiOnly,
} from './lib/novayState';
import { initFeatureIconMorphing } from './lib/iconMorph';
import { NovayMascotController, mountNovayMascot } from './lib/novayMascot';
import { mountNoaChatWidget } from './lib/noaChatWidget';
import { getPosterUrl } from './lib/posterAssets';

const THEME_STORAGE_KEY = 'novay-theme';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderBrandSealSvg(): string {
  return `
    <svg class="novay-brand-seal" viewBox="0 0 256 256" fill="none" aria-hidden="true">
      <path class="brand-mark-tile" d="M 72 20 H 184 A 52 52 0 0 1 236 72 V 184 A 52 52 0 0 1 184 236 H 72 A 52 52 0 0 1 20 184 V 72 A 52 52 0 0 1 72 20 Z" />
      <path class="brand-mark-n" d="M 66 64 H 92 V 176 L 66 191 Z M 104 64 H 126 L 154 128 V 192 H 132 L 104 128 Z M 164 79 L 190 64 V 192 H 164 Z" />
    </svg>`;
}

function renderKatanaHankoSvg(className: string): string {
  return `
    <svg class="${className}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M 155.95 23.68 A 108 108 0 0 1 221.53 182 L 212.87 177 A 98 98 0 0 0 153.36 33.34 Z" />
      <path d="M 100.05 232.32 A 108 108 0 0 1 34.47 74 L 43.13 79 A 98 98 0 0 0 102.64 222.66 Z" />
      <path d="M 64 64 H 88 V 178 L 64 192 Z" />
      <path d="M 168 78 L 192 64 V 192 H 168 Z" />
      <path d="M 98 64 H 120 L 158 148 V 192 H 136 L 98 108 Z" />
    </svg>`;
}

function renderPosterImg(entry: CatalogEntry, className: string = 'anime-poster-img'): string {
  const url = getPosterUrl(entry.posterKey);
  return `<img class="${className}" src="${url}" alt="Affiche de ${escapeHtml(entry.title)}" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none'" />`;
}

function startIntroCountdown(onReady?: () => void): void {
  const loaderEl = document.getElementById('page-loader');
  const countEl = document.getElementById('loader-count');
  const captionEl = document.getElementById('loader-caption');
  const skipBtn = document.getElementById('loader-skip');
  const dots = Array.from(document.querySelectorAll<HTMLElement>('[data-loader-dot]'));
  const root = document.documentElement;

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const autostart =
    typeof window !== 'undefined' && window.location.search.includes('autostart=1');

  if (!loaderEl || autostart || shouldSkipIntroLoader(reducedMotion)) {
    root.dataset.loader = 'done';
    if (loaderEl) loaderEl.hidden = true;
    onReady?.();
    return;
  }

  const captions = ['Préparation', 'Presque prêt', 'C’est parti'];
  const timers: number[] = [];
  let completed = false;

  const finishReveal = () => {
    if (completed) return;
    completed = true;
    timers.forEach((id) => window.clearTimeout(id));
    root.dataset.loader = 'revealing';
    loaderEl.classList.add('is-revealing');
    onReady?.();

    window.setTimeout(() => {
      root.dataset.loader = 'done';
      loaderEl.hidden = true;
    }, 780);
  };

  const applyStep = (stepIndex: number) => {
    const value = COUNTDOWN_STEPS[stepIndex] ?? 1;
    const progress = getLoaderStepProgress(stepIndex);

    loaderEl.dataset.step = String(stepIndex);
    loaderEl.style.setProperty('--loader-progress', String(progress));

    dots.forEach((dot, idx) => {
      dot.classList.toggle('is-active', idx <= stepIndex);
      dot.classList.toggle('is-current', idx === stepIndex);
    });

    if (captionEl && captions[stepIndex]) {
      captionEl.textContent = captions[stepIndex];
    }

    if (countEl) {
      if (stepIndex === 0) {
        countEl.textContent = String(value);
      } else {
        countEl.classList.remove('is-ticking');
        void countEl.offsetWidth;
        countEl.textContent = String(value);
        countEl.classList.add('is-ticking');
      }
    }
  };

  skipBtn?.addEventListener('click', finishReveal, { once: true });

  applyStep(0);
  timers.push(window.setTimeout(() => applyStep(1), 700));
  timers.push(window.setTimeout(() => applyStep(2), 1400));
  timers.push(window.setTimeout(finishReveal, 2180));
}

function attachRipples(reducedMotion: boolean): void {
  if (reducedMotion) return;
  const rippleSelector = [
    '.button',
    '.step-card',
    '.phone-nav-btn',
    '.play-btn',
    '.novay-icon-btn',
    '.novay-chip',
    '.phone-resume-banner',
    '.anime-card',
    '.phone-list-row',
    '.phone-mini-action',
    '.more-pref-row',
    '.more-preset-chip',
    '.show-btn-primary',
    '.show-btn-outline',
    '.show-ep-row',
    '.sheet-sort-btn',
    '.segmented-btn',
    '.faq-trigger',
  ].join(', ');

  document.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement | null;
    const host = target?.closest<HTMLElement>(rippleSelector);
    if (!host) return;

    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.1;
    const x =
      event.clientX > 0 ? event.clientX - rect.left - size / 2 : rect.width / 2 - size / 2;
    const y =
      event.clientY > 0 ? event.clientY - rect.top - size / 2 : rect.height / 2 - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'm3-ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    host.appendChild(ripple);

    window.setTimeout(() => ripple.remove(), 580);
  });
}

function initPhoneTilt(reducedMotion: boolean): void {
  if (reducedMotion) return;
  const finePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!finePointer) return;

  const heroVisual = document.getElementById('apercu');
  const phone = document.getElementById('interactive-phone');
  if (!heroVisual || !phone) return;

  heroVisual.addEventListener('pointermove', (event) => {
    const rect = heroVisual.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const relY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const ry = (relX - 0.5) * 14;
    const rx = (0.5 - relY) * 12;

    phone.style.setProperty('--tilt-rx', rx.toFixed(2));
    phone.style.setProperty('--tilt-ry', ry.toFixed(2));
    phone.style.setProperty('--glare-x', `${(relX * 100).toFixed(1)}%`);
    phone.style.setProperty('--glare-y', `${(relY * 100).toFixed(1)}%`);
    heroVisual.style.setProperty('--tilt-rx', rx.toFixed(2));
    heroVisual.style.setProperty('--tilt-ry', ry.toFixed(2));
  });

  heroVisual.addEventListener('pointerleave', () => {
    phone.style.setProperty('--tilt-rx', '0');
    phone.style.setProperty('--tilt-ry', '0');
    phone.style.setProperty('--glare-x', '50%');
    phone.style.setProperty('--glare-y', '30%');
    heroVisual.style.setProperty('--tilt-rx', '0');
    heroVisual.style.setProperty('--tilt-ry', '0');
  });
}

function triggerFeatureStrokeDraw(featureClass: string): void {
  const icon = document.querySelector<SVGElement>(
    `.${featureClass} .illustration-icon`
  );
  if (!icon) return;
  icon.classList.remove('is-icon-drawing');
  void icon.getBoundingClientRect();
  icon.classList.add('is-icon-drawing');
}

function initDeviceStatusBar(): void {
  const timeEl = document.getElementById('phone-status-time');
  const deviceEl = document.getElementById('phone-status-device');
  if (!timeEl && !deviceEl) return;

  interface NetworkInfoLike extends EventTarget {
    type?: string;
    effectiveType?: string;
  }
  interface BatteryManagerLike extends EventTarget {
    level: number;
    charging: boolean;
  }
  type NavigatorWithTelemetry = Navigator & {
    connection?: NetworkInfoLike;
    mozConnection?: NetworkInfoLike;
    webkitConnection?: NetworkInfoLike;
    getBattery?: () => Promise<BatteryManagerLike>;
  };

  const nav = navigator as NavigatorWithTelemetry;
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  let batteryLevel: number | null = null;
  let batteryCharging = false;

  const updateClock = () => {
    if (timeEl) {
      timeEl.textContent = formatDeviceClock(new Date());
    }
  };

  const updateTelemetry = () => {
    if (!deviceEl) return;
    const statusText = formatDeviceStatusLabel({
      online: navigator.onLine,
      connectionType: conn?.type,
      effectiveType: conn?.effectiveType,
      batteryLevel,
      batteryCharging,
    });
    const pct = resolveDeviceBatteryPercent(batteryLevel);
    deviceEl.innerHTML = `<span class="phone-status-right"><span>${escapeHtml(statusText)}</span><span class="phone-battery-pill ${batteryCharging ? 'is-charging' : ''}"><span class="phone-battery-fill" style="width: ${pct}%"></span></span></span>`;
  };

  updateClock();
  updateTelemetry();

  window.setInterval(updateClock, 15000);
  window.addEventListener('online', updateTelemetry);
  window.addEventListener('offline', updateTelemetry);
  conn?.addEventListener?.('change', updateTelemetry);

  if (typeof nav.getBattery === 'function') {
    nav
      .getBattery()
      .then((battery) => {
        batteryLevel = battery.level;
        batteryCharging = battery.charging;
        updateTelemetry();

        const onBatteryChange = () => {
          batteryLevel = battery.level;
          batteryCharging = battery.charging;
          updateTelemetry();
        };
        battery.addEventListener('levelchange', onBatteryChange);
        battery.addEventListener('chargingchange', onBatteryChange);
      })
      .catch(() => undefined);
  }
}

function init(): void {
  document.documentElement.classList.add('js-enhanced');
  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mascot: NovayMascotController | null = null;
  let loaderCompleted = false;

  startIntroCountdown(() => {
    loaderCompleted = true;
    mascot?.setVisible(true);
  });
  attachRipples(reducedMotion);
  initPhoneTilt(reducedMotion);
  initDeviceStatusBar();
  initFeatureIconMorphing(reducedMotion);

  let storedTheme: string | null = null;
  try {
    storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    storedTheme = null;
  }

  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  let state: NovayAppState = createInitialState(
    resolveInitialTheme(storedTheme, prefersDark)
  );

  const noaChat = mountNoaChatWidget({
    onOpenChange: (open, side, panelHeight) => {
      mascot?.setChatOpen(open, side, panelHeight);
    },
    onEmotion: (emotion, durationMs) => {
      mascot?.pulseEmotion(emotion, durationMs);
    },
  });

  const mascotHost = document.getElementById('novay-mascot-stage');
  if (mascotHost) {
    mascot = mountNovayMascot(mascotHost, state.theme, state.phoneAccentPreset, {
      onToggleChat: (currentX) => {
        noaChat.toggle(currentX);
      },
    });
    if (loaderCompleted) {
      mascot.setVisible(true);
    }
  }

  let toastTimeoutId: number | null = null;
  const showPhoneToast = (message: string) => {
    const host = document.getElementById('phone-toast-host');
    if (!host) return;
    host.innerHTML = `<div class="novay-toast"><span class="novay-toast-dot" aria-hidden="true"></span><span>${escapeHtml(message)}</span></div>`;
    if (toastTimeoutId !== null) {
      window.clearTimeout(toastTimeoutId);
    }
    toastTimeoutId = window.setTimeout(() => {
      host.innerHTML = '';
      toastTimeoutId = null;
    }, 2200);
  };

  let lastActiveTab: PhoneTab | null = null;
  let sheetCloseTimer: number | null = null;
  let showCloseTimer: number | null = null;

  const renderPhone = () => {
    const tabChanged = lastActiveTab !== null && lastActiveTab !== state.activeTab;
    lastActiveTab = state.activeTab;

    const phoneEl = document.getElementById('interactive-phone');
    if (phoneEl) {
      phoneEl.dataset.accent = state.phoneAccentPreset;
    }
    const chatPanelEl = document.getElementById('noa-chat-panel');
    if (chatPanelEl) {
      chatPanelEl.dataset.accent = state.phoneAccentPreset;
    }

    // 1. Aniyomi Floating Frosted-Glass Bottom Dock + Morphing Icons
    const dockEl = document.querySelector<HTMLElement>('.aniyomi-dock');
    const tabIndex = Math.max(0, PHONE_TABS.indexOf(state.activeTab));
    if (dockEl) {
      dockEl.style.setProperty('--dock-index', String(tabIndex));
    }

    document.querySelectorAll<HTMLButtonElement>('[data-phone-tab]').forEach((btn) => {
      const tab = btn.dataset.phoneTab as PhoneTab;
      btn.setAttribute('aria-selected', tab === state.activeTab ? 'true' : 'false');
    });

    const totalNew = getTotalNewEpisodes(state);
    const dockBadge = document.getElementById('dock-updates-badge');
    if (dockBadge) {
      dockBadge.textContent = String(totalNew);
      dockBadge.hidden = totalNew <= 0;
    }

    // 2. Screen Switch with Material Z-Axis Fade-Through
    document.querySelectorAll<HTMLElement>('[data-phone-screen]').forEach((screen) => {
      const name = screen.dataset.phoneScreen as PhoneTab;
      const isVisible = name === state.activeTab;
      screen.hidden = !isVisible;
      screen.classList.remove('is-m3-entering');
      if (isVisible && tabChanged) {
        void screen.offsetWidth;
        screen.classList.add('is-m3-entering');
      }
    });

    // 3. Screen 1: Library (Bibliothèque)
    const libraryItems = getLibraryItems(state);
    const libCountPill = document.getElementById('library-count-pill');
    if (libCountPill) {
      libCountPill.textContent = String(libraryItems.length);
    }

    document.querySelectorAll<HTMLButtonElement>('[data-lib-filter]').forEach((chip) => {
      const filter = chip.dataset.libFilter as LibraryFilter;
      chip.setAttribute('aria-pressed', state.libraryFilter === filter ? 'true' : 'false');
    });

    const libBody = document.getElementById('phone-library-body');
    if (libBody) {
      const resumeEntry = state.libraryFilter === 'all' ? getLatestResumeEntry(state) : null;
      const resumeHtml = resumeEntry
        ? `
        <button type="button" class="phone-resume-banner" data-play-ep="${resumeEntry.id}" data-ep-num="${resumeEntry.lastWatchedEpisode}" aria-label="Reprendre ${escapeHtml(resumeEntry.title)} épisode ${resumeEntry.lastWatchedEpisode}">
          <div class="phone-resume-thumb" style="background: ${resumeEntry.fallbackGradient}">
            ${renderPosterImg(resumeEntry)}
          </div>
          <div class="phone-resume-copy">
            <span class="phone-resume-kicker">Reprendre la séance</span>
            <span class="phone-resume-title">${escapeHtml(resumeEntry.title)}</span>
            <span class="phone-resume-sub">Ép. ${String(resumeEntry.lastWatchedEpisode).padStart(2, '0')} · ${resumeEntry.watchProgress}%</span>
            <div class="phone-resume-bar">
              <div class="phone-resume-bar-fill" style="width: ${resumeEntry.watchProgress}%"></div>
            </div>
          </div>
          <span class="phone-resume-play" aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>
          </span>
        </button>`
        : '';

      let itemsHtml = '';
      if (libraryItems.length === 0) {
        itemsHtml = `
          <div class="phone-empty-card">
            Aucun animé dans ce filtre. Explore le catalogue pour enrichir ta bibliothèque.
          </div>`;
      } else if (state.libraryDisplay === 'list') {
        itemsHtml = `
          <div class="anime-poster-grid is-list">
            ${libraryItems
              .map((item) => {
                const dlCount = getEntryDownloadedCount(item);
                return `
                <div class="phone-list-row" role="button" tabindex="0" data-open-show="${item.id}">
                  <div class="phone-row-thumb" style="background: ${item.fallbackGradient}">
                    ${renderPosterImg(item)}
                  </div>
                  <div class="phone-row-body">
                    <div class="phone-row-title">${escapeHtml(item.title)}</div>
                    <div class="phone-row-meta">${escapeHtml(item.episode)} · ${item.languages.join(' / ')}${dlCount > 0 ? ` · ${dlCount} hors ligne` : ''}</div>
                  </div>
                  <button type="button" class="phone-mini-action is-active" data-play-ep="${item.id}" data-ep-num="${item.lastWatchedEpisode}" aria-label="Lire ${escapeHtml(item.title)}">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8z"/></svg>
                  </button>
                </div>`;
              })
              .join('')}
          </div>`;
      } else {
        const gridClass =
          state.libraryDisplay === 'compact'
            ? 'anime-poster-grid is-compact'
            : 'anime-poster-grid';
        itemsHtml = `
          <div class="${gridClass}">
            ${libraryItems
              .map((item) => {
                const dlCount = getEntryDownloadedCount(item);
                const badgesHtml =
                  dlCount > 0 || item.newEpisodes > 0
                    ? `<div class="anime-badge-group">
                        ${dlCount > 0 ? `<span class="nv-badge is-offline" title="Hors ligne">${dlCount}</span>` : ''}
                        ${item.newEpisodes > 0 ? `<span class="nv-badge is-new" title="Nouveaux épisodes">${item.newEpisodes}</span>` : ''}
                      </div>`
                    : '';
                const playFab =
                  item.watchProgress > 0
                    ? `<button type="button" class="anime-card-play" data-play-ep="${item.id}" data-ep-num="${item.lastWatchedEpisode}" aria-label="Reprendre ${escapeHtml(item.title)}">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8z"/></svg>
                      </button>`
                    : '';
                return `
                <div class="anime-card" role="button" tabindex="0" data-open-show="${item.id}" aria-label="Ouvrir ${escapeHtml(item.title)}">
                  <div class="anime-card-poster" style="background: ${item.fallbackGradient}">
                    ${renderPosterImg(item)}
                    <div class="anime-card-scrim" aria-hidden="true"></div>
                    ${badgesHtml}
                    ${playFab}
                    <div class="anime-card-title">${escapeHtml(item.title)}</div>
                  </div>
                </div>`;
              })
              .join('')}
          </div>`;
      }

      libBody.innerHTML = resumeHtml + itemsHtml;
    }

    // 4. Screen 2: Updates (Nouveautés)
    const updatesCountPill = document.getElementById('updates-count-pill');
    if (updatesCountPill) {
      updatesCountPill.textContent = String(totalNew);
      updatesCountPill.hidden = totalNew <= 0;
    }

    const updatesList = document.getElementById('phone-updates-list');
    if (updatesList) {
      const updates = getUpdatesEntries(state);
      if (updates.length === 0) {
        updatesList.innerHTML = `
          <div class="phone-empty-card">
            Tout est à jour — aucun nouvel épisode en attente.
          </div>`;
      } else {
        updatesList.innerHTML = `
          <div class="novay-section-header">
            <span class="novay-section-bar" aria-hidden="true"></span>
            <span>Nouvelles sorties</span>
          </div>
          ${updates
            .map(
              (item) => `
            <div class="phone-list-row" role="button" tabindex="0" data-open-show="${item.id}">
              <div class="phone-row-thumb" style="background: ${item.fallbackGradient}">
                ${renderPosterImg(item)}
              </div>
              <div class="phone-row-body">
                <div class="phone-row-title">${escapeHtml(item.title)}</div>
                <div class="phone-row-meta">${escapeHtml(item.episode)} · ${escapeHtml(item.updateAgo)}</div>
              </div>
              <button type="button" class="phone-mini-action ${item.downloaded ? 'is-emerald' : ''}" data-toggle-dl="${item.id}" aria-pressed="${item.downloaded}" aria-label="${item.downloaded ? 'Retirer hors ligne' : 'Télécharger'} ${escapeHtml(item.title)}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
                  item.downloaded
                    ? '<path d="M20 6 9 17l-5-5"/>'
                    : '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>'
                }</svg>
              </button>
              <button type="button" class="phone-mini-action is-active" data-play-ep="${item.id}" data-ep-num="${item.lastWatchedEpisode}" aria-label="Lire ${escapeHtml(item.title)}">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8z"/></svg>
              </button>
            </div>`
            )
            .join('')}`;
      }
    }

    // 5. Screen 3: History (Historique)
    const historyGroups = getHistoryGroups(state);
    const historyCount = historyGroups.reduce((acc, grp) => acc + grp.entries.length, 0);
    const historyCountPill = document.getElementById('history-count-pill');
    if (historyCountPill) {
      historyCountPill.textContent = String(historyCount);
      historyCountPill.hidden = historyCount <= 0;
    }

    const historyList = document.getElementById('phone-history-list');
    if (historyList) {
      if (historyGroups.length === 0) {
        historyList.innerHTML = `
          <div class="phone-empty-card">
            Aucun historique récent. Lance un épisode pour retrouver ta progression ici.
          </div>`;
      } else {
        historyList.innerHTML = historyGroups
          .map(
            (group) => `
          <div class="novay-section-header">
            <span class="novay-section-bar" aria-hidden="true"></span>
            <span>${escapeHtml(group.day)}</span>
          </div>
          ${group.entries
            .map(
              (item) => `
            <div class="phone-list-row" role="button" tabindex="0" data-open-show="${item.id}">
              <div class="phone-row-thumb" style="background: ${item.fallbackGradient}">
                ${renderPosterImg(item)}
              </div>
              <div class="phone-row-body">
                <div class="phone-row-title">${escapeHtml(item.title)}</div>
                <div class="phone-row-meta">Ép. ${String(item.lastWatchedEpisode).padStart(2, '0')} · ${escapeHtml(item.lastWatchedTime)}</div>
                <div class="phone-row-progress">
                  <div class="phone-row-progress-fill" style="width: ${item.watchProgress}%"></div>
                </div>
              </div>
              <button type="button" class="phone-mini-action is-active" data-play-ep="${item.id}" data-ep-num="${item.lastWatchedEpisode}" aria-label="Reprendre ${escapeHtml(item.title)}">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8z"/></svg>
              </button>
            </div>`
            )
            .join('')}`
          )
          .join('');
      }
    }

    // 6. Screen 4: Browse (Explorer)
    const browseSearchInput = document.getElementById(
      'phone-browse-search'
    ) as HTMLInputElement | null;
    if (browseSearchInput && browseSearchInput.value !== state.browseQuery) {
      browseSearchInput.value = state.browseQuery;
    }

    document.querySelectorAll<HTMLButtonElement>('[data-lang-filter]').forEach((btn) => {
      const filter = btn.dataset.langFilter as LanguageFilter;
      btn.setAttribute('aria-pressed', state.languageFilter === filter ? 'true' : 'false');
    });

    document.querySelectorAll<HTMLButtonElement>('[data-genre-chip]').forEach((btn) => {
      const genre = btn.dataset.genreChip as CollectionGenre;
      btn.setAttribute('aria-pressed', state.selectedGenre === genre ? 'true' : 'false');
    });

    const browseBody = document.getElementById('phone-browse-body');
    if (browseBody) {
      const catalogEntries = getFilteredCatalog(state);
      if (catalogEntries.length === 0) {
        browseBody.innerHTML = `
          <div class="phone-empty-card">
            Aucun résultat${state.browseQuery.trim() ? ` pour « ${escapeHtml(state.browseQuery.trim())} »` : ''}.
          </div>`;
      } else {
        browseBody.innerHTML = `
          <div class="anime-poster-grid">
            ${catalogEntries
              .map(
                (item) => `
              <div class="anime-card" role="button" tabindex="0" data-open-show="${item.id}" aria-label="Voir la fiche de ${escapeHtml(item.title)}">
                <div class="anime-card-poster" style="background: ${item.fallbackGradient}">
                  ${renderPosterImg(item)}
                  <div class="anime-card-scrim" aria-hidden="true"></div>
                  <div class="anime-badge-group">
                    <span class="nv-badge is-lang">${item.languages.join(' · ')}</span>
                  </div>
                  <button type="button" class="browse-fav-btn" data-toggle-fav="${item.id}" aria-pressed="${item.favorite}" aria-label="${item.favorite ? 'Retirer' : 'Ajouter'} ${escapeHtml(item.title)} de la bibliothèque">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="${item.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  </button>
                  <div class="anime-card-title">${escapeHtml(item.title)}</div>
                </div>
              </div>`
              )
              .join('')}
          </div>`;
      }
    }

    // 7. Screen 5: More (Plus)
    const moreBody = document.getElementById('phone-more-body');
    if (moreBody) {
      const offlineCount = getOfflineCount(state);
      const isDark = state.theme === 'dark';
      moreBody.innerHTML = `
        <div class="more-brand-card">
          ${renderBrandSealSvg()}
          <div class="more-brand-meta">
            <strong>NoVaY</strong>
            <small>Material 3 · VF &amp; VOSTFR sans pub</small>
          </div>
          ${renderKatanaHankoSvg('more-brand-hanko')}
        </div>

        <div class="more-section-label">Bibliothèque &amp; Hors ligne</div>
        <div class="more-group-card">
          <button type="button" class="more-pref-row" id="more-offline-row">
            <span class="more-pref-ico" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>
            </span>
            <span class="more-pref-copy">
              <strong>File hors ligne</strong>
              <small>${offlineCount} épisode${offlineCount > 1 ? 's' : ''} disponible${offlineCount > 1 ? 's' : ''}</small>
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        <div class="more-section-label">Apparence &amp; Couleurs</div>
        <div class="more-group-card">
          <div class="more-presets-row" role="group" aria-label="Thème d'accentuation NoVaY">
            <button type="button" class="more-preset-chip" data-accent-preset="noir_crimson" aria-pressed="${state.phoneAccentPreset === 'noir_crimson'}">
              <span class="preset-swatch" style="background: #d9143c" aria-hidden="true"></span>
              <span>Carmin</span>
            </button>
            <button type="button" class="more-preset-chip" data-accent-preset="midnight_slate" aria-pressed="${state.phoneAccentPreset === 'midnight_slate'}">
              <span class="preset-swatch" style="background: #0284c7" aria-hidden="true"></span>
              <span>Ardoise</span>
            </button>
            <button type="button" class="more-preset-chip" data-accent-preset="warm_amber" aria-pressed="${state.phoneAccentPreset === 'warm_amber'}">
              <span class="preset-swatch" style="background: #d97706" aria-hidden="true"></span>
              <span>Ambre</span>
            </button>
          </div>
          <button type="button" class="more-pref-row" data-toggle-page-theme aria-pressed="${isDark}">
            <span class="more-pref-ico" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            </span>
            <span class="more-pref-copy">
              <strong>Mode sombre cinéma</strong>
              <small>Synchronisé avec la page (${isDark ? 'Sombre' : 'Clair'})</small>
            </span>
            <span class="novay-switch ${isDark ? 'is-on' : ''}" aria-hidden="true"></span>
          </button>
        </div>

        <div class="more-section-label">Lecture &amp; Réseau</div>
        <div class="more-group-card">
          <button type="button" class="more-pref-row" data-toggle-wifi aria-pressed="${state.wifiOnly}">
            <span class="more-pref-ico" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>
            </span>
            <span class="more-pref-copy">
              <strong>Téléchargement Wi-Fi uniquement</strong>
              <small>${state.wifiOnly ? 'Activé · Préserve les données 5G' : 'Désactivé · Autorise le réseau mobile'}</small>
            </span>
            <span class="novay-switch ${state.wifiOnly ? 'is-on' : ''}" aria-hidden="true"></span>
          </button>
          <div class="more-pref-row">
            <span class="more-pref-ico" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
            </span>
            <span class="more-pref-copy">
              <strong>Qualité vidéo par défaut</strong>
              <small>${state.quality} · ${escapeHtml(getQualityDescription(state.quality))}</small>
            </span>
          </div>
        </div>
      `;
    }

    // 8. Push Overlay: Show Detail (Fiche Animé)
    const showOverlay = document.getElementById('phone-show-overlay');
    if (showOverlay) {
      const activeShow = state.activeShowId
        ? state.catalog.find((entry) => entry.id === state.activeShowId) ?? null
        : null;

      if (showCloseTimer !== null) {
        window.clearTimeout(showCloseTimer);
        showCloseTimer = null;
      }

      if (activeShow) {
        const posterUrl = getPosterUrl(activeShow.posterKey);
        showOverlay.innerHTML = `
          <div class="show-hero-backdrop">
            <div class="show-hero-bg" style="background-image: url('${posterUrl}'), ${activeShow.fallbackGradient}" aria-hidden="true"></div>
            <div class="show-hero-scrim" aria-hidden="true"></div>
            <div class="show-topbar">
              <button type="button" class="novay-icon-btn" id="show-back-btn" aria-label="Retour">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <span class="novay-count-pill">${escapeHtml(getGenreLabel(activeShow.genre))}</span>
            </div>
            <div class="show-header-row">
              <div class="show-hero-poster" style="background: ${activeShow.fallbackGradient}">
                ${renderPosterImg(activeShow)}
              </div>
              <div class="show-hero-info">
                <div class="show-hero-title">${escapeHtml(activeShow.title)}</div>
                <div class="show-hero-meta">${activeShow.year} · ${activeShow.format} · ${activeShow.duration}</div>
                <div class="show-hero-actions">
                  <button type="button" class="show-btn-primary" data-play-ep="${activeShow.id}" data-ep-num="${activeShow.lastWatchedEpisode}">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8z"/></svg>
                    <span>Ép. ${String(activeShow.lastWatchedEpisode).padStart(2, '0')}</span>
                  </button>
                  <button type="button" class="show-btn-outline" data-toggle-fav="${activeShow.id}" aria-pressed="${activeShow.favorite}" aria-label="${activeShow.favorite ? 'Retirer de la bibliothèque' : 'Ajouter à la bibliothèque'}">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="${activeShow.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                    <span>${activeShow.favorite ? 'Suivi' : 'Suivre'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="show-body">
            <div class="novay-chip-row" role="group" aria-label="Piste audio">
              ${activeShow.languages
                .map(
                  (lang) =>
                    `<button type="button" class="novay-chip" data-show-lang="${lang}" aria-pressed="${state.activeShowLang === lang}">${lang}</button>`
                )
                .join('')}
            </div>
            <p class="show-synopsis">${escapeHtml(activeShow.synopsis)}</p>
            <div class="novay-section-header">
              <span class="novay-section-bar" aria-hidden="true"></span>
              <span>Épisodes (${activeShow.episodes.length})</span>
            </div>
            <div class="show-ep-list">
              ${activeShow.episodes
                .map(
                  (ep) => `
                <div class="show-ep-row">
                  <div class="phone-row-body">
                    <div class="phone-row-title">Ép. ${String(ep.number).padStart(2, '0')} · ${escapeHtml(ep.title)}</div>
                    <div class="phone-row-meta">${ep.duration}${ep.progressPercent > 0 && ep.progressPercent < 100 ? ` · ${ep.progressPercent}%` : ep.watched ? ' · Vu' : ''}</div>
                  </div>
                  <button type="button" class="phone-mini-action ${ep.downloaded ? 'is-emerald' : ''}" data-toggle-ep-dl="${activeShow.id}" data-ep-num="${ep.number}" aria-pressed="${ep.downloaded}" aria-label="${ep.downloaded ? 'Supprimer le téléchargement' : 'Télécharger'} épisode ${ep.number}">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
                      ep.downloaded
                        ? '<path d="M20 6 9 17l-5-5"/>'
                        : '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>'
                    }</svg>
                  </button>
                  <button type="button" class="phone-mini-action is-active" data-play-ep="${activeShow.id}" data-ep-num="${ep.number}" aria-label="Lire épisode ${ep.number}">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8z"/></svg>
                  </button>
                </div>`
                )
                .join('')}
            </div>
          </div>`;

        showOverlay.hidden = false;
        requestAnimationFrame(() => {
          showOverlay.classList.add('is-open');
        });
      } else {
        showOverlay.classList.remove('is-open');
        if (reducedMotion) {
          showOverlay.hidden = true;
        } else {
          showCloseTimer = window.setTimeout(() => {
            if (!state.activeShowId) {
              showOverlay.hidden = true;
            }
          }, 260);
        }
      }
    }

    // 9. Library Display & Sort ModalBottomSheet
    const sheet = document.getElementById('phone-sheet');
    const sheetBackdrop = document.getElementById('phone-sheet-backdrop');
    const sheetBody = document.getElementById('phone-display-sheet-body');
    const showSheet = state.activeTab === 'library' && state.displaySheetOpen;

    if (sheet && sheetBackdrop && sheetBody) {
      if (sheetCloseTimer !== null) {
        window.clearTimeout(sheetCloseTimer);
        sheetCloseTimer = null;
      }

      if (showSheet) {
        sheetBody.innerHTML = `
          <div class="sheet-section-title">Disposition</div>
          <div class="sheet-segmented-row" role="group" aria-label="Mode d'affichage">
            <button type="button" class="novay-chip" data-lib-display="comfortable" aria-pressed="${state.libraryDisplay === 'comfortable'}">Grille 2×2</button>
            <button type="button" class="novay-chip" data-lib-display="compact" aria-pressed="${state.libraryDisplay === 'compact'}">Compact 3×3</button>
            <button type="button" class="novay-chip" data-lib-display="list" aria-pressed="${state.libraryDisplay === 'list'}">Liste</button>
          </div>
          <div class="sheet-section-title">Trier par</div>
          <div class="sheet-sort-list" role="group" aria-label="Ordre de tri">
            <button type="button" class="sheet-sort-btn" data-lib-sort="recent" aria-pressed="${state.librarySort === 'recent'}">
              <span>Activité récente</span>
              ${state.librarySort === 'recent' ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>' : ''}
            </button>
            <button type="button" class="sheet-sort-btn" data-lib-sort="alpha" aria-pressed="${state.librarySort === 'alpha'}">
              <span>Alphabétique (A–Z)</span>
              ${state.librarySort === 'alpha' ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>' : ''}
            </button>
            <button type="button" class="sheet-sort-btn" data-lib-sort="unread" aria-pressed="${state.librarySort === 'unread'}">
              <span>Nouveaux épisodes</span>
              ${state.librarySort === 'unread' ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>' : ''}
            </button>
          </div>`;
        sheet.hidden = false;
        sheetBackdrop.hidden = false;
        requestAnimationFrame(() => {
          sheet.classList.add('is-open');
          sheetBackdrop.classList.add('is-open');
        });
      } else {
        sheet.classList.remove('is-open');
        sheetBackdrop.classList.remove('is-open');
        if (reducedMotion) {
          sheet.hidden = true;
          sheetBackdrop.hidden = true;
        } else {
          sheetCloseTimer = window.setTimeout(() => {
            if (!state.displaySheetOpen) {
              sheet.hidden = true;
              sheetBackdrop.hidden = true;
            }
          }, 260);
        }
      }
    }
  };

  const applyTheme = (theme: NovayAppState['theme']) => {
    document.documentElement.dataset.theme = theme;
    mascot?.setTheme(theme, state.phoneAccentPreset);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#151410' : '#f8f7f2');
    }
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      toggleBtn.setAttribute(
        'aria-label',
        theme === 'dark'
          ? 'Passer au thème clair'
          : 'Passer au thème sombre'
      );
    }
  };

  let playbackSeconds = RESUME_START_SECONDS;
  let playbackIntervalId: number | null = null;

  const updatePlaybackUi = () => {
    const resumeTime = document.getElementById('resume-time');
    const resumeFill = document.getElementById('resume-bar-fill');
    if (resumeTime) {
      resumeTime.textContent = `${formatPlaybackTime(playbackSeconds)} / ${formatPlaybackTime(RESUME_TOTAL_SECONDS)}`;
    }
    if (resumeFill) {
      resumeFill.style.width = `${getPlaybackProgressPercent(playbackSeconds)}%`;
    }
  };

  const syncSegmentedIndicators = () => {
    document.querySelectorAll<HTMLElement>('.segmented').forEach((group) => {
      const active = group.querySelector<HTMLElement>('.segmented-btn[aria-pressed="true"]');
      if (!active) return;
      group.style.setProperty('--seg-x', `${active.offsetLeft}px`);
      group.style.setProperty('--seg-w', `${active.offsetWidth}px`);
    });
  };

  const renderFeatures = () => {
    const langButtons = document.querySelectorAll<HTMLButtonElement>('[data-feature-lang]');
    langButtons.forEach((btn) => {
      const lang = btn.dataset.featureLang as 'VF' | 'VOSTFR';
      btn.setAttribute('aria-pressed', state.featureLanguage === lang ? 'true' : 'false');
    });
    const langNote = document.getElementById('feature-lang-note');
    if (langNote) {
      langNote.textContent =
        state.featureLanguage === 'VF'
          ? 'Piste audio française sélectionnée'
          : 'Voix originales · Sous-titres français';
    }

    const qualityButtons = document.querySelectorAll<HTMLButtonElement>('[data-quality-opt]');
    qualityButtons.forEach((btn) => {
      const q = btn.dataset.qualityOpt as VideoQuality;
      btn.setAttribute('aria-pressed', state.quality === q ? 'true' : 'false');
    });
    const qualityNote = document.getElementById('feature-quality-note');
    if (qualityNote) {
      qualityNote.textContent = getQualityDescription(state.quality);
    }

    syncSegmentedIndicators();

    const resumeWidget = document.getElementById('resume-widget');
    const resumeBtn = document.getElementById('resume-play-btn');
    if (resumeWidget && resumeBtn) {
      resumeWidget.classList.toggle('is-playing', state.resumePlaying);
      resumeBtn.setAttribute('aria-pressed', state.resumePlaying ? 'true' : 'false');
      resumeBtn.setAttribute(
        'aria-label',
        state.resumePlaying ? 'Mettre en pause la lecture' : 'Reprendre la lecture'
      );
      resumeBtn.innerHTML = state.resumePlaying
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8z"/></svg>';

      if (state.resumePlaying && playbackIntervalId === null) {
        playbackIntervalId = window.setInterval(() => {
          playbackSeconds =
            playbackSeconds >= RESUME_TOTAL_SECONDS
              ? RESUME_START_SECONDS
              : playbackSeconds + 1;
          updatePlaybackUi();
        }, 1000);
      } else if (!state.resumePlaying && playbackIntervalId !== null) {
        window.clearInterval(playbackIntervalId);
        playbackIntervalId = null;
      }
      updatePlaybackUi();
    }
  };

  const renderSteps = () => {
    const stepCards = document.querySelectorAll<HTMLButtonElement>('[data-step]');
    stepCards.forEach((card) => {
      const stepNum = Number(card.dataset.step);
      const done = state.completedSteps.includes(stepNum);
      card.setAttribute('aria-pressed', done ? 'true' : 'false');
    });

    const count = state.completedSteps.length;
    const isComplete = count === 3;
    const installSection = document.getElementById('installation');
    installSection?.classList.toggle('is-complete', isComplete);

    const progressLabel = document.getElementById('steps-progress');
    if (progressLabel) {
      progressLabel.textContent = isComplete
        ? '3/3 étapes validées — prêt à regarder'
        : `${count}/3 étapes validées`;
    }

    const progressFill = document.getElementById('steps-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${getInstallProgressPercent(state.completedSteps)}%`;
    }

    const completeBanner = document.getElementById('steps-complete-banner');
    if (completeBanner) {
      completeBanner.hidden = !isComplete;
    }
  };

  const renderFaq = () => {
    const items = document.querySelectorAll<HTMLElement>('[data-faq-index]');
    items.forEach((item) => {
      const idx = Number(item.dataset.faqIndex);
      const isOpen = state.openFaqIndex === idx;
      item.classList.toggle('is-open', isOpen);
      const trigger = item.querySelector<HTMLButtonElement>('.faq-trigger');
      if (trigger) {
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    });
  };

  // Initial render
  applyTheme(state.theme);
  renderPhone();
  renderFeatures();
  renderSteps();
  renderFaq();

  // Theme toggle with radial screen transition from button center
  const themeBtn = document.getElementById('theme-toggle');
  const triggerThemeToggle = () => {
    const commitThemeChange = () => {
      state = toggleTheme(state);
      applyTheme(state.theme);
      renderPhone();
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, state.theme);
      } catch {
        // Ignore storage failures
      }
    };

    const docWithTransition = document as Document & {
      startViewTransition?: (cb: () => void) => {
        ready: Promise<void>;
        finished: Promise<void>;
      };
    };

    if (
      reducedMotion ||
      !themeBtn ||
      typeof docWithTransition.startViewTransition !== 'function'
    ) {
      commitThemeChange();
      return;
    }

    const rect = themeBtn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const root = document.documentElement;
    root.style.setProperty('--theme-x', `${x.toFixed(1)}px`);
    root.style.setProperty('--theme-y', `${y.toFixed(1)}px`);
    root.style.setProperty('--theme-r', `${Math.ceil(endRadius)}px`);
    root.classList.add('is-theme-transitioning');

    const transition = docWithTransition.startViewTransition(() => {
      commitThemeChange();
    });

    transition.finished
      .catch(() => undefined)
      .finally(() => {
        root.classList.remove('is-theme-transitioning');
      });
  };

  themeBtn?.addEventListener('click', triggerThemeToggle);

  // Mobile navigation drawer
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const setMobileMenu = (open: boolean) => {
    state = { ...state, mobileMenuOpen: open };
    mobileMenuBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileDrawer?.classList.toggle('is-open', open);
    if (mobileDrawer) {
      mobileDrawer.hidden = !open;
    }
  };
  mobileMenuBtn?.addEventListener('click', () => {
    setMobileMenu(!state.mobileMenuOpen);
  });
  mobileDrawer?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMobileMenu(false));
  });

  // Phone search live input
  const browseSearchInput = document.getElementById(
    'phone-browse-search'
  ) as HTMLInputElement | null;
  browseSearchInput?.addEventListener('input', () => {
    state = setBrowseQuery(state, browseSearchInput.value);
    renderPhone();
  });

  // Phone interactions (event delegation for dynamic items)
  const phoneEl = document.getElementById('interactive-phone');
  const handlePhoneActivate = (target: HTMLElement) => {
    const tabBtn = target.closest<HTMLButtonElement>('[data-phone-tab]');
    if (tabBtn) {
      state = setPhoneTab(state, tabBtn.dataset.phoneTab as PhoneTab);
      renderPhone();
      return;
    }

    const jumpBtn = target.closest<HTMLButtonElement>('[data-jump-tab]');
    if (jumpBtn) {
      const nextTab = jumpBtn.dataset.jumpTab as PhoneTab;
      state = setPhoneTab(state, nextTab);
      renderPhone();
      if (nextTab === 'browse') {
        requestAnimationFrame(() => browseSearchInput?.focus());
      }
      return;
    }

    if (target.closest('#library-display-btn')) {
      state = toggleDisplaySheet(state);
      renderPhone();
      return;
    }

    const libFilterBtn = target.closest<HTMLButtonElement>('[data-lib-filter]');
    if (libFilterBtn) {
      state = setLibraryFilter(state, libFilterBtn.dataset.libFilter as LibraryFilter);
      renderPhone();
      return;
    }

    const refreshBtn = target.closest<HTMLButtonElement>('#updates-refresh-btn');
    if (refreshBtn) {
      refreshBtn.classList.remove('is-spinning');
      void refreshBtn.offsetWidth;
      refreshBtn.classList.add('is-spinning');
      state = refreshUpdatesFeed(state);
      renderPhone();
      showPhoneToast('Flux des nouveautés actualisé');
      return;
    }

    if (target.closest('#history-clear-btn')) {
      state = clearWatchHistory(state);
      renderPhone();
      showPhoneToast('Historique effacé');
      return;
    }

    const filterBtn = target.closest<HTMLButtonElement>('[data-lang-filter]');
    if (filterBtn) {
      state = setLanguageFilter(state, filterBtn.dataset.langFilter as LanguageFilter);
      renderPhone();
      return;
    }

    const genreBtn = target.closest<HTMLButtonElement>('[data-genre-chip]');
    if (genreBtn) {
      state = selectCollectionGenre(state, genreBtn.dataset.genreChip as CollectionGenre);
      renderPhone();
      return;
    }

    if (target.closest('#phone-sheet-close') || target.closest('#phone-sheet-backdrop')) {
      state = toggleDisplaySheet(state, false);
      renderPhone();
      return;
    }

    const displayBtn = target.closest<HTMLButtonElement>('[data-lib-display]');
    if (displayBtn) {
      state = setLibraryDisplay(state, displayBtn.dataset.libDisplay as LibraryDisplay);
      renderPhone();
      return;
    }

    const sortBtn = target.closest<HTMLButtonElement>('[data-lib-sort]');
    if (sortBtn) {
      state = setLibrarySort(state, sortBtn.dataset.libSort as LibrarySort);
      renderPhone();
      return;
    }

    if (target.closest('#show-back-btn')) {
      state = closeShowDetail(state);
      renderPhone();
      return;
    }

    const showLangBtn = target.closest<HTMLButtonElement>('[data-show-lang]');
    if (showLangBtn) {
      const lang = showLangBtn.dataset.showLang as 'VF' | 'VOSTFR';
      state = setActiveShowLang(state, lang);
      renderPhone();
      showPhoneToast(`Piste ${lang} sélectionnée`);
      return;
    }

    const favBtn = target.closest<HTMLButtonElement>('[data-toggle-fav]');
    if (favBtn && favBtn.dataset.toggleFav) {
      const id = favBtn.dataset.toggleFav;
      const before = state.catalog.find((entry) => entry.id === id)?.favorite ?? false;
      state = toggleFavoriteEntry(state, id);
      renderPhone();
      showPhoneToast(before ? 'Retiré de la bibliothèque' : 'Ajouté à la bibliothèque');
      return;
    }

    const epDlBtn = target.closest<HTMLButtonElement>('[data-toggle-ep-dl]');
    if (epDlBtn && epDlBtn.dataset.toggleEpDl) {
      const epNum = Number(epDlBtn.dataset.epNum);
      state = toggleEpisodeDownload(state, epDlBtn.dataset.toggleEpDl, epNum);
      renderPhone();
      showPhoneToast(`Épisode ${String(epNum).padStart(2, '0')} mis à jour`);
      return;
    }

    const dlBtn = target.closest<HTMLButtonElement>('[data-toggle-dl]');
    if (dlBtn && dlBtn.dataset.toggleDl) {
      const id = dlBtn.dataset.toggleDl;
      const before = state.catalog.find((entry) => entry.id === id)?.downloaded ?? false;
      state = toggleDownloadedEntry(state, id);
      renderPhone();
      showPhoneToast(before ? 'Supprimé du hors ligne' : 'Téléchargé hors ligne');
      return;
    }

    const playBtn = target.closest<HTMLElement>('[data-play-ep]');
    if (playBtn && playBtn.dataset.playEp) {
      const id = playBtn.dataset.playEp;
      const epNum = playBtn.dataset.epNum ? Number(playBtn.dataset.epNum) : undefined;
      const show = state.catalog.find((entry) => entry.id === id);
      state = playEpisodeEntry(state, id, epNum);
      renderPhone();
      if (show) {
        const targetEp = epNum ?? show.lastWatchedEpisode;
        showPhoneToast(
          `Lecture · ${show.title} (Ép. ${String(targetEp).padStart(2, '0')})`
        );
      }
      return;
    }

    if (target.closest('#more-offline-row')) {
      state = setLibraryFilter(setPhoneTab(state, 'library'), 'offline');
      renderPhone();
      return;
    }

    const presetBtn = target.closest<HTMLButtonElement>('[data-accent-preset]');
    if (presetBtn && presetBtn.dataset.accentPreset) {
      state = setPhoneAccentPreset(state, presetBtn.dataset.accentPreset as PhoneAccentPreset);
      mascot?.setTheme(state.theme, state.phoneAccentPreset);
      mascot?.pulseEmotion('excited', 1600);
      renderPhone();
      showPhoneToast('Palette appliquée');
      return;
    }

    if (target.closest('[data-toggle-wifi]')) {
      state = toggleWifiOnly(state);
      renderPhone();
      showPhoneToast(
        state.wifiOnly ? 'Téléchargement Wi-Fi uniquement activé' : 'Téléchargement 5G autorisé'
      );
      return;
    }

    if (target.closest('[data-toggle-page-theme]')) {
      triggerThemeToggle();
      return;
    }

    const openShowEl = target.closest<HTMLElement>('[data-open-show]');
    if (openShowEl && openShowEl.dataset.openShow) {
      state = openShowDetail(state, openShowEl.dataset.openShow);
      mascot?.pulseEmotion('happy', 1400);
      renderPhone();
    }
  };

  phoneEl?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (target) handlePhoneActivate(target);
  });

  phoneEl?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target as HTMLElement | null;
    if (!target || target.tagName === 'INPUT' || target.tagName === 'BUTTON') return;
    const interactiveCard = target.closest<HTMLElement>('[data-open-show]');
    if (interactiveCard) {
      event.preventDefault();
      handlePhoneActivate(interactiveCard);
    }
  });

  // Feature micro-controls
  document.querySelectorAll<HTMLButtonElement>('[data-feature-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state = setFeatureLanguage(state, btn.dataset.featureLang as 'VF' | 'VOSTFR');
      renderFeatures();
      triggerFeatureStrokeDraw('f0');
      mascot?.pulseEmotion('wink', 1600);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-quality-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state = setVideoQuality(state, btn.dataset.qualityOpt as VideoQuality);
      renderFeatures();
      renderPhone();
      triggerFeatureStrokeDraw('f1');
      mascot?.pulseEmotion('excited', 1500);
    });
  });

  document.getElementById('resume-play-btn')?.addEventListener('click', () => {
    state = { ...state, resumePlaying: !state.resumePlaying };
    renderFeatures();
    if (state.resumePlaying) {
      triggerFeatureStrokeDraw('f2');
      mascot?.pulseEmotion('happy', 1800);
    }
  });

  requestAnimationFrame(() => syncSegmentedIndicators());
  window.addEventListener('resize', syncSegmentedIndicators, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => syncSegmentedIndicators());
  }

  // Installation step checklist
  document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((card) => {
    card.addEventListener('click', () => {
      state = toggleInstallStep(state, Number(card.dataset.step));
      renderSteps();
      if (state.completedSteps.length === 3) {
        mascot?.pulseEmotion('excited', 2600, 'Prêt pour ton premier épisode !');
      } else {
        mascot?.pulseEmotion('happy', 1200);
      }
    });
  });

  // FAQ accordion
  document.querySelectorAll<HTMLButtonElement>('.faq-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const parent = btn.closest<HTMLElement>('[data-faq-index]');
      if (!parent) return;
      state = toggleFaqItem(state, Number(parent.dataset.faqIndex));
      renderFaq();
    });
  });

  // Scroll progress bar, sticky header border, and zero-stall reveal fallback
  const header = document.getElementById('site-header');
  const progressBar = document.getElementById('scroll-progress-bar');
  const revealEls = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav-links a'));
  const trackedSections = Array.from(
    document.querySelectorAll<HTMLElement>('section[id]')
  );

  const revealVisibleSections = () => {
    const triggerBottom = window.innerHeight + 120;
    revealEls.forEach((el) => {
      if (!el.classList.contains('is-visible')) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerBottom) {
          el.classList.add('is-visible');
        }
      }
    });
  };

  const promiseItems = Array.from(document.querySelectorAll<HTMLElement>('.promise-item'));

  const updateScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    header?.classList.toggle('is-scrolled', scrollTop > 12);
    if (header) {
      const blurPx = 12 + Math.min(10, (scrollTop / 420) * 10);
      header.style.setProperty('--header-blur', `${blurPx.toFixed(1)}px`);
    }

    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollTop / maxScroll)) : 0;
    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress.toFixed(4)})`;
    }

    if (!reducedMotion && promiseItems.length === 2) {
      const promiseRect = promiseItems[0].parentElement?.getBoundingClientRect();
      if (promiseRect) {
        const centerOffset =
          (promiseRect.top + promiseRect.height / 2 - window.innerHeight / 2) /
          window.innerHeight;
        const clamped = Math.max(-1, Math.min(1, centerOffset));
        promiseItems[0].style.setProperty('--promise-shift', `${(clamped * -8).toFixed(2)}px`);
        promiseItems[1].style.setProperty('--promise-shift', `${(clamped * 8).toFixed(2)}px`);
      }
    }

    revealVisibleSections();

    if (scrollTop < 220) {
      navLinks.forEach((link) => link.classList.remove('is-active'));
    } else {
      let activeId = '';
      trackedSections.forEach((sec) => {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.45 && rect.bottom >= 120) {
          activeId = sec.id;
        }
      });
      navLinks.forEach((link) => {
        link.classList.toggle(
          'is-active',
          activeId !== '' && link.getAttribute('href') === `#${activeId}`
        );
      });
    }
  };
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: '100px 0px 100px 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
