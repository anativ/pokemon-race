/**
 * race-world / species traits + rider art
 *
 * Two jobs:
 *
 * 1. `riderArt()` / `riderSprite()` - the *identity* of the racer in the seat.
 *    The silhouette is not invented here: it is the canonical per-species art
 *    from src/core/avatars.js (CONTRACTS 4b), compiled once per racer into
 *    Path2D ops and rasterised into a small offscreen figure that rider.js
 *    billboards onto the driver's shoulders, pinned by the art's own jaw line.
 *    Head, ears, horns, fins, snout, shell, wings and tail therefore come out
 *    exactly as the HUD portrait draws them - no per-species recipe to fall out
 *    of sync, and no way for a roster entry to degrade into a recoloured bear.
 *    `headWidth()` measures the head blob so the rider can scale every species
 *    to the same fraction of the kart instead of the same fraction of its own
 *    art frame.
 *
 * 2. The small cosmetic recipe below, which now only feeds *kart* dressing
 *    (livery / side emblem / cap colour) and the fur tone used for the arms.
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

import { creatureMarkup, hasSpecies } from '../core/avatars.js';

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

/* ------------------------------------------------------------------ rider art
 * The canonical creature markup is a tiny, closed subset of SVG (<path>,
 * <ellipse>, <circle> with flat fills and round-joined strokes). Compiling it
 * to Path2D once per racer lets the race renderer stamp the exact same
 * silhouette the portraits use into a kart-local plane, with no <img> decode
 * to wait for and no per-frame parsing.
 */

const TAG = /<(path|ellipse|circle)\b([^>]*?)\/>/g;
const ATTR = /([a-z-]+)\s*=\s*"([^"]*)"/g;

function attrs(src) {
  const o = {};
  ATTR.lastIndex = 0;
  let m;
  while ((m = ATTR.exec(src))) o[m[1]] = m[2];
  return o;
}

/* Bounding box of an SVG path string, in art units. Control points are folded
 * in (a curve never leaves its hull), which is all the rider needs: the box
 * only has to answer "is this op part of the head, a limb, or the tail?". */
const NUMS = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
const TOK = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g;

