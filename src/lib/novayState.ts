export type PosterKey =
  | 'tokyo-revengers'
  | 'black-clover'
  | 'blue-box'
  | 'bleach'
  | 'tougen-anki'
  | 'ao-ashi';
export type ThemeMode = 'light' | 'dark';
export type PhoneTab = 'library' | 'updates' | 'history' | 'browse' | 'more';
export type LanguageFilter = 'all' | 'VF' | 'VOSTFR';
export type LibraryFilter = 'all' | 'VF' | 'VOSTFR' | 'offline';
export type LibraryDisplay = 'comfortable' | 'compact' | 'list';
export type LibrarySort = 'recent' | 'alpha' | 'unread';
export type PhoneAccentPreset = 'noir_crimson' | 'midnight_slate' | 'warm_amber';
export type VideoQuality = '1080p' | '720p' | '480p';
export type CollectionGenre = 'aventure' | 'fantastique' | 'decouverte';

export interface AnimeEpisodeEntry {
  number: number;
  title: string;
  duration: string;
  downloaded: boolean;
  watched: boolean;
  progressPercent: number;
}

export interface CatalogEntry {
  id: string;
  title: string;
  posterKey: PosterKey;
  fallbackGradient: string;
  year: string;
  format: string;
  synopsis: string;
  episode: string;
  languages: ('VF' | 'VOSTFR')[];
  genre: CollectionGenre;
  favorite: boolean;
  downloaded: boolean;
  newEpisodes: number;
  duration: string;
  watchProgress: number;
  lastWatchedEpisode: number;
  lastWatchedDay: 'Aujourd’hui' | 'Hier' | 'Cette semaine' | null;
  lastWatchedTime: string;
  updateAgo: string;
  episodes: AnimeEpisodeEntry[];
}

export interface NovayAppState {
  theme: ThemeMode;
  activeTab: PhoneTab;
  activeShowId: string | null;
  activeShowLang: 'VF' | 'VOSTFR';
  languageFilter: LanguageFilter;
  libraryFilter: LibraryFilter;
  libraryDisplay: LibraryDisplay;
  librarySort: LibrarySort;
  displaySheetOpen: boolean;
  browseQuery: string;
  selectedGenre: CollectionGenre | null;
  phoneAccentPreset: PhoneAccentPreset;
  wifiOnly: boolean;
  featureLanguage: 'VF' | 'VOSTFR';
  quality: VideoQuality;
  resumePlaying: boolean;
  completedSteps: number[];
  openFaqIndex: number | null;
  mobileMenuOpen: boolean;
  historyCleared: boolean;
  updatesCheckedAt: number;
  catalog: CatalogEntry[];
}

