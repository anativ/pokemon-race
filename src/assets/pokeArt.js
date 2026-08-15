/**
 * Procedural creature art for the pre-race menus (character + track select).
 *
 * Self-contained: no imports, no external assets. Every racer id in
 * src/data/roster.js gets a BESPOKE silhouette - different body proportions,
 * wings, tails, horns, snouts and poses - so 24 cards read as 24 different
 * creatures at 96px, not one recoloured blob.
 *
 * Frame: viewBox "0 0 100 100", ground ~y=93, head roughly around y=26..46.
 * The lower ~6px is hidden behind the kart chassis in kartArt.js, so keep the
 * silhouette information in the top three quarters.
 */

const OUT = '#160f2a';

/* ------------------------------------------------------------------ atoms */
export const P = (d, fill, stroke = OUT, w = 2.4) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
export const F = (d, fill, o = 1) => `<path d="${d}" fill="${fill}" opacity="${o}"/>`;
export const E = (cx, cy, rx, ry, fill, stroke = OUT, w = 2.4) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
export const Ef = (cx, cy, rx, ry, fill, o = 1) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${o}"/>`;
export const L = (d, stroke, w = 2.2, o = 1) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" opacity="${o}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const C = (cx, cy, r, fill, stroke = OUT, w = 2.2) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;

/** darken/lighten a hex colour by amount (-1..1) */
export function shade(hex, amt) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
    return Math.max(0, Math.min(255, Math.round(x)));
  });
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/* ------------------------------------------------------------------ eyes */
export function eyes(y, dx = 12, r = 4.6, kind = 'dot', tint = '#141a2e') {
  const a = 50 - dx; const b = 50 + dx;
  if (kind === 'sleep') {
    return L(`M${a - 5.5} ${y} q5.5 5.5 11 0`, OUT, 2.8) + L(`M${b - 5.5} ${y} q5.5 5.5 11 0`, OUT, 2.8);
  }
  if (kind === 'slit') {
    return P(`M${a - 6.4} ${y - 3.6} L${a + 6} ${y - 0.4} L${a - 4} ${y + 3.8} Z`, tint, OUT, 1.3)
      + P(`M${b + 6.4} ${y - 3.6} L${b - 6} ${y - 0.4} L${b + 4} ${y + 3.8} Z`, tint, OUT, 1.3);
  }
  if (kind === 'big') {
    return E(a, y, r + 1.5, r + 2.4, '#ffffff', OUT, 1.7) + E(b, y, r + 1.5, r + 2.4, '#ffffff', OUT, 1.7)
      + Ef(a + 0.6, y + 0.9, r * 0.66, r * 0.84, tint) + Ef(b - 0.6, y + 0.9, r * 0.66, r * 0.84, tint)
      + Ef(a - 1, y - 1.6, 1.8, 1.8, '#fff') + Ef(b - 2.4, y - 1.6, 1.8, 1.8, '#fff');
  }
  if (kind === 'glow') {
    return Ef(a, y, r, r * 1.15, tint) + Ef(b, y, r, r * 1.15, tint)
      + Ef(a, y, r * 0.45, r * 0.55, '#fff8d6') + Ef(b, y, r * 0.45, r * 0.55, '#fff8d6');
  }
  if (kind === 'wide') {
    return Ef(a, y, r * 1.15, r * 1.3, '#ffffff') + Ef(b, y, r * 1.15, r * 1.3, '#ffffff')
      + Ef(a, y + 0.6, r * 0.55, r * 0.7, tint) + Ef(b, y + 0.6, r * 0.55, r * 0.7, tint);
  }
  if (kind === 'angry') {
    return Ef(a, y, r, r * 1.15, '#fff') + Ef(b, y, r, r * 1.15, '#fff')
      + Ef(a, y + 0.6, r * 0.5, r * 0.66, tint) + Ef(b, y + 0.6, r * 0.5, r * 0.66, tint)
      + L(`M${a - r - 1.5} ${y - r - 1} L${a + r} ${y - r + 1.4}`, OUT, 2.6)
      + L(`M${b + r + 1.5} ${y - r - 1} L${b - r} ${y - r + 1.4}`, OUT, 2.6);
  }
  return Ef(a, y, r, r * 1.2, tint) + Ef(b, y, r, r * 1.2, tint)
    + Ef(a + 1.5, y - 1.6, 1.7, 1.7, '#fff') + Ef(b + 1.5, y - 1.6, 1.7, 1.7, '#fff');
}

/* ---------------------------------------------------------------- mouths */
export const smile = (y, w = 6, x = 50) => L(`M${x - w} ${y} q${w} ${w * 0.9} ${w * 2} 0`, OUT, 2.4);
export const wMouth = (y, w = 7, x = 50) =>
  L(`M${x - w} ${y} q${w * 0.5} ${w * 0.75} ${w * 0.5} 0 q${w * 0.5} ${w * 0.75} ${w * 0.5} 0`, OUT, 2.2);
export const grin = (y, w = 13, gum = '#3a1c5c', x = 50) =>
  P(`M${x - w} ${y - 2} q${w} ${w} ${w * 2} 0 q-${w} ${w * 0.45} -${w * 2} 0 Z`, '#ffffff', OUT, 1.7)
  + L(`M${x - w * 0.6} ${y - 0.8} l1.6 4.8 M${x} ${y} l0 5.6 M${x + w * 0.6} ${y - 0.8} l-1.6 4.8`, gum, 1.3);
export const beak = (y, c = '#f6d24c', x = 50, w = 7) =>
  P(`M${x - w} ${y} L${x + w} ${y} L${x} ${y + w * 1.2} Z`, c, OUT, 2);
