/**
 * results-podium :: procedural art atoms (no external assets).
 *
 * Everything here is inline SVG markup so the podium works offline and stays
 * CSP-safe. Poke Balls, the trophy, sparkles and the 3D plinths live here; the
 * per-species full-body racers live next door in `podium-figures.js`.
 */

const OUT = '#1b1230';

const P = (d, fill, stroke = OUT, w = 2.4) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const F = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const E = (cx, cy, rx, ry, fill, stroke = OUT, w = 2.4) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const Ef = (cx, cy, rx, ry, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const L = (d, stroke, w = 2.2) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Confetti / celebration palette shared by the DOM and the canvas arena. */
export const CONFETTI = Object.freeze([
  '#ffd63b', '#e8433c', '#4fc3ff', '#5fc45a', '#ff8ecb', '#ffffff', '#b98cff',
]);

/** Poke Ball, top-red / bottom-white with a lit centre button. */
export function pokeballSvg(size = 48, { glow = 0.5, tilt = 0 } = {}) {
  const uid = `pb${Math.abs(Math.round(size * 97 + tilt * 13))}`;
  return `<svg class="pkr-rp-ball" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"
    style="transform:rotate(${tilt}deg)">
    <defs>
      <radialGradient id="${uid}top" cx="36%" cy="26%" r="78%">
        <stop offset="0" stop-color="#ff8e83"/><stop offset="55%" stop-color="#e8433c"/>
        <stop offset="100%" stop-color="#9d1d22"/>
      </radialGradient>
      <radialGradient id="${uid}bot" cx="34%" cy="70%" r="80%">
        <stop offset="0" stop-color="#ffffff"/><stop offset="58%" stop-color="#e2e9f5"/>
        <stop offset="100%" stop-color="#8b9ab5"/>
      </radialGradient>
      <radialGradient id="${uid}sh" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(12,18,38,.42)"/>
      </radialGradient>
      <linearGradient id="${uid}rim" x1="1" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="rgba(190,230,255,.85)"/>
        <stop offset="55%" stop-color="rgba(190,230,255,0)"/>
      </linearGradient>
      <radialGradient id="${uid}core" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#ffffff"/><stop offset="100%" stop-color="#9fe6ff"/>
      </radialGradient>
    </defs>
    <ellipse cx="52" cy="95" rx="30" ry="6" fill="rgba(6,18,44,.28)"/>
    <circle cx="50" cy="50" r="45" fill="url(#${uid}bot)" stroke="${OUT}" stroke-width="5"/>
    <path d="M5 50 A45 45 0 0 1 95 50 Z" fill="url(#${uid}top)" stroke="${OUT}" stroke-width="5"/>
    <rect x="5" y="43" width="90" height="13" fill="${OUT}"/>
    <circle cx="50" cy="50" r="45" fill="url(#${uid}sh)"/>
    <circle cx="50" cy="50" r="43" fill="none" stroke="url(#${uid}rim)" stroke-width="5"/>
    <circle cx="50" cy="50" r="17" fill="#eef3fb" stroke="${OUT}" stroke-width="5"/>
    <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2"/>
    <circle cx="50" cy="50" r="8" fill="url(#${uid}core)" stroke="#8fa3c4" stroke-width="2"/>
    <circle cx="50" cy="50" r="5.5" fill="#eaf6ff" opacity="${0.35 + glow * 0.65}"/>
    <path d="M22 26 a36 36 0 0 1 20 -13" fill="none" stroke="#fff" stroke-width="7"
      stroke-linecap="round" opacity=".62"/>
    <ellipse cx="34" cy="66" rx="10" ry="6" fill="#fff" opacity=".5"
      transform="rotate(-32 34 66)"/>
  </svg>`;
}

/** Small trophy for the winner plinth. */
export function trophySvg(size = 62) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <defs><linearGradient id="rpTro" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff3b0"/><stop offset="45%" stop-color="#ffd63b"/>
      <stop offset="100%" stop-color="#d98f10"/></linearGradient></defs>
    ${P('M26 16 H74 V38 C74 56 64 66 50 66 C36 66 26 56 26 38 Z', 'url(#rpTro)', '#7a4d06', 3)}
    ${P('M26 22 C10 22 8 42 26 46', 'none', '#7a4d06', 5)}
    ${P('M74 22 C90 22 92 42 74 46', 'none', '#7a4d06', 5)}
    ${P('M44 66 H56 V78 H44 Z', 'url(#rpTro)', '#7a4d06', 3)}
    ${P('M30 78 H70 L74 90 H26 Z', 'url(#rpTro)', '#7a4d06', 3)}
    ${F('M36 22 q4 22 12 30 q-16 -4 -18 -30 Z', 'rgba(255,255,255,.55)')}
  </svg>`;
}

/** A tiny star sparkle (used around the winner). */
export function sparkleSvg(size = 26, color = '#fff3b0') {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <path d="M50 4 C56 34 66 44 96 50 C66 56 56 66 50 96 C44 66 34 56 4 50 C34 44 44 34 50 4 Z"
      fill="${color}"/></svg>`;
}

