/**
 * race-world / kart bodywork
 *
 * The kart is a real (small) polygon mesh in kart-local space: x right, y up,
 * z forward toward the nose, 1 unit = half the body width, ground at y=0.
 * `buildKart()` returns the face list; src/race/kart3d.js yaws/rolls it with the
 * driving state, shades it and paints it. Nothing here is view-dependent, so the
 * same body reads correctly straight-on, mid-corner and in a full drift.
 */
import { rgba, mix } from './paint.js';
import { REAR_Z } from './kart3d.js';

/** rgba() that also accepts the rgb(...) strings mix()/shade() return. */
export function tint(col, a) {
  if (col[0] === '#') return rgba(col, a);
  const m = /rgba?\(([^)]+)\)/.exec(col);
  if (!m) return col;
  const p = m[1].split(',').map((v) => parseFloat(v));
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
}

/** hex-ify whatever mix() handed back so shadeOf() can tone it. */
export function hexish(col) {
  if (col[0] === '#') return col;
  const m = /rgba?\(([^)]+)\)/.exec(col);
  if (!m) return '#888888';
  const p = m[1].split(',').map((v) => Math.max(0, Math.min(255, Math.round(parseFloat(v)))));
  return `#${p.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const H = (a, b, t) => hexish(mix(a, b, t));

// ---- chassis loft -------------------------------------------------------
// [z, top-of-deck y, half width]
const SECT = [
  [1.62, 0.54, 0.40],
  [1.30, 0.68, 0.55],
  [0.88, 0.82, 0.66],
  [0.30, 0.90, 0.73],
  [-0.36, 0.92, 0.74],
  [-0.88, 0.86, 0.70],
  [-1.12, 0.72, 0.60],
];
const FLOOR = 0.26;
const CROWN = 0.075;      // how much the deck domes across its width
const LAT = [-1, -0.62, -0.24, 0.24, 0.62, 1];

function deckY(sec, u) { return sec[1] - CROWN * u * u; }

// the deck strip pair that is cut away for the cockpit
const COCKPIT_I = 3;
const CP_FRONT = SECT[COCKPIT_I][0];      //  0.10
const CP_BACK = SECT[COCKPIT_I + 1][0];   // -0.52
const CP_X = 0.62 * SECT[COCKPIT_I][2];   //  half width of the opening
export const SEAT = { x: CP_X, front: CP_FRONT, back: CP_BACK, floor: 0.52 };

/** Top surface: crowned strips so the bodywork catches light across its beam. */
function deckFaces(out, col) {
  for (let i = 0; i < SECT.length - 1; i++) {
    const a = SECT[i]; const b = SECT[i + 1];
    for (let j = 0; j < LAT.length - 1; j++) {
      if (i === COCKPIT_I && j >= 1 && j <= 3) continue;   // seat well opening
      const u0 = LAT[j]; const u1 = LAT[j + 1];
      out.push({
        col,
        pts: [
          [u0 * a[2], deckY(a, u0), a[0]],
          [u1 * a[2], deckY(a, u1), a[0]],
          [u1 * b[2], deckY(b, u1), b[0]],
          [u0 * b[2], deckY(b, u0), b[0]],
        ],
      });
    }
  }
}

/** Flanks: an upper shoulder that rolls over, then the vertical sill. */
function flankFaces(out, col, sill) {
  for (const sx of [-1, 1]) {
    for (let i = 0; i < SECT.length - 1; i++) {
      const a = SECT[i]; const b = SECT[i + 1];
      const ay = deckY(a, 1); const by = deckY(b, 1);
      const mid = 0.58;
      out.push({
        col,
        pts: sx > 0
          ? [[a[2], ay, a[0]], [b[2], by, b[0]], [b[2] * 1.02, mid, b[0]], [a[2] * 1.02, mid, a[0]]]
          : [[-a[2] * 1.02, mid, a[0]], [-b[2] * 1.02, mid, b[0]], [-b[2], by, b[0]], [-a[2], ay, a[0]]],
      });
      out.push({
        col: sill,
        pts: sx > 0
          ? [[a[2] * 1.02, mid, a[0]], [b[2] * 1.02, mid, b[0]], [b[2] * 0.94, FLOOR, b[0]], [a[2] * 0.94, FLOOR, a[0]]]
          : [[-a[2] * 0.94, FLOOR, a[0]], [-b[2] * 0.94, FLOOR, b[0]], [-b[2] * 1.02, mid, b[0]], [-a[2] * 1.02, mid, a[0]]],
      });
    }
  }
}

/** Floor pan, nose cap and tail panel. */
function capFaces(out, col, dark, tail) {
  const f = SECT[0]; const r = SECT[SECT.length - 1];
  out.push({
    col: dark, two: true, flat: 0.35,
    pts: [[-f[2] * 0.94, FLOOR, f[0]], [f[2] * 0.94, FLOOR, f[0]],
      [r[2] * 0.94, FLOOR, r[0]], [-r[2] * 0.94, FLOOR, r[0]]],
  });
  out.push({
    col,
    pts: [[-f[2], deckY(f, -1), f[0]], [f[2], deckY(f, 1), f[0]],
      [f[2] * 0.94, FLOOR, f[0]], [-f[2] * 0.94, FLOOR, f[0]]],
  });
  out.push({
    col: tail,
    pts: [[r[2] * 0.94, FLOOR, r[0]], [r[2], deckY(r, 1), r[0]],
      [-r[2], deckY(r, -1), r[0]], [-r[2] * 0.94, FLOOR, r[0]]],
  });
}

/** Seat well: floor, dash bulkhead, side walls, seat back. */
function cockpitFaces(out, col, dark, trim) {
  const x = SEAT.x; const fz = SEAT.front; const bz = SEAT.back; const fy = SEAT.floor;
  const sz = bz - 0.30;              // back of the seat shell
  const topY = deckY(SECT[COCKPIT_I], 0.5);
  out.push({ col: dark, flat: 0.4, two: true, lift: 0.02,
    pts: [[-x, fy, fz], [x, fy, fz], [x, fy, sz], [-x, fy, sz]] });
  // dash bulkhead
  out.push({ col: dark, two: true, lift: 0.05,
    pts: [[-x, fy, fz], [x, fy, fz], [x * 0.92, topY, fz], [-x * 0.92, topY, fz]] });
  // side walls of the well
  for (const sx of [-1, 1]) {
    out.push({ col: dark, two: true, lift: 0.05,
      pts: [[sx * x, fy, fz], [sx * x, fy, sz], [sx * x * 0.95, topY, sz], [sx * x * 0.95, topY, fz]] });
  }
  // seat back shell
  const sy = 1.10;
  out.push({ col: trim, lift: 0.10,
    pts: [[-x * 0.82, fy, bz], [x * 0.82, fy, bz], [x * 0.70, sy, bz + 0.04], [-x * 0.70, sy, bz + 0.04]] });
  out.push({ col: col,
    pts: [[x * 0.86, fy, sz], [-x * 0.86, fy, sz], [-x * 0.74, sy - 0.03, sz], [x * 0.74, sy - 0.03, sz]] });
  out.push({ col: H(col, '#ffffff', 0.2),
    pts: [[-x * 0.70, sy, bz + 0.04], [x * 0.70, sy, bz + 0.04], [x * 0.74, sy - 0.03, sz], [-x * 0.74, sy - 0.03, sz]] });
  for (const sx of [-1, 1]) {
    out.push({ col,
      pts: [[sx * x * 0.82, fy, bz], [sx * x * 0.86, fy, sz], [sx * x * 0.74, sy - 0.03, sz], [sx * x * 0.70, sy, bz + 0.04]] });
  }
}

/** Rear diffuser box, brake lights, plate and exhaust tips. */
function rearFaces(out, body, trim, dark) {
  const r = SECT[SECT.length - 1];
  const z0 = r[0]; const z1 = r[0] - 0.13;
  const w = r[2] * 0.98;
  out.push({ col: dark, pts: [[-w, 0.26, z1], [w, 0.26, z1], [w, 0.68, z1], [-w, 0.68, z1]] });
  out.push({ col: H(dark, '#ffffff', 0.14), pts: [[-w, 0.68, z1], [w, 0.68, z1], [w * 1.02, 0.70, z0], [-w * 1.02, 0.70, z0]] });
  for (const sx of [-1, 1]) {
    out.push({ col: '#e8323a', lift: 0.10,
      pts: [[sx * w * 0.44, 0.40, z1], [sx * w * 0.86, 0.40, z1], [sx * w * 0.86, 0.58, z1], [sx * w * 0.44, 0.58, z1]] });
    out.push({ col: '#c0c8d2', lift: 0.10,
      pts: [[sx * w * 0.62, 0.28, z1], [sx * w * 0.86, 0.28, z1], [sx * w * 0.86, 0.38, z1], [sx * w * 0.62, 0.38, z1]] });
  }
  out.push({ col: '#f2f5f8', lift: 0.10,
    pts: [[-w * 0.30, 0.38, z1], [w * 0.30, 0.38, z1], [w * 0.30, 0.60, z1], [-w * 0.30, 0.60, z1]] });
  out.push({ col: trim, lift: 0.11,
    pts: [[-w * 0.24, 0.42, z1], [w * 0.24, 0.42, z1], [w * 0.24, 0.56, z1], [-w * 0.24, 0.56, z1]] });
}

/**
 * Ducktail lip across the tail. The reference karts are roadsters, not formula
 * cars - a full aero wing at seat height cuts the rider in half, so this is a
 * low kicked-up spoiler that hugs the rear deck.
 */
function spoilerFaces(out, body, trim) {
  const z0 = -0.98; const z1 = -1.18; const y = 0.92; const w = 0.50;
  const dk = H(trim, '#000000', 0.34);
  for (const sx of [-1, 1]) {
    const a = sx * 0.30; const b = sx * 0.46;
    out.push({ col: dk, two: true, pts: [[a, 0.64, z0], [b, 0.64, z0], [b, y, z0], [a, y, z0]] });
  }
  // plate: top, underside, trailing edge
  out.push({ col: H(trim, '#ffffff', 0.26), pts: [[-w, y + 0.05, z1], [w, y + 0.05, z1], [w, y + 0.10, z0], [-w, y + 0.10, z0]] });
  out.push({ col: H(trim, '#000000', 0.34), two: true, pts: [[-w, y - 0.09, z1], [w, y - 0.09, z1], [w, y - 0.04, z0], [-w, y - 0.04, z0]] });
  out.push({ col: H(trim, '#000000', 0.06), pts: [[-w, y - 0.09, z1], [w, y - 0.09, z1], [w, y + 0.05, z1], [-w, y + 0.05, z1]] });
  // end fins
  for (const sx of [-1, 1]) {
    out.push({ col: trim, two: true,
      pts: [[sx * w, y - 0.09, z1], [sx * w, y + 0.10, z0], [sx * w, y + 0.20, z0 - 0.02], [sx * w, y + 0.15, z1 + 0.03]] });
  }
}

// ---- wheels -------------------------------------------------------------
const WN = 20;

/**
 * One wheel as a short cylinder. `steer` turns it about its own vertical axis
 * (so the fronts point where the kart is steering) and `spin` rolls the tread
 * blocks, which is what makes the kart read as moving rather than sliding.
 */
export function wheelFaces(out, cx, cz, r, hw, steer, spin, rim) {
  const axx = Math.cos(steer); const axz = -Math.sin(steer);
  const fwx = Math.sin(steer); const fwz = Math.cos(steer);
  const P = (a, side) => [
    cx + fwx * Math.sin(a) * r + axx * side * hw,
    r + Math.cos(a) * r,
    cz + fwz * Math.sin(a) * r + axz * side * hw,
  ];
  for (let i = 0; i < WN; i++) {
    const a0 = spin + (i / WN) * Math.PI * 2;
    const a1 = spin + ((i + 1) / WN) * Math.PI * 2;
    out.push({
      col: i % 2 ? '#1b1f27' : '#101319',
      flat: 0.62,
      pts: [P(a0, -1), P(a1, -1), P(a1, 1), P(a0, 1)],
    });
  }
  for (const side of [-1, 1]) {
    const disc = [];
    const hub = [];
    for (let i = 0; i < WN; i++) {
      const a = spin + (i / WN) * Math.PI * 2;
      disc.push(P(a, side));
      const p = P(a, side * 1.02);
      hub.push([cx + (p[0] - cx) * 0.56, r + (p[1] - r) * 0.56, cz + (p[2] - cz) * 0.56]);
    }
    // The discs are close to edge-on from a chase camera, so they must be
    // two-sided or the rims vanish and each tyre reads as a black block.
    out.push({ col: '#15181e', flat: 0.55, two: true, pts: disc });
    out.push({ col: rim, flat: 0.8, two: true, lift: 0.06, pts: hub });
  }
}

/** Side-pod / plate glyph, drawn in screen space at (x, y) with radius r. */
export function emblem(c, x, y, r, kind, col) {
  c.save();
  c.translate(x, y);
  c.fillStyle = col;
  c.beginPath();
  if (kind === 'bolt') {
    c.moveTo(-r * 0.28, -r); c.lineTo(r * 0.52, -r * 0.14); c.lineTo(r * 0.08, -r * 0.1);
    c.lineTo(r * 0.36, r); c.lineTo(-r * 0.5, r * 0.06); c.lineTo(-r * 0.04, r * 0.02);
  } else if (kind === 'flame') {
    c.moveTo(0, -r); c.quadraticCurveTo(r * 0.9, -r * 0.1, r * 0.36, r * 0.9);
    c.quadraticCurveTo(0, r * 0.4, -r * 0.36, r * 0.9);
    c.quadraticCurveTo(-r * 0.8, -r * 0.1, 0, -r);
  } else if (kind === 'drop') {
    c.moveTo(0, -r); c.quadraticCurveTo(r * 0.85, r * 0.1, 0, r);
    c.quadraticCurveTo(-r * 0.85, r * 0.1, 0, -r);
  } else if (kind === 'leaf') {
    c.moveTo(-r * 0.7, r * 0.7); c.quadraticCurveTo(-r * 0.2, -r, r * 0.8, -r * 0.7);
    c.quadraticCurveTo(r * 0.5, r * 0.5, -r * 0.7, r * 0.7);
  } else if (kind === 'fist') {
    c.moveTo(-r * 0.7, -r * 0.4); c.lineTo(r * 0.7, -r * 0.7); c.lineTo(r * 0.7, r * 0.7);
    c.lineTo(-r * 0.7, r * 0.4);
  } else if (kind === 'gem') {
    c.moveTo(0, -r); c.lineTo(r * 0.8, -r * 0.2); c.lineTo(0, r); c.lineTo(-r * 0.8, -r * 0.2);
  } else if (kind === 'moon') {
    c.arc(0, 0, r, Math.PI * 0.35, Math.PI * 1.65);
    c.quadraticCurveTo(-r * 0.1, 0, r * 0.38, -r * 0.62);
  } else {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI * 2) / 5;
      if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  c.closePath();
  c.fill();
  c.restore();
}

/**
 * Two-tone livery. Many roster accents are only a shade off their body colour
 * (Pikachu is yellow-on-orange), which paints an all-one-colour lump; the
 * reference karts are always body + a clearly contrasting second colour, so we
 * pick the first candidate far enough away in RGB and fall back to a cool
 * graphite / silver.
 */
export function liveryOf(body, accent, hat) {
  const b = rgbOf(body);
  const far = (c) => {
    if (!c) return -1;
    const v = rgbOf(c);
    return Math.abs(v[0] - b[0]) + Math.abs(v[1] - b[1]) + Math.abs(v[2] - b[2]);
  };
  for (const cand of [accent, hat]) if (far(cand) > 200) return hexish(cand);
  const lum = (b[0] * 0.3 + b[1] * 0.59 + b[2] * 0.11);
  return lum > 140 ? '#2b4a86' : '#e2e8f0';
}

function rgbOf(hex) {
  const h = hexish(hex).replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Livery: a swept accent flash up each flank, floated just off the bodywork. */
function liveryFaces(out, trim) {
  for (const sx of [-1, 1]) {
    const q = (i) => SECT[i];
    for (let i = 1; i <= 4; i++) {
      const a = q(i); const b = q(i + 1);
      const ta = 0.30 + (i - 1) * 0.06;
      const tb = 0.30 + i * 0.06;
      out.push({
        col: trim, lift: 0.06,
        pts: sx > 0
          ? [[a[2] * 1.006, ta, a[0]], [b[2] * 1.006, tb, b[0]],
            [b[2] * 1.006, tb + 0.24, b[0]], [a[2] * 1.006, ta + 0.24, a[0]]]
          : [[-a[2] * 1.006, ta + 0.24, a[0]], [-b[2] * 1.006, tb + 0.24, b[0]],
            [-b[2] * 1.006, tb, b[0]], [-a[2] * 1.006, ta, a[0]]],
      });
    }
  }
}


/** (unused) Fender pod over a wheel - kept for reference, see buildKart. */
function podFaces(out, col, sx, zc, len, xIn, xOut, yTop, yBot) {
  const z0 = zc + len; const z1 = zc - len;
  const xi = sx * xIn; const xo = sx * xOut;
  const yo = yTop - 0.06;
  // top
  out.push({ col, pts: [[xi, yTop, z0], [xo, yo, z0], [xo, yo, z1], [xi, yTop, z1]] });
  // outer wall
  out.push({ col: H(col, '#000000', 0.16), pts: sx > 0
    ? [[xo, yo, z0], [xo, yBot, z0], [xo, yBot, z1], [xo, yo, z1]]
    : [[xo, yo, z1], [xo, yBot, z1], [xo, yBot, z0], [xo, yo, z0]] });
  // front / rear caps
  out.push({ col: H(col, '#ffffff', 0.10), pts: [[xi, yTop, z0], [xi, yBot, z0], [xo, yBot, z0], [xo, yo, z0]] });
  out.push({ col: H(col, '#000000', 0.30), pts: [[xo, yo, z1], [xo, yBot, z1], [xi, yBot, z1], [xi, yTop, z1]] });
}

/** Bonnet stripes - the two-tone flash the reference karts wear down the nose. */
function stripeFaces(out, col) {
  for (let i = 0; i < 3; i++) {
    const a = SECT[i]; const b = SECT[i + 1];
    for (const u of [-0.40, 0.40]) {
      const w0 = 0.13; 
      out.push({ col, lift: 0.05, pts: [
        [(u - w0) * a[2], deckY(a, u - w0) + 0.006, a[0]],
        [(u + w0) * a[2], deckY(a, u + w0) + 0.006, a[0]],
        [(u + w0) * b[2], deckY(b, u + w0) + 0.006, b[0]],
        [(u - w0) * b[2], deckY(b, u - w0) + 0.006, b[0]],
      ] });
    }
  }
}

export const AXLE = { front: 1.06, rear: REAR_Z, x: 0.84, rf: 0.38, rr: 0.44, hw: 0.105 };

/**
 * Whole kart body (no rider). `steer` is the front-wheel angle in radians,
 * `spin` the tyre roll phase.
 */
export function buildKart({ body, trim, livery, steer = 0, spin = 0 }) {
  const base = hexish(body);
  const acc = hexish(livery || trim);
  const sill = H(acc, '#000000', 0.30);
  const dark = H(base, '#0b0d12', 0.72);
  const out = [];
  capFaces(out, base, dark, H(acc, '#000000', 0.42));
  flankFaces(out, base, sill);
  deckFaces(out, base);
  liveryFaces(out, acc);
  cockpitFaces(out, base, dark, H(acc, '#000000', 0.18));
  rearFaces(out, base, acc, H(acc, '#000000', 0.52));
  spoilerFaces(out, base, acc);
  stripeFaces(out, acc);
  wheelFaces(out, -AXLE.x, AXLE.front, AXLE.rf, AXLE.hw, steer, spin, acc);
  wheelFaces(out, AXLE.x, AXLE.front, AXLE.rf, AXLE.hw, steer, spin, acc);
  wheelFaces(out, -AXLE.x * 1.02, AXLE.rear, AXLE.rr, AXLE.hw * 1.4, 0, spin * 0.86, acc);
  wheelFaces(out, AXLE.x * 1.02, AXLE.rear, AXLE.rr, AXLE.hw * 1.4, 0, spin * 0.86, acc);
  return out;
}

export { SECT, FLOOR, deckY, H, podFaces };
