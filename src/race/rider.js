/**
 * race-world / driver
 *
 * The Pokemon sitting in the kart's seat well is the species itself, not a
 * recoloured template:
 *
 *   - the head - and everything the species hangs off it: ears, horns, fins,
 *     crest, wings, tail - is the creature's own portrait art from
 *     src/core/avatars.js, rasterised once per size bucket, lit by the kart's
 *     key light and billboarded above the shoulders. It is scaled off the art's
 *     head width, so every species' head reads at the same ~27% of kart width
 *     the reference does, and a Squirtle still keeps its shell rim while a
 *     Garchomp keeps its head fin;
 *   - shoulders, chest and arms are the invented part, because a chibi portrait
 *     has neither and a driver needs shoulders to stop reading as a bobblehead:
 *     a lofted torso and swept limbs in kart-local space, closing on the wheel
 *     rim, pushed through the same projector and key light as the bodywork
 *     (src/race/kart3d.js), with an inverted-hull ink pass in a colour drawn
 *     from the creature's own skin;
 *   - roster ids with no bespoke art fall back to the parametric driver below.
 *
 * Flat details (steering wheel, tail, shell) are drawn inside *kart-local
 * planes* handed over by kart3d: `plane(frame, z)` installs a canvas transform
 * whose axes are the projected kart x/y axes at that depth, so they are
 * automatically foreshortened, leaned and shifted when the kart yaws or rolls.
 *
 * Plane coordinates: +x right, +y UP, 1 unit = half the kart's body width,
 * y = 0 is the road.
 */
import { mix, roundRect } from './paint.js';
import { tint, hexish } from './kartBody.js';
import { paint } from './kart3d.js';
import { riderArt, rigOf, riderSprite, ART_CUT, SPRITE_ASPECT, SPRITE_HALF } from './species.js';

export const SEAT_Z = -0.30;    // torso plane
export const HEAD_Z = -0.40;    // head plane
export const BACK_Z = -0.80;    // tail / rig plane
export const HEAD_Y = 1.50;
export const HEAD_R = 0.30;

/**
 * Install a canvas transform for the kart-local x/y plane at depth `z`.
 * Returns false (and installs nothing) if the plane is degenerate.
 */
export function plane(c, frame, z) {
  return planeAt(c, frame, z, 0);
}

/**
 * Same plane, but with its affine basis sampled *at height `y0`* instead of at
 * the road. The projection is perspective, so a basis taken at y = 0 drifts the
 * further up the plane you draw - which is exactly where the driver's head is,
 * and why a head anchored to the cockpit centreline used to slide off the shell
 * mid-corner. Sampling at the head's own height removes the extrapolation:
 * plane coordinates are then measured from y0 (draw the head at y - y0).
 */
export function planeAt(c, frame, z, y0) {
  const o = frame.p(0, y0, z);
  const px = frame.p(1, y0, z);
  const py = frame.p(0, y0 + 1, z);
  const ex = px.x - o.x; const exy = px.y - o.y;
  const ey = py.x - o.x; const eyy = py.y - o.y;
  if (!isFinite(ex) || Math.abs(ex * eyy - ey * exy) < 1e-4) return false;
  c.save();
  c.transform(ex, exy, ey, eyy, o.x, o.y);
  return true;
}

