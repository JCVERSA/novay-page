import {
  COUNTDOWN_STEPS,
  CollectionGenre,
  LanguageFilter,
  NovayAppState,
  PhoneTab,
  RESUME_START_SECONDS,
  RESUME_TOTAL_SECONDS,
  VideoQuality,
  createInitialState,
  formatPlaybackTime,
  getFilteredCatalog,
  getGenreEntries,
  getGenreLabel,
  getInstallProgressPercent,
  getLoaderStepProgress,
  getOfflineCount,
  getPlaybackProgressPercent,
  getQualityDescription,
  resolveInitialTheme,
  selectCollectionGenre,
  setFeatureLanguage,
  setLanguageFilter,
  setPhoneTab,
  setVideoQuality,
  shouldSkipIntroLoader,
  toggleDownloadedEntry,
  toggleFaqItem,
  toggleFavoriteEntry,
  toggleInstallStep,
  toggleTheme,
} from './lib/novayState';

const THEME_STORAGE_KEY = 'novay-theme';

function startIntroCountdown(): void {
  const loaderEl = document.getElementById('page-loader');
  const countEl = document.getElementById('loader-count');
  const captionEl = document.getElementById('loader-caption');
  const skipBtn = document.getElementById('loader-skip');
  const dots = Array.from(document.querySelectorAll<HTMLElement>('[data-loader-dot]'));
  const root = document.documentElement;

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!loaderEl || shouldSkipIntroLoader(reducedMotion)) {
    root.dataset.loader = 'done';
    if (loaderEl) loaderEl.hidden = true;
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
  const rippleSelector =
    '.button, .step-card, .phone-nav-btn, .play-btn, .offline-banner, .mini-tile, .segmented-btn, .faq-trigger, .phone-sheet-cta';

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

function init(): void {
  document.documentElement.classList.add('js-enhanced');
  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  startIntroCountdown();
  attachRipples(reducedMotion);
  initPhoneTilt(reducedMotion);

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

  const applyTheme = (theme: NovayAppState['theme']) => {
    document.documentElement.dataset.theme = theme;
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

  let lastActiveTab: PhoneTab | null = null;

  const renderPhone = () => {
    const tabChanged = lastActiveTab !== null && lastActiveTab !== state.activeTab;
    lastActiveTab = state.activeTab;

    const tabButtons = document.querySelectorAll<HTMLButtonElement>('[data-phone-tab]');
    tabButtons.forEach((btn) => {
      const tab = btn.dataset.phoneTab as PhoneTab;
      const isActive = tab === state.activeTab;
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const screens = document.querySelectorAll<HTMLElement>('[data-phone-screen]');
    screens.forEach((screen) => {
      const name = screen.dataset.phoneScreen as PhoneTab;
      const isVisible = name === state.activeTab;
      screen.hidden = !isVisible;
      screen.classList.remove('is-m3-entering');
      if (isVisible && tabChanged) {
        void screen.offsetWidth;
        screen.classList.add('is-m3-entering');
      }
    });

    const subtitle = document.getElementById('phone-subtitle');
    if (subtitle) {
      if (state.activeTab === 'library') {
        subtitle.textContent = 'Ton prochain épisode t’attend.';
      } else if (state.activeTab === 'catalog') {
        subtitle.textContent = 'Explore en VF ou VOSTFR.';
      } else {
        subtitle.textContent = 'Regarde sans connexion.';
      }
    }

    // Highlight selected genre tiles in Library view
    const genreTiles = document.querySelectorAll<HTMLButtonElement>('[data-genre-tile]');
    genreTiles.forEach((tile) => {
      const genre = tile.dataset.genreTile as CollectionGenre;
      tile.classList.toggle('is-selected', state.selectedGenre === genre);
      tile.setAttribute(
        'aria-pressed',
        state.selectedGenre === genre ? 'true' : 'false'
      );
    });

    // Update Library offline summary banner
    const offlineSummaryText = document.getElementById('library-offline-count');
    if (offlineSummaryText) {
      const count = getOfflineCount(state);
      offlineSummaryText.textContent =
        count > 0
          ? `${count} épisode${count > 1 ? 's' : ''} prêt${count > 1 ? 's' : ''} hors ligne`
          : 'Emporte tes épisodes avec toi';
    }

    // Render Library Genre Bottom Sheet inside phone
    const sheet = document.getElementById('phone-sheet');
    const sheetBackdrop = document.getElementById('phone-sheet-backdrop');
    const sheetTitle = document.getElementById('phone-sheet-title');
    const sheetList = document.getElementById('phone-sheet-list');
    const showSheet = state.activeTab === 'library' && state.selectedGenre !== null;

    if (sheet && sheetBackdrop && sheetTitle && sheetList) {
      if (showSheet && state.selectedGenre) {
        const genreEntries = getGenreEntries(state);
        sheetTitle.textContent = getGenreLabel(state.selectedGenre);
        sheetList.innerHTML = genreEntries
          .map(
            (item) => `
          <div class="phone-item">
            <div>
              <div class="phone-item-title">${item.title}</div>
              <div class="phone-item-meta">${item.episode} · ${item.languages.join(' / ')}</div>
            </div>
            <div class="phone-item-actions">
              <button type="button" class="phone-mini-icon-btn" data-toggle-fav="${item.id}" aria-pressed="${item.favorite}" aria-label="${item.favorite ? 'Retirer' : 'Ajouter'} ${item.title} aux favoris">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="${item.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </button>
              <button type="button" class="phone-mini-icon-btn" data-toggle-dl="${item.id}" aria-pressed="${item.downloaded}" aria-label="${item.downloaded ? 'Supprimer le téléchargement de' : 'Télécharger'} ${item.title}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
                  item.downloaded
                    ? '<path d="M20 6 9 17l-5-5"/>'
                    : '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>'
                }</svg>
              </button>
            </div>
          </div>`
          )
          .join('');
        sheet.hidden = false;
        sheetBackdrop.hidden = false;
        requestAnimationFrame(() => {
          sheet.classList.add('is-open');
          sheetBackdrop.classList.add('is-open');
        });
      } else {
        sheet.classList.remove('is-open');
        sheetBackdrop.classList.remove('is-open');
        sheet.hidden = true;
        sheetBackdrop.hidden = true;
      }
    }

    // Update Catalog filter buttons
    const filterButtons = document.querySelectorAll<HTMLButtonElement>('[data-lang-filter]');
    filterButtons.forEach((btn) => {
      const filter = btn.dataset.langFilter as LanguageFilter;
      btn.setAttribute('aria-pressed', state.languageFilter === filter ? 'true' : 'false');
    });

    // Render Catalog items
    const catalogList = document.getElementById('phone-catalog-list');
    if (catalogList) {
      const entries = getFilteredCatalog(state);
      catalogList.innerHTML = entries
        .map(
          (item) => `
          <div class="phone-item">
            <div>
              <div class="phone-item-title">${item.title}</div>
              <div class="phone-item-meta">${item.episode} · ${item.languages.join(' / ')}</div>
            </div>
            <div class="phone-item-actions">
              <button type="button" class="phone-mini-icon-btn" data-toggle-fav="${item.id}" aria-pressed="${item.favorite}" aria-label="${item.favorite ? 'Retirer' : 'Ajouter'} ${item.title} aux favoris">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="${item.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </button>
              <button type="button" class="phone-mini-icon-btn" data-toggle-dl="${item.id}" aria-pressed="${item.downloaded}" aria-label="${item.downloaded ? 'Supprimer le téléchargement de' : 'Télécharger'} ${item.title}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
                  item.downloaded
                    ? '<path d="M20 6 9 17l-5-5"/>'
                    : '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>'
                }</svg>
              </button>
            </div>
          </div>`
        )
        .join('');
    }

    // Render Offline queue
    const offlineCountBadge = document.getElementById('phone-offline-total');
    if (offlineCountBadge) {
      const count = getOfflineCount(state);
      offlineCountBadge.textContent = `${count}/${state.catalog.length} prêts`;
    }

    const offlineList = document.getElementById('phone-offline-list');
    if (offlineList) {
      offlineList.innerHTML = state.catalog
        .map(
          (item) => `
          <div class="phone-item">
            <div>
              <div class="phone-item-title">${item.title}</div>
              <div class="phone-item-meta">${item.episode} · ${item.duration} · ${state.quality}</div>
            </div>
            <button type="button" class="phone-mini-icon-btn" data-toggle-dl="${item.id}" aria-pressed="${item.downloaded}" aria-label="${item.downloaded ? 'Retirer du mode hors ligne' : 'Télécharger hors ligne'} : ${item.title}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
                item.downloaded
                  ? '<path d="M20 6 9 17l-5-5"/>'
                  : '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>'
              }</svg>
            </button>
          </div>`
        )
        .join('');
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
  themeBtn?.addEventListener('click', () => {
    const commitThemeChange = () => {
      state = toggleTheme(state);
      applyTheme(state.theme);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, state.theme);
      } catch {
        // Ignore storage failures
      }
    };

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const docWithTransition = document as Document & {
      startViewTransition?: (cb: () => void) => {
        ready: Promise<void>;
        finished: Promise<void>;
      };
    };

    if (reducedMotion || typeof docWithTransition.startViewTransition !== 'function') {
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
  });

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

  // Phone interactions (event delegation for dynamic items)
  const phoneEl = document.getElementById('interactive-phone');
  phoneEl?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const tabBtn = target.closest<HTMLButtonElement>('[data-phone-tab]');
    if (tabBtn) {
      state = setPhoneTab(state, tabBtn.dataset.phoneTab as PhoneTab);
      renderPhone();
      return;
    }

    const jumpBtn = target.closest<HTMLButtonElement>('[data-jump-tab]');
    if (jumpBtn) {
      state = setPhoneTab(state, jumpBtn.dataset.jumpTab as PhoneTab);
      renderPhone();
      return;
    }

    const genreBtn = target.closest<HTMLButtonElement>('[data-genre-tile]');
    if (genreBtn) {
      state = selectCollectionGenre(
        state,
        genreBtn.dataset.genreTile as CollectionGenre
      );
      renderPhone();
      return;
    }

    const closeSheetBtn = target.closest('#phone-sheet-close');
    const sheetBackdrop = target.closest('#phone-sheet-backdrop');
    if (closeSheetBtn || sheetBackdrop) {
      state = selectCollectionGenre(state, null);
      renderPhone();
      return;
    }

    const sheetCatalogBtn = target.closest('#phone-sheet-catalog-btn');
    if (sheetCatalogBtn) {
      state = setPhoneTab(state, 'catalog');
      renderPhone();
      return;
    }

    const filterBtn = target.closest<HTMLButtonElement>('[data-lang-filter]');
    if (filterBtn) {
      state = setLanguageFilter(
        state,
        filterBtn.dataset.langFilter as LanguageFilter
      );
      renderPhone();
      return;
    }

    const favBtn = target.closest<HTMLButtonElement>('[data-toggle-fav]');
    if (favBtn && favBtn.dataset.toggleFav) {
      state = toggleFavoriteEntry(state, favBtn.dataset.toggleFav);
      renderPhone();
      return;
    }

    const dlBtn = target.closest<HTMLButtonElement>('[data-toggle-dl]');
    if (dlBtn && dlBtn.dataset.toggleDl) {
      state = toggleDownloadedEntry(state, dlBtn.dataset.toggleDl);
      renderPhone();
    }
  });

  // Feature micro-controls
  document.querySelectorAll<HTMLButtonElement>('[data-feature-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state = setFeatureLanguage(state, btn.dataset.featureLang as 'VF' | 'VOSTFR');
      renderFeatures();
      triggerFeatureStrokeDraw('f0');
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-quality-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state = setVideoQuality(state, btn.dataset.qualityOpt as VideoQuality);
      renderFeatures();
      renderPhone();
      triggerFeatureStrokeDraw('f1');
    });
  });

  document.getElementById('resume-play-btn')?.addEventListener('click', () => {
    state = { ...state, resumePlaying: !state.resumePlaying };
    renderFeatures();
    if (state.resumePlaying) {
      triggerFeatureStrokeDraw('f2');
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