export const fangMouth = (y, w = 9, x = 50) =>
  L(`M${x - w} ${y} q${w} ${w * 0.8} ${w * 2} 0`, OUT, 2.4)
  + P(`M${x - w * 0.6} ${y + 1.4} l2.6 0 l-1.3 4 Z`, '#fff', OUT, 1)
  + P(`M${x + w * 0.6} ${y + 1.4} l-2.6 0 l1.3 4 Z`, '#fff', OUT, 1);
export const cheeks = (y, c = '#f0554c', dx = 22, r = 5.2) =>
  `<circle cx="${50 - dx}" cy="${y}" r="${r}" fill="${c}" opacity=".92"/>`
  + `<circle cx="${50 + dx}" cy="${y}" r="${r}" fill="${c}" opacity=".92"/>`;
export const shadow = (rx = 27) => Ef(50, 92, rx, 5.4, 'rgba(6,12,32,.28)');

/** flame blob, anchored at its base (x,y) */
export const flame = (x, y, s = 1) =>
  P(`M${x} ${y} c${-7 * s} ${-4 * s} ${-5 * s} ${-12 * s} ${1 * s} ${-16 * s}
      c${-1 * s} ${6 * s} ${4 * s} ${6 * s} ${4 * s} ${1 * s}
      c${5 * s} ${4 * s} ${5 * s} ${12 * s} ${-5 * s} ${15 * s} Z`, '#ffae2b', '#e2551f', 1.8)
  + P(`M${x} ${y - 3 * s} c${-3 * s} ${-2 * s} ${-2 * s} ${-6 * s} ${1 * s} ${-8 * s}
      c${2 * s} ${3 * s} ${3 * s} ${6 * s} ${-1 * s} ${8 * s} Z`, '#ffeaa0', 'none', 0);

/** two stubby legs standing on the ground */
export const legs = (c, dx = 13, top = 76, w = 8) =>
  P(`M${50 - dx - w / 2} ${top} h${w} v12 q0 4 -${w / 2 + 2} 4 q-${w / 2 + 3} 0 -${w / 2 + 3} -5 Z`, c)
  + P(`M${50 + dx - w / 2} ${top} h${w} v12 q0 4 ${w / 2 + 2} 4 q${w / 2 + 3} 0 ${w / 2 + 3} -5 Z`, c);
/** rounded paws / feet */
export const feet = (c, dx = 17, y = 91, rx = 10.5) =>
  Ef(50 - dx, y, rx, 5, c) + Ef(50 + dx, y, rx, 5, c);

/* ==================================================================== species
 * Each entry is drawn from scratch: (color, accent, dark, light) -> SVG body.
 * Layer order: things behind -> body -> limbs -> head -> face.
 */
export const SPECIES = {};