/** Tail / back rigging drawn behind the seat. */
export function drawTail(c, frame, sp, time) {
  // Bespoke riders carry their own tail inside the portrait figure (Pikachu's
  // bolt, Charizard's flame, Meowth's coin), so this parametric one would be a
  // second tail - it only serves the generic fallback driver.
  if (sp.art) return;
  if (sp.tail === 'none') return;
  if (!plane(c, frame, BACK_Z)) return;
  const wag = Math.sin(time * 0.004) * 0.05;
  c.translate(-0.34, 0.62);
  c.rotate(-wag);
  c.scale(0.40, 0.40);
  const t = sp.tail;
  if (t === 'bolt') {
    const g = c.createLinearGradient(0, 0, -0.5, 1.5);
    g.addColorStop(0, mix(sp.fur, '#8a5a22', 0.55));
    g.addColorStop(0.35, sp.fur);
    g.addColorStop(1, mix(sp.fur, '#ffffff', 0.32));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-0.30, 0.30); c.lineTo(-0.02, 0.44); c.lineTo(-0.34, 0.86);
    c.lineTo(-0.06, 0.92); c.lineTo(-0.52, 1.52); c.lineTo(-0.86, 1.10);
    c.lineTo(-0.56, 1.02); c.lineTo(-0.80, 0.60); c.lineTo(-0.48, 0.52);
    c.lineTo(-0.60, 0.14);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(90,60,20,0.5)';
    c.lineWidth = 0.035;
    c.stroke();
  } else if (t === 'flame') {
    c.fillStyle = mix(sp.fur, '#000000', 0.12);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-0.55, 0.2, -0.62, 0.78);
    c.quadraticCurveTo(-0.44, 0.42, -0.12, 0.16);
    c.closePath();
    c.fill();
    const fg = c.createRadialGradient(-0.66, 0.94, 0.02, -0.66, 0.9, 0.36);
    fg.addColorStop(0, '#fff6c8');
    fg.addColorStop(0.4, '#ffb42a');
    fg.addColorStop(1, 'rgba(255,80,20,0)');
    c.fillStyle = fg;
    c.beginPath();
    c.moveTo(-0.66, 1.34 + Math.abs(wag));
    c.quadraticCurveTo(-0.36, 0.88, -0.66, 0.68);
    c.quadraticCurveTo(-0.96, 0.88, -0.66, 1.34);
    c.closePath();
    c.fill();
  } else if (t === 'curl' || t === 'fluffy') {
    const g = c.createLinearGradient(0, 0, -0.7, 0.7);
    g.addColorStop(0, mix(sp.fur, '#ffffff', 0.28));
    g.addColorStop(1, mix(sp.fur, '#000000', 0.3));
    c.fillStyle = g;
    c.beginPath();
    if (t === 'curl') {
      c.moveTo(0, 0);
      c.quadraticCurveTo(-0.86, 0.16, -0.62, 0.78);
      c.quadraticCurveTo(-0.44, 0.4, -0.06, 0.22);
    } else {
      c.ellipse(-0.42, 0.42, 0.44, 0.34, 0.6, 0, Math.PI * 2);
    }
    c.closePath();
    c.fill();
  } else if (t === 'spike') {
    c.fillStyle = mix(sp.fur, '#000000', 0.22);
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-(0.04 + i * 0.2), 0);
      c.lineTo(-(0.26 + i * 0.24), 0.5 + i * 0.16);
      c.lineTo(-(0.36 + i * 0.2), 0);
      c.closePath();
      c.fill();
    }
  } else if (t === 'coin') {
    c.strokeStyle = mix(sp.fur, '#000000', 0.18);
    c.lineWidth = 0.09;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-0.9, 0.1, -0.7, 0.72);
    c.stroke();
    c.fillStyle = '#f6c63c';
    c.beginPath();
    c.arc(-0.72, 0.8, 0.16, 0, Math.PI * 2);
    c.fill();
  } else if (t === 'leaf') {
    c.fillStyle = mix('#6fc44c', '#000000', 0.1);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-0.2, 0.9, -0.72, 0.9);
    c.quadraticCurveTo(-0.36, 0.4, 0, 0);
    c.fill();
  }
  c.restore();
}

/** Shell / bulb / wings mounted behind the seat. */
export function drawBackRig(c, frame, sp) {
  const k = sp.back;
  // Squirtle's shell, Bulbasaur's bulb and Charizard's wings are all part of
  // the portrait silhouette the bespoke rider stamps, so this generic rig is
  // for the fallback driver only.
  if (sp.art) return;
  if (k === 'none' || k === 'wings') return;
  if (!plane(c, frame, BACK_Z + 0.06)) return;
  c.scale(0.62, 0.62);
  c.translate(0, 0.86);
  if (k === 'shell') {
    const g = c.createRadialGradient(-0.1, 1.05, 0.04, 0, 0.9, 0.6);
    g.addColorStop(0, '#c9853f');
    g.addColorStop(1, '#7a4a1e');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, 0.86, 0.52, 0.40, 0, 0, Math.PI);
    c.fill();
    c.strokeStyle = 'rgba(255,230,190,0.5)';
    c.lineWidth = 0.03;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(i * 0.24, 0.86);
      c.lineTo(i * 0.15, 1.22);
      c.stroke();
    }
  } else if (k === 'bulb') {
    const g = c.createRadialGradient(-0.1, 1.24, 0.03, 0, 1.06, 0.5);
    g.addColorStop(0, '#a8e878');
    g.addColorStop(1, '#3f7a4c');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, 1.04, 0.40, 0.38, 0, 0, Math.PI * 2);
    c.fill();
  } else if (k === 'wings') {
    c.fillStyle = tint(mix(sp.fur, '#000000', 0.3), 0.9);
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(sx * 0.26, 0.9);
      c.quadraticCurveTo(sx * 1.15, 1.75, sx * 0.95, 0.82);
      c.quadraticCurveTo(sx * 0.64, 0.98, sx * 0.26, 0.9);
      c.closePath();
      c.fill();
    }
  }
  c.restore();
}