/* ------------------------------------------------------------------ plinths */

/** Metal ramps for the three places: [rim, light, mid, dark, deep, faceInk]. */
const METAL = {
  1: ['#fff6c8', '#ffe57a', '#f5c02c', '#c9860c', '#8d5a04', '#4a2c00'],
  2: ['#ffffff', '#e9f1fb', '#c2cfe2', '#8e9db6', '#5f6d85', '#26303f'],
  3: ['#ffe0bd', '#f2b27a', '#d98a45', '#a9601f', '#77410f', '#3a1e05'],
};

/**
 * One short, rounded 3D plinth: elliptical top surface, curved cylinder body,
 * a soft contact shadow on the floor. viewBox origin is the SVG's own top-left;
 * the top-surface centre sits at y = `ry + 4`, which the screen uses to seat the
 * racer's feet exactly on the plinth.
 */
export function plinthSvg(place, { w = 340, faceH = 92, ry = 30 } = {}) {
  const [rim, light, mid, dark, deep, ink] = METAL[place] || METAL[3];
  const uid = `pl${place}`;
  const cx = w / 2;
  const rx = w / 2 - 10;
  const cy = ry + 4;                 // centre of the top ellipse
  const by = cy + faceH;             // centre of the bottom ellipse
  const h = by + ry + 30;            // room for the floor shadow
  return `<svg class="pkr-rp-plinth-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <defs>
      <linearGradient id="${uid}side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${deep}"/><stop offset="14%" stop-color="${dark}"/>
        <stop offset="38%" stop-color="${light}"/><stop offset="56%" stop-color="${mid}"/>
        <stop offset="84%" stop-color="${dark}"/><stop offset="100%" stop-color="${deep}"/>
      </linearGradient>
      <linearGradient id="${uid}vert" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(255,255,255,.32)"/>
        <stop offset="42%" stop-color="rgba(255,255,255,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,.38)"/>
      </linearGradient>
      <radialGradient id="${uid}top" cx="42%" cy="34%" r="78%">
        <stop offset="0" stop-color="${rim}"/><stop offset="52%" stop-color="${light}"/>
        <stop offset="100%" stop-color="${mid}"/>
      </radialGradient>
      <radialGradient id="${uid}sh" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="rgba(3,9,26,.68)"/>
        <stop offset="60%" stop-color="rgba(3,9,26,.34)"/>
        <stop offset="100%" stop-color="rgba(3,9,26,0)"/>
      </radialGradient>
      <radialGradient id="${uid}cs" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="rgba(0,0,0,.42)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <ellipse cx="${cx}" cy="${by + 16}" rx="${rx * 1.16}" ry="${ry * 0.92}" fill="url(#${uid}sh)"/>
    <path d="M${cx - rx} ${cy} V${by} A${rx} ${ry * 0.5} 0 0 0 ${cx + rx} ${by} V${cy} Z"
      fill="url(#${uid}side)" stroke="${ink}" stroke-width="3"/>
    <path d="M${cx - rx} ${cy} V${by} A${rx} ${ry * 0.5} 0 0 0 ${cx + rx} ${by} V${cy} Z"
      fill="url(#${uid}vert)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${uid}top)"
      stroke="${ink}" stroke-width="3"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.8}" ry="${ry * 0.66}" fill="${rim}" opacity=".38"/>
    <ellipse cx="${cx}" cy="${cy + ry * 0.28}" rx="${rx * 0.5}" ry="${ry * 0.5}" fill="url(#${uid}cs)"/>
    <path d="M${cx - rx + 6} ${cy + 10} V${by - 4}" stroke="rgba(255,255,255,.45)" stroke-width="6"
      stroke-linecap="round" fill="none" opacity=".5"/>
    <path d="M${cx - rx} ${by} A${rx} ${ry * 0.5} 0 0 0 ${cx + rx} ${by}"
      fill="none" stroke="rgba(255,255,255,.5)" stroke-width="3"/>
  </svg>`;
}

/* ------------------------------------------------------------------ figures */

