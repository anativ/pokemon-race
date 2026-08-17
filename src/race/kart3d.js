/**
 * race-world / miniature 3D rasteriser for the karts
 *
 * The karts are no longer flat sprites: they are small polygon meshes in kart
 * local space (x right, y up, z forward toward the nose, 1 unit = half the
 * kart's body width) that get yawed, rolled and pitched by the driving state
 * and then projected through a fixed chase-camera frustum. Faces are Newell
 * normal shaded, back-face culled and painter-sorted, so the same mesh reads as
 * a real object from any steering angle instead of a symmetric cardboard cutout.
 */

// Chase rig, in kart units. Slightly high and close so we look down on the
// deck the way Mario Kart's camera does.
const CAM_Y = 2.02;
const CAM_D = 8.60;
const FOCAL = 9.10;
const TILT = 0.150;
const CT = Math.cos(TILT);
const ST = Math.sin(TILT);

/** z of the rear axle - the pivot the kart yaws around and the ground anchor. */
export const REAR_Z = -0.72;

function rawView(x, y, z) {
  const Yv = y - CAM_Y;
  const Zv = z + CAM_D;
  return [x, Yv * CT + Zv * ST, Math.max(0.6, -Yv * ST + Zv * CT)];
}

/** Half-width of the rear axle at rest, in projected units - the scale datum. */
const REF = (() => {
  const v = rawView(1, 0.42, REAR_Z);
  return (FOCAL * v[0]) / v[2];
})();

/**
 * Build a projector for one kart.
 * @param {number} s  half the kart body width, in pixels
 * @param {{yaw?:number, roll?:number, pitch?:number}} o
 */
export function makeFrame(s, o = {}) {
  const yaw = o.yaw || 0;
  const roll = o.roll || 0;
  const pitch = o.pitch || 0;
  const cy = Math.cos(yaw); const sy = Math.sin(yaw);
  const cr = Math.cos(roll); const sr = Math.sin(roll);
  const cp = Math.cos(pitch); const sp = Math.sin(pitch);
  const scale = s / REF;

  function view(x, y, z) {
    let X = x * cy + z * sy;
    let Z = -x * sy + z * cy;
    let Y = y;
    const X2 = X * cr - Y * sr;
    Y = X * sr + Y * cr;
    X = X2;
    const Y3 = Y * cp - Z * sp;
    Z = Y * sp + Z * cp;
    Y = Y3;
    return rawView(X, Y, Z);
  }

  const a = view(0, 0, REAR_Z);
  const ax = (FOCAL * a[0]) / a[2] * scale;
  const ay = (-FOCAL * a[1]) / a[2] * scale;

  const f = {
    yaw, roll, scale,
    /** local point -> { x, y (screen px, anchored at the rear contact patch), z (depth) } */
    p(x, y, z) {
      const v = view(x, y, z);
      return {
        x: (FOCAL * v[0]) / v[2] * scale - ax,
        y: (-FOCAL * v[1]) / v[2] * scale - ay,
        z: v[2],
        vx: v[0], vy: v[1], vz: v[2],
      };
    },
    /** apparent pixels-per-unit at depth z, for sizing screen-space details */
    unit(z) {
      const v = view(0, 0, z);
      return (FOCAL / v[2]) * scale;
    },
  };
  return f;
}

// key light: high, front-left of the camera
const LX = -0.42; const LY = 0.80; const LZ = -0.43;

function newell(pts) {
  let nx = 0; let ny = 0; let nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    nx += (a.vy - b.vy) * (a.vz + b.vz);
    ny += (a.vz - b.vz) * (a.vx + b.vx);
    nz += (a.vx - b.vx) * (a.vy + b.vy);
  }
  const m = Math.hypot(nx, ny, nz) || 1;
  return [nx / m, ny / m, nz / m];
}

/**
 * Project + shade + painter-sort a face list.
 * face = { pts:[[x,y,z]..], col:'#rrggbb'|fn, lift?:number, two?:bool,
 *          flat?:number (0..1 shading amount), a?:number, line?:string }
 */
export function paint(c, frame, faces, opt = {}) {
  const out = [];
  for (const face of faces) {
    const pts = face.pts.map((p) => frame.p(p[0], p[1], p[2]));
    const n = newell(pts);
    const facing = -n[2];
    if (!face.two && facing <= 0.02) continue;
    let z = 0;
    for (const p of pts) z += p.z;
    z /= pts.length;
    out.push({ face, pts, n, z: z - (face.lift || 0) });
  }
  out.sort((a, b) => b.z - a.z);
  for (const it of out) drawFace(c, it, opt);
  return out;
}

const clip = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function drawFace(c, it, opt) {
  const { face, pts, n } = it;
  let lam = n[0] * LX + n[1] * LY + n[2] * LZ;
  if (face.two && lam < 0) lam = -lam;
  const amt = face.flat != null ? face.flat : 1;
  const k = clip(0.5 + 0.5 * lam) * amt + (1 - amt) * 0.62;
  const amb = opt.ambient != null ? opt.ambient : 0;
  const t = clip(k * (1 - amb) + amb);

  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();

  if (face.a != null) { c.save(); c.globalAlpha = face.a; }
  const fill = typeof face.col === 'function' ? face.col(c, pts, t) : shadeOf(face.col, t);
  c.fillStyle = fill;
  c.fill();
  if (face.line) {
    c.strokeStyle = face.line;
    c.lineWidth = face.lw || 1;
    c.stroke();
  } else if (face.a == null) {
    // Canvas leaves an antialiased hairline between abutting polygons, which
    // turns a smooth lofted shell into a wireframe of pale seams. Re-stroking
    // each face in its own fill colour closes the gap.
    c.strokeStyle = fill;
    c.lineWidth = 1.25;
    c.lineJoin = 'round';
    c.stroke();
  }
  if (face.a != null) c.restore();
}

const CACHE = new Map();
function rgbOf(hex) {
  let v = CACHE.get(hex);
  if (v) return v;
  const h = hex.replace('#', '');
  const s = h.length === 3 ? h.split('').map((x) => x + x) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  v = s.map((x) => parseInt(x, 16));
  CACHE.set(hex, v);
  return v;
}

/** Tone a base colour by a 0..1 lambert term, with a soft specular roll-off. */
export function shadeOf(hex, t) {
  const [r, g, b] = rgbOf(hex);
  const lo = 0.62; const hi = 1.20;
  const m = lo + (hi - lo) * t;
  const spec = t > 0.88 ? (t - 0.88) * 260 : 0;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * m + spec)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** Screen-space bounding box of a projected point list. */
export function bbox(pts) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

export default makeFrame;