/** Ears / crest, in plane coords (+y up) above a head of radius r at (hx, hy). */
function drawEars(c, sp, hx, hy, r, turn) {
  const k = sp.ear;
  if (k === 'none') return;
  const base = mix(sp.fur, '#000000', 0.06);
  const tip = sp.earTip || base;
  c.fillStyle = base;
  if (k === 'long') {
    for (const sx of [-1, 1]) {
      c.save();
      c.translate(hx + sx * r * 0.42 + turn * r * 0.3, hy + r * 0.62);
      c.rotate(sx * 0.12);
      c.beginPath();
      c.moveTo(-r * 0.26, -r * 0.16);
      c.quadraticCurveTo(sx * r * 0.34, r * 1.5, sx * r * 0.52, r * 1.72);
      c.quadraticCurveTo(sx * r * 0.86, r * 1.5, r * 0.30, -r * 0.1);
      c.closePath();
      c.fill();
      c.fillStyle = tip;
      c.beginPath();
      c.moveTo(sx * r * 0.16, r * 1.16);
      c.quadraticCurveTo(sx * r * 0.34, r * 1.5, sx * r * 0.52, r * 1.72);
      c.quadraticCurveTo(sx * r * 0.86, r * 1.5, sx * r * 0.62, r * 1.04);
      c.closePath();
      c.fill();
      c.fillStyle = base;
      c.restore();
    }
  } else if (k === 'cat') {
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.2, hy + r * 0.7);
      c.lineTo(hx + sx * r * 0.86, hy + r * 1.7);
      c.lineTo(hx + sx * r * 1.08, hy + r * 0.44);
      c.closePath();
      c.fill();
      c.fillStyle = tip;
      c.beginPath();
      c.moveTo(hx + sx * r * 0.55, hy + r * 1.16);
      c.lineTo(hx + sx * r * 0.86, hy + r * 1.7);
      c.lineTo(hx + sx * r * 0.95, hy + r * 0.96);
      c.closePath();
      c.fill();
      c.fillStyle = base;
    }
  } else if (k === 'round') {
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.ellipse(hx + sx * r * 0.86, hy + r * 0.72, r * 0.34, r * 0.44, sx * 0.4, 0, Math.PI * 2);
      c.fill();
    }
  } else if (k === 'spike') {
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(hx + sx * r * (0.3 + i * 0.28), hy + r * 0.75);
        c.lineTo(hx + sx * r * (0.62 + i * 0.34), hy + r * (1.7 - i * 0.3));
        c.lineTo(hx + sx * r * (0.78 + i * 0.28), hy + r * 0.6);
        c.closePath();
        c.fill();
      }
    }
  } else if (k === 'horn') {
    c.fillStyle = tip;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.36, hy + r * 0.86);
      c.quadraticCurveTo(hx + sx * r * 1.4, hy + r * 1.5, hx + sx * r * 1.3, hy + r * 1.9);
      c.quadraticCurveTo(hx + sx * r * 0.92, hy + r * 1.2, hx + sx * r * 0.62, hy + r * 0.72);
      c.closePath();
      c.fill();
    }
  } else if (k === 'fin') {
    c.fillStyle = tip;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.5, hy + r * 0.5);
      c.quadraticCurveTo(hx + sx * r * 1.5, hy + r * 0.9, hx + sx * r * 1.55, hy + r * 0.1);
      c.quadraticCurveTo(hx + sx * r * 1.0, hy + r * 0.24, hx + sx * r * 0.5, hy + r * 0.5);
      c.closePath();
      c.fill();
    }
  } else if (k === 'crest') {
    c.fillStyle = tip;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(hx + i * r * 0.3, hy + r * 0.8);
      c.lineTo(hx + i * r * 0.62, hy + r * (1.86 - Math.abs(i) * 0.34));
      c.lineTo(hx + i * r * 0.3 + r * 0.26, hy + r * 0.74);
      c.closePath();
      c.fill();
    }
  } else if (k === 'antenna') {
    c.strokeStyle = tip;
    c.lineWidth = r * 0.11;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.34, hy + r * 0.82);
      c.quadraticCurveTo(hx + sx * r * 1.0, hy + r * 1.7, hx + sx * r * 0.72, hy + r * 2.0);
      c.stroke();
      c.fillStyle = tip;
      c.beginPath();
      c.arc(hx + sx * r * 0.72, hy + r * 2.02, r * 0.17, 0, Math.PI * 2);
      c.fill();
    }
  }
}

