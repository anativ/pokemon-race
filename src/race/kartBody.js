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
// The body is ONE closed lofted shell: a stack of cross-section rings running
// nose -> cockpit -> tail, joined by quad strips. Every visible panel is a wall
// of that single solid, so there is nothing coplanar to z-fight, no floating
// decal slabs and no seams between "deck", "flank" and "sill" pieces - the
// silhouette reads as one rounded roadster hull from any steering angle.
//
// ring = [z, half width, deck y (centreline), floor y]
// The waist swells into a hip over each axle so the tyres are faired into the
// bodywork instead of bolted onto a slab-sided tub.
//
// The front half is a real wedge, not a slab with a chamfer: from the dash
// bulkhead forward every ring loses width AND deck height, so the nose is a
// low rounded snout about a quarter of the cockpit width (the reference kart's
// bonnet drops away between the front tyres instead of running on at cockpit
// height to a blunt end).
const RING = [
  [1.50, 0.148, 0.428, 0.362],
  [1.36, 0.296, 0.474, 0.325],
  [1.16, 0.434, 0.550, 0.298],
  [0.92, 0.556, 0.642, 0.282],
  [0.62, 0.655, 0.756, 0.275],
  [0.30, 0.745, 0.875, 0.27],
  [0.04, 0.775, 0.90, 0.265],
  [-0.22, 0.790, 0.92, 0.265],
  [-0.46, 0.798, 0.945, 0.265],
  [-0.62, 0.792, 0.965, 0.27],
  [-0.84, 0.762, 1.000, 0.285],
  [-0.98, 0.700, 1.010, 0.320],
  [-1.08, 0.605, 0.995, 0.360],
  [-1.15, 0.490, 0.950, 0.415],
  [-1.20, 0.342, 0.885, 0.490],
  [-1.23, 0.170, 0.805, 0.570],
];
const CP_A = 5;            // first cockpit ring (dash bulkhead)
const CP_B = 10;           // last cockpit ring (seat bulkhead)
const RIM = 0.58;          // cockpit opening as a fraction of the ring half width
const WELL = 0.50;         // seat floor height
const FLOOR = 0.27;

export const SEAT = {
  x: RING[7][1] * RIM, front: RING[CP_A][0], back: RING[CP_B][0], floor: WELL,
};

/**
 * One cross-section outline: 22 points, bottom centre -> up the right flank ->
 * over the deck -> down the left flank. The winding is what makes the lofted
 * quads face outward, so keep the order. The shoulder is sampled finely enough
 * that the roll-over reads as a curve rather than a crease.
 */
function ring(r) {
  const z = r[0]; const w = r[1]; const top = r[2]; const bot = r[3];
  const h = top - bot;
  const half = [
    [0.50 * w, bot],
    [0.84 * w, bot + 0.045 * h],
    [0.975 * w, bot + 0.20 * h],
    [1.000 * w, bot + 0.40 * h],
    [0.995 * w, bot + 0.62 * h],
    [0.965 * w, bot + 0.80 * h],
    [0.905 * w, bot + 0.90 * h],
    [0.800 * w, top - 0.062],
    [0.680 * w, top - 0.024],
    [RIM * w, top - 0.002],
  ];
  const pts = [[0, bot, z]];
  for (const p of half) pts.push([p[0], p[1], z]);
  pts.push([0, top + 0.014, z]);
  for (let i = half.length - 1; i >= 0; i--) pts.push([-half[i][0], half[i][1], z]);
  return pts;
}

const K = 22;                 // points (and strips) per ring
const CUT_A = 10;             // the two strips over the cockpit opening
const CUT_B = 11;

// which paint each of the 22 strips wears
const BAND = ['pan', 'sill', 'low', 'low', 'side', 'side', 'side',
  'deck', 'deck', 'deck', 'deck', 'deck', 'deck', 'deck', 'deck',
  'side', 'side', 'side', 'low', 'low', 'sill', 'pan'];

