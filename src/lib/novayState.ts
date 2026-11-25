export type ThemeMode = 'light' | 'dark';
export type PhoneTab = 'library' | 'catalog' | 'offline';
export type LanguageFilter = 'all' | 'VF' | 'VOSTFR';
export type VideoQuality = '1080p' | '720p' | '480p';
export type CollectionGenre = 'aventure' | 'fantastique' | 'decouverte';

export interface CatalogEntry {
  id: string;
  title: string;
  episode: string;
  languages: ('VF' | 'VOSTFR')[];
  genre: CollectionGenre;
  favorite: boolean;
  downloaded: boolean;
  duration: string;
}

export interface NovayAppState {
  theme: ThemeMode;
  activeTab: PhoneTab;
  languageFilter: LanguageFilter;
  selectedGenre: CollectionGenre | null;
  featureLanguage: 'VF' | 'VOSTFR';
  quality: VideoQuality;
  resumePlaying: boolean;
  completedSteps: number[];
  openFaqIndex: number | null;
  mobileMenuOpen: boolean;
  catalog: CatalogEntry[];
}

export const INITIAL_CATALOG: CatalogEntry[] = [
  {
    id: 'l-eveil-du-vent',
    title: 'L’Éveil du Vent',
    episode: 'Ép. 12',
    languages: ['VF', 'VOSTFR'],
    genre: 'aventure',
    favorite: true,
    downloaded: true,
    duration: '24 min',
  },
  {
    id: 'chroniques-d-aube',
    title: 'Chroniques d’Aube',
    episode: 'Ép. 08',
    languages: ['VF'],
    genre: 'fantastique',
    favorite: false,
    downloaded: true,
    duration: '23 min',
  },
  {
    id: 'horizons-lointains',
    title: 'Horizons Lointains',
    episode: 'Ép. 04',
    languages: ['VOSTFR'],
    genre: 'decouverte',
    favorite: true,
    downloaded: false,
    duration: '25 min',
  },
  {
    id: 'sentiers-d-ombre',
    title: 'Sentiers d’Ombre',
    episode: 'Ép. 19',
    languages: ['VF', 'VOSTFR'],
    genre: 'fantastique',
    favorite: false,
    downloaded: false,
    duration: '24 min',
  },
];

export function createInitialState(theme: ThemeMode = 'light'): NovayAppState {
  return {
    theme,
    activeTab: 'library',
    languageFilter: 'all',
    selectedGenre: null,
    featureLanguage: 'VF',
    quality: '720p',
    resumePlaying: false,
    completedSteps: [],
    openFaqIndex: 0,
    mobileMenuOpen: false,
    catalog: INITIAL_CATALOG.map((item) => ({ ...item, languages: [...item.languages] })),
  };
}

export function resolveInitialTheme(
  storedTheme: string | null | undefined,
  prefersDark: boolean
): ThemeMode {
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }
  return prefersDark ? 'dark' : 'light';
}

export function toggleTheme(state: NovayAppState): NovayAppState {
  return {
    ...state,
    theme: state.theme === 'light' ? 'dark' : 'light',
  };
}

export function setPhoneTab(state: NovayAppState, tab: PhoneTab): NovayAppState {
  return {
    ...state,
    activeTab: tab,
  };
}

export function setLanguageFilter(
  state: NovayAppState,
  filter: LanguageFilter
): NovayAppState {
  return {
    ...state,
    languageFilter: filter,
  };
}

export function selectCollectionGenre(
  state: NovayAppState,
  genre: CollectionGenre | null
): NovayAppState {
  return {
    ...state,
    selectedGenre: state.selectedGenre === genre ? null : genre,
  };
}

export function toggleFavoriteEntry(
  state: NovayAppState,
  entryId: string
): NovayAppState {
  return {
    ...state,
    catalog: state.catalog.map((item) =>
      item.id === entryId ? { ...item, favorite: !item.favorite } : item
    ),
  };
}

