/**
 * Shared track data for Pokemon Racing Game.
 *
 * CONTRACT (see CONTRACTS.md): exactly three named tracks, each with
 *   id           kebab-case id used by ?track=
 *   name         display name (e.g. "PALLET TOWN CIRCUIT")
 *   laps         number of laps in a race
 *   theme        palette used by every renderer (sky/ground/road/rumble/fog/neon)
 *   segments     [{ len, curve, hill }]  pseudo-3D road description, looped
 *   minimap      [[x,y]...] closed loop in 0..1 space, drawn by the HUD minimap
 *   itemRows     [t...] normalized lap positions where Poke Ball rows spawn
 *
 * Frozen: clone before mutating.
 */

/** Build a closed segment list from a compact spec: [curve, lengthUnits, hill?] */
function seg(list) {
  return Object.freeze(list.map(([curve, len, hill = 0]) =>
    Object.freeze({ curve, len, hill })));
}

function totalLength(segments) {
  return segments.reduce((a, s) => a + s.len, 0);
}

const TRACKS = [
  {
    id: 'pallet-town',
    name: 'PALLET TOWN CIRCUIT',
    subtitle: 'Sunny meadows, gentle sweepers, three Poke Ball rows',
    order: 3,
    laps: 3,
    difficulty: 1,
    time: 'day',
    theme: {
      key: 'grass',
      skyTop: '#3fa9f5', skyBottom: '#bfe8ff',
      cloud: '#ffffff',
      hillFar: '#4f8f5f', hillNear: '#5fae5a',
      ground: '#66c05a', groundAlt: '#57ae4e',
      road: '#6d7480', roadAlt: '#767d89',
      rumbleA: '#e8433c', rumbleB: '#f6f7fb',
      line: '#f2f4f8',
      fog: '#cfeaff',
      neon: '#ffd63b',
      accent: '#ffd63b',
      hud: '#1d2b45',
    },
    segments: seg([
      [0, 340], [0.9, 260, 0.4], [1.7, 220], [0.4, 180], [0, 300],
      [-1.4, 260, -0.3], [-2.1, 200], [-0.6, 220], [0, 260, 0.5],
      [2.2, 240], [1.0, 200], [0, 320], [-1.1, 240], [0, 280],
    ]),
    minimap: [
      [0.50, 0.06], [0.74, 0.10], [0.86, 0.26], [0.80, 0.44], [0.62, 0.52],
      [0.72, 0.68], [0.66, 0.88], [0.46, 0.94], [0.26, 0.84], [0.22, 0.64],
      [0.34, 0.50], [0.20, 0.36], [0.26, 0.14],
    ],
    itemRows: [0.18, 0.46, 0.78],
  },
  {
    id: 'ryme-city',
    name: 'RYME CITY GRAND PRIX',
    subtitle: 'Neon night streets, boost strips, hairpin under the billboards',
    order: 1,
    laps: 3,
    difficulty: 2,
    time: 'night',
    theme: {
      key: 'neon',
      skyTop: '#050a20', skyBottom: '#16255c',
      cloud: '#2a3d7a',
      hillFar: '#101a3c', hillNear: '#182552',
      ground: '#141c38', groundAlt: '#101730',
      road: '#2b3350', roadAlt: '#333b5c',
      rumbleA: '#12d0ff', rumbleB: '#f0f6ff',
      line: '#8fe6ff',
      fog: '#1b2a5e',
      neon: '#22e0ff',
      accent: '#ff45c8',
      hud: '#0b1330',
    },
    segments: seg([
      [0, 300], [2.4, 200], [1.2, 180], [0, 240], [-2.6, 220],
      [-1.0, 200], [0, 280, 0.4], [3.0, 160], [0.5, 200], [-1.8, 240],
      [0, 300], [1.6, 220], [-2.2, 180], [0, 260],
    ]),
    minimap: [
      [0.50, 0.05], [0.72, 0.08], [0.88, 0.22], [0.84, 0.40], [0.64, 0.48],
      [0.78, 0.62], [0.74, 0.84], [0.52, 0.95], [0.30, 0.86], [0.24, 0.66],
      [0.40, 0.52], [0.22, 0.38], [0.28, 0.12],
    ],
    itemRows: [0.12, 0.4, 0.68, 0.9],
  },
  {
    id: 'mt-coronet',
    name: 'MOUNT CORONET PASS',
    subtitle: 'Icy switchbacks, crystal caves, long downhill straight',
    order: 2,
    laps: 3,
    difficulty: 3,
    time: 'dusk',
    theme: {
      key: 'snow',
      skyTop: '#5f86b8', skyBottom: '#cfe2f2',
      cloud: '#eaf3fb',
      hillFar: '#7d93ad', hillNear: '#9db3c8',
      ground: '#e6eff8', groundAlt: '#d3e2ef',
      road: '#5e6672', roadAlt: '#69717d',
      rumbleA: '#2f7fd8', rumbleB: '#f6fbff',
      line: '#f6d34a',
      fog: '#dbe9f5',
      neon: '#5fd8ff',
      accent: '#5fd8ff',
      hud: '#1b2a3d',
    },
    segments: seg([
      [0, 280, 0.8], [-2.8, 180], [-1.2, 200, -0.6], [0, 260], [2.9, 170],
      [1.1, 190, 0.6], [0, 300], [-2.0, 210], [-3.1, 160], [0, 240, -0.8],
      [1.8, 220], [0, 280], [2.4, 180], [0, 240],
    ]),
    minimap: [
      [0.48, 0.06], [0.70, 0.12], [0.80, 0.30], [0.66, 0.42], [0.78, 0.56],
      [0.70, 0.80], [0.50, 0.92], [0.28, 0.82], [0.32, 0.62], [0.20, 0.50],
      [0.34, 0.38], [0.24, 0.18],
    ],
    itemRows: [0.22, 0.55, 0.85],
  },
];

for (const t of TRACKS) {
  t.length = totalLength(t.segments);
  Object.freeze(t.theme);
  Object.freeze(t.minimap);
  Object.freeze(t.itemRows);
  Object.freeze(t);
}

export const tracks = Object.freeze(TRACKS);
export const DEFAULT_TRACK_ID = 'pallet-town';

/** Menu order matching the reference "TRACK SELECTION" panel (1..3). */
export const trackMenuOrder = Object.freeze(
  [...TRACKS].sort((a, b) => a.order - b.order));

/** @param {string} id */
export function getTrack(id) {
  return tracks.find((t) => t.id === id) || null;
}

export function trackOr(id, fallbackId = DEFAULT_TRACK_ID) {
  return getTrack(id) || getTrack(fallbackId) || tracks[0];
}

/**
 * Sample the looped road at distance d (world units).
 * Returns cumulative curvature + hill so pseudo-3D renderers and the sim agree.
 */
export function sampleTrack(track, d) {
  const len = track.length;
  let x = ((d % len) + len) % len;
  for (const s of track.segments) {
    if (x < s.len) return { curve: s.curve, hill: s.hill, t: x / s.len, seg: s };
    x -= s.len;
  }
  const last = track.segments[track.segments.length - 1];
  return { curve: last.curve, hill: last.hill, t: 0, seg: last };
}

export default tracks;