/** The whole hull: one quad strip per ring pair, plus a nose and a tail cap. */
function hullFaces(out, col) {
  const rings = RING.map(ring);
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i]; const b = rings[i + 1];
    const cut = i >= CP_A && i < CP_B;
    for (let j = 0; j < K; j++) {
      if (cut && (j === CUT_A || j === CUT_B)) continue;   // seat well opening
      const k = (j + 1) % K;
      out.push({ col: col[BAND[j]], pts: [a[j], b[j], b[k], a[k]] });
    }
  }
  out.push({ col: col.low, pts: rings[0] });
  out.push({ col: col.tail, pts: rings[rings.length - 1].slice().reverse() });
}

/** Axis-aligned box, six outward-facing quads. Used for every add-on part. */
function box(out, ax0, ax1, ay0, ay1, az0, az1, c) {
  const xl = Math.min(ax0, ax1); const xr = Math.max(ax0, ax1);
  const yb = Math.min(ay0, ay1); const yt = Math.max(ay0, ay1);
  const zb = Math.min(az0, az1); const zf = Math.max(az0, az1);
  const side = c.side; const bot = c.bot || side;
  const front = c.front || side; const back = c.back || side;
  // Faces are painter-sorted on their average depth, so a small part bolted to
  // a big one needs a depth bias or the parent panel's centroid can win and
  // swallow it (an off-centre brake lens vanishing into the bumper).
  const L = c.lift || 0;
  const q = (col, pts) => out.push({ col, pts, lift: L });
  q(c.top, [[xl, yt, zb], [xl, yt, zf], [xr, yt, zf], [xr, yt, zb]]);
  q(bot, [[xl, yb, zf], [xl, yb, zb], [xr, yb, zb], [xr, yb, zf]]);
  q(front, [[xl, yb, zf], [xr, yb, zf], [xr, yt, zf], [xl, yt, zf]]);
  q(back, [[xr, yb, zb], [xl, yb, zb], [xl, yt, zb], [xr, yt, zb]]);
  q(side, [[xr, yb, zf], [xr, yb, zb], [xr, yt, zb], [xr, yt, zf]]);
  q(side, [[xl, yb, zb], [xl, yb, zf], [xl, yt, zf], [xl, yt, zb]]);
}

/**
 * A rounded-rectangle outline in the x/z plane at height `y`, wound so that
 * loft() below turns a stack of them into an outward-facing shell. `p` sets how
 * boxy the corners are (2 = ellipse, 4 = nearly square).
 */
function plateRing(y, hx, zf, zb, p = 2.7) {
  const cz = (zf + zb) / 2; const hz = (zf - zb) / 2;
  const N = 12;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const ca = Math.cos(a); const sa = Math.sin(a);
    const k = (Math.abs(ca) ** p + Math.abs(sa) ** p) ** (-1 / p);
    pts.push([ca * k * hx, y, cz + sa * k * hz]);
  }
  return pts;
}

/**
 * Plan-view outline at height `y` from a front->back list of [z, half width].
 * Wound the same way as plateRing() so both feed loft() unchanged; use it for
 * add-on parts (bumper, ducktail) that must follow the hull's taper rather than
 * sit across it as a straight-edged slab.
 */
function planRing(y, spans, k = 1) {
  const pts = [];
  for (let i = spans.length - 1; i >= 0; i--) pts.push([spans[i][1] * k, y, spans[i][0]]);
  for (const s of spans) pts.push([-s[1] * k, y, s[0]]);
  return pts;
}

/**
 * Stitch a stack of equal-length rings (bottom -> top) into a closed shell.
 * Faces come out wound outward, so they cull and painter-sort like the hull -
 * that is what stops a seat back from punching through the bodywork.
 */
function loft(out, rings, colOf, lift = 0) {
  const N = rings[0].length;
  for (let i = 0; i < rings.length - 1; i++) {
    const lo = rings[i]; const up = rings[i + 1];
    for (let j = 0; j < N; j++) {
      const k = (j + 1) % N;
      out.push({ col: colOf(j), lift, pts: [lo[j], up[j], up[k], lo[k]] });
    }
  }
}