export const INITIAL_CATALOG: CatalogEntry[] = [
  {
    id: 'tokyo-revengers',
    title: 'Tokyo Revengers',
    posterKey: 'tokyo-revengers',
    fallbackGradient: 'linear-gradient(155deg, #1b1724 0%, #5b2333 55%, #e11d48 100%)',
    year: '2023',
    format: 'Série TV',
    synopsis:
      'À 26 ans, Takemichi est ramené 12 ans en arrière après un accident. Pour sauver Hinata du Tokyo Manji-kai, il doit changer le passé et gravir les rangs du gang.',
    episode: 'Ép. 12',
    languages: ['VF', 'VOSTFR'],
    genre: 'aventure',
    favorite: true,
    downloaded: true,
    newEpisodes: 2,
    duration: '24 min',
    watchProgress: 78,
    lastWatchedEpisode: 12,
    lastWatchedDay: 'Aujourd’hui',
    lastWatchedTime: '21:14',
    updateAgo: 'Il y a 2 h',
    episodes: [
      { number: 12, title: 'Revenge', duration: '24:05', downloaded: true, watched: false, progressPercent: 78 },
      { number: 11, title: 'Rendez-vous sous la pluie', duration: '23:50', downloaded: true, watched: true, progressPercent: 100 },
      { number: 10, title: 'Bloody Halloween', duration: '24:12', downloaded: false, watched: true, progressPercent: 100 },
    ],
  },
  {
    id: 'black-clover',
    title: 'Black Clover',
    posterKey: 'black-clover',
    fallbackGradient: 'linear-gradient(155deg, #12151f 0%, #3d2c1b 58%, #d97706 100%)',
    year: '2021',
    format: 'Série TV',
    synopsis:
      'Asta et Yuno ont grandi ensemble avec un même rêve : devenir le prochain Empereur-Mage. Sans la moindre étincelle de magie, Asta brandit un grimoire d’antimagie.',
    episode: 'Ép. 170',
    languages: ['VF', 'VOSTFR'],
    genre: 'fantastique',
    favorite: true,
    downloaded: true,
    newEpisodes: 1,
    duration: '23 min',
    watchProgress: 46,
    lastWatchedEpisode: 170,
    lastWatchedDay: 'Hier',
    lastWatchedTime: '19:40',
    updateAgo: 'Hier · 18:00',
    episodes: [
      { number: 170, title: 'Un avenir lointain', duration: '23:40', downloaded: true, watched: false, progressPercent: 46 },
      { number: 169, title: 'Le rituel d’union démoniaque', duration: '23:35', downloaded: false, watched: true, progressPercent: 100 },
      { number: 168, title: 'L’éveil du Taureau Noir', duration: '23:50', downloaded: false, watched: true, progressPercent: 100 },
    ],
  },
  {
    id: 'blue-box',
    title: 'Blue Box',
    posterKey: 'blue-box',
    fallbackGradient: 'linear-gradient(155deg, #0f2035 0%, #1d4ed8 55%, #38bdf8 100%)',
    year: '2025',
    format: 'Série TV',
    synopsis:
      'Taiki Inomata, joueur de badminton au lycée Eimei, s’entraîne chaque matin au gymnase aux côtés de Chinatsu Kano, étoile du club de basketball.',
    episode: 'Ép. 25',
    languages: ['VF', 'VOSTFR'],
    genre: 'decouverte',
    favorite: true,
    downloaded: false,
    newEpisodes: 0,
    duration: '24 min',
    watchProgress: 92,
    lastWatchedEpisode: 25,
    lastWatchedDay: 'Cette semaine',
    lastWatchedTime: 'Lun · 22:05',
    updateAgo: 'Il y a 3 j',
    episodes: [
      { number: 25, title: 'Même si ça doit arriver', duration: '24:10', downloaded: false, watched: false, progressPercent: 92 },
      { number: 24, title: 'Un matin d’hiver', duration: '24:00', downloaded: false, watched: true, progressPercent: 100 },
    ],
  },
  {
    id: 'bleach',
    title: 'Bleach TYBW',
    posterKey: 'bleach',
    fallbackGradient: 'linear-gradient(155deg, #09090d 0%, #27272f 55%, #fb3758 100%)',
    year: '2024',
    format: 'Série TV',
    synopsis:
      'La paix de la Soul Society vole en éclats lorsque le Wandenreich lance son assaut. Ichigo Kurosaki reprend son Zanpakutō pour défendre le monde des vivants.',
    episode: 'Ép. 40',
    languages: ['VF'],
    genre: 'fantastique',
    favorite: true,
    downloaded: false,
    newEpisodes: 0,
    duration: '24 min',
    watchProgress: 0,
    lastWatchedEpisode: 40,
    lastWatchedDay: null,
    lastWatchedTime: '',
    updateAgo: 'Il y a 4 j',
    episodes: [
      { number: 40, title: 'Mon ultime combat', duration: '24:15', downloaded: false, watched: false, progressPercent: 0 },
      { number: 39, title: 'La réponse visible', duration: '24:05', downloaded: false, watched: false, progressPercent: 0 },
    ],
  },
  {
    id: 'tougen-anki',
    title: 'Tougen Anki',
    posterKey: 'tougen-anki',
    fallbackGradient: 'linear-gradient(155deg, #0d161a 0%, #4b101d 55%, #dc2626 100%)',
    year: '2025',
    format: 'Série TV',
    synopsis:
      'Shiki Ichinose découvre qu’il hérite du sang des Oni lorsque l’organisation Momotarou attaque son foyer, l’entraînant dans une guerre séculaire.',
    episode: 'Ép. 11',
    languages: ['VOSTFR'],
    genre: 'fantastique',
    favorite: false,
    downloaded: false,
    newEpisodes: 0,
    duration: '24 min',
    watchProgress: 0,
    lastWatchedEpisode: 11,
    lastWatchedDay: null,
    lastWatchedTime: '',
    updateAgo: 'Il y a 5 j',
    episodes: [
      { number: 11, title: 'Le sang écarlate', duration: '24:00', downloaded: false, watched: false, progressPercent: 0 },
      { number: 10, title: 'L’héritage des Oni', duration: '23:55', downloaded: false, watched: false, progressPercent: 0 },
    ],
  },
  {
    id: 'ao-ashi',
    title: 'Ao Ashi',
    posterKey: 'ao-ashi',
    fallbackGradient: 'linear-gradient(155deg, #102136 0%, #0369a1 55%, #facc15 100%)',
    year: '2024',
    format: 'Série TV',
    synopsis:
      'Ashito Aoi, jeune attaquant au tempérament de feu, est repéré par un entraîneur qui lui ouvre les portes du centre de formation de Tokyo Esperion.',
    episode: 'Ép. 24',
    languages: ['VF', 'VOSTFR'],
    genre: 'aventure',
    favorite: false,
    downloaded: false,
    newEpisodes: 0,
    duration: '24 min',
    watchProgress: 0,
    lastWatchedEpisode: 24,
    lastWatchedDay: null,
    lastWatchedTime: '',
    updateAgo: 'Il y a 6 j',
    episodes: [
      { number: 24, title: 'À partir de maintenant', duration: '24:20', downloaded: false, watched: false, progressPercent: 0 },
      { number: 23, title: 'Vision périphérique', duration: '24:10', downloaded: false, watched: false, progressPercent: 0 },
    ],
  },
];