/* --- batch 1 : mouse, ghost, jackal, cat, fox, giant ---------------------- */
Object.assign(SPECIES, {
  /** small round-headed mouse, huge pointed ears, zig-zag bolt tail */
  pikachu: (c, a, d, l) =>
    P('M70 74 L84 56 L74 53 L92 30 L86 52 L96 55 L80 78 Z', '#f7cf3c', OUT, 2.2)
    + shadow(22)
    + P('M36 34 L18 3 L30 5 L46 26 Z', c, OUT, 2.2) + P('M26 12 L18 3 L30 5 Z', '#2a2233')
    + P('M64 34 L82 3 L70 5 L54 26 Z', c, OUT, 2.2) + P('M74 12 L82 3 L70 5 Z', '#2a2233')
    + E(50, 74, 20, 19, c) + Ef(50, 80, 13, 12, shade(c, 0.28))
    + Ef(28, 74, 7.5, 9, c) + Ef(72, 74, 7.5, 9, c)
    + Ef(38, 92, 9, 5, shade(c, -0.18)) + Ef(62, 92, 9, 5, shade(c, -0.18))
    + E(50, 44, 25, 22, c)
    + L('M32 26 q10 -5 18 -1 M68 26 q-10 -5 -18 -1', shade(c, -0.4), 3, 0.5)
    + eyes(42, 11, 4.2, 'big', '#2b2338')
    + cheeks(52, '#ef5a4c', 19, 5.4)
    + wMouth(53, 5) + L('M50 50 v3', OUT, 2),

  /** squat wide ghost: spiked ridge, no neck, wide toothy grin, stubby limbs */
  gengar: (c, a, d, l) => {
    const spike = (x, y, w, h) => P(`M${x - w} ${y} L${x} ${y - h} L${x + w} ${y} Z`, c, OUT, 2);
    return shadow(30)
      + spike(24, 46, 8, 20) + spike(76, 46, 8, 20)
      + spike(36, 32, 7, 16) + spike(64, 32, 7, 16) + spike(50, 26, 8, 14)
      + P('M50 24 C76 24 90 44 90 62 C90 80 72 90 50 90 C28 90 10 80 10 62 C10 44 24 24 50 24 Z', c)
      + F('M14 70 q36 16 72 0 q-10 20 -36 20 q-26 0 -36 -20 Z', a)
      + P('M14 62 L2 55 L15 51 Z', a, OUT, 2) + P('M86 62 L98 55 L85 51 Z', a, OUT, 2)
      + P('M28 88 l-6 6 h14 Z', a, OUT, 2) + P('M72 88 l6 6 h-14 Z', a, OUT, 2)
      + eyes(48, 15, 4.6, 'glow', '#f6f2ff')
      + grin(64, 19, '#4a2d80')
      + L('M31 41 l12 4 M69 41 l-12 4', OUT, 2.4);
  },

  /** tall slim jackal: side-on muzzle, long ears, chest spike, thin legs */
  lucario: (c, a, d, l) =>
    P('M64 72 C82 74 88 88 78 94 C86 84 76 78 64 80 Z', a, OUT, 2.2)
    + shadow(19)
    + P('M40 34 L30 4 L44 22 Z', c, OUT, 2.2) + P('M60 34 L70 4 L56 22 Z', c, OUT, 2.2)
    + P('M50 40 C62 40 70 52 70 64 C70 80 62 90 50 90 C38 90 30 80 30 64 C30 52 38 40 50 40 Z', c)
    + F('M36 52 q14 -6 28 0 q-4 22 -14 24 q-10 -2 -14 -24 Z', '#e7c98f')
    + P('M28 56 q-8 12 -4 24 q6 6 10 -2 q-4 -10 0 -20 Z', c, OUT, 2)
    + P('M72 56 q8 12 4 24 q-6 6 -10 -2 q4 -10 0 -20 Z', c, OUT, 2)
    + Ef(40, 92, 9, 5, '#2b3550') + Ef(60, 92, 9, 5, '#2b3550')
    + E(50, 32, 19, 16, c)
    + P('M50 30 C64 30 74 34 74 39 C74 44 64 46 50 45 Z', c, OUT, 2.2)
    + `<circle cx="70" cy="38" r="2.4" fill="${OUT}"/>`
    + F('M34 26 q16 -8 32 0 q-16 5 -32 0 Z', a)
    + eyes(30, 9, 3.6, 'slit', '#d8442c')
    + C(50, 58, 5, '#f1cd52')
    + L('M52 42 q8 3 14 0', OUT, 2),

  /** cat: triangular ears, gold charm, whiskers, curling tail */
  meowth: (c, a, d, l) =>
    P('M74 78 C94 76 96 54 84 46 C96 60 88 70 72 71 Z', c, OUT, 2.2)
    + shadow(22)
    + E(50, 70, 22, 22, c) + Ef(50, 76, 14, 14, shade(c, 0.22))
    + Ef(29, 72, 7, 9, c) + Ef(71, 72, 7, 9, c)
    + Ef(40, 92, 8.5, 5, c) + Ef(60, 92, 8.5, 5, c)
    + P('M30 34 L22 8 L46 26 Z', c, OUT, 2.2) + F('M31 29 L27 15 L40 26 Z', '#e0796f')
    + P('M70 34 L78 8 L54 26 Z', c, OUT, 2.2) + F('M69 29 L73 15 L60 26 Z', '#e0796f')
    + E(50, 44, 24, 20, c)
    + `<ellipse cx="50" cy="30" rx="8" ry="6" fill="#f6cf3f" stroke="${OUT}" stroke-width="2.2"/>`
    + eyes(43, 11, 4.2, 'big', '#2b2338')
    + L('M26 46 h13 M25 52 h14 M74 46 h-13 M75 52 h-14', OUT, 1.6)
    + P('M46 52 h8 l-4 4 Z', '#e0796f')
    + wMouth(57, 6),

  /** fox: four legs, oversized bushy tail, thick neck ruff, big ears */
  eevee: (c, a, d, l) =>
    P('M70 84 C96 84 100 46 78 38 C94 52 84 72 66 74 Z', '#f4e6c6', OUT, 2.4)
    + shadow(24)
    + E(56, 70, 24, 18, c)
    + P('M40 78 h8 v14 h-8 Z', shade(c, -0.14)) + P('M64 78 h8 v14 h-8 Z', shade(c, -0.14))
    + Ef(44, 92, 7, 4.5, c) + Ef(68, 92, 7, 4.5, c)
    + P('M28 32 L16 4 L40 20 Z', c, OUT, 2.2) + F('M29 27 L22 12 L36 22 Z', '#8b5a2a')
    + P('M64 30 L74 2 L52 18 Z', c, OUT, 2.2) + F('M63 25 L69 11 L57 20 Z', '#8b5a2a')
    + P('M24 56 q22 -14 44 -2 q-6 12 -22 13 q-16 -1 -22 -11 Z', '#f4e6c6', OUT, 2.2)
    + E(46, 42, 21, 18, c)
    + P('M46 44 C58 44 64 48 64 52 C64 56 56 58 46 57 Z', c, OUT, 2.2)
    + `<path d="M60 50 l6 0 l-3 4 Z" fill="${OUT}"/>`
    + eyes(40, 10, 4.2, 'big', '#3a2a1a')
    + wMouth(54, 5, 58),

  /** the giant: vast belly, tiny ears, arms flung out, asleep */
  snorlax: (c, a, d, l) =>
    shadow(33)
    + P('M50 20 C80 20 94 46 94 64 C94 84 74 93 50 93 C26 93 6 84 6 64 C6 46 20 20 50 20 Z', c)
    + P('M50 46 C68 46 80 58 80 72 C80 86 66 93 50 93 C34 93 20 86 20 72 C20 58 32 46 50 46 Z', '#eee2b8', OUT, 2.2)
    + P('M8 58 C-2 62 0 78 10 80 C18 81 22 72 20 64 Z', c, OUT, 2.2)
    + P('M92 58 C102 62 100 78 90 80 C82 81 78 72 80 64 Z', c, OUT, 2.2)
    + P('M28 30 L22 16 L40 26 Z', c, OUT, 2) + P('M72 30 L78 16 L60 26 Z', c, OUT, 2)
    + eyes(40, 15, 4.2, 'sleep') + smile(52, 9)
    + L('M40 52 q10 8 20 0', OUT, 2.4)
    + `<text x="70" y="24" font-size="15" fill="#e8f6ff" font-family="Verdana" opacity=".95">z</text>`
    + `<text x="80" y="13" font-size="10" fill="#e8f6ff" font-family="Verdana" opacity=".75">z</text>`,
});

