/**
 * race-world / theme: PALLET TOWN CIRCUIT (sunny grass)
 *
 * A scene description consumed by src/race/sky.js, road.js and scenery.js.
 * Pure data - no clock reads, no randomness (scenery picks props with the
 * deterministic per-slice noise baked into geometry.js).
 */
export const pallet = {
  key: 'grass',
  name: 'PALLET TOWN CIRCUIT',

  sky: {
    stops: [
      [0.00, '#1f7ede'],
      [0.34, '#4aa8f0'],
      [0.68, '#93d4fb'],
      [1.00, '#d8f1ff'],
    ],
    sun: { x: 0.72, y: 0.16, r: 190, core: '#fffbe6', halo: '#ffe89a' },
    clouds: { kind: 'puffy', color: '#ffffff', shade: '#d6ecff', count: 9, alpha: 0.95 },
    stars: 0,
    birds: 3,
  },

  /** Far -> near parallax ridges drawn just above the horizon. */
  hills: [
    // far blue range, then two green ridges; the nearest is forested
    { color: '#5f8fb8', amp: 150, freq: 0.0034, base: 4, parallax: 0.06, haze: 0.55,
      lit: '#eaf6ff', litAlpha: 0.30, foot: '#2c5f8f' },
    { color: '#41855f', amp: 118, freq: 0.0058, base: 16, parallax: 0.13, haze: 0.26,
      lit: '#c8f0a8', litAlpha: 0.24, foot: '#1d5136' },
    { color: '#3c8f4a', amp: 78, freq: 0.0102, base: 34, parallax: 0.24, haze: 0.08,
      lit: '#a8e878', litAlpha: 0.20, foot: '#1f5c2c',
      canopy: { step: 26, a: '#3fa14a', b: '#2f7f3b' } },
  ],
  skyline: null,

  ground: {
    near: '#6cc95c', far: '#4d9f49', alt: '#5cb84f',
    stripeAlpha: 0.16, stripe: '#4a9c44',
    speck: '#8ee06f', speckAlpha: 0.5,
    shoulder: '#c9b98a',
    patch: '#7ed86a', patch2: '#46974a', patchAlpha: 0.34,
  },

  road: {
    base: '#767d89', alt: '#7e8591',
    worn: '#5f6673', wornAlpha: 0.32,
    edge: '#f4f7fb', line: '#f6f8fc',
    dash: 12, dashGap: 12,
    grain: '#9aa2ae', grainAlpha: 0.12,
    apron: '#8e94a0',
    /** warm sun sheen sliding along the right-hand side of the asphalt */
    sheen: '#fff4d2', sheenAlpha: 0.09, sheenSide: 1,
  },

  kerb: { a: '#e8433c', b: '#fbfdff', size: 3, width: 0.115 },
  /** Checkerboard kerbs on the inside of corners, like the reference photo. */
  kerbAlt: { a: '#2f8ede', b: '#fbfdff' },

  rail: {
    post: '#f2f5f9', beam: '#dfe6ef', shade: '#9fb0c2',
    glow: null, every: 3, height: 20,
    shadowDir: -0.95, shadowColor: '#17364f', shadowAlpha: 0.24,
  },

  fog: { color: '#cfeaff', start: 0.42, power: 2.1, max: 0.92 },

  /** Baked surface grain (src/race/shading.js): asphalt aggregate + mown turf. */
  tex: { roadAlpha: 0.75, groundAlpha: 0.88 },
  groundTex: { dark: '#1f6b2b', light: '#cffb9e' },

  light: { ambient: 0.86, sun: 0.42, rim: '#fff4c8' },

  props: [
    { type: 'tree', w: 30, min: 1.95, max: 4.2, scale: 1.05 },
    { type: 'tree2', w: 22, min: 1.90, max: 3.6, scale: 0.95 },
    { type: 'bush', w: 22, min: 1.52, max: 2.4, scale: 0.62 },
    { type: 'flowers', w: 16, min: 1.30, max: 2.6, scale: 0.26 },
    { type: 'fence', w: 10, min: 1.55, max: 1.55, scale: 0.85 },
    // crowd Pokemon: knee-high next to a 7 m tree, drawn from the canonical
    // silhouettes in src/core/avatars.js (see src/race/crowd.js)
    { type: 'spectator', w: 34, min: 1.32, max: 1.80, scale: 0.30 },
    { type: 'sign', w: 5, min: 1.62, max: 1.9, scale: 0.8 },
    { type: 'balloon', w: 4, min: 2.0, max: 3.2, scale: 0.9 },
  ],
  /** Big Poke Ball arch gates over the road, at these lap fractions. */
  arches: [0.0, 0.33, 0.66],
  archStyle: 'pokeball',
  palette: { treeA: '#3fa14a', treeB: '#2f7f3b', treeC: '#6cd06a', trunk: '#7a5230' },
  /** Sunny-route species lining the verge (ids from src/data/roster.js). */
  fans: ['eevee', 'charmander', 'bulbasaur', 'squirtle', 'jigglypuff',
    'meowth', 'togepi', 'celebi', 'pikachu', 'mew'],
  /** Near-field ground scatter painted by src/race/scenery.js. */
  detail: {
    tuft: ['#3f9c46', '#59c05a', '#2c7a38'],
    flower: ['#ffffff', '#ffd63b', '#ff88b0', '#a8dcff'],
    flowerRate: 0.30, density: 5, size: 0.048,
  },
};

export default pallet;