/**
 * Moulded bucket seat: a tapered loft (cushion + shoulders + head pad) rather
 * than a stack of boxes, so nothing juts past the flanks and the whole thing
 * sits inside the cockpit opening.
 */
function seatFaces(out, seat, trim) {
  const dark = H(seat, '#000000', 0.34);
  const mid = H(seat, '#000000', 0.14);
  const lite = H(seat, '#ffffff', 0.12);
  // cushion
  const cushion = [
    plateRing(WELL - 0.01, 0.355, -0.02, -0.50),
    plateRing(WELL + 0.075, 0.335, -0.05, -0.49),
  ];
  loft(out, cushion, () => mid, 0.01);
  out.push({ col: lite, lift: 0.02, pts: cushion[1].slice().reverse() });
  // back rest -> head pad, each ring narrower and shorter than the one below
  const S = [
    [WELL + 0.02, 0.360, -0.335, -0.640],
    [0.700, 0.352, -0.375, -0.646],
    [0.870, 0.330, -0.420, -0.644],
    [0.990, 0.292, -0.452, -0.634],
    [1.078, 0.232, -0.478, -0.616],
    [1.132, 0.146, -0.500, -0.594],
  ];
  const back = S.map((r) => plateRing(r[0], r[1], r[2], r[3]));
  const face = (j) => {
    const s = Math.sin((j / 12) * Math.PI * 2);
    return s > 0.5 ? seat : s < -0.5 ? dark : mid;
  };
  loft(out, back, face, 0.01);
  out.push({ col: H(trim, '#ffffff', 0.18), lift: 0.02, pts: back[back.length - 1].slice().reverse() });
}

/**
 * Seat well: the recess inside the hull opening. Its rim is exactly the hull's
 * cockpit-opening edge, so the well meets the bodywork on a shared edge instead
 * of overlapping it.
 */
function cockpitFaces(out, dark, seat, trim, shelf) {
  const lip = (r) => RIM * r[1];
  const rimY = (r) => r[2] + 0.008;
  for (let i = CP_A; i < CP_B; i++) {
    const a = RING[i]; const b = RING[i + 1];
    out.push({ col: dark, flat: 0.42, two: true, lift: 0.03,
      pts: [[-lip(a) * 0.9, WELL, a[0]], [lip(a) * 0.9, WELL, a[0]],
        [lip(b) * 0.9, WELL, b[0]], [-lip(b) * 0.9, WELL, b[0]]] });
    for (const sx of [-1, 1]) {
      out.push({ col: dark, flat: 0.5, two: true, lift: 0.05,
        pts: [[sx * lip(a), rimY(a), a[0]], [sx * lip(b), rimY(b), b[0]],
          [sx * lip(b) * 0.9, WELL, b[0]], [sx * lip(a) * 0.9, WELL, a[0]]] });
    }
  }
  // bulkheads closing the front (dash) and back (parcel shelf) of the well
  for (const idx of [CP_A, CP_B]) {
    const f = RING[idx];
    out.push({ col: dark, flat: 0.5, two: true, lift: 0.04,
      pts: [[-lip(f), rimY(f), f[0]], [lip(f), rimY(f), f[0]],
        [lip(f) * 0.9, WELL, f[0]], [-lip(f) * 0.9, WELL, f[0]]] });
  }
  // parcel shelf: closes the deck between the seat back and the rear bulkhead so
  // the cockpit never opens into a black slot behind the rider
  const a = RING[CP_B - 1]; const b = RING[CP_B];
  const t = 0.20;
  const zs = a[0] + (b[0] - a[0]) * t;
  const ws = (a[1] + (b[1] - a[1]) * t) * RIM;
  const ys = a[2] + (b[2] - a[2]) * t;
  out.push({ col: shelf, lift: 0.02,
    pts: [[-ws, ys, zs], [ws, ys, zs], [lip(b), rimY(b), b[0]], [-lip(b), rimY(b), b[0]]] });
  out.push({ col: dark, flat: 0.5, two: true, lift: 0.03,
    pts: [[-ws, ys, zs], [-ws * 0.92, WELL, zs], [ws * 0.92, WELL, zs], [ws, ys, zs]] });
  seatFaces(out, seat, trim);
}

