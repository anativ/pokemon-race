/**
 * race-world / theme registry.
 *
 * Themes are keyed by the `theme.key` in src/data/tracks.js ('grass' | 'neon' |
 * 'snow') so a track id rename (mt-coronet / mount-coronet) can never orphan a
 * scene.  Track ids are accepted as aliases too.
 */
import pallet from './pallet-town.js';
import ryme from './ryme-city.js';
import coronet from './mt-coronet.js';

export const scenes = { grass: pallet, neon: ryme, snow: coronet };

const ALIAS = {
  'pallet-town': 'grass',
  'pallet': 'grass',
  'ryme-city': 'neon',
  'ryme': 'neon',
  'mt-coronet': 'snow',
  'mount-coronet': 'snow',
  'coronet': 'snow',
};

/** @param {any} track a frozen entry from src/data/tracks.js */
export function sceneFor(track) {
  if (!track) return pallet;
  const byKey = track.theme && scenes[track.theme.key];
  if (byKey) return byKey;
  return scenes[ALIAS[track.id]] || pallet;
}

export default sceneFor;
