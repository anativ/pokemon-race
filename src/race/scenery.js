/**
 * race-world / roadside scenery, arch gates and floating item boxes.
 *
 * Placement is derived from the deterministic per-slice noise in geometry.js,
 * so the same track always grows the same trees in the same places. Everything
 * is collected first and painted far-to-near so overlaps are correct.
 */
import { PROPS, FOOTPRINT } from './props.js';
import { noise1, SEG_LEN } from './geometry.js';
import { DRAW, placeAt } from './projection.js';
import { edgeY } from './road.js';
import { groundShadow, castStreak, lightOf } from './shading.js';
import { rgba, clamp, roundRect } from './paint.js';

const PROP_UNIT = 74;      // world height of a "scale 1.0" prop

function pickProp(table, r) {
  let total = 0;
  for (const p of table) total += p.w;
  let x = r * total;
  for (const p of table) { x -= p.w; if (x <= 0) return p; }
  return table[table.length - 1];
}

/** Collect prop billboards for the visible road. */
export function collectScenery(view3, scene) {
  const out = [];
  const { pts, horizon, hh } = view3;
  let maxY = Infinity;
  for (let n = 2; n < DRAW; n++) {
    const p = pts[n];
    if (!p) continue;
    if (p.y < horizon - 1) break;
    if (p.y >= maxY) continue;
    maxY = p.y;
    const gi = view3.base + n;
    if (p.fog > 0.97) continue;
    for (const side of [-1, 1]) {
      const salt = side < 0 ? 401 : 907;
      const gate = noise1(gi, salt);
      if (gate > 0.27) continue;
      const def = pickProp(scene.props, noise1(gi, salt + 3));
      const spread = noise1(gi, salt + 11);
      const f = (def.min + (def.max - def.min) * spread) * side;
      const s = def.scale * (0.78 + noise1(gi, salt + 17) * 0.5) * PROP_UNIT * p.scale * hh;
      if (s < 2.2) continue;
      const yTilt = edgeY(p, clamp(f, -1.5, 1.5));
      out.push({
        fn: PROPS[def.type] || PROPS.tree,
        foot: FOOTPRINT[def.type] || FOOTPRINT.tree,
        x: p.x + f * p.w,
        y: yTilt,
        s,
        seed: noise1(gi, salt + 23),
        fog: p.fog,
        z: p.z,
      });
    }
  }
  return out;
}

/**
 * Near-field ground scatter: real little grass clumps, blossoms and snow lumps
 * standing ON the verge, sown thickly close to the camera and thinning with
 * depth. The baked grain tile (shading.js) gives the surface its fine noise;
 * this gives it silhouette, so the roadside stops reading as a colour ramp.
 */
export function drawGroundDetail(c, view3, scene) {
  const D = scene.detail;
  if (!D) return;
  const { pts, horizon, hh, w, h } = view3;
  const per = D.density || 3;
  const unit = (D.size || 0.05) * PROP_UNIT;
  const paint = PROPS.tuft;
  let maxY = Infinity;
  c.save();
  for (let n = 2; n < DRAW; n++) {
    const p = pts[n];
    if (!p) continue;
    if (p.y < horizon - 1) break;
    if (p.y >= maxY) continue;
    maxY = p.y;
    if (p.fog > 0.72) continue;
    const s = unit * p.scale * hh;
    if (s < 3.0) continue;            // below this the clump is one grey pixel
    const gi = view3.base + n;
    const a = (1 - Math.min(0.95, p.fog)) * clamp((s - 3) / 5, 0.25, 1);
    c.globalAlpha = a;
    const far = Math.min(9, w / Math.max(1, p.w) + 1.6);
    for (let k = 0; k < per; k++) {
      const sd = gi * 7 + k * 3;
      const side = noise1(sd, 907) > 0.5 ? 1 : -1;
      const f = side * (1.10 + noise1(sd, 911) * (far - 1.10));
      if (Math.abs(f) > 9) continue;
      const px = p.x + f * p.w;
      if (px < -60 || px > w + 60) continue;
      const py = edgeY(p, clamp(f, -1.5, 1.5));
      if (py > h + 40) continue;
      const ss = s * (0.7 + noise1(sd, 919) * 0.75);
      paint(c, px, py, ss, scene, noise1(sd, 923));
    }
  }
  c.restore();
}