/* --- batch 2 : dragon, ninja, shark, psychic, egg, fighter ---------------- */
Object.assign(SPECIES, {
  /** wings spread wide, long neck + snout, back horns, flame tail */
  charizard: (c, a, d, l) =>
    P('M34 44 L12 14 C7 9 4 16 6 26 L10 38 L5 42 L11 56 C15 64 26 60 34 56 Z', '#4e93b4', OUT, 2.2)
    + L('M12 18 L28 46 M9 40 L30 55', '#2f6d8c', 1.8, 0.85)
    + P('M66 44 L88 14 C93 9 96 16 94 26 L90 38 L95 42 L89 56 C85 64 74 60 66 56 Z', '#4e93b4', OUT, 2.2)
    + L('M88 18 L72 46 M91 40 L70 55', '#2f6d8c', 1.8, 0.85)
    + P('M62 72 C82 76 92 66 88 54 C98 68 86 86 64 82 Z', c, OUT, 2.2)
    + flame(92, 50, 1.15)
    + shadow(23)
    + P('M50 44 C64 44 74 58 74 72 C74 86 62 92 50 92 C38 92 26 86 26 72 C26 58 36 44 50 44 Z', c)
    + F('M36 60 q14 -6 28 0 q-3 26 -14 30 q-11 -4 -14 -30 Z', '#f7dfa2')
    + Ef(24, 66, 7, 10, c) + Ef(76, 66, 7, 10, c)
    + Ef(38, 92, 9, 5, '#f7dfa2') + Ef(62, 92, 9, 5, '#f7dfa2')
    + P('M42 52 C40 34 46 24 56 24 C66 24 72 32 70 44 Z', c, OUT, 2.4)
    + P('M50 30 C68 26 80 32 80 38 C80 44 68 46 52 43 Z', c, OUT, 2.4)
    + F('M56 40 C66 41 74 40 78 38 C74 43 64 44 56 43 Z', '#f7dfa2')
    + P('M46 24 L36 8 L52 20 Z', a, OUT, 2) + P('M58 22 L54 4 L66 20 Z', a, OUT, 2)
    + `<circle cx="75" cy="34" r="2" fill="${OUT}"/><circle cx="70" cy="33" r="2" fill="${OUT}"/>`
    + eyes(30, 7, 3.4, 'slit', '#3d8ad8')
    + L('M58 40 q10 2 18 -1', OUT, 2)
    + P('M60 42 l4 5 l-4 0 Z', '#fff'),

  /** crouched ninja frog: head fins, long tongue-scarf, webbed hands */
  greninja: (c, a, d, l) =>
    shadow(21)
    + P('M50 40 C62 40 70 54 70 68 C70 84 62 92 50 92 C38 92 30 84 30 68 C30 54 38 40 50 40 Z', c)
    + F('M38 62 q12 -5 24 0 q-4 24 -12 26 q-8 -2 -12 -26 Z', '#dfe9f6')
    + P('M30 60 q-14 8 -16 20 q8 6 14 -2 q0 -10 6 -12 Z', c, OUT, 2.2)
    + P('M70 60 q14 8 16 20 q-8 6 -14 -2 q0 -10 -6 -12 Z', c, OUT, 2.2)
    + E(50, 32, 20, 17, c)
    + P('M32 24 C20 6 34 8 42 22 Z', a, OUT, 2.2) + P('M68 24 C80 6 66 8 58 22 Z', a, OUT, 2.2)
    + P('M30 44 q20 13 40 0 q-3 9 -20 11 q-17 -2 -20 -11 Z', '#f4a6c6', OUT, 2.2)
    + P('M39 54 C34 66 36 78 43 86 C40 72 41 62 46 56 Z', '#f4a6c6', OUT, 2)
    + P('M61 54 C66 66 64 78 57 86 C60 72 59 62 54 56 Z', '#f4a6c6', OUT, 2)
    + eyes(30, 10, 4.2, 'slit', '#f6e14c')
    + L('M40 40 q10 5 20 0', '#eaf1fb', 2.8),

  /** land shark: hammer head fins, blade arms, huge tail fin, stocky legs */
  garchomp: (c, a, d, l) =>
    P('M70 74 C90 72 96 52 84 42 C100 54 96 82 70 84 Z', c, OUT, 2.2)
    + shadow(25)
    + P('M50 40 C66 40 76 56 76 70 C76 86 64 92 50 92 C36 92 24 86 24 70 C24 56 34 40 50 40 Z', c)
    + F('M34 60 q16 -6 32 0 q-4 24 -16 28 q-12 -4 -16 -28 Z', '#e6edf6')
    + P('M24 58 L6 52 L18 66 L14 78 L28 72 Z', c, OUT, 2.2)
    + P('M76 58 L94 52 L82 66 L86 78 L72 72 Z', c, OUT, 2.2)
    + P('M34 88 l-8 6 h16 Z', shade(c, -0.2), OUT, 2) + P('M66 88 l8 6 h-16 Z', shade(c, -0.2), OUT, 2)
    + P('M50 14 C62 14 72 24 72 34 C72 44 62 48 50 48 C38 48 28 44 28 34 C28 24 38 14 50 14 Z', c, OUT, 2.4)
    + P('M28 30 L4 18 L30 24 Z', c, OUT, 2.2) + P('M72 30 L96 18 L70 24 Z', c, OUT, 2.2)
    + P('M50 8 L54 18 L46 18 Z', a, OUT, 2)
    + F('M34 40 q16 8 32 0 q-16 12 -32 0 Z', '#e6edf6')
    + eyes(30, 11, 3.6, 'slit', '#f6e14c')
    + fangMouth(41, 11),

  /** psychic humanoid: narrow torso, long neck, head tube, thick curling tail */
  mewtwo: (c, a, d, l) =>
    P('M66 78 C90 78 96 52 82 40 C100 50 96 88 66 88 Z', c, OUT, 2.4)
    + shadow(18)
    + P('M50 44 C60 44 68 56 68 70 C68 84 60 92 50 92 C40 92 32 84 32 70 C32 56 40 44 50 44 Z', c)
    + F('M40 58 q10 -4 20 0 q-3 22 -10 26 q-7 -4 -10 -26 Z', a)
    + P('M32 58 q-12 8 -12 20 q4 8 10 2 q-2 -12 6 -14 Z', c, OUT, 2.2)
    + P('M68 58 q12 8 12 20 q-4 8 -10 2 q2 -12 -6 -14 Z', c, OUT, 2.2)
    + P('M46 40 h8 v10 h-8 Z', c, OUT, 2)
    + P('M62 26 C76 30 78 44 70 52 C74 42 70 34 58 32 Z', c, OUT, 2.2)
    + P('M50 10 C62 10 70 20 70 30 C70 40 62 44 50 44 C38 44 30 40 30 30 C30 20 38 10 50 10 Z', c, OUT, 2.4)
    + P('M38 12 L34 2 L46 10 Z', c, OUT, 2) + P('M62 12 L66 2 L54 10 Z', c, OUT, 2)
    + eyes(26, 9, 3.6, 'glow', '#8f5fd0')
    + smile(35, 4),

  /** egg in a shell: zig-zag shell rim, red/blue shapes, spike crown */
  togepi: (c, a, d, l) =>
    shadow(23)
    + P('M50 16 C70 16 82 44 82 64 C82 82 68 92 50 92 C32 92 18 82 18 64 C18 44 30 16 50 16 Z',
      '#fdf7e2', OUT, 2.4)
    + P('M20 60 L28 50 L36 60 L44 50 L52 60 L60 50 L68 60 L76 50 L82 60 L82 74 Q50 94 18 74 Z',
      '#fffdf6', OUT, 2)
    + `<path d="M28 74 l7 -9 l7 9 Z" fill="#e2534c"/><path d="M56 76 l7 -9 l7 9 Z" fill="#3d8ad8"/>`
    + `<circle cx="50" cy="70" r="4" fill="#3fb27a"/>`
    + P('M42 14 L50 26 L58 14 Z', a, OUT, 2)
    + P('M28 24 L40 30 L34 16 Z', a, OUT, 2) + P('M72 24 L60 30 L66 16 Z', a, OUT, 2)
    + Ef(14, 64, 7, 8, '#fdf7e2') + Ef(86, 64, 7, 8, '#fdf7e2')
    + eyes(40, 11, 4.4, 'big', '#3a2a1a')
    + smile(51, 5)
    + cheeks(48, '#f4a2a8', 20, 4.4),

  /** bird fighter: long legs, hair crest, beak, flaming wrists */
  blaziken: (c, a, d, l) =>
    shadow(20)
    + flame(16, 70, 0.95) + flame(84, 70, 0.95)
    + P('M42 74 h6 v18 h-6 Z', '#f2e2c4') + P('M52 74 h6 v18 h-6 Z', '#f2e2c4')
    + Ef(40, 92, 9, 4.6, c) + Ef(60, 92, 9, 4.6, c)
    + P('M50 34 C64 34 72 48 72 60 C72 74 62 80 50 80 C38 80 28 74 28 60 C28 48 36 34 50 34 Z', c)
    + F('M38 48 q12 -5 24 0 q-4 22 -12 26 q-8 -4 -12 -26 Z', '#f7e6c8')
    + P('M28 52 q-12 8 -12 18 q6 6 10 0 q-2 -10 6 -12 Z', c, OUT, 2.2)
    + P('M72 52 q12 8 12 18 q-6 6 -10 0 q2 -10 -6 -12 Z', c, OUT, 2.2)
    + E(50, 26, 17, 15, c)
    + P('M50 6 L58 26 L42 26 Z', '#f6e14c', OUT, 2)
    + P('M32 12 L44 28 L28 28 Z', '#f6e14c', OUT, 2) + P('M68 12 L56 28 L72 28 Z', '#f6e14c', OUT, 2)
    + eyes(24, 9, 3.4, 'slit', '#f6e14c')
    + beak(31, '#f2e2c4', 50, 7),
});

