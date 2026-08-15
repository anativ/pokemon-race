/**
 * Per-species creature art. No external assets (CSP-safe, offline-safe).
 *
 * Every racer id in src/data/roster.js has a hand-built silhouette in SPECIES:
 * distinct head/body shapes plus signature features (Charizard's wings + tail
 * flame, Snorlax's bulk, Gengar's grin, Pikachu's bolt tail...). One art source
 * feeds the select grid, the podium karts, the minimap tokens and the 3D karts
 * (rasterised through avatarImage()).
 *
 * Frame: viewBox 0 0 100 100, ground line y=92, head centred near (50,52).
 */

const OUT = '#1b1230';

/* ------------------------------------------------------------------ helpers */
const P = (d, fill, stroke = OUT, w = 2.4) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const F = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const E = (cx, cy, rx, ry, fill, stroke = OUT, w = 2.4) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const Ef = (cx, cy, rx, ry, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const L = (d, stroke, w = 2.2) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Two eyes with a catchlight. kind: dot | big | slit | sleep | glow */
function eyes(y, dx = 11, r = 4.4, kind = 'dot', tint = '#12182a') {
  const l = 50 - dx; const rr2 = 50 + dx;
  if (kind === 'sleep') {
    return L(`M${l - 5} ${y} q5 5 10 0`, OUT, 2.6) + L(`M${rr2 - 5} ${y} q5 5 10 0`, OUT, 2.6);
  }
  if (kind === 'slit') {
    return P(`M${l - 5.5} ${y - 3} L${l + 5.5} ${y - 0.5} L${l - 4} ${y + 3.4} Z`, tint, OUT, 1.4)
      + P(`M${rr2 + 5.5} ${y - 3} L${rr2 - 5.5} ${y - 0.5} L${rr2 + 4} ${y + 3.4} Z`, tint, OUT, 1.4);
  }
  if (kind === 'big') {
    return E(l, y, r + 1.4, r + 2.2, '#ffffff', OUT, 1.8) + E(rr2, y, r + 1.4, r + 2.2, '#ffffff', OUT, 1.8)
      + Ef(l + 0.6, y + 0.8, r * 0.62, r * 0.78, tint) + Ef(rr2 - 0.6, y + 0.8, r * 0.62, r * 0.78, tint)
      + Ef(l - 0.8, y - 1.4, 1.7, 1.7, '#fff') + Ef(rr2 - 2.2, y - 1.4, 1.7, 1.7, '#fff');
  }
  if (kind === 'glow') {
    return Ef(l, y, r, r * 1.1, tint) + Ef(rr2, y, r, r * 1.1, tint)
      + Ef(l, y, r * 0.42, r * 0.5, '#fff6d0') + Ef(rr2, y, r * 0.42, r * 0.5, '#fff6d0');
  }
  return Ef(l, y, r, r * 1.18, tint) + Ef(rr2, y, r, r * 1.18, tint)
    + Ef(l + 1.5, y - 1.5, 1.6, 1.6, '#fff') + Ef(rr2 + 1.5, y - 1.5, 1.6, 1.6, '#fff');
}

/** mouth kinds */
const smile = (y, w = 6) => L(`M${50 - w} ${y} q${w} ${w * 0.85} ${w * 2} 0`, OUT, 2.4);
const wMouth = (y, w = 7) => L(`M${50 - w} ${y} q${w * 0.5} ${w * 0.7} ${w * 0.5} 0 q${w * 0.5} ${w * 0.7} ${w * 0.5} 0`, OUT, 2.2);
const grin = (y, w = 13, a = '#3a1c5c') =>
  P(`M${50 - w} ${y - 2} q${w} ${w * 0.95} ${w * 2} 0 q-${w} ${w * 0.42} -${w * 2} 0 Z`, '#ffffff', OUT, 1.8)
  + L(`M${50 - w * 0.62} ${y - 1} l1.6 4.6 M50 ${y - 0.2} l0 5.4 M${50 + w * 0.62} ${y - 1} l-1.6 4.6`, a, 1.3);
const beak = (y, c = '#f6d24c') => P(`M43 ${y} L57 ${y} L50 ${y + 8} Z`, c, OUT, 2);
const cheeks = (y, c = '#f0554c', dx = 21, r = 5) =>
  `<circle cx="${50 - dx}" cy="${y}" r="${r}" fill="${c}" opacity=".92"/><circle cx="${50 + dx}" cy="${y}" r="${r}" fill="${c}" opacity=".92"/>`;
const shadow = () => Ef(50, 91, 26, 5.5, 'rgba(6,14,34,.34)');

/* --------------------------------------------------------------- shared bits */
const wingsBack = (c) =>
  P('M30 46 C10 26 2 44 8 62 C14 76 26 72 34 62 Z', c, OUT, 2.2)
  + P('M70 46 C90 26 98 44 92 62 C86 76 74 72 66 62 Z', c, OUT, 2.2);
const smallWings = (c) =>
  P('M32 48 C18 38 12 50 20 60 L33 58 Z', c, OUT, 2)
  + P('M68 48 C82 38 88 50 80 60 L67 58 Z', c, OUT, 2);
/** Little flame blob (Charmander / Charizard tail tip). */
const flame = (x, y, s = 1) =>
  P(`M${x} ${y} c${-7 * s} ${-4 * s} ${-5 * s} ${-12 * s} ${1 * s} ${-16 * s}
      c${-1 * s} ${6 * s} ${4 * s} ${6 * s} ${4 * s} ${1 * s}
      c${5 * s} ${4 * s} ${5 * s} ${12 * s} ${-5 * s} ${15 * s} Z`, '#ffae2b', '#e2551f', 1.8)
  + P(`M${x} ${y - 3 * s} c${-3 * s} ${-2 * s} ${-2 * s} ${-6 * s} ${1 * s} ${-8 * s}
      c${2 * s} ${3 * s} ${3 * s} ${6 * s} ${-1 * s} ${8 * s} Z`, '#ffeaa0', 'none', 0);

/* --------------------------------------------------------------- body shapes */
/** Round pear body used by most bipeds. */
const pear = (c, a) =>
  P('M50 34 C74 34 84 54 84 68 C84 84 68 92 50 92 C32 92 16 84 16 68 C16 54 26 34 50 34 Z', c)
  + F('M50 92 C34 92 20 85 18 72 C26 84 38 88 50 88 C62 88 74 84 82 72 C80 85 66 92 50 92 Z', a);
/** Chunky rounded blob (Snorlax / Jigglypuff family). */
const blob = (c, a) =>
  E(50, 64, 34, 30, c)
  + F('M20 74 q30 16 60 0 q-8 18 -30 18 q-22 0 -30 -18 Z', a);
/** Tall torso for the heavier fighters. */
const torso = (c, a) =>
  P('M50 30 C70 30 80 46 80 62 C80 82 66 92 50 92 C34 92 20 82 20 62 C20 46 30 30 50 30 Z', c)
  + F('M28 68 q22 12 44 0 q-6 20 -22 20 q-16 0 -22 -20 Z', a);
/** Feet peeking under the body. */
const feet = (c) => Ef(34, 90, 10, 5, c) + Ef(66, 90, 10, 5, c);
/** Two pointy ears (Pikachu / Eevee / Lucario). */
const pointEars = (c, tip, lean = 1) =>
  P(`M36 40 L${26 - 4 * lean} 8 L46 30 Z`, c, OUT, 2.2)
  + P(`M64 40 L${74 + 4 * lean} 8 L54 30 Z`, c, OUT, 2.2)
  + F(`M${29 - 4 * lean} 16 L${26 - 4 * lean} 8 L34 20 Z`, tip)
  + F(`M${71 + 4 * lean} 16 L${74 + 4 * lean} 8 L66 20 Z`, tip);
/** Wide floppy ears. */
const floppyEars = (c, a) =>
  P('M34 40 C18 30 8 38 12 52 C16 64 30 58 36 50 Z', c) + F('M18 40 C14 46 16 52 20 54 Z', a)
  + P('M66 40 C82 30 92 38 88 52 C84 64 70 58 64 50 Z', c) + F('M82 40 C86 46 84 52 80 54 Z', a);
/** Head spikes / crest. */
const crest = (c) =>
  P('M50 12 L58 30 L42 30 Z', c, OUT, 2)
  + P('M32 20 L42 32 L28 34 Z', c, OUT, 2)
  + P('M68 20 L58 32 L72 34 Z', c, OUT, 2);
/** Long tail curling to the right. */
const tail = (c, a) =>
  P('M78 74 C94 72 98 58 90 48 C96 62 86 68 74 68 Z', c) + F('M84 60 C90 58 92 54 90 50 Z', a);
/** Muzzle / snout blob. */
const snout = (y, w, h, c) => E(50, y, w, h, c, OUT, 2);
/** Row of back spikes across the top of a blob body. */
const backSpikes = (c) =>
  P('M50 22 L57 36 L43 36 Z', c, OUT, 2)
  + P('M30 30 L41 40 L27 44 Z', c, OUT, 2)
  + P('M70 30 L59 40 L73 44 Z', c, OUT, 2)
  + P('M17 50 L28 54 L18 60 Z', c, OUT, 2)
  + P('M83 50 L72 54 L82 60 Z', c, OUT, 2);
/** Belly patch. */
const belly = (c, ry = 18) => Ef(50, 72, 22, ry, c);

/* ------------------------------------------------------------------ species */
/** Each entry: (c, a) => inner markup for the 0 0 100 100 frame. */
const SPECIES = {
  pikachu: (c, a) =>
    P('M74 82 L86 66 L77 64 L93 48 L81 46 L90 32 L66 58 L78 60 L69 74 Z', c, OUT, 2.2)
    + pointEars(c, '#2b2233')
    + pear(c, a)
    + eyes(56, 12, 4.6, 'dot')
    + cheeks(65, '#f0554c', 22, 5.6)
    + wMouth(66, 7)
    + feet(a),

  gengar: (c, a) =>
    backSpikes(a)
    + blob(c, a)
    + eyes(52, 13, 4.6, 'glow', '#f24c4c')
    + grin(64, 15, '#3a1c5c')
    + P('M22 84 L30 92 L14 92 Z', a, OUT, 2)
    + P('M78 84 L86 92 L70 92 Z', a, OUT, 2),

  lucario: (c, a) =>
    pointEars(c, a, 1.6)
    + tail(c, a)
    + pear(c, a)
    + F('M50 60 C64 60 72 70 72 80 C72 88 62 92 50 92 C38 92 28 88 28 80 C28 70 36 60 50 60 Z', '#f0eef6')
    + snout(62, 12, 9, '#3b2f55')
    + eyes(52, 12, 4, 'slit', '#c8342c')
    + Ef(50, 60, 3, 2.2, '#12182a')
    + P('M40 66 L36 78 L44 74 Z', a, OUT, 1.6)
    + P('M60 66 L64 78 L56 74 Z', a, OUT, 1.6),

  meowth: (c, a) =>
    pointEars(c, a, 0.4)
    + L('M84 84 C96 78 94 62 84 58', a, 3)
    + pear(c, a)
    + E(50, 26, 9, 6.5, '#f6c93c', OUT, 2)
    + eyes(54, 12, 4.6, 'big', '#2b2233')
    + Ef(50, 63, 3.4, 2.6, '#e07a86')
    + wMouth(67, 7)
    + L('M14 60 L32 64 M14 70 L32 70 M86 60 L68 64 M86 70 L68 70', '#efe6d0', 1.8)
    + feet(a),

  eevee: (c, a) =>
    P('M78 80 C96 78 98 56 84 46 C94 62 84 70 72 68 Z', '#f2e2c4', OUT, 2.2)
    + pointEars(c, a, 0.2)
    + pear(c, a)
    + F('M22 74 C34 62 66 62 78 74 C74 88 60 92 50 92 C40 92 26 88 22 74 Z', '#f6e6c8')
    + eyes(54, 12, 4.6, 'big', '#4a2c1c')
    + Ef(50, 64, 3.6, 2.8, '#3a241a')
    + wMouth(69, 6.5),

  snorlax: (c, a) =>
    P('M20 40 L30 30 L34 44 Z', c, OUT, 2)
    + P('M80 40 L70 30 L66 44 Z', c, OUT, 2)
    + blob(c, a)
    + belly('#f2e2b8', 19)
    + eyes(52, 13, 4.6, 'sleep')
    + L('M42 66 q8 8 16 0', OUT, 2.6)
    + P('M16 84 C10 88 12 94 20 94 L30 92 Z', '#f2e2b8', OUT, 2)
    + P('M84 84 C90 88 88 94 80 94 L70 92 Z', '#f2e2b8', OUT, 2)
    + L('M60 30 l6 -4 -6 -5 6 -4', '#cfe0ff', 2.4),
  charizard: (c, a) =>
    P('M34 44 C16 14 2 26 6 44 C9 58 22 58 34 54 Z', '#4f9fc4', OUT, 2.2)
    + P('M66 44 C84 14 98 26 94 44 C91 58 78 58 66 54 Z', '#4f9fc4', OUT, 2.2)
    + L('M20 24 L16 50 M10 30 L9 48 M80 24 L84 50 M90 30 L91 48', '#2f6f92', 1.8)
    + P('M80 78 C96 76 100 60 90 50 C98 66 86 72 74 70 Z', c, OUT, 2.2)
    + flame(92, 46, 0.9)
    + torso(c, a)
    + belly('#f6dc9c', 17)
    + P('M36 34 L30 22 L44 30 Z', a, OUT, 2)
    + P('M64 34 L70 22 L56 30 Z', a, OUT, 2)
    + snout(58, 15, 10, c)
    + eyes(48, 12, 4, 'slit', '#2b2233')
    + L('M38 60 q12 7 24 0', OUT, 2.4)
    + F('M40 62 l4 5 4 -5 4 5 4 -5', '#fff'),

  greninja: (c, a) =>
    P('M34 44 C20 36 12 48 20 58 L34 56 Z', a, OUT, 2)
    + P('M66 44 C80 36 88 48 80 58 L66 56 Z', a, OUT, 2)
    + pear(c, a)
    + F('M50 40 C60 40 66 48 66 56 C66 66 58 72 50 72 C42 72 34 66 34 56 C34 48 40 40 50 40 Z', '#eef6ff')
    + P('M50 58 C56 62 58 76 50 96 C42 76 44 62 50 58 Z', '#f2d9d0', OUT, 1.8)
    + eyes(52, 12, 4.2, 'slit', '#f6e04c')
    + L('M42 66 q8 5 16 0', OUT, 2.2)
    + Ef(28, 62, 4, 4, a) + Ef(72, 62, 4, 4, a),

  garchomp: (c, a) =>
    P('M26 40 C6 34 4 52 16 58 L30 54 Z', a, OUT, 2.2)
    + P('M74 40 C94 34 96 52 84 58 L70 54 Z', a, OUT, 2.2)
    + torso(c, a)
    + belly('#f0d6c0', 16)
    + P('M50 18 L60 34 L40 34 Z', a, OUT, 2)
    + eyes(48, 13, 4, 'slit', '#f6c93c')
    + P('M32 60 L68 60 L50 76 Z', '#2b1c3a', OUT, 2)
    + F('M36 62 l4 6 4 -6 4 6 4 -6 4 6 4 -6', '#fff')
    + L('M24 46 L34 50 M76 46 L66 50', a, 2.4),

  mewtwo: (c, a) =>
    P('M76 88 C98 84 96 56 78 46 C90 60 84 76 70 78 Z', c, OUT, 2.2)
    + pear(c, a)
    + P('M50 30 L44 16 L56 16 Z', c, OUT, 2)
    + L('M62 40 C74 44 74 58 66 62', a, 3)
    + eyes(52, 12, 4.4, 'slit', '#8f4fd0')
    + Ef(50, 62, 2.6, 2, '#7a5a94')
    + L('M42 70 q8 4 16 0', OUT, 2.2)
    + Ef(50, 46, 12, 5, a),

  togepi: (c, a) =>
    P('M50 12 L57 28 L43 28 Z', '#f6f2e2', OUT, 2)
    + P('M32 22 L42 32 L28 36 Z', '#f6f2e2', OUT, 2)
    + P('M68 22 L58 32 L72 36 Z', '#f6f2e2', OUT, 2)
    + blob('#f8f2dc', '#e6dcc0')
    + L('M18 66 L28 74 L38 66 L48 74 L58 66 L68 74 L78 66 L82 70', a, 3)
    + F('M28 78 l6 6 6 -6 z', '#e2544c') + F('M60 80 l6 6 6 -6 z', '#3f8cd8')
    + Ef(36, 82, 5, 4, '#4fb0e0')
    + eyes(56, 12, 4.6, 'big', '#3b2f22')
    + smile(68, 6),

  blaziken: (c, a) =>
    P('M50 12 L58 30 L42 30 Z', '#f6e04c', OUT, 2)
    + P('M34 18 L44 32 L30 34 Z', '#f6e04c', OUT, 2)
    + P('M66 18 L56 32 L70 34 Z', '#f6e04c', OUT, 2)
    + torso(c, a)
    + belly('#f6e8c8', 15)
    + beak(56, '#f2c43c')
    + eyes(46, 12, 4, 'slit', '#f6f0d0')
    + flame(20, 82, 0.55) + flame(80, 82, 0.55)
    + L('M30 54 L20 62 M70 54 L80 62', a, 2.6),
  gardevoir: (c, a) =>
    P('M50 30 C74 30 86 56 84 76 C82 90 66 92 50 92 C34 92 18 90 16 76 C14 56 26 30 50 30 Z', '#f4f8ff')
    + F('M24 78 q26 12 52 0 q-6 14 -26 14 q-20 0 -26 -14 ', '#e2e8f4')
    + P('M50 22 C64 22 70 34 68 46 C62 40 56 38 50 38 C44 38 38 40 32 46 C30 34 36 22 50 22 Z', c, OUT, 2.2)
    + P('M32 44 C24 54 26 66 34 72 C34 60 34 52 32 44 Z', c, OUT, 2)
    + P('M68 44 C76 54 74 66 66 72 C66 60 66 52 68 44 Z', c, OUT, 2)
    + eyes(48, 10, 4, 'dot', '#c8446c')
    + P('M50 58 L58 70 L50 82 L42 70 Z', a, OUT, 2)
    + smile(54, 4),

  mew: (c, a) =>
    L('M78 84 C98 82 96 52 76 50', a, 3.4)
    + F('M74 44 c10 -2 12 10 2 12 z', a)
    + blob(c, a)
    + Ef(50, 74, 20, 14, '#fbd8e6')
    + P('M36 36 L28 20 L48 32 Z', c, OUT, 2)
    + P('M64 36 L72 20 L52 32 Z', c, OUT, 2)
    + eyes(54, 12, 5, 'big', '#3f6fb0')
    + Ef(50, 64, 3, 2.2, '#c2718f')
    + smile(68, 6)
    + Ef(24, 88, 8, 5, c) + Ef(76, 88, 8, 5, c),

  celebi: (c, a) =>
    smallWings('#dff2c8')
    + L('M38 30 C32 16 24 12 18 12 M62 30 C68 16 76 12 82 12', a, 2.6)
    + Ef(18, 12, 4, 4, a) + Ef(82, 12, 4, 4, a)
    + blob(c, a)
    + belly('#e2f4bc', 14)
    + eyes(54, 12, 5, 'big', '#2f5c2a')
    + smile(68, 5)
    + P('M30 84 L22 94 L38 94 Z', a, OUT, 2)
    + P('M70 84 L78 94 L62 94 Z', a, OUT, 2),

  tyranitar: (c, a) =>
    P('M82 80 C98 76 98 58 86 50 C94 64 84 70 72 70 Z', c, OUT, 2.2)
    + backSpikes(a)
    + torso(c, a)
    + belly('#c8dca0', 16)
    + L('M32 66 L68 66 M32 76 L68 76', a, 2)
    + P('M50 22 L58 36 L42 36 Z', '#dfeec0', OUT, 2)
    + eyes(48, 13, 4, 'slit', '#e2544c')
    + P('M30 58 L70 58 L50 74 Z', '#2b1c3a', OUT, 2)
    + F('M34 60 l5 6 5 -6 5 6 5 -6 5 6 5 -6', '#fff')
    + Ef(26, 90, 10, 5, a) + Ef(74, 90, 10, 5, a),

  machamp: (c, a) =>
    torso(c, a)
    + P('M26 52 C8 44 0 58 10 68 C16 74 24 70 28 64 Z', c, OUT, 2.2)
    + P('M74 52 C92 44 100 58 90 68 C84 74 76 70 72 64 Z', c, OUT, 2.2)
    + P('M28 72 C12 72 8 86 20 92 C26 94 32 88 32 82 Z', a, OUT, 2.2)
    + P('M72 72 C88 72 92 86 80 92 C74 94 68 88 68 82 Z', a, OUT, 2.2)
    + F('M30 62 q20 10 40 0 q-4 20 -20 20 q-16 0 -20 -20 Z', '#e8eef6')
    + P('M50 20 L56 34 L44 34 Z', a, OUT, 2)
    + eyes(48, 12, 4, 'slit', '#2b2233')
    + L('M40 62 q10 6 20 0', OUT, 2.6)
    + L('M34 44 L26 40 M66 44 L74 40', a, 2.4),

  dragonite: (c, a) =>
    smallWings('#8fd4e2')
    + P('M80 80 C96 76 96 60 86 52 C92 66 82 72 70 72 Z', c, OUT, 2.2)
    + pear(c, a)
    + belly('#f8e2b0', 15)
    + L('M40 30 C36 18 30 14 26 14 M60 30 C64 18 70 14 74 14', c, 3)
    + Ef(26, 14, 4, 4, c) + Ef(74, 14, 4, 4, c)
    + snout(60, 13, 9, c)
    + eyes(50, 11, 4.4, 'dot', '#2b2233')
    + smile(60, 6)
    + Ef(30, 90, 10, 5, a) + Ef(70, 90, 10, 5, a),
  jigglypuff: (c, a) =>
    P('M26 40 C22 26 34 20 40 26 C36 32 40 36 46 34 C42 42 30 46 26 40 Z', c, OUT, 2.2)
    + P('M30 44 C20 40 14 46 18 54 C22 60 32 56 34 50 Z', c, OUT, 2)
    + P('M70 44 C80 40 86 46 82 54 C78 60 68 56 66 50 Z', c, OUT, 2)
    + E(50, 62, 33, 30, c)
    + F('M20 72 q30 15 60 0 q-8 20 -30 20 q-22 0 -30 -20 Z', a)
    + eyes(56, 13, 6, 'big', '#3f7fd0')
    + Ef(50, 68, 3.2, 2.4, '#c26f92')
    + wMouth(72, 7)
    + Ef(24, 90, 8, 4.5, a) + Ef(76, 90, 8, 4.5, a),

  rayquaza: (c, a) =>
    L('M18 88 C4 74 16 62 30 66 C46 70 54 58 44 50', c, 11)
    + L('M18 88 C4 74 16 62 30 66 C46 70 54 58 44 50', a, 3)
    + P('M50 26 C68 26 80 40 80 54 C80 72 66 80 50 80 C34 80 22 70 22 54 C22 40 32 26 50 26 Z', c)
    + F('M28 62 q22 12 44 0 q-8 18 -22 18 q-14 0 -22 -18 Z', '#3f7f5c')
    + P('M34 30 L22 14 L44 26 Z', a, OUT, 2)
    + P('M66 30 L78 14 L56 26 Z', a, OUT, 2)
    + eyes(48, 13, 4.2, 'slit', '#f6e04c')
    + P('M32 60 L68 60 L50 74 Z', '#22143a', OUT, 2)
    + L('M26 44 L34 48 M74 44 L66 48', a, 2.4),

  squirtle: (c, a) =>
    P('M78 78 C94 78 96 62 86 54 C92 68 82 72 72 70 Z', c, OUT, 2.2)
    + E(50, 66, 32, 26, '#c98a4c')
    + Ef(50, 68, 24, 19, '#f2d69c')
    + L('M32 62 L68 62 M40 50 L40 84 M60 50 L60 84', '#c98a4c', 2.4)
    + P('M50 28 C68 28 78 40 78 52 C78 64 66 70 50 70 C34 70 22 64 22 52 C22 40 32 28 50 28 Z', c, OUT, 2.4)
    + eyes(46, 12, 5, 'big', '#3a2a1c')
    + wMouth(58, 7)
    + cheeks(54, '#f0a0a8', 22, 4)
    + Ef(22, 88, 9, 5, c) + Ef(78, 88, 9, 5, c),

  charmander: (c, a) =>
    P('M80 82 C94 78 94 62 84 54 C90 68 80 74 70 74 Z', c, OUT, 2.2)
    + flame(88, 50, 0.75)
    + pear(c, a)
    + belly('#f8dcae', 15)
    + snout(58, 13, 9, c)
    + eyes(48, 11, 4.4, 'dot', '#2b2233')
    + smile(60, 6)
    + Ef(28, 90, 9, 5, a) + Ef(72, 90, 9, 5, a),

  bulbasaur: (c, a) =>
    E(50, 46, 24, 20, '#8fc45c', OUT, 2.2)
    + L('M32 40 C40 30 60 30 68 40', '#5f9a3c', 2.6)
    + P('M50 26 C36 22 30 34 40 40 Z', '#a8d472', OUT, 2)
    + P('M50 26 C64 22 70 34 60 40 Z', '#a8d472', OUT, 2)
    + blob(c, a)
    + F('M26 46 q10 -8 20 -2 q-8 2 -20 2 Z', a)
    + eyes(58, 13, 4.6, 'dot', '#c8425c')
    + L('M38 70 q12 8 24 0', OUT, 2.6)
    + P('M40 70 L44 76 L36 74 Z', '#fff', OUT, 0.8)
    + P('M60 70 L56 76 L64 74 Z', '#fff', OUT, 0.8)
    + Ef(28, 70, 5, 4, a) + Ef(72, 70, 5, 4, a),

  ditto: (c, a) =>
    P('M50 34 C74 34 88 52 86 70 C84 86 68 92 50 92 C32 92 16 86 14 70 C12 52 26 34 50 34 Z', c)
    + F('M18 74 q32 14 64 0 q-8 18 -32 18 q-24 0 -32 -18 Z', a)
    + F('M20 56 c-6 6 -4 14 2 16 c-2 -8 -1 -12 -2 -16 Z', a)
    + Ef(38, 62, 3.4, 3.4, '#2b2233') + Ef(62, 62, 3.4, 3.4, '#2b2233')
    + L('M42 74 L58 74', OUT, 2.6),
};

/** Generic creature used if an unknown id ever shows up. */
const FALLBACK = (c, a) =>
  pointEars(c, a) + pear(c, a) + eyes(56, 12, 4.4, 'dot') + smile(68, 6) + feet(a);

/* ------------------------------------------------------------------ exports */

/** Inner markup (no <svg> wrapper) for one racer. */
export function creatureMarkup(racer) {
  const def = racer && typeof racer === 'object' ? racer : null;
  const c = def?.color || '#9fb0c8';
  const a = def?.accent || '#4a5a72';
  const draw = (def && SPECIES[def.id]) || FALLBACK;
  return draw(c, a);
}

/**
 * Portrait used by the roster cards, the title heroes and the race HUD.
 * @param {object} racer roster entry
 * @param {number} size  px (square)
 */
export function avatarSvg(racer, size = 84) {
  return `<svg class="pkr-avatar" viewBox="0 0 100 100" width="${size}" height="${size}"
    role="img" aria-label="${(racer && racer.name) || 'racer'}">${shadow()}${creatureMarkup(racer)}</svg>`;
}

/** Small round minimap / stat-line token: clipped portrait on a colour disc. */
export function tokenSvg(racer, size = 40) {
  const c = (racer && racer.color) || '#9fb0c8';
  const a = (racer && racer.accent) || '#22143a';
  return `<svg class="pkr-token" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="50" cy="50" r="45" fill="${c}" stroke="${OUT}" stroke-width="7"/>
    <svg x="12" y="12" width="76" height="76" viewBox="20 26 60 60">${creatureMarkup(racer)}</svg>
    <circle cx="50" cy="50" r="45" fill="none" stroke="${a}" stroke-width="4"/>
  </svg>`;
}

/** Poke Ball icon (items, coin chips, menu bullets). */
export function ballSvg(size = 48) {
  return `<svg class="pkr-ball" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="50" cy="50" r="42" fill="#f4f6fb" stroke="${OUT}" stroke-width="6"/>
    <path d="M8 50 A42 42 0 0 1 92 50 Z" fill="#e8433c"/>
    <path d="M8 50 L92 50" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="14" fill="#f4f6fb" stroke="${OUT}" stroke-width="6"/>
    <circle cx="50" cy="50" r="6" fill="#ffd63b" stroke="${OUT}" stroke-width="2.4"/>
    <path d="M28 26 A30 30 0 0 1 46 16" fill="none" stroke="#ffffff" stroke-width="5"
      stroke-linecap="round" opacity=".55"/>
  </svg>`;
}

/** Racer sitting in their kart - character-select preview + results podium. */
export function kartSvg(racer, size = 300) {
  const c = (racer && racer.color) || '#9fb0c8';
  const k = (racer && racer.kart) || c;
  const a = (racer && racer.accent) || '#22143a';
  const w = Math.round(size);
  const h = Math.round(size * 0.82);
  return `<svg class="pkr-kart" viewBox="0 0 140 115" width="${w}" height="${h}"
    role="img" aria-label="${(racer && racer.name) || 'racer'} kart">
    <ellipse cx="70" cy="106" rx="58" ry="7" fill="rgba(6,14,34,.32)"/>
    <g transform="translate(35 -2) scale(0.66)">${creatureMarkup(racer)}</g>
    <path d="M18 74 L122 74 L114 92 L26 92 Z" fill="${k}" stroke="${OUT}" stroke-width="3"
      stroke-linejoin="round"/>
    <path d="M26 92 L114 92 L110 98 L30 98 Z" fill="${a}"/>
    <path d="M30 74 L44 60 L96 60 L110 74 Z" fill="${k}" stroke="${OUT}" stroke-width="3"
      stroke-linejoin="round" opacity=".92"/>
    <rect x="58" y="52" width="24" height="12" rx="4" fill="${a}" stroke="${OUT}" stroke-width="3"/>
    <path d="M14 78 L4 70 L4 86 Z" fill="${a}" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M126 78 L136 70 L136 86 Z" fill="${a}" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="32" cy="92" r="18" fill="#241a35" stroke="${OUT}" stroke-width="3"/>
    <circle cx="32" cy="92" r="8" fill="${k}" stroke="${OUT}" stroke-width="2.4"/>
    <circle cx="108" cy="92" r="18" fill="#241a35" stroke="${OUT}" stroke-width="3"/>
    <circle cx="108" cy="92" r="8" fill="${k}" stroke="${OUT}" stroke-width="2.4"/>
    <path d="M40 68 L100 68" stroke="#ffffff" stroke-width="2.4" opacity=".35" stroke-linecap="round"/>
  </svg>`;
}

/**
 * Rasterised portrait for the canvas/3D karts.
 * @returns {HTMLImageElement} decodes async; draw once `.complete` is true.
 */
export function avatarImage(racer, size = 128) {
  const svg = avatarSvg(racer, size);
  const img = new Image(size, size);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return img;
}

/** Ids that have bespoke art (handy for tests / audits). */
export const SPECIES_IDS = Object.freeze(Object.keys(SPECIES));

/** True when this racer has a bespoke silhouette (not the generic fallback). */
export function hasSpecies(id) {
  return Object.prototype.hasOwnProperty.call(SPECIES, id);
}

/**
 * Audit helper: roster ids with no bespoke art. Should always be empty -
 * a non-empty result means some screen is about to draw a generic blob.
 * @param {{id:string}[]} list roster (or any list of racer-ish objects)
 */
export function missingSpecies(list) {
  return (list || []).map((r) => r && r.id).filter((id) => id && !hasSpecies(id));
}

export default { avatarSvg, tokenSvg, ballSvg, kartSvg, avatarImage, creatureMarkup, SPECIES_IDS };
