/**
 * Minimap route geometry - piece: race-hud-and-countdown / minimap-chips.
 *
 * The reference HUD map reads as a *circuit*: one thin pale line looping the
 * corner with small racer markers threaded along it single-file. `tracks.js`
 * only ships a coarse 12-point blob (owned by another piece), so the HUD keeps
 * its own route shapes here and maps lap fraction to them by *arc length* -
 * which guarantees chips sit centred on the drawn ribbon instead of on a
 * polygon that only approximates it.
 *
 * Shape constraint that matters for chips: any two strands of the loop that are
 * far apart *along* the route must stay far apart *in the plane* too. The old
 * hand-drawn serpentines folded back on themselves ~14 units apart - narrower
 * than the ribbon itself - so arc-spaced chips still collided across a hairpin
 * and piled up two-deep. These loops keep every distant pair of strands >=23
 * units apart (checked numerically; see `minStrandGap`), i.e. wider than the
 * ribbon plus a chip, so single-file spacing along the arc is enough.
 */

/* Wandering circuits in a 0..100 x 0..100 box; index 0 (the start line) sits on
   the left strand, well clear of the wordmark under the card. */
const ROUTES = {
  'pallet-town': [
    [11.0, 69.8], [12.6, 48.2], [25.1, 34.4], [36.9, 30.5], [43.1, 25.1],
    [49.2, 13.6], [59.6, 5.4], [70.9, 9.9], [77.5, 24.2], [80.3, 39.7],
    [83.0, 55.0], [83.5, 72.6], [76.7, 87.1], [64.5, 89.7], [54.3, 83.1],
    [47.4, 79.8], [37.7, 83.8], [22.7, 84.0],
  ],
  'ryme-city': [
    [10.9, 69.4], [20.3, 51.4], [28.8, 41.1], [30.7, 29.3], [36.5, 17.7],
    [46.8, 11.6], [59.1, 7.1], [72.0, 11.0], [78.8, 25.3], [83.6, 38.6],
    [90.5, 52.8], [87.3, 68.6], [74.2, 75.6], [64.4, 79.4], [56.6, 87.2],
    [45.8, 91.4], [32.6, 91.8], [17.1, 86.7],
  ],
  'mt-coronet': [
    [9.2, 62.1], [16.0, 44.0], [31.6, 36.9], [40.1, 33.8], [43.7, 23.0],
    [51.8, 10.2], [64.9, 5.1], [76.8, 13.2], [79.7, 31.0], [76.6, 46.2],
    [78.6, 57.9], [81.6, 74.0], [74.7, 86.8], [62.2, 87.9], [52.1, 84.1],
    [43.8, 81.8], [33.4, 81.1], [19.0, 77.0],
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

/** Closest approach, in the plane, between two strands >=30 apart along the arc. */
export function minStrandGap(route, apart = 30) {
  const { xs, ys, acc, length } = route;
  let min = Infinity;
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = i + 1; j < xs.length; j += 1) {
      const da = Math.abs(acc[j] - acc[i]);
      if (Math.min(da, length - da) < apart) continue;
      const d = Math.hypot(xs[i] - xs[j], ys[i] - ys[j]);
      if (d < min) min = d;
    }
  }
  return min;
}

/**
 * Thread the chips single-file along the route.
 *
 * Input: `[{ id, s, r }]` - arc-length position plus the chip's outer radius.
 * Chips are pushed apart *along the path* (circularly) until neighbouring chips
 * clear each other, so on the start grid - where the whole field shares one
 * metre of track - the twelve markers read as a queue of beads on the line
 * rather than a heap. Two passes:
 *   1. arc-length: every neighbour pair at least (rA + rB) * pad apart;
 *   2. plane: if `at` is given, near neighbours whose *euclidean* distance is
 *      still short (the inside of a tight bend) get extra arc separation.
 * Centres are never nudged sideways, so every chip stays on the drawn stroke.
 */
export function spreadAlong(items, length, opts = {}, passes = 80) {
  const n = items.length;
  if (!n) return items;
  const { pad = 1.06, at = null } = typeof opts === 'number' ? { pad: 1 } : opts;
  const order = items
    .map((it, i) => ({ ...it, i, s: ((it.s % length) + length) % length, r: it.r || 0 }))
    .sort((a, b) => a.s - b.s || a.i - b.i);
  // total room the field needs; if the loop is too short, shrink gaps evenly
  // rather than letting the relaxation fight itself forever.
  let want = 0;
  for (let i = 0; i < n; i++) want += (order[i].r + order[(i + 1) % n].r) * pad;
  const squeeze = want > length * 0.96 ? (length * 0.96) / want : 1;
  const gapOf = (a, b) => (a.r + b.r) * pad * squeeze;

  const arcPass = () => {
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const a = order[i];
      const b = order[(i + 1) % n];
      if (a === b) break;
      let delta = b.s - a.s;
      if (i === n - 1) delta += length;
      const need = gapOf(a, b) - delta;
      if (need > 0.001) {
        a.s -= need / 2;
        b.s += need / 2;
        moved++;
      }
    }
    return moved;
  };

  for (let pass = 0; pass < passes; pass++) if (!arcPass()) break;

  if (at && n > 2 && squeeze === 1) {
    for (let pass = 0; pass < passes; pass++) {
      let moved = 0;
      for (let i = 0; i < n; i++) {
        for (const k of [1, 2]) {
          const a = order[i];
          const b = order[(i + k) % n];
          if (a === b) continue;
          const pa = at(a.s);
          const pb = at(b.s);
          const need = (a.r + b.r) * squeeze - Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
          if (need > 0.02) {
            const push = Math.min(1.5, need * 0.6);
            a.s -= push;
            b.s += push;
            moved++;
          }
        }
      }
      arcPass();
      if (!moved) break;
    }
  }

  const out = new Array(n);
  for (const it of order) out[it.i] = { ...it, s: ((it.s % length) + length) % length };
  return out;
}