export const PHONE_TABS: readonly PhoneTab[] = [
  'library',
  'updates',
  'history',
  'browse',
  'more',
] as const;

export function createInitialState(theme: ThemeMode = 'light'): NovayAppState {
  return {
    theme,
    activeTab: 'library',
    activeShowId: null,
    activeShowLang: 'VF',
    languageFilter: 'all',
    libraryFilter: 'all',
    libraryDisplay: 'comfortable',
    librarySort: 'recent',
    displaySheetOpen: false,
    browseQuery: '',
    selectedGenre: null,
    phoneAccentPreset: 'noir_crimson',
    wifiOnly: true,
    featureLanguage: 'VF',
    quality: '720p',
    resumePlaying: false,
    completedSteps: [],
    openFaqIndex: 0,
    mobileMenuOpen: false,
    historyCleared: false,
    updatesCheckedAt: 0,
    catalog: INITIAL_CATALOG.map((item) => ({
      ...item,
      languages: [...item.languages],
      episodes: item.episodes.map((ep) => ({ ...ep })),
    })),
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
    activeShowId: null,
    displaySheetOpen: false,
  };
}

export function openShowDetail(state: NovayAppState, showId: string): NovayAppState {
  const show = state.catalog.find((entry) => entry.id === showId);
  if (!show) return state;
  const preferredLang = show.languages.includes(state.featureLanguage)
    ? state.featureLanguage
    : show.languages[0];
  return {
    ...state,
    activeShowId: showId,
    activeShowLang: preferredLang,
    displaySheetOpen: false,
  };
}

export function closeShowDetail(state: NovayAppState): NovayAppState {
  return {
    ...state,
    activeShowId: null,
  };
}

