/**
 * Item slot glyphs for the race HUD (piece: race-hud-and-countdown).
 * Pure inline SVG, no assets. Ids match src/core/sim.js ITEMS; a few friendly
 * aliases are accepted so URL params like `?item=thunder` still render.
 */

export const ITEM_ALIAS = {
  thunder: 'thunderbolt',
  thunderbolt: 'thunderbolt',
  bolt: 'thunderbolt',
  shell: 'green-shell',
  'green-shell': 'green-shell',
  'leaf-shell': 'green-shell',
  ball: 'poke-ball',
  'poke-ball': 'poke-ball',
  'pokeball': 'poke-ball',
  'hyper-beam': 'hyper-beam',
  'shadow-ball': 'shadow-ball',
  'boost-berry': 'boost-berry',
  berry: 'boost-berry',
};

export const ITEM_NAME = {
  'poke-ball': 'Poke Ball',
  thunderbolt: 'Thunderbolt',
  'green-shell': 'Leaf Shell',
  'hyper-beam': 'Hyper Beam',
  'shadow-ball': 'Shadow Ball',
  'boost-berry': 'Boost Berry',
};

/** Normalise anything the URL / sim can hand us to a known item id (or null). */
export function itemId(raw) {
  if (!raw) return null;
  const k = String(raw).toLowerCase();
  return ITEM_ALIAS[k] || (ITEM_NAME[k] ? k : null);
}

const G = {
  'poke-ball': `
    <circle cx="50" cy="50" r="36" fill="#f6f9ff"/>
    <path d="M14 50a36 36 0 0 1 72 0z" fill="#ec4a3f"/>
    <path d="M14 50h72" stroke="#141a28" stroke-width="8"/>
    <circle cx="50" cy="50" r="36" fill="none" stroke="#141a28" stroke-width="6"/>
    <circle cx="50" cy="50" r="12" fill="#fbfdff" stroke="#141a28" stroke-width="6"/>
    <circle cx="38" cy="34" r="8" fill="#fff" opacity=".45"/>`,
  thunderbolt: `
    <path d="M58 8 L22 54 h20 l-8 40 l40-52 H52 z"
          fill="url(#hudBoltG)" stroke="#7a4d00" stroke-width="5" stroke-linejoin="round"/>
    <path d="M55 17 L31 49 h16" fill="none" stroke="#fff6bd" stroke-width="5" stroke-linecap="round" opacity=".85"/>`,
  'green-shell': `
    <ellipse cx="50" cy="70" rx="39" ry="20" fill="#f3f7e6" stroke="#17421a" stroke-width="5"/>
    <path d="M11 70 A39 44 0 0 1 89 70 Z" fill="url(#hudShellG)" stroke="#17421a" stroke-width="5" stroke-linejoin="round"/>
    <path d="M50 27 v43 M28 36 l9 34 M72 36 l-9 34" stroke="#1d5c22" stroke-width="4" stroke-linecap="round" opacity=".7"/>
    <path d="M22 48 q28 -22 56 0" fill="none" stroke="#c9f3a2" stroke-width="5" stroke-linecap="round" opacity=".75"/>
    <ellipse cx="33" cy="72" rx="7" ry="3.4" fill="#fff" opacity=".65"/>`,
  'hyper-beam': `
    <path d="M50 4 L59 34 L88 22 L72 50 L96 62 L64 66 L70 96 L50 74 L30 96 L36 66 L4 62 L28 50 L12 22 L41 34 Z"
          fill="url(#hudBeamG)" stroke="#c8791a" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="17" fill="#fffbe6" stroke="#e6a833" stroke-width="4"/>`,
  'shadow-ball': `
    <circle cx="50" cy="52" r="34" fill="url(#hudShadeG)" stroke="#33195e" stroke-width="6"/>
    <circle cx="50" cy="50" r="14" fill="#e3d3ff" opacity=".85"/>
    <path d="M20 26 q10 -10 20 -4" fill="none" stroke="#cbb2ff" stroke-width="5" stroke-linecap="round" opacity=".7"/>`,
  'boost-berry': `
    <circle cx="50" cy="60" r="30" fill="#ff8330" stroke="#7d3208" stroke-width="6"/>
    <circle cx="40" cy="52" r="9" fill="#ffd2a5" opacity=".8"/>
    <path d="M50 32 C40 12 76 8 66 32 Z" fill="#4fb84c" stroke="#17421a" stroke-width="5" stroke-linejoin="round"/>`,
};

/** Item icon markup at a given pixel size (viewBox 0 0 100 100). */
export function itemSvg(raw, size = 78) {
  const id = itemId(raw);
  if (!id) return '';
  return `<svg class="hud-item-svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <defs>
      <linearGradient id="hudBoltG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff3a8"/><stop offset=".55" stop-color="#ffd12e"/><stop offset="1" stop-color="#f39b0d"/>
      </linearGradient>
      <radialGradient id="hudBeamG" cx=".5" cy=".4" r=".7">
        <stop offset="0" stop-color="#fff8d4"/><stop offset="1" stop-color="#ffc93c"/>
      </radialGradient>
      <linearGradient id="hudShellG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7ede6a"/><stop offset=".6" stop-color="#3fae44"/><stop offset="1" stop-color="#28833a"/>
      </linearGradient>
      <radialGradient id="hudShadeG" cx=".38" cy=".32" r=".8">
        <stop offset="0" stop-color="#a684ea"/><stop offset="1" stop-color="#5b31a8"/>
      </radialGradient>
    </defs>
    ${G[id]}
  </svg>`;
}

export function itemName(raw) {
  const id = itemId(raw);
  return id ? ITEM_NAME[id] : '';
}