/**
 * Rear valance: NOT a bumper bolted to the tail. Its leading rings sit *inside*
 * the hull, tucked behind the sill band, and it only becomes visible as the boat
 * tail narrows above it - so the skirt appears to run unbroken from the sill,
 * between the wheels, and around the back. It is painted in the same single
 * skirt colour as the hull's sill/low bands, so there is no second-blue seam:
 * the only thing separating valance from flank is the lambert shading of its own
 * curvature. The lights and plate live on its flat centre panel.
 */
// [z, half width, top edge y]. The top edge is a ramp, not a constant height:
// its leading values ARE the hull's own low-band top (ring bot + 0.4h) at that z,
// so where the valance emerges from under the flank the two skirt lines meet
// flush. A constant height instead steps up into a band and leaves a
// body-coloured tongue dipping into the skirt at the crossover.
const BUMP = [
  [-0.86, 0.626, 0.573], [-0.94, 0.652, 0.586], [-1.02, 0.670, 0.602],
  [-1.16, 0.652, 0.652], [-1.26, 0.600, 0.698], [-1.330, 0.500, 0.720],
  [-1.365, 0.330, 0.704],
];
const VAL_Y0 = 0.285;      // valance floor
const VAL_T = [0, 0.30, 0.64, 0.87, 1];
const VAL_K = [0.92, 1.00, 1.00, 0.95, 0.80];

/** One valance ring at height parameter t, wound like planRing(). */
function valRing(t, k) {
  const y = (s) => VAL_Y0 + t * (s[2] - VAL_Y0);
  const pts = [];
  for (let i = BUMP.length - 1; i >= 0; i--) pts.push([BUMP[i][1] * k, y(BUMP[i]), BUMP[i][0]]);
  for (const s of BUMP) pts.push([-s[1] * k, y(s), s[0]]);
  return pts;
}

function rearFaces(out, trim, skirt) {
  // Tall enough at the back that the hull's boat-tail cap is tucked inside it
  // (left exposed it reads as a body-coloured lump stuck on the tail), with the
  // top ring pulled well inboard so its leading end stays hidden under the sill.
  const rings = VAL_T.map((t, i) => valRing(t, VAL_K[i]));
  // Small depth bias only. The leading rings deliberately sit inside the hull, so
  // a big bias would let those hidden faces sort in front of the flank and punch
  // a blue patch through the bodywork; the lens/plate pads carry their own much
  // larger lift, so they still win over the panel they are mounted on.
  loft(out, rings, () => skirt, 0.02);
  out.push({ col: skirt, lift: 0.03, pts: rings[rings.length - 1].slice().reverse() });
  out.push({ col: skirt, lift: 0.03, pts: rings[0] });
  for (const sx of [-1, 1]) {
    // lens pads, standing proud of the valance's flat centre panel
    box(out, sx * 0.19, sx * 0.40, 0.385, 0.545, -1.330, -1.352,
      { top: '#f0666c', back: '#e8323a', front: '#e8323a', side: '#c02a32', lift: 0.40 });
  }
  box(out, -0.150, 0.150, 0.380, 0.540, -1.330, -1.348,
    { top: '#f2f5f8', back: '#f2f5f8', front: '#f2f5f8', side: '#c9ced6', lift: 0.40 });
  out.push({ col: trim, lift: 0.46,
    pts: [[-0.102, 0.408, -1.351], [0.102, 0.408, -1.351], [0.102, 0.512, -1.351], [-0.102, 0.512, -1.351]] });
}

/**
 * Ducktail lip kicked up off the rear deck. The reference karts are roadsters,
 * not formula cars - a wing on struts at seat height cuts straight across the
 * rider - so the spoiler is a low integrated lip that hugs the boat tail.
 */
function spoilerFaces(out, trim) {
  // plan follows the tail taper; the base ring sits below the deck line so the
  // lip grows out of the bodywork instead of hovering over it
  const S = [[-0.80, 0.545], [-0.94, 0.530], [-1.06, 0.480], [-1.14, 0.395], [-1.185, 0.275]];
  const rings = [planRing(0.945, S, 1.00), planRing(1.020, S, 0.97), planRing(1.072, S, 0.86)];
  loft(out, rings, () => trim, 0.05);
  out.push({ col: H(trim, '#ffffff', 0.26), lift: 0.06, pts: rings[2].slice().reverse() });
}