function faceFor(shape, color, accent) {
  if (shape === 'spike') {
    return Ef(39, 52, 5, 5.6, '#f4e9ff') + Ef(61, 52, 5, 5.6, '#f4e9ff')
      + Ef(39, 52, 2.4, 2.8, '#2a1240') + Ef(61, 52, 2.4, 2.8, '#2a1240')
      + P('M37 66 q13 12 26 0 q-13 5 -26 0 Z', '#ffffff', OUT, 1.8);
  }
  if (shape === 'wing') {
    return Ef(40, 52, 4.4, 5, '#ffffff') + Ef(60, 52, 4.4, 5, '#ffffff')
      + Ef(40.6, 52.6, 2.2, 2.6, '#20182e') + Ef(60.6, 52.6, 2.2, 2.6, '#20182e')
      + L('M43 66 q7 6 14 0', OUT, 2.4);
  }
  if (shape === 'blob') {
    return L('M35 53 q5 5 10 0', OUT, 2.6) + L('M55 53 q5 5 10 0', OUT, 2.6)
      + L('M42 66 q8 7 16 0', OUT, 2.4)
      + `<circle cx="28" cy="60" r="5" fill="${accent}" opacity=".55"/>`
      + `<circle cx="72" cy="60" r="5" fill="${accent}" opacity=".55"/>`;
  }
  return Ef(40, 51, 4.2, 5, '#20182e') + Ef(60, 51, 4.2, 5, '#20182e')
    + Ef(41.4, 49.4, 1.6, 1.6, '#fff') + Ef(61.4, 49.4, 1.6, 1.6, '#fff')
    + L('M43 64 q7 6 14 0', OUT, 2.4)
    + `<circle cx="28" cy="62" r="5.4" fill="#f0554c" opacity=".9"/>`
    + `<circle cx="72" cy="62" r="5.4" fill="#f0554c" opacity=".9"/>`;
}

function crownFor(shape, color, accent) {
  if (shape === 'ears') {
    return P('M36 40 L26 8 L46 30 Z', color, OUT, 2.2) + P('M64 40 L74 8 L54 30 Z', color, OUT, 2.2)
      + F('M29 16 L26 8 L34 20 Z', accent) + F('M71 16 L74 8 L66 20 Z', accent);
  }
  if (shape === 'spike') {
    return P('M50 12 L58 32 L42 32 Z', color, OUT, 2)
      + P('M30 20 L42 34 L26 34 Z', color, OUT, 2) + P('M70 20 L58 34 L74 34 Z', color, OUT, 2);
  }
  if (shape === 'wing') {
    return P('M30 46 C10 26 2 44 8 62 C16 74 28 70 34 60 Z', accent, OUT, 2.2)
      + P('M70 46 C90 26 98 44 92 62 C84 74 72 70 66 60 Z', accent, OUT, 2.2);
  }
  return P('M32 40 C20 32 12 40 16 50 C20 58 30 54 35 47 Z', color, OUT, 2)
    + P('M68 40 C80 32 88 40 84 50 C80 58 70 54 65 47 Z', color, OUT, 2);
}

/**
 * Fallback creature figure. viewBox 0 0 100 100, feet on y=92.
 * `racer` = a roster entry ({ color, accent, shape }).
 */
export function racerFigureSvg(racer, size = 150) {
  const color = racer.color || '#7fc4ff';
  const accent = racer.accent || '#2b5aa8';
  const shape = racer.shape || 'ears';
  const body = shape === 'blob'
    ? E(50, 64, 34, 30, color) + F('M20 74 q30 16 60 0 q-8 18 -30 18 q-22 0 -30 -18 Z', accent)
    : P('M50 34 C74 34 84 54 84 68 C84 84 68 92 50 92 C32 92 16 84 16 68 C16 54 26 34 50 34 Z', color)
      + F('M50 92 C34 92 20 85 18 72 C26 84 38 88 50 88 C62 88 74 84 82 72 C80 85 66 92 50 92 Z', accent);
  return `<svg class="pkr-rp-figure" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    ${Ef(50, 92, 27, 5.5, 'rgba(6,14,34,.34)')}
    ${crownFor(shape, color, accent)}
    ${body}
    ${Ef(34, 90, 10, 5, accent)}${Ef(66, 90, 10, 5, accent)}
    ${faceFor(shape, color, accent)}
  </svg>`;
}

/**
 * Geometry the screen needs to seat a figure on a plinth.
 * `fig` is the figure's DRAWN height; the figure keeps to ~86% of that in width,
 * which stays comfortably narrower than `w` so the racer never overhangs its drum.
 */
export const PLINTH_SPEC = Object.freeze({
  1: { w: 404, faceH: 176, ry: 26, fig: 326 },
  2: { w: 348, faceH: 128, ry: 22, fig: 300 },
  3: { w: 348, faceH: 100, ry: 22, fig: 292 },
});

export default { pokeballSvg, trophySvg, sparkleSvg, racerFigureSvg, plinthSvg, PLINTH_SPEC, CONFETTI };