export function setActiveShowLang(
  state: NovayAppState,
  lang: 'VF' | 'VOSTFR'
): NovayAppState {
  return {
    ...state,
    activeShowLang: lang,
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

export function setLibraryFilter(
  state: NovayAppState,
  filter: LibraryFilter
): NovayAppState {
  return {
    ...state,
    libraryFilter: filter,
  };
}

export function setLibraryDisplay(
  state: NovayAppState,
  display: LibraryDisplay
): NovayAppState {
  return {
    ...state,
    libraryDisplay: display,
  };
}

export function setLibrarySort(
  state: NovayAppState,
  sort: LibrarySort
): NovayAppState {
  return {
    ...state,
    librarySort: sort,
    displaySheetOpen: false,
  };
}

export function toggleDisplaySheet(
  state: NovayAppState,
  open?: boolean
): NovayAppState {
  return {
    ...state,
    displaySheetOpen: open ?? !state.displaySheetOpen,
  };
}

export function setBrowseQuery(state: NovayAppState, query: string): NovayAppState {
  return {
    ...state,
    browseQuery: query,
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

export function setPhoneAccentPreset(
  state: NovayAppState,
  preset: PhoneAccentPreset
): NovayAppState {
  return {
    ...state,
    phoneAccentPreset: preset,
  };
}

export function toggleWifiOnly(state: NovayAppState): NovayAppState {
  return {
    ...state,
    wifiOnly: !state.wifiOnly,
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
    catalog: state.catalog.map((item) => {
      if (item.id !== entryId) return item;
      const nextDownloaded = !item.downloaded;
      return {
        ...item,
        downloaded: nextDownloaded,
        episodes: item.episodes.map((ep, index) =>
          index === 0 ? { ...ep, downloaded: nextDownloaded } : ep
        ),
      };
    }),
  };
}

export function toggleEpisodeDownload(
  state: NovayAppState,
  entryId: string,
  episodeNumber: number
): NovayAppState {
  return {
    ...state,
    catalog: state.catalog.map((item) => {
      if (item.id !== entryId) return item;
      const episodes = item.episodes.map((ep) =>
        ep.number === episodeNumber ? { ...ep, downloaded: !ep.downloaded } : ep
      );
      return {
        ...item,
        downloaded: episodes.some((ep) => ep.downloaded),
        episodes,
      };
    }),
  };
}

export function playEpisodeEntry(
  state: NovayAppState,
  entryId: string,
  episodeNumber?: number
): NovayAppState {
  return {
    ...state,
    historyCleared: false,
    catalog: state.catalog.map((item) => {
      if (item.id !== entryId) return item;
      const targetEp = episodeNumber ?? item.lastWatchedEpisode;
      const nextProgress = item.watchProgress >= 95 ? 24 : Math.min(96, Math.max(18, item.watchProgress + 12));
      return {
        ...item,
        episode: `Ép. ${String(targetEp).padStart(2, '0')}`,
        lastWatchedEpisode: targetEp,
        lastWatchedDay: 'Aujourd’hui',
        lastWatchedTime: 'À l’instant',
        watchProgress: nextProgress,
        newEpisodes: 0,
        episodes: item.episodes.map((ep) =>
          ep.number === targetEp ? { ...ep, progressPercent: nextProgress } : ep
        ),
      };
    }),
  };
}

export function clearWatchHistory(state: NovayAppState): NovayAppState {
  return {
    ...state,
    historyCleared: true,
  };
}

export function refreshUpdatesFeed(state: NovayAppState): NovayAppState {
  return {
    ...state,
    updatesCheckedAt: state.updatesCheckedAt + 1,
  };
}

export function getLibraryItems(state: NovayAppState): CatalogEntry[] {
  const inLib = state.catalog.filter((item) => item.favorite);
  const filtered = inLib.filter((item) => {
    if (state.libraryFilter === 'VF') return item.languages.includes('VF');
    if (state.libraryFilter === 'VOSTFR') return item.languages.includes('VOSTFR');
    if (state.libraryFilter === 'offline') return getEntryDownloadedCount(item) > 0;
    return true;
  });

  const sorted = [...filtered];
  if (state.librarySort === 'alpha') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  } else if (state.librarySort === 'unread') {
    sorted.sort((a, b) => b.newEpisodes - a.newEpisodes || a.title.localeCompare(b.title, 'fr'));
  }
  return sorted;
}

export function getEntryDownloadedCount(entry: CatalogEntry): number {
  const epCount = entry.episodes.filter((ep) => ep.downloaded).length;
  if (epCount > 0) return epCount;
  return entry.downloaded ? 1 : 0;
}

export function getTotalNewEpisodes(state: NovayAppState): number {
  return state.catalog
    .filter((item) => item.favorite)
    .reduce((sum, item) => sum + item.newEpisodes, 0);
}

export function getLatestResumeEntry(state: NovayAppState): CatalogEntry | null {
  if (state.historyCleared) return null;
  const libraryResume = state.catalog.find(
    (item) => item.favorite && item.lastWatchedDay !== null
  );
  return (
    libraryResume ??
    state.catalog.find((item) => item.lastWatchedDay !== null) ??
    null
  );
}

export function getHistoryGroups(
  state: NovayAppState
): { day: string; entries: CatalogEntry[] }[] {
  if (state.historyCleared) return [];
  const order: ('Aujourd’hui' | 'Hier' | 'Cette semaine')[] = [
    'Aujourd’hui',
    'Hier',
    'Cette semaine',
  ];
  return order
    .map((day) => ({
      day,
      entries: state.catalog.filter((item) => item.lastWatchedDay === day),
    }))
    .filter((group) => group.entries.length > 0);
}

export function getUpdatesEntries(state: NovayAppState): CatalogEntry[] {
  return state.catalog.filter((item) => item.favorite && item.newEpisodes > 0);
}

export function getFilteredCatalog(state: NovayAppState): CatalogEntry[] {
  const query = state.browseQuery.trim().toLowerCase();
  return state.catalog.filter((item) => {
    const matchesLanguage =
      state.languageFilter === 'all' || item.languages.includes(state.languageFilter);
    const matchesGenre =
      state.selectedGenre === null || item.genre === state.selectedGenre;
    const matchesQuery =
      query.length === 0 ||
      item.title.toLowerCase().includes(query) ||
      item.genre.toLowerCase().includes(query) ||
      item.languages.some((l) => l.toLowerCase().includes(query));
    return matchesLanguage && matchesGenre && matchesQuery;
  });
}

export function getOfflineCount(state: NovayAppState): number {
  return state.catalog.reduce(
    (total, item) => total + getEntryDownloadedCount(item),
    0
  );
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

export interface DeviceStatusSnapshot {
  online: boolean;
  connectionType?: string;
  effectiveType?: string;
  batteryLevel?: number | null;
  batteryCharging?: boolean;
}

export function formatDeviceClock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function resolveDeviceBatteryPercent(batteryLevel?: number | null): number {
  if (
    typeof batteryLevel === 'number' &&
    Number.isFinite(batteryLevel) &&
    batteryLevel >= 0 &&
    batteryLevel <= 1
  ) {
    return Math.round(batteryLevel * 100);
  }
  return 100;
}

export function formatDeviceStatusLabel(snapshot: DeviceStatusSnapshot): string {
  let networkLabel: string;
  if (!snapshot.online) {
    networkLabel = 'Hors ligne';
  } else if (snapshot.connectionType === 'wifi') {
    networkLabel = 'Wi-Fi';
  } else if (snapshot.connectionType === 'ethernet') {
    networkLabel = 'LAN';
  } else if (snapshot.effectiveType && snapshot.effectiveType !== '4g') {
    networkLabel = snapshot.effectiveType.toUpperCase();
  } else if (snapshot.connectionType === 'cellular' || snapshot.effectiveType === '4g') {
    networkLabel = '4G';
  } else {
    networkLabel = 'En ligne';
  }

  const pct = resolveDeviceBatteryPercent(snapshot.batteryLevel);
  const chargePrefix = snapshot.batteryCharging ? '⚡ ' : '';
  return `${networkLabel} · ${chargePrefix}${pct}%`;
}
