/**
 * race-world / theme: RYME CITY GRAND PRIX (neon night)
 * Dark asphalt, cyan light-strips running down both edges, glowing billboards
 * and a skyline of lit towers behind the barriers.
 */
export const ryme = {
  key: 'neon',
  name: 'RYME CITY GRAND PRIX',

  sky: {
    stops: [
      [0.00, '#050718'],
      [0.38, '#0d1338'],
      [0.72, '#1b2a63'],
      [1.00, '#3a3f8c'],
    ],
    sun: { x: 0.5, y: 0.9, r: 420, core: '#2b57b8', halo: '#1a2a6e', soft: true },
    clouds: { kind: 'wispy', color: '#3a4d9c', shade: '#26306b', count: 6, alpha: 0.45 },
    stars: 130,
    birds: 0,
  },

  hills: [
    { color: '#131a44', amp: 90, freq: 0.0042, base: 6, parallax: 0.05, haze: 0.4,
      lit: '#4b5fb0', litAlpha: 0.20, foot: '#05081f' },
  ],
  /** Lit tower blocks along the horizon. */
  skyline: {
    layers: [
      { color: '#161e50', win: '#5f7fe8', winAlpha: 0.30, h: 210, w: 120, parallax: 0.07 },
      { color: '#101641', win: '#8fd8ff', winAlpha: 0.45, h: 150, w: 84, parallax: 0.14 },
      { color: '#0a0f30', win: '#ffd36a', winAlpha: 0.55, h: 100, w: 58, parallax: 0.22 },
    ],
    neon: ['#22e0ff', '#ff45c8', '#ffd63b', '#7c5cff'],
  },

  ground: {
    near: '#151c3a', far: '#0e1430', alt: '#111938',
    stripeAlpha: 0.30, stripe: '#0a1030',
    speck: '#2b3a78', speckAlpha: 0.35,
    shoulder: '#232c55',
    patch: '#1d2a5e', patch2: '#0b0f2a', patchAlpha: 0.42,
  },

  road: {
    base: '#2a3152', alt: '#313a5c',
    worn: '#1e2440', wornAlpha: 0.42,
    edge: '#8fe6ff', line: '#a8efff',
    dash: 14, dashGap: 16,
    grain: '#4a5488', grainAlpha: 0.14,
    apron: '#20263f',
    /** Cyan light-strip that runs the length of both edges. */
    lightStrip: { color: '#22e0ff', glow: '#12d0ff', width: 0.05 },
    reflect: 0.5,
    /** wet-tarmac sheen picking up the magenta signage overhead */
    sheen: '#5a7cff', sheenAlpha: 0.10, sheenSide: -1,
    /** smeared neon reflections streaked down the wet road */
    wet: { colors: ['#22e0ff', '#ff45c8', '#ffd63b'], alpha: 0.16 },
  },

  kerb: { a: '#12d0ff', b: '#eaf9ff', size: 4, width: 0.10 },
  kerbAlt: { a: '#ff45c8', b: '#eaf9ff' },

  rail: {
    post: '#3b4570', beam: '#2a3358', shade: '#161d38',
    glow: '#22e0ff', every: 2, height: 26,
    shadowDir: 0.55, shadowColor: '#03051a', shadowAlpha: 0.26,
  },

  fog: { color: '#16204e', start: 0.30, power: 1.7, max: 0.95 },

  /** Rain-slick tarmac: karts and gantries smear back out of the surface. */
  wetFloor: 0.22,

  /** Wet plaza slabs + rain-flecked tarmac (src/race/shading.js). */
  tex: { roadAlpha: 0.62, groundAlpha: 0.55 },
  groundTex: { dark: '#060a24', light: '#4fd8ff' },

  /** Crowd creatures sit in the city's blue night light, not in daylight. */
  fanTint: { color: '#1b2a63', amount: 0.52 },

  light: { ambient: 0.42, sun: 0.10, rim: '#22e0ff' },

  props: [
    { type: 'billboard', w: 26, min: 1.72, max: 2.4, scale: 1.0 },
    { type: 'tower', w: 30, min: 1.95, max: 3.6, scale: 1.0 },
    { type: 'streetlight', w: 22, min: 1.62, max: 1.68, scale: 1.0 },
    { type: 'neonsign', w: 16, min: 1.75, max: 2.4, scale: 0.9 },
    { type: 'chevron', w: 14, min: 1.46, max: 1.52, scale: 0.8 },
    { type: 'spectator', w: 22, min: 1.42, max: 1.86, scale: 0.28 },
    { type: 'palmneon', w: 8, min: 1.85, max: 2.6, scale: 0.9 },
  ],
  arches: [0.0, 0.5],
  archStyle: 'gantry',
  palette: {
    neonA: '#22e0ff', neonB: '#ff45c8', neonC: '#ffd63b', neonD: '#7c5cff',
    glass: '#16204e', panel: '#1d2648',
  },
  /** Night-city crowd: the moodier half of the roster. */
  fans: ['gengar', 'lucario', 'greninja', 'machamp', 'mewtwo',
    'gardevoir', 'ditto', 'meowth', 'pikachu', 'jigglypuff'],
  /**
   * No ground scatter: the verge here is wet plaza slab, not turf, so the
   * grain tile in shading.js carries the whole surface.
   */
  detail: null,
};

export default ryme;
