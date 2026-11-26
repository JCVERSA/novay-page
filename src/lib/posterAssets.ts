import posterTokyoRevengers from '../assets/images/anime_sama_tokyo_revengers.webp';
import posterBlackClover from '../assets/images/anime_sama_black_clover.webp';
import posterBlueBox from '../assets/images/anime_sama_blue_box.webp';
import posterBleach from '../assets/images/anime_sama_bleach.webp';
import posterTougenAnki from '../assets/images/anime_sama_tougen_anki.webp';
import posterAoAshi from '../assets/images/anime_sama_ao_ashi.webp';
import type { PosterKey } from './novayState';

export const POSTER_ASSETS: Record<PosterKey, string> = {
  'tokyo-revengers': posterTokyoRevengers,
  'black-clover': posterBlackClover,
  'blue-box': posterBlueBox,
  bleach: posterBleach,
  'tougen-anki': posterTougenAnki,
  'ao-ashi': posterAoAshi,
};

export function getPosterUrl(key: PosterKey): string {
  return POSTER_ASSETS[key];
}
