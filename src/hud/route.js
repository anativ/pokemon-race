/**
 * Minimap route geometry - piece: race-hud-and-countdown.
 *
 * The reference HUD map is not a fat symmetric loop: it is a long *meandering
 * serpentine* ribbon with ~10 bends that snakes across the whole bottom-right
 * corner, so a dozen face chips can be strung along it and still read
 * individually. `tracks.js` only ships a coarse 12-point blob (owned by another
 * piece), so the HUD keeps its own route shapes here and maps lap fraction to
 * them by *arc length* - which also guarantees chips sit centred on the drawn
 * ribbon instead of on a polygon that only approximates it.
 */

/* Hand-authored serpentines, in a 0..100 x 0..100 box. Each closes across the
   bottom, so the two end strands read like the reference's snake tails. */
const ROUTES = {
  'pallet-town': [
    [30, 95], [18, 86], [15, 72], [27, 63], [38, 57], [28, 47], [15, 39],
    [18, 25], [31, 16], [43, 21], [48, 32], [56, 28], [62, 13], [76, 8],
    [87, 17], [86, 33], [75, 43], [65, 52], [60, 64], [51, 72], [44, 84],
    [45, 95],
  ],
  'ryme-city': [
    [33, 96], [21, 89], [14, 76], [24, 65], [36, 60], [27, 50], [13, 43],
    [15, 28], [28, 17], [42, 19], [48, 31], [58, 32], [64, 19], [77, 10],
    [88, 20], [87, 36], [77, 46], [67, 54], [62, 67], [53, 75], [46, 86],
    [48, 96],
  ],
  'mt-coronet': [
    [26, 95], [15, 84], [20, 70], [34, 65], [45, 57], [35, 47], [22, 41],
    [27, 27], [41, 19], [54, 24], [59, 36], [69, 30], [80, 17], [90, 27],
    [86, 42], [73, 50], [64, 60], [70, 74], [62, 88], [48, 94], [38, 96],
  ],
};

const FALLBACK = ROUTES['pallet-town'];

/** Catmull-Rom -> cubic bezier control points over a closed loop. */
function segments(points) {
  const n = points.length;
  const P = (i) => points[((i % n) + n) % n];
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1); const p1 = P(i); const p2 = P(i + 1); const p3 = P(i + 2);
    out.push({
      p1,
      c1: [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      c2: [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    });
  }
  return out;
}

function bez(s, t) {
  const u = 1 - t;
  const a = u * u * u; const b = 3 * u * u * t; const c = 3 * u * t * t; const d = t * t * t;
  return [
    a * s.p1[0] + b * s.c1[0] + c * s.c2[0] + d * s.p2[0],
    a * s.p1[1] + b * s.c1[1] + c * s.c2[1] + d * s.p2[1],
  ];
}

const STEPS = 28;

/**
 * Build the route for a track id: svg path `d`, plus an arc-length table so
 * lap fraction maps to a point that is genuinely on the drawn ribbon.
 */
export function buildRoute(trackId) {
  const pts = ROUTES[trackId] || FALLBACK;
  const segs = segments(pts);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  const xs = []; const ys = []; const acc = [];
  let len = 0;
  let prev = bez(segs[0], 0);
  xs.push(prev[0]); ys.push(prev[1]); acc.push(0);
  for (const s of segs) {
    d += ` C ${s.c1[0].toFixed(2)} ${s.c1[1].toFixed(2)}, ${s.c2[0].toFixed(2)} ${s.c2[1].toFixed(2)}, ${s.p2[0].toFixed(2)} ${s.p2[1].toFixed(2)}`;
    for (let i = 1; i <= STEPS; i++) {
      const p = bez(s, i / STEPS);
      len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      xs.push(p[0]); ys.push(p[1]); acc.push(len);
      prev = p;
    }
  }
  return { d: `${d} Z`, xs, ys, acc, length: len };
}

/** Point + unit tangent at arc-length `s` (wrapped) along the route. */
export function pointAtLength(route, s) {
  const L = route.length;
  let t = ((s % L) + L) % L;
  const acc = route.acc;
  let lo = 0; let hi = acc.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (acc[mid] <= t) lo = mid; else hi = mid;
  }
  const span = acc[hi] - acc[lo] || 1;
  const k = (t - acc[lo]) / span;
  const x = route.xs[lo] + (route.xs[hi] - route.xs[lo]) * k;
  const y = route.ys[lo] + (route.ys[hi] - route.ys[lo]) * k;
  let tx = route.xs[hi] - route.xs[lo];
  let ty = route.ys[hi] - route.ys[lo];
  const tl = Math.hypot(tx, ty) || 1;
  return [x, y, tx / tl, ty / tl];
}

/** Point at lap fraction 0..1. */
export function pointAtFraction(route, f) {
  return pointAtLength(route, f * route.length);
}

/**
 * Spread chips that landed on top of each other.
 *
 * Input: `[{ key, s }]` arc-length positions on the closed route. Overlapping
 * chips are pushed apart along the path (circularly) until every neighbour pair
 * is at least `gap` apart, so all twelve faces stay individually legible even
 * on the start grid where the whole field shares one metre of track.
 */
export function spreadAlong(items, length, gap, passes = 60) {
  const n = items.length;
  if (!n) return items;
  const g = Math.min(gap, (length * 0.94) / n);
  const order = items
    .map((it, i) => ({ ...it, i, s: ((it.s % length) + length) % length }))
    .sort((a, b) => a.s - b.s || a.i - b.i);
  for (let pass = 0; pass < passes; pass++) {
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const a = order[i];
      const b = order[(i + 1) % n];
      let delta = b.s - a.s;
      if (i === n - 1) delta += length;
      const need = g - delta;
      if (need > 0.001) {
        const push = need / 2;
        a.s -= push;
        b.s += push;
        moved++;
      }
    }
    if (!moved) break;
  }
  const out = new Array(n);
  for (const it of order) out[it.i] = { ...it, s: ((it.s % length) + length) % length };
  return out;
}