/* --- batch 3 : gown, floater, fairy, armour, four-arms, chunky dragon ----- */
Object.assign(SPECIES, {
  /** flowing gown that flares to the floor, hair fins, chest fin */
  gardevoir: (c, a, d, l) =>
    shadow(26)
    + P('M50 42 C64 42 74 62 80 93 L20 93 C26 62 36 42 50 42 Z', '#f7fbff', OUT, 2.4)
    + F('M50 52 C58 52 64 66 66 84 L34 84 C36 66 42 52 50 52 Z', '#e3ecf7')
    + P('M42 60 L50 88 L58 60 Z', a, OUT, 2)
    + P('M34 46 q-16 8 -18 26 q10 -4 12 -14 Z', '#f7fbff', OUT, 2.2)
    + P('M66 46 q16 8 18 26 q-10 -4 -12 -14 Z', '#f7fbff', OUT, 2.2)
    + E(50, 28, 13, 14, '#f7fbff')
    + P('M50 14 C64 14 70 22 70 30 C64 24 58 22 50 22 C42 22 36 24 30 30 C30 22 36 14 50 14 Z', c, OUT, 2.2)
    + P('M36 24 C20 18 26 42 40 34 Z', c, OUT, 2.2) + P('M64 24 C80 18 74 42 60 34 Z', c, OUT, 2.2)
    + eyes(29, 6, 3, 'glow', '#cf5a80')
    + smile(36, 3.4),

  /** floating: small round body high on the frame, long tail with oval tip */
  mew: (c, a, d, l) =>
    L('M64 66 C88 66 92 34 76 26', shade(c, -0.18), 4.5)
    + Ef(74, 22, 6, 8, c)
    + Ef(50, 92, 14, 3.6, 'rgba(6,12,32,.2)')
    + E(50, 50, 22, 21, c) + Ef(50, 58, 13, 11, l)
    + P('M34 34 L26 16 L44 28 Z', c, OUT, 2) + P('M66 34 L74 16 L56 28 Z', c, OUT, 2)
    + P('M30 58 q-10 4 -10 12 q6 4 9 -2 Z', c, OUT, 2)
    + P('M70 58 q10 4 10 12 q-6 4 -9 -2 Z', c, OUT, 2)
    + Ef(38, 76, 8, 11, c) + Ef(62, 76, 8, 11, c)
    + eyes(46, 9, 3.8, 'big', '#3a2a44')
    + wMouth(58, 5)
    + cheeks(54, '#f4a4bd', 16, 3.6),

  /** fairy: antennae with bulbs, translucent wings, round body, big feet */
  celebi: (c, a, d, l) =>
    P('M28 44 C6 34 4 62 26 62 Z', '#dff6e2', OUT, 2) + P('M72 44 C94 34 96 62 74 62 Z', '#dff6e2', OUT, 2)
    + shadow(20)
    + L('M40 30 C34 16 30 12 26 8', shade(c, -0.3), 2.6) + C(25, 6, 4, a)
    + L('M60 30 C66 16 70 12 74 8', shade(c, -0.3), 2.6) + C(75, 6, 4, a)
    + E(50, 62, 21, 22, c) + Ef(50, 70, 12, 11, l)
    + Ef(30, 62, 6, 8, c) + Ef(70, 62, 6, 8, c)
    + Ef(40, 90, 8, 5, c) + Ef(60, 90, 8, 5, c)
    + E(50, 38, 18, 15, c)
    + eyes(37, 8, 4, 'big', '#2f4a22')
    + smile(48, 4),

  /** armoured colossus: nose horn, spine plates, thick tail, blocky legs */
  tyranitar: (c, a, d, l) =>
    P('M72 78 C94 76 100 54 88 44 C104 58 100 88 72 88 Z', c, OUT, 2.4)
    + shadow(29)
    + P('M50 34 C70 34 82 52 82 70 C82 86 68 92 50 92 C32 92 18 86 18 70 C18 52 30 34 50 34 Z', c)
    + P('M30 62 q20 10 40 0 q-4 24 -20 26 q-16 -2 -20 -26 Z', '#dceeb8', OUT, 2)
    + P('M78 46 L92 38 L84 52 Z', shade(c, -0.25), OUT, 2)
    + P('M84 58 L98 54 L88 66 Z', shade(c, -0.25), OUT, 2)
    + P('M16 58 q-10 8 -8 18 q8 6 12 -2 q-4 -8 2 -14 Z', c, OUT, 2.2)
    + P('M84 60 q10 8 8 18 q-8 6 -12 -2 q4 -8 -2 -14 Z', c, OUT, 2.2)
    + P('M30 84 h14 v10 h-16 Z', shade(c, -0.15), OUT, 2)
    + P('M56 84 h14 v10 h-16 Z', shade(c, -0.15), OUT, 2)
    + P('M50 12 C66 12 76 22 76 32 C76 42 64 46 50 46 C36 46 24 42 24 32 C24 22 34 12 50 12 Z', c, OUT, 2.4)
    + P('M50 4 L56 16 L44 16 Z', a, OUT, 2)
    + P('M24 26 L10 16 L26 18 Z', c, OUT, 2) + P('M76 26 L90 16 L74 18 Z', c, OUT, 2)
    + `<path d="M42 66 l8 -8 l8 8 l-8 8 Z" fill="#3d8ad8" stroke="${OUT}" stroke-width="1.8"/>`
    + eyes(28, 11, 3.6, 'angry', '#e8434c')
    + fangMouth(38, 11),

  /** four arms, wide shoulders, narrow waist, three head ridges */
  machamp: (c, a, d, l) =>
    shadow(26)
    + P('M50 30 C68 30 76 40 78 54 C80 68 72 76 66 78 L34 78 C28 76 20 68 22 54 C24 40 32 30 50 30 Z', c)
    + P('M36 76 h12 v18 h-12 Z', shade(c, -0.16)) + P('M52 76 h12 v18 h-12 Z', shade(c, -0.16))
    + Ef(38, 94, 9, 4.4, a) + Ef(62, 94, 9, 4.4, a)
    + P('M24 44 C10 44 4 54 8 62 C12 70 22 68 26 60 Z', c, OUT, 2.2)
    + P('M76 44 C90 44 96 54 92 62 C88 70 78 68 74 60 Z', c, OUT, 2.2)
    + P('M26 62 C12 66 10 78 18 82 C26 86 32 78 32 70 Z', c, OUT, 2.2)
    + P('M74 62 C88 66 90 78 82 82 C74 86 68 78 68 70 Z', c, OUT, 2.2)
    + F('M32 52 q18 8 36 0 q-6 20 -18 22 q-12 -2 -18 -22 Z', '#e8eef6')
    + E(50, 22, 16, 15, shade(c, 0.14))
    + `<circle cx="40" cy="9" r="4" fill="${a}" stroke="${OUT}" stroke-width="2"/>`
    + `<circle cx="50" cy="6" r="4.4" fill="${a}" stroke="${OUT}" stroke-width="2"/>`
    + `<circle cx="60" cy="9" r="4" fill="${a}" stroke="${OUT}" stroke-width="2"/>`
    + eyes(21, 8, 4, 'angry', '#1d2a3c')
    + fangMouth(30, 8),

  /** chunky friendly dragon: small wings, antennae, big cream belly, snout */
  dragonite: (c, a, d, l) =>
    P('M62 76 C84 78 92 64 84 54 C98 66 90 88 62 86 Z', c, OUT, 2.2)
    + P('M28 46 C10 38 6 56 20 62 L32 58 Z', a, OUT, 2.2)
    + P('M72 46 C90 38 94 56 80 62 L68 58 Z', a, OUT, 2.2)
    + shadow(26)
    + P('M50 36 C70 36 80 54 80 70 C80 86 66 92 50 92 C34 92 20 86 20 70 C20 54 30 36 50 36 Z', c)
    + P('M50 52 C64 52 72 64 72 76 C72 88 62 92 50 92 C38 92 28 88 28 76 C28 64 36 52 50 52 Z', '#f9ebc6', OUT, 2.2)
    + Ef(22, 64, 7, 10, c) + Ef(78, 64, 7, 10, c)
    + Ef(38, 92, 9, 5, '#f9ebc6') + Ef(62, 92, 9, 5, '#f9ebc6')
    + E(50, 26, 19, 17, c)
    + P('M50 30 C64 30 70 34 70 38 C70 43 60 45 50 44 Z', c, OUT, 2.2)
    + L('M40 12 q-4 -8 -10 -8', shade(c, -0.25), 2.6) + C(29, 3, 3.4, a)
    + L('M60 12 q4 -8 10 -8', shade(c, -0.25), 2.6) + C(71, 3, 3.4, a)
    + P('M32 16 C24 6 38 8 42 18 Z', c, OUT, 2) + P('M68 16 C76 6 62 8 58 18 Z', c, OUT, 2)
    + eyes(24, 9, 4, 'big', '#2f2a22')
    + `<circle cx="66" cy="36" r="1.8" fill="${OUT}"/>`
    + L('M56 40 q8 2 12 0', OUT, 2),
});