export function drawScenery(c, list, scene, light) {
  const L = light || lightOf(scene);
  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i];
    const a = 1 - Math.min(0.96, it.fog);
    if (a <= 0.03) continue;
    c.save();
    c.globalAlpha = a;
    // ground it first: long cast streak away from the key light, then the
    // soft contact patch the object actually stands in
    const fp = it.foot || { r: 0.3, tall: 0.6 };
    if (it.s > 6) {
      castStreak(c, it.x, it.y, it.s * fp.tall, it.s * fp.r * 1.1,
        { light: L, alpha: 0.7 * a });
      groundShadow(c, it.x, it.y, it.s * fp.r, { light: L, alpha: 1.0, len: 0.9 });
    }
    it.fn(c, it.x, it.y, it.s, scene, it.seed);
    // Atmospheric fade comes from `globalAlpha` alone: the background a distant
    // prop blends into is already fogged, and the old `source-atop` tint rect
    // repainted a huge slab of ground around every prop - which flattened the
    // verge and erased the contact shadows underneath it.
    c.restore();
  }
}

/* ------------------------------------------------------------ arch gates */

function pokeballArch(c, x, y, w, h, scene) {
  const t = Math.max(2, h * 0.20);
  c.save();
  // legs
  const grd = c.createLinearGradient(x - w, 0, x + w, 0);
  grd.addColorStop(0, '#b9c3cf');
  grd.addColorStop(0.5, '#eef3f8');
  grd.addColorStop(1, '#a9b4c1');
  c.fillStyle = grd;
  c.fillRect(x - w - t * 0.5, y - h * 0.62, t, h * 0.62);
  c.fillRect(x + w - t * 0.5, y - h * 0.62, t, h * 0.62);
  // arch band: red top, white bottom, dark centre stripe
  c.lineCap = 'butt';
  c.lineWidth = t;
  c.strokeStyle = '#e8433c';
  c.beginPath();
  c.ellipse(x, y - h * 0.62, w, h * 0.46, 0, Math.PI, Math.PI * 2);
  c.stroke();
  c.lineWidth = t * 0.34;
  c.strokeStyle = '#f6f8fc';
  c.beginPath();
  c.ellipse(x, y - h * 0.62, w, h * 0.46, 0, Math.PI * 1.02, Math.PI * 1.98);
  c.stroke();
  c.lineWidth = t * 0.16;
  c.strokeStyle = '#2b3038';
  c.beginPath();
  c.ellipse(x, y - h * 0.62, w, h * 0.46, 0, Math.PI, Math.PI * 2);
  c.stroke();
  // centre button
  c.fillStyle = '#e9eef4';
  c.beginPath();
  c.arc(x, y - h * 1.08, t * 0.78, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#2b3038';
  c.beginPath();
  c.arc(x, y - h * 1.08, t * 0.78, 0, Math.PI * 2);
  c.lineWidth = t * 0.18;
  c.strokeStyle = '#2b3038';
  c.stroke();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(x, y - h * 1.08, t * 0.40, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function gantryArch(c, x, y, w, h, scene) {
  const neon = (scene.palette && scene.palette.neonA) || '#22e0ff';
  const alt = (scene.palette && scene.palette.neonB) || '#ff45c8';
  const t = Math.max(2, h * 0.12);
  c.save();
  c.fillStyle = '#1a2148';
  c.fillRect(x - w - t, y - h * 0.98, t * 1.4, h * 0.98);
  c.fillRect(x + w - t * 0.4, y - h * 0.98, t * 1.4, h * 0.98);
  c.fillRect(x - w - t, y - h * 1.02, w * 2 + t * 2.4, t * 1.6);
  c.shadowColor = neon;
  c.shadowBlur = Math.min(34, h * 0.3);
  c.fillStyle = neon;
  c.fillRect(x - w - t, y - h * 1.02, w * 2 + t * 2.4, Math.max(1.6, t * 0.3));
  c.fillStyle = alt;
  c.fillRect(x - w - t, y - h * 0.98 + t * 1.6, w * 2 + t * 2.4, Math.max(1.4, t * 0.22));
  c.shadowBlur = 0;
  // hanging banner
  c.globalAlpha = 0.85;
  c.fillStyle = '#101740';
  roundRect(c, x - w * 0.44, y - h * 0.96, w * 0.88, h * 0.30, t * 0.3);
  c.fill();
  c.globalAlpha = 1;
  c.shadowColor = alt; c.shadowBlur = Math.min(24, h * 0.2);
  c.strokeStyle = alt;
  c.lineWidth = Math.max(1, t * 0.16);
  roundRect(c, x - w * 0.44, y - h * 0.96, w * 0.88, h * 0.30, t * 0.3);
  c.stroke();
  c.restore();
}

export function drawArches(c, view3, scene, track, road) {
  if (!scene.arches || !scene.arches.length) return;
  const loop = road.loopLen;
  const camZ = view3.camZ;
  const lapBase = Math.floor(camZ / loop);
  const list = [];
  for (const frac of scene.arches) {
    for (let k = 0; k <= 1; k++) {
      const z = (lapBase + k) * loop + frac * loop;
      const dz = z - camZ;
      const at = placeAt(view3, dz, 0, 0);
      if (!at) continue;
      list.push(at);
    }
  }
  list.sort((a, b) => b.z - a.z);
  for (const at of list) {
    const a = 1 - Math.min(0.95, at.fog);
    if (a < 0.05) continue;
    c.save();
    c.globalAlpha = a;
    const w = at.w * 1.42;
    const h = at.w * 1.15;
    // the gate legs plant themselves on the verge with their own cast shadows
    const L = lightOf(scene);
    if (h > 14) {
      for (const sx of [-1, 1]) {
        castStreak(c, at.x + sx * w, at.y, h * 0.6, h * 0.10, { light: L, alpha: 0.6 });
        groundShadow(c, at.x + sx * w, at.y, h * 0.11, { light: L, alpha: 0.8, len: 0.5 });
      }
    }
    if (scene.archStyle === 'gantry') gantryArch(c, at.x, at.y, w, h, scene);
    else pokeballArch(c, at.x, at.y, w, h, scene);
    c.restore();
  }
}

/* ---------------------------------------------------------- item pickups */

export function drawItemBoxes(c, view3, scene, track, road, time) {
  const loop = road.loopLen;
  const camZ = view3.camZ;
  const lapBase = Math.floor(camZ / loop);
  const boxes = [];
  for (const t of track.itemRows) {
    for (let k = 0; k <= 1; k++) {
      const z = (lapBase + k) * loop + t * loop;
      const dz = z - camZ;
      // keep pickups off the very front of the frame: closer than this they
      // balloon past the kart and clip the HUD.
      // (CAM_BACK is 96, so anything nearer than ~1.4x that is already level
      // with or behind the hero kart and would fill half the frame)
      if (dz < 138 || dz > view3.maxZ * 0.55) continue;
      for (const lane of [-0.62, -0.21, 0.21, 0.62]) {
        const at = placeAt(view3, dz, lane, 0);
        if (!at) continue;
        boxes.push({ at, lane, z: dz });
      }
    }
  }
  boxes.sort((a, b) => b.z - a.z);
  for (const b of boxes) {
    const r = Math.min(46, b.at.w * 0.078);
    if (r < 1.2) continue;
    const bob = Math.sin(time * 0.0024 + b.lane * 3 + b.z * 0.01) * r * 0.35;
    const y = b.at.y - r * 1.9 + bob;
    const a = 1 - Math.min(0.95, b.at.fog);
    c.save();
    c.globalAlpha = a;
    // shadow on the road: floats away from the ball as it bobs upward
    const lift = clamp((b.at.y - y) / (r * 2.6), 0, 1.4);
    groundShadow(c, b.at.x, b.at.y, r * (1.05 - lift * 0.22), {
      light: lightOf(scene), alpha: 0.85 - lift * 0.22, len: 0.75,
    });
    pokeball(c, b.at.x, y, r, scene);
    c.restore();
  }
}

/** A glossy Poke Ball pickup. */
export function pokeball(c, x, y, r, scene) {
  const g = c.createLinearGradient(x - r, y - r, x + r * 0.6, y + r);
  g.addColorStop(0, '#ff6b62');
  g.addColorStop(0.55, '#e8433c');
  g.addColorStop(1, '#a41f1c');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, Math.PI, Math.PI * 2);
  c.closePath();
  c.fill();
  const g2 = c.createLinearGradient(x - r, y, x + r * 0.6, y + r);
  g2.addColorStop(0, '#ffffff');
  g2.addColorStop(1, '#c8d2de');
  c.fillStyle = g2;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI);
  c.closePath();
  c.fill();
  c.fillStyle = '#23272e';
  c.fillRect(x - r, y - r * 0.13, r * 2, r * 0.26);
  c.beginPath();
  c.arc(x, y, r * 0.36, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f6f8fc';
  c.beginPath();
  c.arc(x, y, r * 0.22, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = Math.max(0.6, r * 0.08);
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.beginPath();
  c.ellipse(x - r * 0.36, y - r * 0.42, r * 0.24, r * 0.15, -0.6, 0, Math.PI * 2);
  c.fill();
  if (scene && scene.key === 'neon') {
    c.save();
    c.globalAlpha = 0.5;
    c.shadowColor = scene.palette.neonA;
    c.shadowBlur = r * 1.4;
    c.strokeStyle = scene.palette.neonA;
    c.lineWidth = Math.max(0.6, r * 0.1);
    c.beginPath();
    c.arc(x, y, r * 1.04, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
}

export default collectScenery;
