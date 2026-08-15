/**
 * race-world / theme: MOUNT CORONET PASS (snow)
 * Cold blue dusk, snow-banked verges, pine forest and ice-crystal outcrops.
 */
export const coronet = {
  key: 'snow',
  name: 'MOUNT CORONET PASS',

  sky: {
    stops: [
      [0.00, '#2f5f9c'],
      [0.34, '#6f9ecb'],
      [0.70, '#b7d5ea'],
      [1.00, '#eaf4fb'],
    ],
    sun: { x: 0.28, y: 0.20, r: 220, core: '#fff6de', halo: '#ffd9a8' },
    clouds: { kind: 'puffy', color: '#f2f8fd', shade: '#c9dcec', count: 8, alpha: 0.8 },
    stars: 0,
    birds: 2,
    snowfall: 150,
  },

  hills: [
    { color: '#7e98b6', amp: 300, freq: 0.0024, base: 2, parallax: 0.05, haze: 0.45,
      peak: 0.55, snowcap: '#f4fbff', snowDepth: 0.30,
      lit: '#ffffff', litAlpha: 0.30, foot: '#5b7d9f' },
    { color: '#5f7b9c', amp: 200, freq: 0.0046, base: 14, parallax: 0.12, haze: 0.22,
      peak: 0.45, snowcap: '#eaf5ff', snowDepth: 0.22,
      lit: '#ffffff', litAlpha: 0.24, foot: '#4a648a' },
    { color: '#4d6688', amp: 104, freq: 0.0098, base: 38, parallax: 0.22, haze: 0.10,
      peak: 0.30, snowcap: '#dfeeff', snowDepth: 0.18,
      lit: '#ffffff', litAlpha: 0.18, foot: '#3f5878' },
  ],
  skyline: null,

  ground: {
    near: '#eef6fd', far: '#c9dcec', alt: '#dde9f5',
    stripeAlpha: 0.22, stripe: '#aac6de',
    speck: '#ffffff', speckAlpha: 0.7,
    shoulder: '#ffffff',
    patch: '#ffffff', patch2: '#c2d7e9', patchAlpha: 0.40,
  },

  road: {
    base: '#5e6672', alt: '#69717d',
    worn: '#4c545f', wornAlpha: 0.30,
    edge: '#f6fbff', line: '#f6d34a',
    dash: 12, dashGap: 14,
    grain: '#8f9aa8', grainAlpha: 0.14,
    apron: '#7d8794',
    ice: { color: '#bfe7ff', alpha: 0.22 },
    /** low winter sun raking across the pass from the left */
    sheen: '#e8f6ff', sheenAlpha: 0.11, sheenSide: -1,
    /** ploughed snow banked up against both kerbs */
    berm: { color: '#f7fcff', shade: '#cadcec', height: 0.16 },
  },

  kerb: { a: '#2f7fd8', b: '#f6fbff', size: 3, width: 0.115 },
  kerbAlt: { a: '#e8433c', b: '#f6fbff' },

  rail: {
    post: '#dfeefb', beam: '#a9c4dc', shade: '#6d87a3',
    glow: null, every: 3, height: 22,
    shadowDir: -0.75, shadowColor: '#4a6c9c', shadowAlpha: 0.20,
  },

  fog: { color: '#dbe9f5', start: 0.34, power: 1.8, max: 0.96 },

  /** Wind-rippled snow + cold grey asphalt (src/race/shading.js). */
  tex: { roadAlpha: 0.7, groundAlpha: 0.75 },
  groundTex: { dark: '#8fa9cc', light: '#ffffff' },

  light: { ambient: 0.9, sun: 0.34, rim: '#d8f0ff' },

  props: [
    { type: 'pine', w: 40, min: 1.85, max: 4.0, scale: 1.05 },
    { type: 'pine', w: 20, min: 1.72, max: 2.6, scale: 0.78 },
    { type: 'snowbank', w: 20, min: 1.62, max: 2.30, scale: 0.72 },
    { type: 'crystal', w: 12, min: 1.68, max: 2.8, scale: 0.9 },
    { type: 'rock', w: 12, min: 1.70, max: 3.0, scale: 1.0 },
    { type: 'cliff', w: 13, min: 2.10, max: 3.40, scale: 0.95 },
    { type: 'sign', w: 6, min: 1.66, max: 1.95, scale: 0.8 },
    { type: 'spectator', w: 26, min: 1.36, max: 1.80, scale: 0.30 },
  ],
  arches: [0.0, 0.45],
  archStyle: 'pokeball',
  palette: { pineA: '#2c5f4a', pineB: '#1f4a3a', pineC: '#3f7f60', trunk: '#5a4330', snow: '#f6fbff' },
  /** Cold-weather crowd, bundled along the barriers. */
  fans: ['snorlax', 'jigglypuff', 'togepi', 'dragonite', 'tyranitar',
    'mewtwo', 'eevee', 'squirtle', 'lucario', 'pikachu'],
  detail: {
    tuft: ['#dceaf6', '#ffffff', '#b6ccdf'],
    flower: ['#ffffff', '#cfeaff'],
    flowerRate: 0.22, density: 4, size: 0.115, lump: true,
  },
};

export default coronet;