/* --- batch 4 : balloon, serpent, turtle, lizard, quadruped, blob ---------- */
Object.assign(SPECIES, {
  /** balloon: one big circle, hair curl, stub ears, huge blue eyes */
  jigglypuff: (c, a, d, l) =>
    shadow(28)
    + C(50, 58, 34, c, OUT, 2.6)
    + F('M22 76 q28 16 56 0 q-12 16 -28 16 q-16 0 -28 -16 Z', a)
    + P('M28 30 C14 18 30 10 40 20 C32 18 26 24 32 30 Z', c, OUT, 2.4)
    + P('M28 40 C18 30 24 46 36 44 Z', c, OUT, 2) + P('M72 40 C82 30 76 46 64 44 Z', c, OUT, 2)
    + Ef(20, 66, 6, 8, c) + Ef(80, 66, 6, 8, c)
    + eyes(54, 13, 6.4, 'big', '#3f74c0')
    + smile(70, 6)
    + cheeks(66, '#f6b6c8', 24, 4.6),

  /** serpent: long coiled body with fins + gold rings, snouted head */
  rayquaza: (c, a, d, l) =>
    Ef(50, 92, 24, 4, 'rgba(6,12,32,.22)')
    + L('M14 90 C2 74 20 62 40 70 C62 79 78 70 70 56 C64 46 46 46 42 58',
      shade(c, -0.35), 16)
    + L('M14 90 C2 74 20 62 40 70 C62 79 78 70 70 56 C64 46 46 46 42 58', c, 11.5)
    + P('M20 78 l-10 -4 l10 -4 Z', '#f6e14c', OUT, 1.6)
    + P('M44 76 l-2 -10 l8 6 Z', '#f6e14c', OUT, 1.6)
    + P('M70 68 l10 -2 l-8 8 Z', '#f6e14c', OUT, 1.6)
    + `<circle cx="30" cy="72" r="3" fill="#f6e14c"/><circle cx="56" cy="78" r="3" fill="#f6e14c"/>`
    + `<circle cx="74" cy="62" r="3" fill="#f6e14c"/>`
    + P('M34 40 C34 26 46 20 58 24 C70 28 74 42 66 50 C58 58 40 54 34 40 Z', c, OUT, 2.4)
    + P('M34 44 C22 46 20 56 30 56 Z', c, OUT, 2)
    + P('M28 30 L10 20 L34 28 Z', '#f6e14c', OUT, 2)
    + P('M64 22 L80 8 L72 30 Z', '#f6e14c', OUT, 2)
    + P('M50 18 L56 4 L60 20 Z', '#f6e14c', OUT, 2)
    + F('M42 46 q14 10 24 -2 q-6 14 -14 14 q-8 0 -10 -12 Z', a)
    + eyes(36, 9, 3.4, 'slit', '#f6e14c')
    + L('M42 48 q12 8 22 -2', OUT, 2.4),

  /** turtle: patterned shell dominating the body, small head, curl tail */
  squirtle: (c, a, d, l) => {
    const sh = '#e6c489';
    return P('M76 82 C94 76 92 60 80 52 C92 66 84 74 70 74 Z', '#f4e2b4', OUT, 2)
      + shadow(26)
      + Ef(24, 78, 8, 10, c) + Ef(76, 78, 8, 10, c)
      + P('M50 44 C74 44 84 58 84 70 C84 84 70 92 50 92 C30 92 16 84 16 70 C16 58 26 44 50 44 Z',
        '#b8783c', OUT, 2.4)
      + E(50, 72, 21, 18, '#f7e3b8')
      + L('M31 66 h38 M33 76 h34 M38 85 h24', shade('#f7e3b8', -0.34), 2)
      + L('M50 54 v0', shade(sh, -0.38), 1.8)
      + E(50, 33, 23, 20, c)
      + eyes(31, 10, 4.6, 'big', '#2b3f56')
      + smile(44, 6)
      + cheeks(41, '#f2a0a8', 18, 4);
  },

  /** small lizard: upright, cream belly, snout, flame tail */
  charmander: (c, a, d, l) =>
    P('M68 78 C86 78 92 64 84 56 C96 66 90 88 66 86 Z', c, OUT, 2.2)
    + flame(92, 52, 1)
    + shadow(21)
    + P('M50 44 C64 44 72 58 72 72 C72 86 62 92 50 92 C38 92 28 86 28 72 C28 58 36 44 50 44 Z', c)
    + P('M50 58 C60 58 66 68 66 78 C66 88 58 92 50 92 C42 92 34 88 34 78 C34 68 40 58 50 58 Z', '#f9e2b4', OUT, 2)
    + Ef(26, 66, 6.5, 9, c) + Ef(74, 66, 6.5, 9, c)
    + Ef(38, 92, 8.5, 5, '#f9e2b4') + Ef(62, 92, 8.5, 5, '#f9e2b4')
    + E(50, 30, 21, 18, c)
    + P('M50 30 C64 30 70 34 70 38 C70 43 60 45 50 44 Z', c, OUT, 2.2)
    + `<circle cx="66" cy="35" r="1.7" fill="${OUT}"/>`
    + eyes(28, 9, 4.2, 'big', '#3a2a1a')
    + L('M56 40 q8 2 12 0', OUT, 2),

  /** quadruped with a bulb on its back: four legs, wide grin, spots */
  bulbasaur: (c, a, d, l) =>
    shadow(28)
    + E(50, 32, 17, 15, '#77c46a')
    + P('M40 26 C32 8 54 12 54 26 Z', '#57a256', OUT, 2)
    + P('M60 26 C68 8 46 12 46 26 Z', '#6db55c', OUT, 2)
    + E(50, 66, 31, 24, c)
    + P('M28 82 h11 v11 h-11 Z', shade(c, -0.14)) + P('M61 82 h11 v11 h-11 Z', shade(c, -0.14))
    + Ef(33, 93, 7.5, 4, shade(c, -0.2)) + Ef(67, 93, 7.5, 4, shade(c, -0.2))
    + `<circle cx="30" cy="60" r="4.4" fill="${a}"/><circle cx="70" cy="60" r="4.4" fill="${a}"/>`
    + `<circle cx="50" cy="52" r="4" fill="${a}"/><circle cx="38" cy="76" r="4" fill="${a}"/>`
    + `<circle cx="62" cy="76" r="4" fill="${a}"/>`
    + P('M28 40 L22 28 L38 38 Z', c, OUT, 2) + P('M72 40 L78 28 L62 38 Z', c, OUT, 2)
    + eyes(62, 13, 4.4, 'big', '#2f4a3a')
    + L('M36 74 q14 9 28 0', OUT, 2.6),

  /** the shapeless one - deliberately a puddle, with a dopey face */
  ditto: (c, a, d, l) =>
    shadow(30)
    + P('M50 36 C74 36 90 50 88 68 C86 84 66 94 48 92 C30 90 12 82 12 66 C12 50 30 36 50 36 Z', c)
    + F('M16 72 q30 18 66 2 q-8 18 -32 18 q-28 0 -34 -20 Z', a)
    + F('M60 44 q14 4 18 12 q-14 -6 -18 -12 Z', shade(c, 0.3))
    + eyes(62, 14, 3.6, 'dot', '#3a2a44')
    + L('M42 74 q8 7 16 0', OUT, 2.6),
});