export function pathBBox(d) {
  let x = 0; let y = 0; let sx = 0; let sy = 0;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  const hit = (px, py) => {
    if (px < x0) x0 = px; if (px > x1) x1 = px;
    if (py < y0) y0 = py; if (py > y1) y1 = py;
  };
  const toks = [];
  TOK.lastIndex = 0;
  let m;
  while ((m = TOK.exec(d))) toks.push(m[1] || parseFloat(m[2]));
  let i = 0; let cmd = 'M';
  while (i < toks.length) {
    if (typeof toks[i] === 'string') { cmd = toks[i]; i++; }
    const up = cmd.toUpperCase();
    const rel = cmd !== up;
    const n = NUMS[up] != null ? NUMS[up] : 2;
    if (up === 'Z') { x = sx; y = sy; hit(x, y); continue; }
    const p = toks.slice(i, i + n);
    if (p.length < n || typeof p[0] === 'string') break;
    i += n;
    if (up === 'H') { x = rel ? x + p[0] : p[0]; hit(x, y); }
    else if (up === 'V') { y = rel ? y + p[0] : p[0]; hit(x, y); }
    else {
      // every (x,y) pair in the run, so control points widen the box
      const start = up === 'A' ? 5 : 0;
      for (let k = start; k + 1 < n; k += 2) {
        const px = rel ? x + p[k] : p[k];
        const py = rel ? y + p[k + 1] : p[k + 1];
        hit(px, py);
        if (k + 2 >= n) { x = px; y = py; }
      }
      if (up === 'M') { sx = x; sy = y; if (rel) cmd = rel ? 'l' : 'L'; else cmd = 'L'; }
    }
  }
  if (!isFinite(x0)) return { x0: 0, y0: 0, x1: 0, y1: 0, cx: 50, cy: 50, w: 0, h: 0 };
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

/** One drawing op: a Path2D plus the flat paint it wants. */
function opOf(tag, a) {
  let path;
  let box;
  if (tag === 'path') {
    if (!a.d) return null;
    path = new Path2D(a.d);
    box = pathBBox(a.d);
  } else {
    path = new Path2D();
    const cx = +a.cx || 0; const cy = +a.cy || 0;
    const rx = tag === 'circle' ? (+a.r || 0) : (+a.rx || 0);
    const ry = tag === 'circle' ? (+a.r || 0) : (+a.ry || 0);
    if (tag === 'circle') path.arc(cx, cy, rx, 0, Math.PI * 2);
    else path.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    box = { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry, cx, cy, w: rx * 2, h: ry * 2 };
  }
  const fill = a.fill && a.fill !== 'none' ? a.fill : null;
  const stroke = a.stroke && a.stroke !== 'none' ? a.stroke : null;
  const lw = a['stroke-width'] != null ? +a['stroke-width'] : 1;
  return {
    path,
    box,
    fill,
    stroke: stroke && lw > 0 ? stroke : null,
    lw,
    alpha: a.opacity != null ? +a.opacity : 1,
  };
}

/** Compile canonical markup -> ordered canvas ops in the 0..100 art frame. */
export function compileArt(markup) {
  const ops = [];
  TAG.lastIndex = 0;
  let m;
  while ((m = TAG.exec(markup))) {
    const op = opOf(m[1], attrs(m[2]));
    if (op && (op.fill || op.stroke)) ops.push(op);
  }
  return ops;
}

/* ------------------------------------------------------------- rider anatomy
 * The rider IS the portrait. Every creature in src/core/avatars.js is already a
 * seated-friendly chibi: one silhouette carrying head, ears/horns/fins, snout,
 * shell, wings and tail, drawn with the same flat fills + dark ink the HUD uses.
 * The rider stamps *that figure* on top of a lit torso, so a Squirtle keeps its
 * shell rim and beak, a Garchomp keeps its head fin and jaw, and no species can
 * decay into a recoloured template. Only the shoulders, chest and arms are
 * invented, because a chibi portrait has none and a driver needs shoulders and
 * both hands on the wheel; they are lit geometry sized off the head.
 *
 * `rig` supplies the per-species numbers the crop needs:
 *   y, r    the face circle of the art frame - sets the jaw line the head is
 *           pinned to, and classifies which ops are head and which are body
 *   build   'slim' | 'round' | 'heavy' - arm thickness / shoulder drop
 *   hand    'paw' | 'claw' | 'fist' | 'fin' | 'hand'
 *   arms    2 (or 4, for Machamp)
 *   belly   fallback tone for the arms' underside
 */
const RIG_D = {
  y: 56, r: 23, cut: 0.62, side: 1.2, wide: 2.0,
  build: 'round', sh: 0.21, dep: 0.16, hand: 'paw', arms: 2, neck: 0.5,
};

export const RIDER = Object.freeze({
  pikachu: { y: 58, r: 24, sh: 0.20, belly: '#ffe9a8' },
  charmander: { y: 52, r: 21, sh: 0.20, hand: 'claw', belly: '#f8dcae' },
  squirtle: { y: 50, r: 22, sh: 0.23, wide: 2.8, belly: '#f2d69c' },
  bulbasaur: { y: 60, r: 25, sh: 0.24, belly: '#bfe8d4' },
  eevee: { y: 57, r: 23, sh: 0.21, cut: 1.0, belly: '#f6e6c8' },
  meowth: { y: 57, r: 23, sh: 0.20, wide: 3.5, belly: '#fff0d0' },
  gengar: { spine: '#5a34a8', y: 56, r: 23, sh: 0.26, build: 'heavy', hand: 'claw', belly: '#7a54c4' },
  lucario: { y: 55, r: 22, sh: 0.24, build: 'slim', hand: 'fist', belly: '#f0eef6' },
  snorlax: { y: 56, r: 24, sh: 0.33, dep: 0.22, build: 'heavy', belly: '#f2e2b8' },
  charizard: { wing: '#4f9fc4', y: 52, r: 22, sh: 0.28, dep: 0.19, build: 'heavy', hand: 'claw', belly: '#f6dc9c' },
  greninja: { y: 56, r: 23, sh: 0.22, cut: 0.95, build: 'slim', hand: 'fin', belly: '#eef6ff' },
  garchomp: { spine: '#4a3f7a', wing: '#5f4f96', y: 53, r: 23, sh: 0.28, dep: 0.19, side: 2.3, wide: 2.6, build: 'heavy', hand: 'claw', belly: '#f0d6c0' },
  mewtwo: { y: 55, r: 22, sh: 0.22, build: 'slim', hand: 'fist', belly: '#e8e2f2' },
  togepi: { y: 58, r: 24, sh: 0.19, belly: '#f8f2dc' },
  blaziken: { y: 50, r: 21, sh: 0.26, build: 'heavy', hand: 'claw', belly: '#f6e8c8' },
  gardevoir: { y: 50, r: 21, sh: 0.19, cut: 1.1, build: 'slim', hand: 'hand', belly: '#f4f8ff' },
  mew: { y: 57, r: 23, sh: 0.18, belly: '#fbd8e6' },
  celebi: { wing: '#dff2c8', y: 57, r: 23, sh: 0.18, side: 1.6, wide: 3.0, belly: '#e2f4bc' },
  tyranitar: { spine: '#5f8a3a', y: 52, r: 22, sh: 0.33, dep: 0.22, build: 'heavy', hand: 'claw', belly: '#c8dca0' },
  machamp: { y: 52, r: 22, sh: 0.31, dep: 0.19, build: 'heavy', hand: 'fist', arms: 4, belly: '#e8eef6' },
  dragonite: { wing: '#8fd4e2', y: 54, r: 22, sh: 0.26, wide: 2.6, build: 'heavy', belly: '#f8e2b0' },
  jigglypuff: { y: 58, r: 25, sh: 0.19, belly: '#ffe8f0' },
  rayquaza: { spine: '#c8b03c', y: 52, r: 24, sh: 0.21, cut: 0.8, wide: 2.4, build: 'slim', hand: 'fin', belly: '#3f7f5c' },
  ditto: { y: 62, r: 26, sh: 0.22, belly: '#f0dcf4' },
});

/** Merged rider anatomy for a racer id. */
export function rigOf(id) {
  return { ...RIG_D, ...(RIDER[id] || null) };
}

/** Widest torso-ish op below the face - where the shoulders sit. */
function bodyHalfWidth(ops, rig) {
  let bw = 0;
  for (const op of ops) {
    const b = op.box;
    if (!b) continue;
    if (b.y1 < rig.y + rig.r * 0.2) continue;      // above the chin: head, not body
    if (Math.abs(b.cx - 50) > 16) continue;        // a tail or a wing, not the trunk
    if (b.w > bw) bw = b.w;
  }
  return (bw || 64) / 2;
}

/**
 * Width of the *head blob* - the op the eye reads as the creature's head - in
 * art units. In this chibi grammar the head and the trunk are usually one
 * silhouette (`pear`, `blob`, `torso`), so the measure is the widest centred op
 * that straddles the face circle; ears, horns, tails, wings and feet all sit
 * too far off the centre line or too far below the jaw to count. The rider
 * scales itself off this number instead of off the face *radius*, because it is
 * the number a viewer (and a critic with a ruler) actually measures against the
 * kart's width.
 */
function headWidth(ops, rig) {
  let w = 0;
  for (const op of ops) {
    const b = op.box;
    if (!b || !b.w) continue;
    if (Math.abs(b.cx - 50) > 14) continue;        // a tail, a wing, an ear
    if (b.y0 > rig.y + rig.r * 1.3) continue;      // feet / legs
    if (b.y1 < rig.y - rig.r * 1.3) continue;      // a crest tip way overhead
    if (b.w > w) w = b.w;
  }
  return w || rig.r * 2.8;
}

const ART = new Map();

/**
 * Compiled bespoke silhouette for a racer, in the canonical 0..100 art frame
 * (ground line y = 92, head near y = 50). Cached per id+palette.
 * @returns {{ops:Array, rig:object, bw:number, hw:number, key:string, bespoke:boolean}}
 */
export function riderArt(racer) {
  const id = (racer && racer.id) || 'pikachu';
  const key = `${id}|${(racer && racer.color) || ''}|${(racer && racer.accent) || ''}`;
  let a = ART.get(key);
  if (a) return a;
  let ops = [];
  try {
    ops = compileArt(creatureMarkup(racer));
  } catch (e) {
    ops = [];
  }
  const rig = rigOf(id);
  a = {
    ops, rig, key,
    bw: bodyHalfWidth(ops, rig),
    hw: headWidth(ops, rig),
    chin: rig.y + rig.r,
    bespoke: hasSpecies(id) && ops.length > 0,
  };
  ART.set(key, a);
  return a;
}

/* ------------------------------------------------------------- rider sprite
 * The figure is rasterised once per (racer, size bucket) into an offscreen
 * canvas: flat portrait fills, then one screen-space key-light gradient laid
 * over the silhouette with `source-atop` so the driver picks up the same
 * up-left highlight / low-right terminator as the bodywork around it. The
 * canvas is then billboarded into the kart's seat plane, which keeps every
 * species' bespoke shapes intact at every LOD for the price of one drawImage.
 */

/** Art-frame y where the figure is cropped: just above the portrait's feet. */
export const ART_CUT = 84;
/** Ink width multiplier for the rider (the HUD keeps the portrait's own). */
const INK = 0.70;
const ART_PAD = 5;
const ART_W = 100 + ART_PAD * 2;
const ART_H = ART_CUT + ART_PAD;

const SPRITE = new Map();
const SIZES = [20, 28, 40, 56, 76, 104, 140, 188, 250, 320];
const bucket = (px) => SIZES.find((v) => v >= px) || SIZES[SIZES.length - 1];

/**
 * Offscreen figure for a racer at (about) `px` pixels wide.
 * The canvas spans art x -5..105 and y -5..ART_CUT, so its bottom edge is the
 * cockpit rim and its horizontal centre is the art frame's centre line.
 * @returns {HTMLCanvasElement|null} null when the racer has no bespoke art
 */
export function riderSprite(racer, px) {
  const art = riderArt(racer);
  if (!art.bespoke) return null;
  const w = bucket(Math.max(18, px));
  const key = `${art.key}|${w}`;
  const hit = SPRITE.get(key);
  if (hit) return hit;
  const k = w / ART_W;
  let cv;
  try {
    cv = document.createElement('canvas');
    cv.width = Math.max(2, Math.round(w));
    cv.height = Math.max(2, Math.round(ART_H * k));
    const c = cv.getContext('2d');
    if (!c) return null;
    c.setTransform(k, 0, 0, k, ART_PAD * k, ART_PAD * k);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const op of art.ops) {
      if (op.alpha !== 1) { c.save(); c.globalAlpha = op.alpha; }
      if (op.fill) { c.fillStyle = op.fill; c.fill(op.path); }
      // The portrait's ink is sized for an 84 px HUD chip; on a rider that is a
      // third of that it turns into a hard black cartoon outline sitting next to
      // faceted bodywork. Thin it (and let the key-light ramp below wash over
      // it) so the head reads as a lit object with an edge, not a sticker.
      if (op.stroke) { c.strokeStyle = op.stroke; c.lineWidth = op.lw * INK; c.stroke(op.path); }
      if (op.alpha !== 1) c.restore();
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    // Same key light as the bodywork: high and front-left of the chase camera
    // (see LX/LY/LZ in kart3d.js), so the highlight lands up-left and the
    // terminator rolls off to the low right. Strong enough that the head is
    // visibly the same lit material as the shell it is sitting in.
    const g = c.createLinearGradient(0, 0, cv.width * 0.58, cv.height * 1.02);
    g.addColorStop(0, 'rgba(255,251,236,0.44)');
    g.addColorStop(0.30, 'rgba(255,253,244,0.14)');
    g.addColorStop(0.56, 'rgba(12,18,40,0.08)');
    g.addColorStop(0.86, 'rgba(10,15,34,0.22)');
    g.addColorStop(1, 'rgba(8,12,30,0.40)');
    c.fillStyle = g;
    c.fillRect(0, 0, cv.width, cv.height);
    // specular bloom on the brow, where a round head catches the key
    const hi = c.createRadialGradient(
      cv.width * 0.34, cv.height * 0.24, 0, cv.width * 0.34, cv.height * 0.24, cv.width * 0.46);
    hi.addColorStop(0, 'rgba(255,255,250,0.20)');
    hi.addColorStop(1, 'rgba(255,255,250,0)');
    c.fillStyle = hi;
    c.fillRect(0, 0, cv.width, cv.height);
    c.globalCompositeOperation = 'source-over';
  } catch (e) {
    return null;
  }
  if (SPRITE.size > 160) SPRITE.clear();
  SPRITE.set(key, cv);
  return cv;
}

/** Aspect of the sprite canvas (height / width) - the seat plane needs it. */
export const SPRITE_ASPECT = ART_H / ART_W;
/** Half-width of the sprite in art units (its centre is the art centre line). */
export const SPRITE_HALF = ART_W / 2;

const RESOLVED = new Map();

/** Traits for a roster entry, falling back to a colour-derived default. */
export function speciesOf(racer) {
  if (!racer) return SPECIES.pikachu;
  const id = racer.id;
  const hit = id && RESOLVED.get(id);
  if (hit) return hit;
  const base = (id && SPECIES[id])
    || spec({ fur: racer.color || D.fur, skin: '#ffe9a8', ear: racer.shape === 'blob' ? 'round' : 'long' });
  // `id` / `art` let the rider know it may lean on the canonical silhouette
  // instead of the parametric fallback recipe.
  const out = Object.freeze({ ...base, id: id || null, art: !!(id && hasSpecies(id)) });
  if (id) RESOLVED.set(id, out);
  return out;
}

export default SPECIES;
