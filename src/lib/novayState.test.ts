import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTDOWN_STEPS,
  PHONE_TABS,
  RESUME_START_SECONDS,
  RESUME_TOTAL_SECONDS,
  clearWatchHistory,
  closeShowDetail,
  createInitialState,
  formatDeviceClock,
  formatDeviceStatusLabel,
  formatPlaybackTime,
  getFilteredCatalog,
  getGenreEntries,
  getGenreLabel,
  getHistoryGroups,
  getInstallProgressPercent,
  getLibraryItems,
  getLoaderStepProgress,
  getOfflineCount,
  getPlaybackProgressPercent,
  getQualityDescription,
  getTotalNewEpisodes,
  openShowDetail,
  playEpisodeEntry,
  resolveInitialTheme,
  selectCollectionGenre,
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
  toggleDownloadedEntry,
  toggleEpisodeDownload,
  toggleFaqItem,
  toggleFavoriteEntry,
  toggleInstallStep,
  toggleTheme,
  toggleWifiOnly,
} from './novayState';
import {
  FEATURE_0_BRANDS,
  FEATURE_1_BRANDS,
  FEATURE_2_BRANDS,
  getMorphBrandState,
} from './iconMorph';

test('resolveInitialTheme prefers valid stored theme over system preference', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme('invalid', false), 'light');
});

test('toggleTheme flips between light and dark', () => {
  const initial = createInitialState('light');
  const dark = toggleTheme(initial);
  assert.equal(dark.theme, 'dark');
  assert.equal(toggleTheme(dark).theme, 'light');
});

test('5-tab NoVaY navigation, browse query, and show detail overlay work predictably', () => {
  let state = createInitialState();
  assert.equal(state.activeTab, 'library');
  assert.deepEqual([...PHONE_TABS], ['library', 'updates', 'history', 'browse', 'more']);

  state = setPhoneTab(state, 'browse');
  assert.equal(state.activeTab, 'browse');

  state = setLanguageFilter(state, 'VOSTFR');
  const vostfr = getFilteredCatalog(state);
  assert.equal(vostfr.length, 5);
  assert.ok(vostfr.every((entry) => entry.languages.includes('VOSTFR')));

  state = selectCollectionGenre(state, 'aventure');
  const aventureVostfr = getFilteredCatalog(state);
  assert.equal(aventureVostfr.length, 2);
  assert.equal(aventureVostfr[0].id, 'tokyo-revengers');

  state = selectCollectionGenre(state, 'aventure');
  assert.equal(state.selectedGenre, null);

  state = setBrowseQuery(state, 'blue');
  assert.equal(getFilteredCatalog(state).length, 1);
  assert.equal(getFilteredCatalog(state)[0].id, 'blue-box');

  state = openShowDetail(state, 'tougen-anki');
  assert.equal(state.activeShowId, 'tougen-anki');
  state = closeShowDetail(state);
  assert.equal(state.activeShowId, null);
});

test('library filters, display modes, updates badge, and history groups update predictably', () => {
  let state = createInitialState();
  assert.equal(getLibraryItems(state).length, 4);
  assert.equal(getTotalNewEpisodes(state), 3);

  state = setLibraryFilter(state, 'offline');
  assert.equal(getLibraryItems(state).length, 2);

  state = setLibraryFilter(state, 'all');
  state = setLibraryDisplay(state, 'compact');
  assert.equal(state.libraryDisplay, 'compact');

  state = setLibrarySort(state, 'alpha');
  assert.equal(getLibraryItems(state)[0].id, 'black-clover');

  assert.equal(getHistoryGroups(state).length, 3);
  state = clearWatchHistory(state);
  assert.equal(getHistoryGroups(state).length, 0);

  state = playEpisodeEntry(state, 'tokyo-revengers', 12);
  assert.equal(getHistoryGroups(state).length, 3);
  assert.equal(getTotalNewEpisodes(state), 1);
});

test('favorite, episode download toggles, and More preferences update cleanly', () => {
  let state = createInitialState();
  const initialOffline = getOfflineCount(state);

  state = toggleDownloadedEntry(state, 'blue-box');
  assert.equal(getOfflineCount(state), initialOffline + 1);

  state = toggleEpisodeDownload(state, 'tokyo-revengers', 10);
  assert.equal(getOfflineCount(state), initialOffline + 2);

  state = toggleFavoriteEntry(state, 'tougen-anki');
  assert.equal(getLibraryItems(state).length, 5);

  state = setPhoneAccentPreset(state, 'midnight_slate');
  assert.equal(state.phoneAccentPreset, 'midnight_slate');
  state = toggleWifiOnly(state);
  assert.equal(state.wifiOnly, false);
});