/** Generic fallback so an unknown id still renders something creature-like. */
function fallback(c, a) {
  return shadow(24) + E(50, 68, 24, 24, c) + E(50, 38, 19, 17, c)
    + Ef(28, 68, 7, 9, c) + Ef(72, 68, 7, 9, c)
    + feet(a, 15) + eyes(36, 10, 4.4, 'big') + smile(48, 5);
}

/** Body-only SVG content (no <svg> wrapper) for a roster entry. */
export function creatureBody(racer) {
  const c = racer.color || '#8fa8c8';
  const a = racer.accent || shade(c, -0.3);
  const fn = SPECIES[racer.id];
  return fn ? fn(c, a, shade(c, -0.35), shade(c, 0.35)) : fallback(c, a);
}

/**
 * Full avatar tile: soft type-coloured lift + creature, drawn slightly larger
 * than the frame so the silhouette fills the bright card plate.
 * @param {object} racer roster entry
 * @param {number} size px
 */
export function avatarSvg(racer, size = 96, opts = {}) {
  const c = racer.color || '#8fa8c8';
  const id = `av-${racer.id}-${Math.round(size)}`;
  return `<svg class="pkr-avatar" viewBox="0 1 100 95" width="${size}" height="${size}" role="img" aria-label="${racer.name}">
    <defs>
      <radialGradient id="${id}-g" cx="50%" cy="54%" r="54%">
        <stop offset="0" stop-color="${shade(c, 0.5)}" stop-opacity="${opts.glow ?? 0.55}"/>
        <stop offset="1" stop-color="${c}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="100" height="100" fill="url(#${id}-g)"/>
    ${creatureBody(racer)}
  </svg>`;
}

/** Poke Ball icon. */
export function ballSvg(size = 24) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="pkr-ball" aria-hidden="true">
    <circle cx="50" cy="50" r="44" fill="#f6f8fc" stroke="${OUT}" stroke-width="6"/>
    <path d="M6 50a44 44 0 0 1 88 0Z" fill="#e8433c"/>
    <rect x="6" y="44" width="88" height="12" fill="${OUT}"/>
    <circle cx="50" cy="50" r="14" fill="#f6f8fc" stroke="${OUT}" stroke-width="6"/>
    <circle cx="50" cy="50" r="6" fill="#cfd8e6"/>
  </svg>`;
}

export default { avatarSvg, ballSvg, creatureBody, SPECIES };