// ---- wheels -------------------------------------------------------------
const TREAD = '#191d25';
const WALL = '#101319';

/**
 * Stub axle: a short barrel from the hull flank out to a wheel's inboard face.
 * Without it the tyres read as donuts parked next to the kart; with it the eye
 * follows the hub straight back into the bodywork.
 */
function axleFaces(out, sx, cz, y, x0, x1, r, col) {
  const N = 8;
  const ring2 = (x, rr) => {
    const p = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      p.push([sx * x, y + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
    }
    return p;
  };
  const a = ring2(x0, r * 1.25); const b = ring2(x1, r);
  for (let i = 0; i < N; i++) {
    const k = (i + 1) % N;
    out.push({ col, two: true, flat: 0.8, lift: 0.02, pts: [a[i], b[i], b[k], a[k]] });
  }
}

/**
 * One wheel: a barrelled cylinder (the crown bulges, the shoulders tuck in, so
 * the highlight rolls round the tyre instead of banding it like a tank track),
 * capped each side by a sidewall annulus, a silver rim disc and a hub cap.
 * `steer` turns it about its own vertical axis, `spin` rolls it.
 */
export function wheelFaces(out, cx, cz, r, hw, steer, spin, rim, lod = 1) {
  const WN = lod ? 22 : 10;
  const BANDS = lod ? [-1, -0.45, 0.45, 1] : [-1, 1];
  const axx = Math.cos(steer); const axz = -Math.sin(steer);
  const fwx = Math.sin(steer); const fwz = Math.cos(steer);
  // radius at lateral position u (-1 outer .. 1 outer): barrel profile
  const rad = (u) => r * (0.945 + 0.055 * (1 - u * u));
  const P = (a, u, k) => {
    const rr = (k == null ? rad(u) : r * k);
    return [
      cx + fwx * Math.sin(a) * rr + axx * u * hw,
      r + Math.cos(a) * rr,
      cz + fwz * Math.sin(a) * rr + axz * u * hw,
    ];
  };
  const A = (i) => spin + (i / WN) * Math.PI * 2;
  for (let i = 0; i < WN; i++) {
    const a0 = A(i); const a1 = A(i + 1);
    for (let b = 0; b < BANDS.length - 1; b++) {
      const u0 = BANDS[b]; const u1 = BANDS[b + 1];
      out.push({
        col: TREAD, flat: 0.9,
        pts: [P(a0, u0), P(a1, u0), P(a1, u1), P(a0, u1)],
      });
    }
  }
  for (const side of [-1, 1]) {
    // sidewall: annulus from the tyre shoulder in to the rim
    if (lod) {
      for (let i = 0; i < WN; i++) {
        const a0 = A(i); const a1 = A(i + 1);
        out.push({
          col: WALL, flat: 0.5, two: true, lift: 0.01,
          pts: [P(a0, side, 0.945), P(a0, side, 0.470), P(a1, side, 0.470), P(a1, side, 0.945)],
        });
      }
    } else {
      // Low detail skips the annulus, so close the whole sidewall with one dark
      // disc - otherwise the smaller rim leaves a ring of open tyre that the
      // background shines through on the distant karts.
      const flat = [];
      for (let i = 0; i < WN; i++) flat.push(P(A(i), side, 0.945));
      out.push({ col: WALL, flat: 0.5, two: true, lift: 0.01, pts: flat });
    }
    // Rim discs live exactly ON the tyre's shoulder plane (u = +-1) at less than
    // half the tread radius, so the disc outline is strictly nested inside the
    // sidewall circle from every angle. Pushing them outboard (u = 1.02 / 1.05)
    // to "make sure they show" is what let a pale wedge poke out under the
    // near-side tyres when the wheel went edge-on to the chase camera.
    const disc = []; const hub = [];
    for (let i = 0; i < WN; i++) {
      disc.push(P(A(i), side, 0.470));
      hub.push(P(A(i), side, 0.205));
    }
    // Near edge-on from a chase camera, so both must be two-sided or the rims
    // vanish and each tyre reads as a solid black block.
    out.push({ col: '#dfe5ed', flat: 0.72, two: true, lift: 0.03, pts: disc });
    out.push({ col: rim, flat: 0.85, two: true, lift: 0.05, pts: hub });
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

// Track is set so each tyre's inboard sidewall sits ~0.03 outside the hip it
// belongs to: no daylight between wheel and bodywork, and the rim disc still
// clears the hull silhouette so both hubs read from a straight-on chase view.
// Front axle sits further forward and on a narrower track than the rear: it
// follows the tapered nose (a wide front track on a narrow snout reads as wheels
// bolted to a plank) and the longer wheelbase keeps the near-side front and rear
// tyres from projecting onto the same screen column mid-steer, where they used
// to fuse into one dark barrel. The stub axles bridge the gap to the hull.
export const AXLE = {
  front: 1.045, rear: REAR_Z, xf: 0.690, xr: 0.826, rf: 0.258, rr: 0.300, hwf: 0.078, hwr: 0.094,
};

/**
 * Whole kart body (no rider). `steer` is the front-wheel angle in radians,
 * `spin` the tyre roll phase.
 */
export function buildKart({ body, trim, livery, steer = 0, spin = 0, lod = 1 }) {
  const base = hexish(body);
  const acc = hexish(livery || trim);
  const out = [];
  // ONE skirt colour. The sill chamfer, the low flank band and the rear valance
  // all wear the same paint, so the dark band reads as a single moulding running
  // sill -> between the wheels -> around the tail, the way the reference kart's
  // blue skirt does. Two shades of the accent here is what made the old rear end
  // look like a separately bolted bumper box.
  const skirt = H(acc, '#000000', 0.22);
  hullFaces(out, {
    pan: H(base, '#0b0d12', 0.66),
    sill: skirt,
    low: skirt,
    side: base,
    deck: base,
    tail: H(base, '#000000', 0.10),
  });
  // Upholstery is charcoal with only a hint of the livery in it. Deriving it
  // straight from the accent paints a light seat into a dark kart (Gengar's
  // silver livery put a white cushion on a purple shell, reading as a separate
  // lump sitting on the deck instead of a seat sunk into the well).
  const seat = H(acc, '#16181e', 0.72);
  cockpitFaces(out, H(base, '#0b0d12', 0.70), seat, H(seat, '#000000', 0.10), H(base, '#000000', 0.16));
  rearFaces(out, acc, skirt);
  // The ducktail is body-coloured, a shade down. In the livery colour a pale
  // accent (Gengar's silver on purple) reads as a foreign white slab parked on
  // the deck; in the shell's own paint the lofted lip is defined by its own
  // shading and reads as moulded bodywork, which is what the reference shows.
  spoilerFaces(out, H(base, '#000000', 0.13));
  const hub = '#31373f';
  for (const sx of [-1, 1]) {
    axleFaces(out, sx, AXLE.rear, AXLE.rr, 0.56, AXLE.xr - AXLE.hwr + 0.01, 0.125, hub);
    axleFaces(out, sx, AXLE.front, AXLE.rf, 0.44, AXLE.xf - AXLE.hwf + 0.01, 0.085, hub);
  }
  wheelFaces(out, -AXLE.xf, AXLE.front, AXLE.rf, AXLE.hwf, steer, spin, acc, lod);
  wheelFaces(out, AXLE.xf, AXLE.front, AXLE.rf, AXLE.hwf, steer, spin, acc, lod);
  wheelFaces(out, -AXLE.xr, AXLE.rear, AXLE.rr, AXLE.hwr, 0, spin * 0.92, acc, lod);
  wheelFaces(out, AXLE.xr, AXLE.rear, AXLE.rr, AXLE.hwr, 0, spin * 0.92, acc, lod);
  return out;
}

export { RING, FLOOR, H };