/** Eyes / cheeks / muzzle, shifted around the skull by `turn` (-1..1). */
function drawFace(c, sp, hx, hy, r, turn) {
  const dark = '#1b1720';
  const ox = turn * r * 0.52;
  const squash = 1 - Math.abs(turn) * 0.34;
  if (sp.cheek) {
    for (const sx of [-1, 1]) {
      const cx = hx + ox + sx * r * 0.66 * squash;
      const g = c.createRadialGradient(cx, hy - r * 0.2, r * 0.03, cx, hy - r * 0.22, r * 0.3);
      g.addColorStop(0, mix(sp.cheek, '#ffffff', 0.4));
      g.addColorStop(1, sp.cheek);
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(cx, hy - r * 0.22, r * 0.25, r * 0.22, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  for (const sx of [-1, 1]) {
    const ex = hx + ox + sx * r * 0.38 * squash;
    c.fillStyle = dark;
    c.beginPath();
    if (sp.eye === 'sleepy') {
      c.ellipse(ex, hy + r * 0.08, r * 0.2 * squash, r * 0.06, 0, 0, Math.PI * 2);
    } else if (sp.eye === 'sharp') {
      c.moveTo(ex - r * 0.2 * squash, hy + r * 0.26);
      c.lineTo(ex + r * 0.22 * squash, hy + r * 0.12);
      c.lineTo(ex + r * 0.12 * squash, hy - r * 0.14);
      c.lineTo(ex - r * 0.18 * squash, hy - r * 0.04);
      c.closePath();
    } else {
      c.ellipse(ex, hy + r * 0.1, r * 0.19 * squash, r * 0.23, 0, 0, Math.PI * 2);
    }
    c.fill();
    if (sp.eye !== 'sleepy') {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(ex + r * 0.04, hy + r * 0.2, r * 0.075 * squash, r * 0.09, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  // muzzle
  c.fillStyle = mix(sp.skin, '#ffffff', 0.12);
  c.beginPath();
  c.ellipse(hx + ox * 1.25, hy - r * 0.4, r * 0.34 * squash, r * 0.24, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = dark;
  c.lineWidth = r * 0.08;
  c.beginPath();
  c.moveTo(hx + ox * 1.25 - r * 0.2 * squash, hy - r * 0.34);
  c.quadraticCurveTo(hx + ox * 1.25 - r * 0.06, hy - r * 0.52, hx + ox * 1.25, hy - r * 0.34);
  c.quadraticCurveTo(hx + ox * 1.25 + r * 0.06, hy - r * 0.52, hx + ox * 1.25 + r * 0.2 * squash, hy - r * 0.34);
  c.stroke();
  c.fillStyle = dark;
  c.beginPath();
  c.ellipse(hx + ox * 1.25, hy - r * 0.22, r * 0.07, r * 0.05, 0, 0, Math.PI * 2);
  c.fill();
}

/** Racing cap: crown across the skull, peak pointing where the driver looks. */
function drawHelmet(c, hx, hy, r, col, turn) {
  const g = c.createLinearGradient(0, hy + r * 1.1, 0, hy + r * 0.1);
  g.addColorStop(0, mix(col, '#ffffff', 0.45));
  g.addColorStop(1, mix(col, '#000000', 0.2));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(hx, hy + r * 0.16, r * 1.03, r * 0.94, 0, 0, Math.PI);
  c.closePath();
  c.fill();
  c.fillStyle = mix(col, '#000000', 0.34);
  c.beginPath();
  c.ellipse(hx + turn * r * 0.72, hy + r * 0.4, r * 0.62, r * 0.19, -turn * 0.14, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.42)';
  c.beginPath();
  c.ellipse(hx - r * 0.34, hy + r * 0.7, r * 0.26, r * 0.12, 0.42, 0, Math.PI * 2);
  c.fill();
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* --------------------------------------------------------------- rider mesh
 * The driver is built the way the kart is: real geometry in kart-local space,
 * pushed through the same projector and shaded by the same key light, so the
 * torso, shoulders and arms catch the light exactly like the bodywork they sit
 * in. Only the face is a decal - and it is the species' own portrait art.
 */
export const ART_Z = -0.34;   // rider plane: the seat back
const TAU = Math.PI * 2;

/**
 * Cross-section in the kart's x/z plane; k = 0 points forward. `p` bends the
 * profile between a slab (p < 1: heavy, square-shouldered fighters) and a
 * tapered wedge (p > 1: the lithe psychic / ninja builds).
 */
function ring(x, y, z, rx, rz, n, p = 1) {
  const pts = [];
  const bend = (v) => (p === 1 ? v : Math.sign(v) * Math.abs(v) ** p);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    pts.push([x + rx * bend(Math.sin(a)), y, z + rz * bend(Math.cos(a))]);
  }
  return pts;
}

/** Loft a stack of rings into quad strips. `col(k)` picks the paint per side. */
function loft(out, rings, col, o = {}) {
  const n = rings[0].length;
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i]; const b = rings[i + 1];
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n;
      out.push({
        col: typeof col === 'function' ? col(k, i) : col,
        two: true, lift: o.lift || 0, pts: [a[k], a[j], b[j], b[k]],
      });
    }
  }
  if (o.cap) out.push({ col: o.cap, two: true, lift: (o.lift || 0) + 0.02, pts: rings[rings.length - 1] });
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function norm(v) {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}

/** A limb: circular sections swept along `path`, radius per node. */
function limb(out, path, rad, col, n, lift) {
  const rings = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const d = norm(sub(path[Math.min(path.length - 1, i + 1)], path[Math.max(0, i - 1)]));
    const ref = Math.abs(d[1]) > 0.86 ? [0, 0, 1] : [0, 1, 0];
    const u = norm(cross(ref, d));
    const v = cross(d, u);
    const r = rad[i];
    const pts = [];
    for (let k = 0; k < n; k++) {
      const t = (k / n) * TAU;
      const cs = Math.cos(t) * r; const sn = Math.sin(t) * r;
      pts.push([p[0] + u[0] * cs + v[0] * sn, p[1] + u[1] * cs + v[1] * sn, p[2] + u[2] * cs + v[2] * sn]);
    }
    rings.push(pts);
  }
  loft(out, rings, col, { cap: col, lift });
}

/**
 * Same faces, pushed out from the rider's core - an ink pass for the body.
 * `col` is the ink: a *coloured* dark drawn from the creature's own skin reads
 * as a contact edge next to faceted bodywork, where flat black reads as a
 * sticker pasted on top of it.
 */
function swell(faces, k, col = '#1b1230') {
  const PY = 1.02; const PZ = -0.24;
  return faces.map((f) => ({
    col, two: true, flat: 0, lift: f.lift != null ? f.lift : 0,
    pts: f.pts.map((p) => [p[0] * k, PY + (p[1] - PY) * k, PZ + (p[2] - PZ) * k]),
  }));
}

/**
 * Seated body for one racer: hips sunk in the well, chest leaning at the wheel,
 * shoulders carrying arms that reach the rim. Sizes come from the species rig,
 * so a Snorlax fills the tub and a Gardevoir barely brushes its sides.
 */
function buildRider(rig, o) {
  const { skin, belly, glove, grip, detail } = o;
  const n = detail ? 10 : 6;
  const out = [];
  const sh = rig.sh; const dep = rig.dep;
  const nk = rig.build === 'heavy' ? 0.13 : rig.build === 'slim' ? 0.095 : 0.11;
  const tilt = grip * 0.035;
  // Torso: waist at the cockpit rim -> chest -> shoulders -> neck. The hips
  // stay under the deck line; from a chase camera a driver is shoulders, arms
  // and head, and anything lower would paint over the bodywork in front of it.
  const stack = [
    [0.82, -0.34, sh * 0.84, dep * 0.94],
    [0.99, -0.30, sh * 0.98, dep * 1.06],
    [1.11, -0.25, sh * 1.00, dep * 0.98],
    [1.19, -0.22, sh * 0.86, dep * 0.80],
    [1.25, -0.21, nk, nk * 0.92],
  ];
  const prof = rig.build === 'heavy' ? 0.70 : rig.build === 'slim' ? 1.22 : 1;
  const rings = stack.map((s, i) => ring(tilt * i * 0.5, s[0], s[1], s[2], s[3], n, prof));
  loft(out, rings, (k) => (Math.cos((k / n) * TAU) > 0.55 ? belly : skin));
  // deltoids: the shoulder line has to read as a shoulder, not a barrel edge
  for (const sx of [-1, 1]) {
    limb(out, [[sx * sh * 0.72, 1.14, -0.24], [sx * sh * 1.04, 1.09, -0.22]],
      [sh * 0.34, sh * 0.30], skin, detail ? 8 : 5, 0.04);
  }
  // spine ridge for the species whose portraits wear one
  if (rig.spine && detail) {
    const sc = rig.spine;
    for (let i = 0; i < 3; i++) {
      const y = 1.14 - i * 0.11;
      const h = 0.10 - i * 0.012;
      const zb = -0.24 - dep * (0.82 + i * 0.06);
      out.push({
        col: sc, two: true, lift: -0.06,
        pts: [[-0.055 + i * 0.004, y, zb], [0.055 - i * 0.004, y, zb], [0, y + h, zb - 0.05]],
      });
    }
  }

  // wings, for the species that fly: flat membranes swept up off the shoulder
  // blades, high enough to clear the deck they are painted over.
  if (rig.wing) {
    const w = rig.wing;
    const edge = 'rgba(20,14,34,0.55)';
    for (const sx of [-1, 1]) {
      out.push({
        col: w, two: true, lift: -0.20, line: edge, lw: 1,
        pts: [[sx * 0.14, 1.02, -0.34], [sx * 0.30, 1.38, -0.42], [sx * 0.52, 1.31, -0.48],
          [sx * 0.44, 1.18, -0.46], [sx * 0.56, 1.12, -0.48], [sx * 0.30, 0.99, -0.42]],
      });
      out.push({
        col: mix(w, '#000000', 0.22), two: true, lift: -0.24, line: edge, lw: 1,
        pts: [[sx * 0.16, 1.03, -0.36], [sx * 0.30, 1.38, -0.42], [sx * 0.26, 1.02, -0.40]],
      });
    }
  }

  // arms: shoulder -> elbow -> wrist, then a paw closed round the rim
  const W = o.wheel;
  const wz = W.z;
  const pairs = rig.arms === 4
    ? [[1.10, sh * 1.04, 0.96, 0.058], [0.99, sh * 0.98, 0.88, 0.050]]
    : [[1.10, sh * 1.04, 0.96, 0.062]];
  for (const [sy, sx0, wy, r0] of pairs) {
    for (const sx of [-1, 1]) {
      // Both paws land on the rim of the wheel actually drawn: the grip x is
      // the wheel's own centre plus its radius, not a fixed +-0.23, so a wheel
      // shifted to stay under the rider never leaves one arm waving at air.
      const gx = W.x + sx * W.r * 0.92;
      const hy = W.y + sx * grip * 0.05;
      const path = [
        [sx * sx0, sy, -0.20],
        [sx * (sx0 + 0.11), sy - 0.10, -0.04],
        [(sx * (sx0 + 0.05) + gx) * 0.5, (sy - 0.20 + hy) * 0.5, wz - 0.16],
        [gx, hy, wz - 0.02],
      ];
      limb(out, path, [r0, r0 * 0.86, r0 * 0.78, r0 * 0.72], skin, detail ? 8 : 5, 0.10);
      const g0 = rig.hand === 'fist' ? 0.078 : rig.hand === 'fin' ? 0.058 : 0.068;
      limb(out, [[gx, hy, wz - 0.03], [gx - sx * 0.02, hy + 0.02, wz + 0.05]],
        [g0 * 0.9, g0], glove, detail ? 8 : 5, 0.22);
      if (detail && rig.hand === 'claw') {
        for (let i = -1; i <= 1; i++) {
          const cx = gx - sx * 0.02 + i * 0.034;
          limb(out, [[cx, hy + 0.02, wz + 0.03], [cx, hy + 0.055, wz + 0.08]], [0.016, 0.003], '#f2ead8', 4, 0.30);
        }
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------- arms
 * The portraits have no arms, and a driver needs both hands on the wheel. The
 * arms are the only invented part of a bespoke rider: swept limbs hung off the
 * figure's own shoulder line (its widest torso op, so a Snorlax reaches from
 * far out and a Gardevoir from close in), lit by the same key as the kart.
 */

/**
 * @param {object} rig    species rig
 * @param {object} o      { skin, glove, grip, detail, sx (shoulder x), sy (shoulder y) }
 */
function buildArms(rig, o) {
  const out = [];
  const { skin, glove, grip, detail } = o;
  const n = detail ? 8 : 5;
  const thick = rig.build === 'heavy' ? 0.061 : rig.build === 'slim' ? 0.043 : 0.051;
  const pairs = rig.arms === 4
    ? [[o.sx, o.sy, thick], [o.sx * 0.92, o.sy - 0.15, thick * 0.84]]
    : [[o.sx, o.sy, thick]];
  const W = o.wheel;
  const WZ_HAND = W.z + 0.03;
  for (const [ax, ay, r0] of pairs) {
    for (const sx of [-1, 1]) {
      // Grip point = the drawn rim, so both paws close on the wheel wherever
      // the wheel had to move to stay centred under the driver.
      const gx = W.x + sx * W.r * 0.90;
      const hy = W.y + sx * grip * 0.05;
      // The elbow tucks in rather than out: splayed elbows fuse the two arms
      // and the deltoids into one wide apron across the cockpit, which is the
      // other half of the bobblehead read.
      const path = [
        [sx * ax, ay, -0.16],
        [sx * ax * 1.02, ay - 0.070, 0.04],
        [(sx * ax * 0.80 + gx) * 0.5, (ay + hy) * 0.5 - 0.03, 0.17],
        [gx, hy, WZ_HAND - 0.03],
      ];
      limb(out, path, [r0, r0 * 0.90, r0 * 0.80, r0 * 0.74], skin, n, 0.10);
      const g0 = rig.hand === 'fist' ? 0.082 : rig.hand === 'fin' ? 0.058 : 0.072;
      limb(out, [[gx, hy, WZ_HAND - 0.03], [gx - sx * 0.016, hy + 0.028, WZ_HAND + 0.05]],
        [g0 * 0.88, g0], glove, n, 0.24);
      if (detail && (rig.hand === 'claw' || rig.hand === 'fin')) {
        for (let i = -1; i <= 1; i++) {
          const cx = gx - sx * 0.016 + i * 0.036;
          limb(out, [[cx, hy + 0.03, WZ_HAND + 0.03], [cx, hy + 0.072, WZ_HAND + 0.08]],
            [0.017, 0.003], '#f4ecdc', 4, 0.32);
        }
      }
    }
  }
  return out;
}

/**
 * Where the steering wheel lives, in kart-local units.
 *
 * It sits just in front of the chest rather than out on the nose, and its
 * centre is slid along x by the parallax between its own plane and the torso's
 * so that from the camera it always reads as centred on the driver: at a
 * three-quarter yaw a wheel bolted to the chassis centreline projects a long
 * way to one side, and only the near arm can reach it.
 */
export function wheelSpec(frame) {
  const z = 0.18;
  const t = Math.tan(frame.yaw || 0);
  const x = Math.max(-0.22, Math.min(0.22, -(z - SEAT_Z) * t));
  return { x, y: 0.845, z, r: 0.195 };
}

/** Steering wheel, drawn in the cockpit plane before the paws close on it. */
function drawWheel(c, frame, trim, grip, W) {
  if (!plane(c, frame, W.z)) return;
  c.strokeStyle = '#20242c';
  c.lineWidth = 0.060;
  c.beginPath();
  c.ellipse(W.x, W.y, W.r, W.r * 0.46, grip * 0.2, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = mix(trim, '#ffffff', 0.3);
  c.lineWidth = 0.026;
  c.beginPath();
  c.ellipse(W.x, W.y + 0.012, W.r, W.r * 0.46, grip * 0.2, Math.PI, Math.PI * 2);
  c.stroke();
  // hub + two spokes, so the rim reads as a wheel and not a stray dark arc
  c.strokeStyle = '#20242c';
  c.lineWidth = 0.034;
  c.beginPath();
  c.moveTo(W.x - W.r * 0.94, W.y + 0.01);
  c.lineTo(W.x + W.r * 0.94, W.y + 0.01);
  c.stroke();
  c.fillStyle = mix(trim, '#101319', 0.35);
  c.beginPath();
  c.ellipse(W.x, W.y + 0.01, W.r * 0.24, W.r * 0.15, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/* -------------------------------------------------------------- the figure
 * A seated driver is a head *on shoulders*, so the rider is built in two parts:
 *
 *   - shoulders, chest and arms are lit kart-local geometry (`buildTorso` /
 *     `buildArms`), sunk in the seat well and steered by the kart's own
 *     transform, sized so the deltoid line always reads wider than the skull;
 *   - the head - and everything the portrait hangs off it: ears, horns, fins,
 *     crest, wings, tail - is the species' own art, billboarded on top with its
 *     jaw pinned to that shoulder line.
 *
 * Scale is normalised on the art's *head width*, not its face radius, so every
 * species' head lands at the same fraction of the kart (~27%) instead of at the
 * same fraction of its own art frame - which is what let a Charizard, whose
 * portrait is nearly all head, tower over a Garchomp. Species shapes are
 * untouched: Squirtle keeps its shell rim, Garchomp its fin and jaw, Pikachu
 * its ears and cheeks.
 */
export const RIM_Y = 0.99;       // plane y of the cockpit rim
/**
 * Plane width the species' *head blob* maps to. The kart is ~2.35 plane units
 * across on screen at the chase camera's three-quarter yaw, so 0.66 puts the
 * head at ~27% of kart width - the reference proportion for a seated driver.
 * (Scaling off the head instead of the face radius is what stops a Charizard,
 * whose art frame is nearly all head, from reading twice a Garchomp's size.)
 */
export const HEAD_W = 0.66;
/** Plane y of the deltoid line - the torso's widest point. */
export const SHOULDER_Y = 1.20;
/** Plane y the head's jaw line is pinned to: just over the shoulders. */
const CHIN_Y = SHOULDER_Y + 0.02;

/** plane units per art unit for this rider - normalised on its head width. */
function artScale(art) {
  return HEAD_W / (art.hw || 68);
}

/**
 * Shoulder half-width in plane units. Tuned so the deltoid line lands ~1.2x the
 * head's width - the reference's proportion. Wider than that and the torso
 * stops reading as shoulders and starts reading as a ruff round the neck.
 */
function shoulderHalf(rig) {
  const k = rig.build === 'heavy' ? 0.50 : rig.build === 'slim' ? 0.38 : 0.44;
  return HEAD_W * k;
}

/**
 * Species head (and whatever the portrait hangs off it - ears, fins, crest,
 * flame) billboarded above the shoulders. The card is placed by the art's own
 * jaw line, not by its bottom edge, so every species' chin lands on the same
 * shoulder line however tall its frame is.
 */
function drawFigure(c, frame, racer, art, o) {
  const u = artScale(art);
  const px = SPRITE_HALF * 2 * u * frame.unit(SEAT_Z);
  const cv = riderSprite(racer, px);
  if (!cv) return false;
  const w = SPRITE_HALF * 2 * u;
  const h = w * SPRITE_ASPECT;
  // bottom edge of the card, so that art y = chin lands on the shoulder line -
  // never below the cockpit rim, or the card would paint over the bodywork
  const foot = Math.max(RIM_Y, CHIN_Y - (ART_CUT - art.chin) * u);
  const mid = foot + h * 0.5;
  // calibrate the plane at the card's own mid height: no extrapolation, so the
  // head stays over the cockpit however hard the kart is yawed or rolled
  if (!planeAt(c, frame, SEAT_Z, mid)) return false;
  c.translate(o.hx, 0);
  c.rotate(-o.roll);
  // billboard squash: the card is flat, so it narrows a little as the kart yaws
  c.scale(1 - Math.abs(o.turn) * 0.10, -1);
  try {
    c.imageSmoothingEnabled = true;
    c.drawImage(cv, -w / 2, -h / 2, w, h);
  } catch (e) { /* sprite not ready */ }
  c.restore();
  return { u, foot, top: foot + h };
}

/**
 * Shoulders and chest for a bespoke rider, in kart-local 3D so they are lit,
 * faceted and steered by exactly the same transform as the bodywork. The
 * portraits are chibi - head and trunk fused into one blob - so a head cropped
 * at the jaw has nothing under it; this is that missing torso, sized off the
 * head so the shoulder line always reads wider than the skull, which is the
 * single cue that separates "seated driver" from "bobblehead".
 */
function buildTorso(rig, o) {
  const { skin, belly, detail } = o;
  const n = detail ? 10 : 6;
  const out = [];
  const sh = shoulderHalf(rig);
  const dep = sh * (rig.build === 'heavy' ? 0.88 : rig.build === 'slim' ? 0.70 : 0.78);
  const tilt = (o.grip || 0) * 0.030;
  const DY = SHOULDER_Y;
  // waist sunk in the well -> chest -> deltoid line -> a neck that tapers away
  // under the jaw, so the head overlaps the shoulders instead of sitting in a
  // bowl of them.
  const stack = [
    [0.84, -0.33, sh * 0.78, dep * 0.92],
    [1.03, -0.29, sh * 0.95, dep * 1.10],
    [DY, -0.265, sh * 1.00, dep * 1.00],
    [DY + 0.070, -0.250, sh * 0.72, dep * 0.72],
    [DY + 0.130, -0.242, sh * 0.42, sh * 0.40],
  ];
  const prof = rig.build === 'heavy' ? 0.70 : rig.build === 'slim' ? 1.22 : 1;
  const rings = stack.map((s, i) => ring(tilt * i * 0.5, s[0], s[1], s[2], s[3], n, prof));
  loft(out, rings, (k) => (Math.cos((k / n) * TAU) > 0.55 ? belly : skin));
  // deltoids, so the shoulder line reads as a shoulder and not a barrel edge
  for (const sx of [-1, 1]) {
    limb(out, [[sx * sh * 0.52, DY + 0.030, -0.255], [sx * sh * 1.00, DY - 0.034, -0.235]],
      [sh * 0.31, sh * 0.27], skin, detail ? 8 : 5, 0.04);
  }
  return out;
}

/**
 * Full driver, seated. `frame` is a kart3d frame, `grip` in -1..1 is the
 * steering input (leans the shoulders and turns the wheel).
 */
export function drawDriver(c, frame, sp, racer, opts = {}) {
  const grip = opts.grip || 0;
  const detail = opts.detail !== false;
  const trim = opts.livery || racer.accent || '#444';
  const turn = clamp(Math.sin(frame.yaw) * 1.45 + grip * 0.2, -0.92, 0.92);
  const lean = grip * 0.07;
  const fur = racer.color || sp.fur;
  const W = wheelSpec(frame);

  // ---- bespoke driver: shaded species body + portrait face ---------------
  const art = riderArt(racer);
  if (art.bespoke) {
    const rig = art.rig;
    // The torso is a shade deeper than the shell it sits in - same hue, so the
    // species colour is untouched, but enough separation that the shoulders do
    // not dissolve into a same-coloured kart (Pikachu in a yellow kart).
    const skin = hexish(mix(fur, '#1a1208', 0.13));
    const belly = hexish(rig.belly || mix(fur, '#ffffff', 0.42));
    const glove = hexish(mix(trim, '#ffffff', 0.22));
    // 1. shoulders and chest first - lit geometry the head then sits down onto
    const ink = hexish(mix(skin, '#150e26', 0.80));
    const torso = buildTorso(rig, { skin, belly, grip, detail });
    if (detail) paint(c, frame, swell(torso, 1.035, ink), { ambient: 0 });
    paint(c, frame, torso, { ambient: opts.ambient || 0 });
    // 2. the species' own head, billboarded onto the shoulder line. If the seat
    //    plane is degenerate the head is skipped, but the bespoke rider still
    //    owns this frame - falling through would stack a second torso on top.
    drawFigure(c, frame, racer, art, { turn, roll: lean * 0.6, hx: grip * 0.03 });
    // 3. wheel, then 4. both arms closing on its rim - hung off the torso's
    //    own deltoid line so the reach matches the shoulders that own it.
    drawWheel(c, frame, trim, grip, W);
    const sx = shoulderHalf(rig) * 0.92;
    const sy = SHOULDER_Y - 0.035;
    const arms = buildArms(rig, { skin, glove, grip, detail, wheel: W, sx, sy });
    if (detail) paint(c, frame, swell(arms, 1.075, ink), { ambient: 0 });
    paint(c, frame, arms, { ambient: opts.ambient || 0 });
    return;
  }

  // ---- fallback (unknown roster id): parametric torso + head -------------
  if (plane(c, frame, SEAT_Z)) {
    c.translate(0, 0.62);
    c.rotate(-lean);
    c.translate(0, -0.62);
    const tg = c.createLinearGradient(0, 1.28, 0, 0.56);
    tg.addColorStop(0, mix(sp.fur, '#ffffff', 0.24));
    tg.addColorStop(1, mix(sp.fur, '#000000', 0.42));
    c.fillStyle = tg;
    roundRect(c, -0.33, 0.58, 0.66, 0.68, 0.20);
    c.fill();
    c.strokeStyle = 'rgba(48,32,12,0.30)';
    c.lineWidth = 0.022;
    c.stroke();
    // racing bib
    c.fillStyle = tint(mix(trim, '#ffffff', 0.12), 0.92);
    roundRect(c, -0.21, 0.74, 0.42, 0.42, 0.13);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.30)';
    roundRect(c, -0.30, 1.00, 0.16, 0.22, 0.07);
    c.fill();
    c.restore();
  }

  // ---- steering wheel + arms -------------------------------------------
  drawWheel(c, frame, trim, grip, W);
  paint(c, frame, buildRider(rigOf(null), {
    skin: hexish(fur), belly: hexish(mix(fur, '#ffffff', 0.4)),
    glove: hexish(mix(trim, '#ffffff', 0.22)), grip, detail,
  }), { ambient: opts.ambient || 0 });

  // ---- head -------------------------------------------------------------
  if (!plane(c, frame, HEAD_Z)) return;
  const r = HEAD_R;
  const hx = grip * 0.05 - lean * 0.4;
  const hy = HEAD_Y;
  drawEars(c, sp, hx, hy, r, turn);
  const hg = c.createRadialGradient(hx - r * 0.32, hy + r * 0.36, r * 0.06, hx, hy, r * 1.36);
  hg.addColorStop(0, mix(sp.fur, '#ffffff', 0.44));
  hg.addColorStop(0.55, sp.fur);
  hg.addColorStop(1, mix(sp.fur, '#000000', 0.32));
  c.fillStyle = hg;
  c.beginPath();
  c.ellipse(hx, hy, r * 1.05, r, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(40,26,10,0.24)';
  c.lineWidth = r * 0.06;
  c.stroke();
  if (detail) drawFace(c, sp, hx, hy - r * 0.06, r, turn);
  drawHelmet(c, hx, hy, r, sp.hat || trim, turn);
  c.restore();
}

export { drawEars };
