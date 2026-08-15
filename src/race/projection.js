/**
 * race-world / pseudo-3D projection
 *
 * Projects the looped road built by geometry.js into screen space for a chase
 * camera parked behind and above the kart. Every consumer (road ribbon, rails,
 * scenery, karts) reads the same projected point list, so nothing can drift out
 * of alignment.
 *
 * A projected point:
 *   { x, y, w, z, n, scale, fog, bank, yl, yr, seg }
 *   x,y  centre of the road surface on screen
 *   w    half width of the road on screen
 *   yl / yr  screen y of the left / right edge (banking tilts the ribbon)
 */
import { SEG_LEN, ROAD_W, segIndexAt, heightAt } from './geometry.js';

export const CAM_DEPTH = 1.42;    // 1/tan(fov/2) -> ~70 degree vertical fov
export const CAM_HEIGHT = 88;     // world units above the road surface
export const CAM_BACK = 106;       // world units behind the kart
export const DRAW = 420;          // road slices projected per frame
export const HORIZON_F = 0.352;   // vanishing point as a fraction of view height
export const CURVE_K = 0.040;    // curvature -> lateral drift per slice
export const BANK_K = 0.42;       // banking tilt (fraction of half width)
export const X_SAT = 620;        // soft limit on accumulated lateral drift
export const BEND_N = 90;         // slice sampled for the backdrop pan
export const HILL_N = 70;         // slice sampled for the horizon lift

export function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/**
 * @param {ReturnType<import('./geometry.js').buildRoad>} road
 * @param {any} cam   camera from ./camera.js (dist, lane, height, pitch)
 * @param {{w:number,h:number}} view
 */
export function projectRoad(road, cam, view) {
  const { w, h } = view;
  const hw = w / 2;
  const hh = h / 2;
  const camZ = cam.dist;
  const camX = cam.lane * ROAD_W * 0.84;
  const camY = heightAt(road, camZ) + (cam.height || CAM_HEIGHT);
  const horizon = Math.round(h * HORIZON_F - (cam.pitch || 0) * h * 0.5);

  const base = Math.floor(camZ / SEG_LEN);
  const offset = camZ - base * SEG_LEN;      // sub-slice remainder
  const pts = [];
  let x = 0;
  let dx = 0;
  let bend = 0;
  let rise = 0;
  const maxZ = DRAW * SEG_LEN;
  const fogStart = 0.30;

  for (let n = 0; n < DRAW; n++) {
    const idx = segIndexAt(road, (base + n) * SEG_LEN);
    const seg = road.segs[idx];
    const z = n * SEG_LEN - offset + SEG_LEN;
    dx += seg.curve * CURVE_K * SEG_LEN;
    x += dx;
    if (z <= 2) { pts.push(null); continue; }
    const scale = CAM_DEPTH / z;
    // Curvature accumulates quadratically, so a 200-unit hairpin would throw
    // the far slices thousands of units sideways and the whole ribbon would
    // leave the frame. Saturate it: linear for the near and mid field (where
    // the bend has to read honestly) and asymptotic beyond, which is how a
    // real corner looks anyway once it turns past the camera's shoulder.
    const xs = X_SAT * Math.tanh(x / X_SAT);
    const sx = hw + scale * (xs - camX) * hw;
    const sy = horizon + scale * (camY - seg.y) * hh;
    const sw = Math.max(0.4, scale * ROAD_W * hw);
    const tilt = seg.bank * BANK_K * sw;
    const t = clamp01((z / maxZ - fogStart) / (1 - fogStart));
    // the last slices dissolve completely into the fog colour, so the finite
    // draw distance never shows as a hard horizontal cut across the tarmac
    const tail = clamp01((n / DRAW - 0.80) / 0.20);
    pts.push({
      x: sx, y: sy, w: sw, z, n, scale, seg, idx,
      yl: sy + tilt, yr: sy - tilt,
      bank: seg.bank,
      fog: t * t,
      tail: tail * tail,
      curveX: xs,
      grade: seg.grade || 0,
    });
    if (n === BEND_N) bend = xs;
    if (n === HILL_N) rise = seg.y - camY;
  }

  return {
    pts, horizon, camX, camY, camZ, base, offset, hw, hh, w, h, maxZ,
    /**
     * Mid-field lateral drift of the road, in world units. The sky, the far
     * ridges and the parallax scenery all pan by this so the whole backdrop
     * swings the way the circuit does instead of sitting nailed behind a
     * road that is visibly turning.
     */
    bend,
    /** mid-field elevation relative to the camera - drives the horizon lift. */
    rise,
  };
}

/**
 * Screen placement for something sitting at track distance `dz` ahead of the
 * camera and lane offset `lane` (-1..1 of the road half width).
 * Returns null when it is behind the camera or past the draw distance.
 */
export function placeAt(view3, dz, lane = 0, lift = 0) {
  const { pts } = view3;
  if (dz < 2 || dz >= view3.maxZ - SEG_LEN) return null;
  const f = (dz + view3.offset) / SEG_LEN - 1;
  const i = Math.floor(f);
  const t = f - i;
  const a = pts[Math.max(0, Math.min(pts.length - 1, i))];
  const b = pts[Math.max(0, Math.min(pts.length - 1, i + 1))];
  if (!a || !b) return null;
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const wdt = a.w + (b.w - a.w) * t;
  const scale = a.scale + (b.scale - a.scale) * t;
  const fog = a.fog + (b.fog - a.fog) * t;
  const tilt = (a.bank + (b.bank - a.bank) * t) * BANK_K * wdt;
  return {
    x: x + lane * wdt,
    y: y - lane * tilt - lift * scale * view3.hh,
    w: wdt, scale, fog, z: dz,
  };
}

export default projectRoad;