test('feature language, quality selector, install steps, and FAQ accordion update cleanly', () => {
  let state = createInitialState();
  state = setFeatureLanguage(state, 'VOSTFR');
  assert.equal(state.featureLanguage, 'VOSTFR');

  state = setVideoQuality(state, '1080p');
  assert.equal(state.quality, '1080p');
  assert.match(getQualityDescription(state.quality), /Full HD/);

  state = toggleInstallStep(state, 2);
  state = toggleInstallStep(state, 1);
  assert.deepEqual(state.completedSteps, [1, 2]);
  state = toggleInstallStep(state, 1);
  assert.deepEqual(state.completedSteps, [2]);

  assert.equal(state.openFaqIndex, 0);
  state = toggleFaqItem(state, 0);
  assert.equal(state.openFaqIndex, null);
  state = toggleFaqItem(state, 2);
  assert.equal(state.openFaqIndex, 2);
});

test('countdown loader steps and progress calculate predictably', () => {
  assert.deepEqual([...COUNTDOWN_STEPS], [3, 2, 1]);
  assert.equal(getLoaderStepProgress(0), 0.3333);
  assert.equal(getLoaderStepProgress(1), 0.6667);
  assert.equal(getLoaderStepProgress(2), 1);
  assert.equal(getLoaderStepProgress(8), 1);
  assert.equal(shouldSkipIntroLoader(true), true);
  assert.equal(shouldSkipIntroLoader(false), false);
});

test('playback timecode, genre entries, and install progress calculate accurately', () => {
  assert.equal(formatPlaybackTime(RESUME_START_SECONDS), '18:42');
  assert.equal(formatPlaybackTime(RESUME_TOTAL_SECONDS), '23:50');
  assert.equal(formatPlaybackTime(RESUME_START_SECONDS + 20), '19:02');
  assert.ok(getPlaybackProgressPercent(RESUME_START_SECONDS) > 78);
  assert.equal(getPlaybackProgressPercent(RESUME_TOTAL_SECONDS + 100), 100);

  let state = createInitialState();
  assert.equal(getGenreEntries(state).length, 0);
  state = selectCollectionGenre(state, 'fantastique');
  assert.equal(getGenreLabel('fantastique'), 'Fantastique');
  assert.equal(getGenreEntries(state).length, 3);

  assert.equal(getInstallProgressPercent([]), 0);
  assert.equal(getInstallProgressPercent([1]), 33.33);
  assert.equal(getInstallProgressPercent([1, 2, 3]), 100);
});

test('real device status clock and telemetry labels format cleanly without fake presets', () => {
  const sampleDate = new Date(2026, 10, 26, 7, 5, 0);
  assert.equal(formatDeviceClock(sampleDate), '07:05');

  assert.equal(
    formatDeviceStatusLabel({
      online: true,
      connectionType: 'wifi',
      batteryLevel: 0.84,
      batteryCharging: false,
    }),
    'Wi-Fi · 84%'
  );

  assert.equal(
    formatDeviceStatusLabel({
      online: true,
      effectiveType: '4g',
      batteryLevel: 0.5,
      batteryCharging: true,
    }),
    '4G · ⚡ 50%'
  );

  assert.equal(
    formatDeviceStatusLabel({
      online: false,
      batteryLevel: null,
    }),
    'Hors ligne · 100%'
  );
});

test('all 3 feature icon morph sets include 25 distinct brands and interpolate cleanly', () => {
  assert.equal(FEATURE_0_BRANDS.length, 25);
  assert.equal(FEATURE_1_BRANDS.length, 25);
  assert.equal(FEATURE_2_BRANDS.length, 25);

  for (const brands of [FEATURE_0_BRANDS, FEATURE_1_BRANDS, FEATURE_2_BRANDS]) {
    const signatures = new Set<string>();
    for (let idx = 0; idx < brands.length; idx++) {
      const start = getMorphBrandState(brands, idx * 2600, 0);
      const mid = getMorphBrandState(brands, idx * 2600 + 1900, 0);
      assert.equal(start.paths.length, 5);
      assert.equal(mid.paths.length, 5);
      assert.ok(start.paths.every((d) => d.startsWith('M ') && !d.includes('NaN')));
      assert.ok(mid.paths.every((d) => d.startsWith('M ') && !d.includes('NaN')));
      signatures.add(start.paths.join('|'));
    }
    assert.equal(signatures.size, 25);
  }
});
