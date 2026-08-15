/**
 * race-world / species traits
 *
 * Per-roster-id cosmetic recipe used by the kart renderer so every racer reads
 * as its own Pokemon: head/ear silhouette, face markings, tail, and the livery
 * that its kart wears (nose motif + side emblem).
 *
 * Fields
 *   fur       main body colour            skin  muzzle / belly patch
 *   ear       'long'|'cat'|'round'|'spike'|'horn'|'fin'|'crest'|'antenna'|'none'
 *   earTip    colour of the ear tips (null = same as fur)
 *   eye       'round'|'sharp'|'sleepy'
 *   cheek     cheek-patch colour or null
 *   tail      'bolt'|'flame'|'curl'|'leaf'|'fluffy'|'coin'|'spike'|'wing'|'none'
 *   emblem    side-pod glyph: 'bolt'|'flame'|'drop'|'leaf'|'star'|'moon'|'fist'|'gem'
 *   nose      how the kart's snout is styled: 'face' (species face) | 'shell' | 'plain'
 *   back      extra rig behind the seat: 'shell'|'bulb'|'wings'|'none'
 */

const D = {
  fur: '#ffd63b', skin: '#ffe9a8', ear: 'long', earTip: '#3a2a1c', eye: 'round',
  cheek: null, tail: 'none', emblem: 'star', nose: 'face', back: 'none',
  brow: null, hat: null,
};

function spec(o) { return Object.freeze({ ...D, ...o }); }

export const SPECIES = Object.freeze({
  pikachu: spec({
    fur: '#ffd93f', skin: '#ffeaa0', ear: 'long', earTip: '#2b2118',
    cheek: '#ff4d4d', tail: 'bolt', emblem: 'bolt', nose: 'face', hat: '#2f6fd0',
  }),
  charmander: spec({
    fur: '#ff9a44', skin: '#ffd9a8', ear: 'none', eye: 'round',
    tail: 'flame', emblem: 'flame', nose: 'face',
  }),
  squirtle: spec({
    fur: '#6fc8ee', skin: '#f2e6b8', ear: 'none', eye: 'round',
    tail: 'curl', emblem: 'drop', nose: 'face', back: 'shell',
  }),
  bulbasaur: spec({
    fur: '#7fd0b0', skin: '#bfe8d4', ear: 'none', eye: 'sharp',
    tail: 'none', emblem: 'leaf', nose: 'face', back: 'bulb',
  }),
  eevee: spec({
    fur: '#cd8f4f', skin: '#f6e2bc', ear: 'cat', earTip: '#7a4a22',
    tail: 'fluffy', emblem: 'star', nose: 'face',
  }),
  meowth: spec({
    fur: '#f4dfb4', skin: '#fff0d0', ear: 'cat', earTip: '#c99a45',
    tail: 'coin', emblem: 'moon', nose: 'face', brow: '#c99a45',
  }),
  gengar: spec({
    fur: '#8e6bd6', skin: '#6b47b8', ear: 'spike', earTip: '#5a34a8', eye: 'sharp',
    tail: 'spike', emblem: 'moon', nose: 'face',
  }),
  lucario: spec({
    fur: '#4d8fe0', skin: '#f0e6d2', ear: 'long', earTip: '#1b3f77', eye: 'sharp',
    tail: 'fluffy', emblem: 'fist', nose: 'face',
  }),
  snorlax: spec({
    fur: '#4f8f9c', skin: '#f2e2b8', ear: 'cat', earTip: '#2b5a66', eye: 'sleepy',
    tail: 'none', emblem: 'moon', nose: 'plain',
  }),
  charizard: spec({
    fur: '#ff9838', skin: '#ffe0a8', ear: 'horn', earTip: '#d86a1c', eye: 'sharp',
    tail: 'flame', emblem: 'flame', nose: 'face', back: 'wings',
  }),
  greninja: spec({
    fur: '#4fa8e0', skin: '#dff2ff', ear: 'fin', earTip: '#1c5d8c', eye: 'sharp',
    tail: 'none', emblem: 'drop', nose: 'face',
  }),
  garchomp: spec({
    fur: '#7f6fb8', skin: '#e05a4a', ear: 'fin', earTip: '#4a3f7a', eye: 'sharp',
    tail: 'spike', emblem: 'gem', nose: 'face', back: 'wings',
  }),
  mewtwo: spec({
    fur: '#e2dbee', skin: '#c9a8dd', ear: 'horn', earTip: '#a98cc8', eye: 'sharp',
    tail: 'curl', emblem: 'gem', nose: 'face',
  }),
  togepi: spec({
    fur: '#fbf0cf', skin: '#ffffff', ear: 'crest', earTip: '#e2924c',
    tail: 'none', emblem: 'star', nose: 'face',
  }),
  blaziken: spec({
    fur: '#ec6b44', skin: '#f6e0b4', ear: 'crest', earTip: '#f6d24c', eye: 'sharp',
    tail: 'flame', emblem: 'flame', nose: 'face',
  }),
  gardevoir: spec({
    fur: '#f2f6fa', skin: '#9fd8bc', ear: 'fin', earTip: '#4fae8c',
    tail: 'none', emblem: 'gem', nose: 'face',
  }),
  mew: spec({
    fur: '#f8bed2', skin: '#ffe2ec', ear: 'cat', earTip: '#d88ba8',
    tail: 'curl', emblem: 'star', nose: 'face',
  }),
  celebi: spec({
    fur: '#c2e88a', skin: '#eaf8c8', ear: 'antenna', earTip: '#4f8c3a',
    tail: 'leaf', emblem: 'leaf', nose: 'face', back: 'wings',
  }),
  tyranitar: spec({
    fur: '#a6cc72', skin: '#5f8a3a', ear: 'horn', earTip: '#4f6b2c', eye: 'sharp',
    tail: 'spike', emblem: 'gem', nose: 'plain',
  }),
  machamp: spec({
    fur: '#b4c2d0', skin: '#f2d9a8', ear: 'none', eye: 'sharp',
    tail: 'none', emblem: 'fist', nose: 'plain',
  }),
  dragonite: spec({
    fur: '#f6c86c', skin: '#f7ead0', ear: 'antenna', earTip: '#3f8c9f',
    tail: 'spike', emblem: 'star', nose: 'face', back: 'wings',
  }),
  jigglypuff: spec({
    fur: '#f9c6d8', skin: '#ffe8f0', ear: 'round', earTip: '#d88ba8',
    tail: 'none', emblem: 'moon', nose: 'face',
  }),
  rayquaza: spec({
    fur: '#4fae74', skin: '#f6f0c8', ear: 'fin', earTip: '#c8b03c', eye: 'sharp',
    tail: 'spike', emblem: 'gem', nose: 'face',
  }),
  ditto: spec({
    fur: '#dcbce4', skin: '#f0dcf4', ear: 'none', eye: 'sleepy',
    tail: 'none', emblem: 'star', nose: 'plain',
  }),
});

/** Traits for a roster entry, falling back to a colour-derived default. */
export function speciesOf(racer) {
  if (!racer) return SPECIES.pikachu;
  const s = SPECIES[racer.id];
  if (s) return s;
  return spec({ fur: racer.color || D.fur, skin: '#ffe9a8', ear: racer.shape === 'blob' ? 'round' : 'long' });
}

export default SPECIES;
