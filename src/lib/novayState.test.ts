import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTDOWN_STEPS,
  RESUME_START_SECONDS,
  RESUME_TOTAL_SECONDS,
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
} from './novayState';

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

test('phone tabs and catalog filters work predictably', () => {
  let state = createInitialState();
  assert.equal(state.activeTab, 'library');

  state = setPhoneTab(state, 'catalog');
  assert.equal(state.activeTab, 'catalog');

  state = setLanguageFilter(state, 'VOSTFR');
  const vostfr = getFilteredCatalog(state);
  assert.equal(vostfr.length, 3);
  assert.ok(vostfr.every((entry) => entry.languages.includes('VOSTFR')));

  state = selectCollectionGenre(state, 'aventure');
  const aventureVostfr = getFilteredCatalog(state);
  assert.equal(aventureVostfr.length, 1);
  assert.equal(aventureVostfr[0].id, 'l-eveil-du-vent');

  // Selecting same genre again clears genre filter
  state = selectCollectionGenre(state, 'aventure');
  assert.equal(state.selectedGenre, null);
});

test('favorite and offline download toggles update catalog state and offline count', () => {
  let state = createInitialState();
  assert.equal(getOfflineCount(state), 2);

  state = toggleDownloadedEntry(state, 'horizons-lointains');
  assert.equal(getOfflineCount(state), 3);

  state = toggleFavoriteEntry(state, 'chroniques-d-aube');
  const updated = state.catalog.find((entry) => entry.id === 'chroniques-d-aube');
  assert.equal(updated?.favorite, true);
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

test('playback timecode, genre bottom sheet, and install progress calculate accurately', () => {
  assert.equal(formatPlaybackTime(RESUME_START_SECONDS), '18:42');
  assert.equal(formatPlaybackTime(RESUME_TOTAL_SECONDS), '23:50');
  assert.equal(formatPlaybackTime(RESUME_START_SECONDS + 20), '19:02');
  assert.ok(getPlaybackProgressPercent(RESUME_START_SECONDS) > 78);
  assert.equal(getPlaybackProgressPercent(RESUME_TOTAL_SECONDS + 100), 100);

  let state = createInitialState();
  assert.equal(getGenreEntries(state).length, 0);
  state = selectCollectionGenre(state, 'fantastique');
  assert.equal(getGenreLabel('fantastique'), 'Fantastique');
  assert.equal(getGenreEntries(state).length, 2);

  assert.equal(getInstallProgressPercent([]), 0);
  assert.equal(getInstallProgressPercent([1]), 33.33);
  assert.equal(getInstallProgressPercent([1, 2, 3]), 100);
});