export function toggleDownloadedEntry(
  state: NovayAppState,
  entryId: string
): NovayAppState {
  return {
    ...state,
    catalog: state.catalog.map((item) =>
      item.id === entryId ? { ...item, downloaded: !item.downloaded } : item
    ),
  };
}

export function getFilteredCatalog(state: NovayAppState): CatalogEntry[] {
  return state.catalog.filter((item) => {
    const matchesLanguage =
      state.languageFilter === 'all' || item.languages.includes(state.languageFilter);
    const matchesGenre =
      state.selectedGenre === null || item.genre === state.selectedGenre;
    return matchesLanguage && matchesGenre;
  });
}

export function getOfflineCount(state: NovayAppState): number {
  return state.catalog.filter((item) => item.downloaded).length;
}

export function setFeatureLanguage(
  state: NovayAppState,
  lang: 'VF' | 'VOSTFR'
): NovayAppState {
  return {
    ...state,
    featureLanguage: lang,
  };
}

export function setVideoQuality(
  state: NovayAppState,
  quality: VideoQuality
): NovayAppState {
  return {
    ...state,
    quality,
  };
}

export function getQualityDescription(quality: VideoQuality): string {
  switch (quality) {
    case '1080p':
      return 'Full HD · Netteté maximale sur grand écran';
    case '720p':
      return 'HD · Équilibre idéal entre netteté et espace';
    case '480p':
      return 'Éco · Téléchargement rapide, léger hors ligne';
  }
}

export function toggleInstallStep(
  state: NovayAppState,
  stepNumber: number
): NovayAppState {
  const exists = state.completedSteps.includes(stepNumber);
  const completedSteps = exists
    ? state.completedSteps.filter((s) => s !== stepNumber)
    : [...state.completedSteps, stepNumber].sort((a, b) => a - b);
  return {
    ...state,
    completedSteps,
  };
}

export function toggleFaqItem(
  state: NovayAppState,
  index: number
): NovayAppState {
  return {
    ...state,
    openFaqIndex: state.openFaqIndex === index ? null : index,
  };
}

export const COUNTDOWN_STEPS = [3, 2, 1] as const;

export type LoaderPhase = 'counting' | 'revealing' | 'done';

export function getLoaderStepProgress(
  stepIndex: number,
  totalSteps: number = COUNTDOWN_STEPS.length
): number {
  if (totalSteps <= 0) return 1;
  const clamped = Math.min(Math.max(stepIndex + 1, 0), totalSteps);
  return Number((clamped / totalSteps).toFixed(4));
}

export function shouldSkipIntroLoader(reducedMotion: boolean): boolean {
  return reducedMotion;
}

export const RESUME_START_SECONDS = 18 * 60 + 42;
export const RESUME_TOTAL_SECONDS = 23 * 60 + 50;

export function formatPlaybackTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getPlaybackProgressPercent(
  currentSeconds: number,
  totalSeconds: number = RESUME_TOTAL_SECONDS
): number {
  if (totalSeconds <= 0) return 0;
  const clamped = Math.min(Math.max(currentSeconds, 0), totalSeconds);
  return Number(((clamped / totalSeconds) * 100).toFixed(2));
}

export function getGenreEntries(state: NovayAppState): CatalogEntry[] {
  if (!state.selectedGenre) return [];
  return state.catalog.filter((item) => item.genre === state.selectedGenre);
}

export function getGenreLabel(genre: CollectionGenre): string {
  switch (genre) {
    case 'aventure':
      return 'Aventure';
    case 'fantastique':
      return 'Fantastique';
    case 'decouverte':
      return 'Découverte';
  }
}

export function getInstallProgressPercent(completedSteps: number[]): number {
  const uniqueCount = new Set(completedSteps.filter((s) => s >= 1 && s <= 3)).size;
  return Number(((uniqueCount / 3) * 100).toFixed(2));
}


