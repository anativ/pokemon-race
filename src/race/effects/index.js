/**
 * racers-items-and-race-rules / effects layer
 *
 * A cosmetic canvas that sits over the race world and paints what the item
 * game is doing: floating Poke Balls in the near field (the depth band the
 * world renderer deliberately skips), boost flames, in-flight projectiles,
 * the Hyper Beam lance, impact bursts, spin-out stars, coin pops and the
 * Thunderbolt flash.
 *
 * It only READS the race, never writes it, so determinism is untouched. It
 * mirrors the world's camera + projection maths (same modules, same constants)
 * so an effect lands exactly on the kart that caused it.
 */
import { register } from '../../core/registry.js';
import { trackOr, getTrack } from '../../data/tracks.js';
import { buildRoad } from '../geometry.js';
import { createCamera, updateCamera } from '../camera.js';
import { projectRoad, placeAt, CAM_BACK } from '../projection.js';
import { getItem } from '../items.js';
import { makeFrame } from '../kart3d.js';
import * as paint from './draw.js';

const STAGE_W = 1600;
const STAGE_H = 900;

const cam = createCamera();
let canvas = null;
let c = null;
let road = null;
let roadId = null;
/** live cosmetic effects: { ev, age, life } */
let live = [];
const seen = new WeakSet();
let clock = 0;

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

/** Deterministic 0..1 noise for cosmetic scatter. */
function rnd(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function trackOf(st) {
  const id = st.race ? st.race.trackId : (st.select && st.select.trackId);
  return getTrack(id) || trackOr(id);
}

const LIFE = {
  pickup: 0.7, burst: 0.5, hit: 0.9, use: 0.5, boost: 0.6, field: 0.9,
  finish: 1.2, go: 0.8,
};

/** Pull new sim events into the cosmetic list. */
function ingest(race) {
  for (const ev of race.fx) {
    if (seen.has(ev)) continue;
    seen.add(ev);
    const life = LIFE[ev.type];
    if (!life) continue;
    live.push({ ev, age: 0, life });
  }
  if (live.length > 40) live = live.slice(live.length - 40);
}

/** Screen placement for a racer, matching what the world renderer does. */
function placeHero(view3, race, w, h) {
  const p = race.racers.find((r) => r.isPlayer) || race.racers[0];
  if (!p) return null;
  const raw = placeAt(view3, CAM_BACK, p.lane, 0)
    || { x: w / 2, y: h * 0.86, w: w * 0.42, fog: 0 };
  const y = clamp(raw.y, h * 0.80, h * 0.93);
  const s = clamp(w * 0.092 + raw.w * 0.014, 106, 176);
  return { x: raw.x, y, s, fog: raw.fog, dz: CAM_BACK };
}

function placeRacer(view3, race, r, w, h) {
  if (r.isPlayer) return placeHero(view3, race, w, h);
  const loop = road ? road.loopLen : race.lapLen;
  let dz = r.dist - cam.dist;
  while (dz < -loop / 2) dz += loop;
  while (dz > loop / 2) dz -= loop;
  if (dz < 66 || dz > view3.maxZ * 0.5) return null;
  const at = placeAt(view3, dz, r.lane, 0);
  if (!at) return null;
  const s = Math.min(132, at.w * 0.155);
  if (s < 5) return null;
  if ((1 - Math.min(0.9, at.fog)) * clamp((dz - 66) / 26, 0, 1) < 0.03) return null;
  // Mirror the world renderer's hero-overlap rule (src/race/world.js): a rival
  // that would intersect the hero's silhouette is shouldered sideways, and one
  // that would be mostly swallowed by it is DROPPED - never drawn at all.
  // Without this the effects layer happily welded a flame (or a hit fireball)
  // onto a kart the renderer had culled, which is exactly how the plume ended
  // up terminating on empty tarmac and bursts landed on nothing.
  let x = at.x;
  const hero = placeHero(view3, race, w, h);
  if (hero) {
    const dxh = at.x - hero.x;
    const over = (s + hero.s) * 1.16 - Math.abs(dxh);
    if (over > 0 && Math.abs(at.y - hero.y) < hero.s * 1.7) {
      if (over > s * 1.7) return null;
      x = at.x + (dxh === 0 ? (r.lane >= 0 ? 1 : -1) : Math.sign(dxh)) * over;
    }
  }
  return { x, y: at.y, s, fog: at.fog, dz };
}

/** Screen placement for a point on the road ahead of the camera. */
function placeWorld(view3, dz, lane) {
  if (dz < 6) return null;
  return placeAt(view3, dz, lane, 0);
}

/** Forward gap from the camera to a lap-relative distance, wrapped. */
function gapTo(lapLen, camDist, dist) {
  let d = dist - camDist;
  while (d < -lapLen / 2) d += lapLen;
  while (d > lapLen / 2) d -= lapLen;
  return d;
}

// ---------------------------------------------------------------- painting

/**
 * HUD safe zones on the 1600x900 stage (owned by src/hud/*). A pickup whose
 * sprite spills into one of these fades out rather than painting over the lap
 * pill, the coin counter, the position badge or the minimap column.
 */
const HUD_ZONES = Object.freeze([
  { x: 0, y: 0, w: 430, h: 152 },        // avatar + item slot + coin pill
  { x: 1352, y: 0, w: 248, h: 176 },     // position badge
  { x: 20, y: 762, w: 320, h: 138 },     // "Lap n/3" pill
  { x: 1236, y: 452, w: 364, h: 448 },   // minimap, standings tokens, logo
]);

/**
 * Does a circle reach into the HUD safe zones AS THEY ARE CLIPPED (inflated by
 * 24 px for the world's corner roll)? A flame whose impact lands in there is cut
 * off short of its victim, so it must not be drawn as a terminating plume.
 */
function hudBlocked(x, y) {
  for (const z of HUD_ZONES) {
    if (x > z.x - 24 && x < z.x + z.w + 24 && y > z.y - 24 && y < z.y + z.h + 24) return true;
  }
  return false;
}

/** How much of a circle's bounding box lands inside a HUD zone (0..1). */
function hudCover(x, y, r) {
  const bx = x - r; const by = y - r; const bs = r * 2;
  let worst = 0;
  for (const z of HUD_ZONES) {
    const ox = Math.min(bx + bs, z.x + z.w) - Math.max(bx, z.x);
    const oy = Math.min(by + bs, z.y + z.h) - Math.max(by, z.y);
    if (ox <= 0 || oy <= 0) continue;
    worst = Math.max(worst, (ox * oy) / (bs * bs));
  }
  return worst;
}

/**
 * Run `fn` with the HUD punched out of the clip, so a fireball or a flame can
 * never paint over the minimap / lap pill / position badge. Inflated a little
 * because this layer is drawn inside the world's corner roll (rotate + 1.06).
 */
function withHudMask(cc, fn) {
  cc.save();
  cc.beginPath();
  cc.rect(0, 0, STAGE_W, STAGE_H);
  for (const z of HUD_ZONES) cc.rect(z.x - 24, z.y - 24, z.w + 48, z.h + 48);
  cc.clip('evenodd');
  fn();
  cc.restore();
}

/**
 * Screen silhouettes of every kart on screen, tagged with their camera depth.
 * Anything drawn on this layer that sits FURTHER from the camera than a kart is
 * clipped against these, so a Poke Ball can never paint over a rider's face.
 */
function kartOccluders(view3, race, w, h) {
  const out = [];
  for (const r of race.racers) {
    const at = placeRacer(view3, race, r, w, h);
    if (!at || at.s < 6) continue;
    out.push({
      dz: at.dz,
      x: at.x,
      y: at.y - at.s * 0.85,           // mid-height of chassis + rider
      rx: at.s * 1.08,                 // half body width + the wheels
      ry: at.s * 1.15,                 // up to the ears, down to the tyres
    });
  }
  return out;
}

/**
 * Overlapping cut-outs would XOR each other back open under an even-odd clip,
 * so any two silhouettes that touch are merged into their bounding ellipse
 * first. Over-clipping is always safe (the pixel behind two karts was never
 * visible anyway); under-clipping is what paints a ball on a rider's face.
 */
function mergeOccluders(list) {
  const out = list.map((o) => ({ ...o }));
  for (let pass = 0; pass < 3; pass++) {
    let merged = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]; const b = out[j];
        if (Math.abs(a.x - b.x) > a.rx + b.rx) continue;
        if (Math.abs(a.y - b.y) > a.ry + b.ry) continue;
        const x0 = Math.min(a.x - a.rx, b.x - b.rx);
        const x1 = Math.max(a.x + a.rx, b.x + b.rx);
        const y0 = Math.min(a.y - a.ry, b.y - b.ry);
        const y1 = Math.max(a.y + a.ry, b.y + b.ry);
        out[i] = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 };
        out.splice(j, 1);
        j--;
        merged = true;
      }
    }
    if (!merged) break;
  }
  return out;
}

/** Clip `draw` to everything except the karts nearer to the camera than `dz`. */
function behindKarts(cc, occ, dz, draw) {
  const near = mergeOccluders(occ.filter((o) => o.dz < dz - 2));
  if (!near.length) { draw(cc); return; }
  cc.save();
  cc.beginPath();
  cc.rect(0, 0, STAGE_W, STAGE_H);
  for (const o of near) {
    cc.moveTo(o.x + o.rx, o.y);
    cc.ellipse(o.x, o.y, o.rx, o.ry, 0, 0, Math.PI * 2, true);
  }
  cc.clip('evenodd');
  draw(cc);
  cc.restore();
}

/**
 * Poke Ball pickups.
 *
 * These are the live, collectable rows (the world renderer only floats the few
 * rows declared on the track, from 138 units out). They use the SAME radius
 * formula and bob as the world's, so where the two ranges overlap they land on
 * top of each other exactly instead of doubling up. Three rules keep them where
 * the reference puts them: the radius is capped at roughly the hero kart's
 * wheel height, every ball is depth-tested against the karts (a kart nearer to
 * the camera clips it), and a ball drifting into a HUD safe zone fades out.
 */
const R_CAP = 46;                         // ~ the hero kart's wheel height

function drawPickups(view3, race, w, h, t, occ) {
  const list = [];
  for (const p of race.pickups) {
    for (let k = 0; k <= 1; k++) {
      const d = gapTo(race.lapLen, cam.dist, p.dist + k * race.lapLen);
      if (d < 26 || d >= view3.maxZ * 0.56) continue;
      const at = placeWorld(view3, d, p.lane);
      if (!at) continue;
      list.push({ at, d, lane: p.lane, cool: p.cool });
    }
  }
  list.sort((a, b) => b.d - a.d);
  for (const it of list) {
    const r = Math.min(R_CAP, it.at.w * 0.078);
    if (r < 2.5) continue;
    const bob = Math.sin(t * 2.4 + it.lane * 3 + it.d * 0.01) * r * 0.35;
    const y = it.at.y - r * 1.9 + bob;
    let alpha = 1 - Math.min(0.92, it.at.fog);
    // collected balls shrink away and pop back when they respawn
    let scale = 1;
    if (it.cool > 0) {
      const k = Math.max(0, Math.min(1, it.cool / 1.25));
      scale = 0.55 + (1 - k) * 0.45;
      alpha *= 0.30 + (1 - k) * 0.55;
    }
    const rr = r * scale;
    // never sit on the HUD: fade out as the sprite creeps into a safe zone
    const cover = hudCover(it.at.x, y, rr * 1.15);
    if (cover > 0.34) continue;
    alpha *= 1 - Math.min(1, cover / 0.34);
    if (alpha < 0.03) continue;
    behindKarts(c, occ, it.d, () => {
      paint.withAlpha(c, alpha, (cc) => {
        const lift = Math.max(0, Math.min(1.3, (it.at.y - y) / (rr * 2.4)));
        paint.ballShadow(cc, it.at.x, it.at.y, rr * 1.05, lift);
        paint.pokeball(cc, it.at.x, y, rr, t * 2.4 + it.lane * 2.2);
      });
    });
  }
}

function drawKartFx(view3, race, w, h, t, occ) {
  const list = [];
  for (const r of race.racers) {
    const at = placeRacer(view3, race, r, w, h);
    if (!at) continue;
    list.push({ r, at });
  }
  list.sort((a, b) => b.at.dz - a.at.dz);
  for (const { r, at } of list) {
    const a = 1 - Math.min(0.9, at.fog);
    if (a < 0.05) continue;
    // a rival's flames/stars belong to that rival's depth slot
    const near = occ ? mergeOccluders(occ.filter((o) => o.dz < at.dz - 8)) : [];
    if (near.length) {
      c.save();
      c.beginPath();
      c.rect(0, 0, STAGE_W, STAGE_H);
      for (const o of near) {
        c.moveTo(o.x + o.rx, o.y);
        c.ellipse(o.x, o.y, o.rx, o.ry, 0, 0, Math.PI * 2, true);
      }
      c.clip('evenodd');
    }
    if (r.boost > 0.08) {
      // twin exhaust flames off the back corners, not one blob under the kart
      paint.withAlpha(c, a * Math.min(1, r.boost * 1.2), (cc) => {
        const off = at.s * 0.34;
        const y = at.y + at.s * 0.16;
        paint.boostTrail(cc, at.x - off, y, at.s * 0.44, t + r.phase * 3, r.accent || '#ff8a3c');
        paint.boostTrail(cc, at.x + off, y, at.s * 0.44, t + r.phase * 3 + 0.4, r.accent || '#ff8a3c');
      });
    }
    if (r.spun > 0.05) {
      paint.withAlpha(c, a, (cc) => {
        paint.spinStars(cc, at.x, at.y - at.s * 0.22, at.s * 0.95, t + r.phase * 2);
      });
    }
    if (r.hitFlash > 0.05) {
      paint.withAlpha(c, a * r.hitFlash * 0.8, (cc) => {
        const g = cc.createRadialGradient(at.x, at.y, 0, at.x, at.y, at.s * 1.2);
        g.addColorStop(0, 'rgba(255,255,255,.9)');
        g.addColorStop(1, 'rgba(255,120,60,0)');
        cc.fillStyle = g;
        cc.beginPath(); cc.arc(at.x, at.y, at.s * 1.2, 0, Math.PI * 2); cc.fill();
      });
    }
    if (r.pickupGlow > 0.05) {
      paint.withAlpha(c, a * r.pickupGlow, (cc) => {
        paint.pickupPop(cc, at.x, at.y - at.s * 0.5, at.s * 0.4, 1 - r.pickupGlow, 1);
      });
    }
    if (near.length) c.restore();
  }
}

// ------------------------------------------------------------- Hyper Beam
//
// The jet is deliberately SHORT: a flame plume about one and a half kart
// lengths long, pinned to the tarmac and pointed down the racing line at the
// rival directly ahead - the Charizard fire-breath of the reference item
// panel - rather than a lance that leaves the road and crosses the frame.

// WHERE THE FLAME LEAVES THE KART.
//
// Not the projected nose of the mesh. The karts are drawn at a deliberately
// exaggerated three-quarter yaw (src/race/kart.js pushes them up to ~1 rad off
// the road so they are never head-on), so the hood tip can project 200 px to the
// camera-LEFT on the very frame the victim sits up-RIGHT. A mouth welded to that
// tip fires a lance across the kart's own flank and straight through the rider -
// which is exactly what read as "breathed out of the rider's back".
//
// So the mouth is anchored on the FIRING AXIS instead: start at the firer's
// contact patch, step forward along the line to the victim by about one half-body
// width, and sit just off the tarmac. That point is always on the kart's leading
// edge in the direction the fire is going, whatever the mesh is doing, and it is
// always LOW - which is what lets the plume pass under the seated rider instead
// of across their chest.
const NOSE_OUT = 1.02;       // mouth: half-widths forward along the firing axis
const ROOT_BACK = 0.34;      // root buried back inside the bodywork, same units
const JET_MOUTH = 0.25;      // mouth radius, in hero half-widths
/** Vertical squash of the plume - must match `flat` in draw.js `flameCone`. */
const CONE_FLAT = 0.62;
/**
 * How far clear of the rider silhouette the DRAWN flame has to stay, as a
 * multiple of the (inflated) silhouette: 1.0 is grazing it. Anything less and the
 * rider cut-out bites a curved chunk out of the plume, which reads as fire coming
 * out of the character rather than out of the kart.
 */
const JET_CLEAR = 1.02;
/**
 * ...and how close it may come before the plume is cut short rather than drawn.
 * Lower than the target above because the silhouette used here is the projected
 * character's bounding ellipse, which is already a shade larger than the ellipse
 * actually cut out of the flame - so a hair of overlap on this measure is still
 * clear air on screen.
 */
const JET_CUT = 0.93;
/**
 * Longest a cone may run on screen, in stage widths. A plume past this is a lance
 * across the whole frame rather than a breath of fire.
 */
const JET_MAX_RUN = 0.46 * STAGE_W;
/** Frame margin the impact must sit inside, in stage widths/heights. */
const JET_EDGE = 0.045;
const JET_TIP_W = 0.80;      // half width at the impact, in VICTIM-kart sizes
const JET_TIP_MIN = 0.55;    // tip may never pinch below this share of the mouth
const JET_TIP_MAX = 1.70;    // ...nor bloom past this share of it
const JET_BURST = 0.72;      // dry-fire burst length, in hero half-widths
const BURST_OUT = 0.52;      // burst mouth: half-widths forward along its axis
/**
 * Where on the kart the fire may leave from, in kart-local units (x right, y up,
 * z towards the nose; ground at y = 0, the hull's front ground line is z ~ 1.0 and
 * |x| <= 0.86). Every one of them is a point on the chassis's own leading edge, at
 * the TARMAC - so wherever the plume ends up leaving from it is welded to the
 * bodywork and passes under the rider. Centre first; the corners exist only to
 * walk the cone out from behind the character when the victim is drawn almost
 * straight above them, and they are deliberately no wider than the front axle so
 * the fire can never look like it is coming out of the flank.
 */
const FRONT_PTS = Object.freeze([
  [0, 0.07, 1.12],
  [0.44, 0.05, 1.04], [-0.44, 0.05, 1.04],
  [0.76, 0.03, 0.94], [-0.76, 0.03, 0.94],
]);
/**
 * Yaws (radians) a muzzle burst may be swung off the road axis to get clear of
 * the firer's own rider. Small on purpose - the puff still has to read as fire
 * breathed forwards, not sideways out of the flank.
 */
const BURST_YAW = Object.freeze([0, 0.16, -0.16, 0.32, -0.32]);
/** Widest the burst may lean off screen-up to follow the circuit (radians). */
const BURST_LEAN = 0.22;
const JET_MIN_GAP = 66;      // below this the rival is not drawn clear of us
const JET_LOCK_LANE = 1.30;  // lane half-window the jet can lock onto
const JET_MIN_RUN = 170;     // shortest a cone WITH a victim may be (px)
const JET_ROAD_FALLBACK = 300; // gap (world units) an undrawn victim is still burnt at
// The rider silhouette the flame has to pass under, as an ellipse on the head
// plane: head + shoulders + chest, i.e. every pixel of the character the cone
// could otherwise smear across. It is cut out of the flame (never out of the
// kart) because the rider is NEARER the camera than the road the fire runs down -
// but the geometry above is chosen so that cut-out never actually has anything to
// remove.
const RIDER_Z = -0.30;
const RIDER_Y = 1.40;
const RIDER_RX = 0.46;
const RIDER_RY = 0.68;

/**
 * The projector the firing kart is DRAWN with, so the flame can be pinned to
 * real points on the mesh instead of to guessed multiples of the sprite box.
 * Mirrors src/race/kart.js (`drawKart`) and its callers in src/race/world.js:
 * the hero is presented at yaw 0.17 plus its steer, a rival at a yaw that
 * follows how far off centre it sits, and both are pushed through the same
 * "never head-on" boost.
 *
 * Returns `{ at(x,y,z), unit(z) }`: kart-local point -> STAGE pixels, and the
 * apparent pixels-per-kart-unit at a given depth.
 */
function kartRig(r, from, w) {
  let base = 0.17;
  let steer = 0;
  let pitch = 0;
  if (r.isPlayer) {
    steer = clamp((cam.yaw * 1.9 + (r.lane - cam.lane) * 1.4) * 3.1, -1, 1);
    pitch = clamp(-(cam.speedT || 0) * 0.02 + (r.boost || 0) * 0.05, -0.06, 0.06);
  } else {
    base = 0.10 + ((from.x - w / 2) / w) * 0.55;
    steer = clamp(r.lane * 0.5, -0.7, 0.7);
  }
  const drift = clamp(r.drift || 0, 0, 1);
  const raw = base + steer * 0.42 + drift * Math.sign(steer || 1) * 0.18;
  const yaw = clamp(raw + 0.20 * Math.tanh(raw / 0.10), -0.98, 0.98);
  const roll = clamp(-steer * 0.13, -0.20, 0.20);
  const frame = makeFrame(from.s, { yaw, roll, pitch });
  return {
    at(x, y, z) {
      const q = frame.p(x, y, z);
      return { x: from.x + q.x, y: from.y + q.y };
    },
    unit(z) { return frame.unit(z); },
  };
}

/**
 * Add an ellipse that lives on one kart-local plane to the current path, as the
 * projected polygon it really is (yaw and roll shear it on screen, so a screen
 * -space ellipse would sit crooked on a hard-steering kart).
 */
function tracePlaneEllipse(c, rig, cy, z, rx, ry, seg = 22) {
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const p = rig.at(Math.cos(a) * rx, cy + Math.sin(a) * ry, z);
    if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
  }
  c.closePath();
}

// Corners of the firing kart's own hull, in kart-local units: the lofted body's
// widest rings (nose, hips, tail) at deck height and at the ground line. Their
// screen convex hull is our bodywork, which stands between the camera and the
// mouth of the flame.
const HULL_PTS = Object.freeze([
  [0, 0.58, 1.44], [-0.30, 0.50, 1.42], [0.30, 0.50, 1.42],
  [-0.72, 0.77, 0.86], [0.72, 0.77, 0.86],
  [-0.80, 0.94, -0.46], [0.80, 0.94, -0.46],
  [-0.74, 1.01, -0.98], [0.74, 1.01, -0.98],
  [-0.36, 0.86, -1.22], [0.36, 0.86, -1.22],
  [-0.86, 0.02, -1.10], [0.86, 0.02, -1.10],
  [-0.86, 0.02, 0.90], [0.86, 0.02, 0.90],
]);

/** The firing kart's projected body silhouette, as a convex polygon. */
function kartHull(rig) {
  const pts = HULL_PTS.map((p) => rig.at(p[0], p[1], p[2]));
  pts.sort((a, b) => (a.x - b.x) || (a.y - b.y));
  const cross = (o, a, bb) => (a.x - o.x) * (bb.y - o.y) - (a.y - o.y) * (bb.x - o.x);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    return out;
  };
  const lower = half(pts);
  const upper = half(pts.slice().reverse());
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Add the firing kart's projected body silhouette (convex hull) to the path. */
function traceKartHull(c, rig) {
  const hull = kartHull(rig);
  if (hull.length < 3) return;
  hull.forEach((p, i) => { if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); });
  c.closePath();
}

/**
 * The kart the jet is burning: the nearest rival ahead of the firer, inside the
 * beam's reach and roughly in the same lane band. It anchors the tip of the
 * plume, so the flame always ENDS on a kart instead of fading into thin air.
 */
function beamTarget(race, b, owner) {
  // the sim NAMES the kart it is burning (items.js locks one victim per beam),
  // so the plume is guaranteed to end on the kart that takes the damage. The
  // local search below is only a fallback for a replacement sim provider.
  // Kept for the beam's WHOLE life, however close we then ram them: the kart
  // the sim burned is the kart the flame has to be drawn ending on, and
  // re-picking mid-burn is what left the plume pointing at a bystander.
  // A DRY shot stays dry: the sim fired it with nobody in front, so there is no
  // victim to find and the plume must not go hunting for one (a burst that turns
  // into a cone two frames later is worse than either).
  if (b.dry) return null;
  if (b.target) {
    const o = race.racers.find((r) => r.id === b.target);
    const g = o ? gapTo(race.lapLen, owner.dist, o.dist) : 0;
    if (o && !o.finished && g > 6) return { racer: o, gap: g };
  }
  let target = null;
  let bestGap = Infinity;
  for (const o of race.racers) {
    if (o.id === b.owner || o.finished) continue;
    const g = gapTo(race.lapLen, owner.dist, o.dist);
    if (g <= JET_MIN_GAP || g > (b.reach || 360) * 1.15 || g >= bestGap) continue;
    if (Math.abs(o.lane - b.lane) > JET_LOCK_LANE) continue;
    bestGap = g; target = o;
  }
  return target ? { racer: target, gap: bestGap } : null;
}

/**
 * Per-beam cosmetic memory. Which SHAPE a shot is (a cone onto a victim or a
 * muzzle burst off the nose) comes straight from the sim's own verdict, and the
 * mouth it leaves from is kept between frames while it still works - so one shot
 * can
 * never swing from a stub into a lance half a beat later, which is what made the
 * effect read as two unrelated animations stitched together.
 */
const plumeMem = new WeakMap();
function memOf(b) {
  let m = plumeMem.get(b);
  if (!m) { m = { end: null, shift: null, cone: null }; plumeMem.set(b, m); }
  return m;
}

/** Repaint a remembered cone, with only its animation clock moved on. */
function reCone(prev, b) {
  return { ...prev, cone: { ...prev.cone, clock: b.life } };
}

/**
 * Build the plume: a ground-hugging flame cone that leaves the firer's leading
 * edge, runs down the tarmac and terminates ON the struck kart - or, for a shot
 * fired with nobody in front, a short muzzle burst off the same anchor.
 *
 * Returns `{ cone, dz, tip, dry, target, clear }`; `cone` is the one shape that
 * gets painted (flat near edge on the kart's nose -> round cap on the victim).
 */
function beamPlume(view3, race, b, from, lock, w, h, rig) {
  const fromZ = from.dz;
  const mem = memOf(b);
  const s = from.s;
  // The firing anchors: real points on the front of the chassis at road level,
  // projected through the kart's own rig. Everything else is measured forward from
  // one of them ALONG the axis of the shot, so the mouth is always on the kart's
  // leading edge in the direction the fire is travelling, and always low enough to
  // pass under the seated rider. `base` is the middle of the front - the default,
  // and the one a shot uses unless the rider is in the way.
  const anchors = FRONT_PTS.map((q) => rig.at(q[0], q[1], q[2]));
  const base = anchors[0];
  const mouthW = clamp(s * JET_MOUTH, 14, 52);

  // ------------------------------------------------- the rider silhouette
  //
  // Projected through the kart's own rig and then taken as its screen bounding
  // box: the cut-out this layer applies is the sheared ellipse itself, and its
  // bounding ellipse is a slightly generous stand-in - erring outwards costs a
  // few pixels of clearance and buys a plume that is never bitten into.
  const rc = rig.at(0, RIDER_Y, RIDER_Z);
  const rEdge = rig.at(RIDER_RX, RIDER_Y, RIDER_Z);
  const rTop = rig.at(0, RIDER_Y + RIDER_RY, RIDER_Z);
  const RX = Math.max(8, Math.hypot(rEdge.x - rc.x, rTop.x - rc.x));
  const RY = Math.max(8, Math.hypot(rEdge.y - rc.y, rTop.y - rc.y));

  /** < 1 => flame pixels of radius `r` at `p` land on the character. */
  function ridePix(p, r) {
    const dx = (p.x - rc.x) / (RX + r);
    const dy = (p.y - rc.y) / (RY + r * CONE_FLAT);
    return Math.hypot(dx, dy);
  }
  /** Closest the DRAWN flame gets to the rider, in inflated-silhouette radii. */
  function coneClear(a, ra, z, rz) {
    let worst = 9;
    for (let i = 0; i <= 14; i++) {
      const f = i / 14;
      worst = Math.min(worst, ridePix(
        { x: a.x + (z.x - a.x) * f, y: a.y + (z.y - a.y) * f },
        ra + (rz - ra) * f,
      ));
    }
    return worst;
  }
  /**
   * Root / mouth of a cone fired towards `to` out of anchor `mouthAt` (an index
   * into FRONT_PTS). Walking that index out to a front corner is what gets the
   * plume from behind the rider when the victim is drawn almost straight above
   * them, WITHOUT letting go of the victim or leaving the bodywork.
   */
  function axisTo(to, outward = NOSE_OUT, mouthAt = 0) {
    const anchor = anchors[mouthAt] || anchors[0];
    const dx = to.x - anchor.x;
    const dy = to.y - anchor.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // THE ONE INVARIANT: the mouth never rises above the rider's lower edge. The
    // whole point of a low anchor is that the fire leaves the kart UNDER the
    // character, so on a steep axis the mouth is pulled back DOWN the axis rather
    // than lifted into their lap - which is what put the near end of the plume at
    // chest height and made it read as breathed out of the rider's torso.
    let out = s * outward;
    const floorY = rc.y + RY + s * 0.05;
    if (uy < -0.05 && anchor.y + uy * out < floorY) {
      out = clamp((floorY - anchor.y) / uy, s * 0.26, out);
    }
    const back = out - s * ROOT_BACK;
    return {
      ux, uy, len: Math.max(1, len - out),
      mouth: { x: anchor.x + ux * out, y: anchor.y + uy * out },
      root: { x: anchor.x + ux * back, y: anchor.y + uy * back },
    };
  }

  // --------------------------------------------------------- the DRY shot
  //
  // Fired with nobody in front (the player is leading, or the only rivals are
  // behind): the item is spent, and the honest read of that is a MUZZLE BURST - a
  // short puff of fire off the nose that blooms and dies, about one kart width
  // long - not a full plume laid down the road onto empty tarmac.
  function dryBurst() {
    // Forward is "from the kart to the tarmac a few kart lengths up its own lane"
    // - so the puff follows the circuit through a bend, and is always aimed UP the
    // road rather than off the mesh's exaggerated three-quarter yaw. (A direction
    // taken between two road samples instead is nearly horizontal at this depth,
    // which is what made the burst read as fire out of the flank.)
    let ax = 0;
    let ay = -1;
    const up = placeWorld(view3, fromZ + 260, b.lane);
    if (up) {
      // ...and LEANED, not aimed: on a hard bend that tarmac sits far out to one
      // side, and a puff fired straight at it reads as fire breathed out of the
      // flank. The heading is clamped to a shallow angle off screen-up, which is
      // the direction "forwards" reads as from behind the kart.
      const lean = clamp(Math.atan2(up.x - base.x, Math.max(1, base.y - up.y)), -BURST_LEAN, BURST_LEAN);
      ax = Math.sin(lean);
      ay = -Math.cos(lean);
    }
    // Blooms out of the hood over the first frames, then holds: a puff, not a jet.
    const run = s * JET_BURST * (0.6 + 0.4 * clamp(b.life / 0.08, 0, 1));
    let best = null;
    // Only the middle of the front and the two inner corners: a short puff has no
    // long axis to read a direction off, so one hung out on a front CORNER just
    // looks like a fireball beside the flank.
    for (let ai = 0; ai < Math.min(3, anchors.length); ai++) {
      for (const rot of BURST_YAW) {
        const cs = Math.cos(rot);
        const sn = Math.sin(rot);
        const ux = ax * cs - ay * sn;
        const uy = ax * sn + ay * cs;
        const from0 = anchors[ai];
        const a = axisTo({ x: from0.x + ux * 600, y: from0.y + uy * 600 }, BURST_OUT, ai);
        const tip = { x: a.mouth.x + ux * run, y: a.mouth.y + uy * run };
        const clear = coneClear(a.mouth, mouthW, tip, mouthW * 1.3);
        // Straight ahead out of the middle of the front is the shot; the corners
        // and the small yaws exist only to keep the puff off the rider.
        const cost = Math.max(0, JET_CLEAR - clear) * 10 + Math.abs(rot) + ai * 0.42;
        if (!best || cost < best.cost) best = { a, tip, clear, cost };
      }
    }
    // ...and if even the shortest lean cannot clear the character (they are
    // leaning across the hood on a hard turn), the puff is shortened until it
    // does: a stub of fire at the nose beats fire painted over the rider.
    let tip = best.tip;
    for (let i = 0; i < 5 && coneClear(best.a.mouth, mouthW, tip, mouthW * 1.3) < JET_CUT; i++) {
      tip = { x: best.a.mouth.x + (tip.x - best.a.mouth.x) * 0.7, y: best.a.mouth.y + (tip.y - best.a.mouth.y) * 0.7 };
    }
    return {
      cone: {
        x0: best.a.root.x, y0: best.a.root.y, r0: mouthW,
        x1: tip.x, y1: tip.y, r1: mouthW * 1.3,
        clock: b.life,
      },
      dz: fromZ + 40,
      tip: null,
      dry: true,
      target: null,
      clear: coneClear(best.a.mouth, mouthW, tip, mouthW * 1.3),
    };
  }

  // ------------------------------------------------------------ the victim
  //
  // The anchor of record is the victim's own sprite box; when the renderer is not
  // drawing that kart (it shoulders, and sometimes drops, a rival that intersects
  // the hero) the patch of road it is standing on stands in, so the plume keeps
  // terminating on the kart the sim is actually burning instead of snapping back
  // to a stub for a few frames.
  let hitAt = null;
  if (lock) {
    const dz = Math.max(fromZ + 24, fromZ + lock.gap);
    const at = placeRacer(view3, race, lock.racer, w, h);
    const on = placeWorld(view3, dz, lock.racer.lane);
    if (at && at.dz > fromZ + 18 && at.s > 12) {
      hitAt = { x: at.x, y: at.y, s: at.s, dz: at.dz, src: 'kart' };
    } else if (on && lock.gap < Math.max(JET_ROAD_FALLBACK, (b.reach || 360) * 1.2)) {
      hitAt = { x: on.x, y: on.y, s: Math.max(16, on.w * 0.15), dz, src: 'road' };
    }
  }

  // Frame + length guards: an impact off the stage, or a run stretched into a
  // lance right across it, is clamped back down the axis. A victim that far out is
  // a speck anyway - what matters is that the plume stays a plume.
  if (hitAt) {
    hitAt = {
      ...hitAt,
      x: clamp(hitAt.x, STAGE_W * JET_EDGE, STAGE_W * (1 - JET_EDGE)),
      y: clamp(hitAt.y, STAGE_H * JET_EDGE, STAGE_H * (1 - JET_EDGE)),
    };
    const run0 = axisTo(hitAt).len;
    if (run0 > JET_MAX_RUN) {
      const k = (JET_MAX_RUN + s * NOSE_OUT) / (run0 + s * NOSE_OUT);
      hitAt = {
        ...hitAt,
        x: base.x + (hitAt.x - base.x) * k,
        y: base.y + (hitAt.y - base.y) * k,
      };
    }
  }

  // Candidate impacts on the victim's chassis, best first: dead centre and low
  // (the flame goes INTO the chassis, not over its roof), then slid onto either
  // flank, then down onto its wheels. Sliding along the chassis is how the cone
  // gets clear of our own rider without ever letting go of its victim.
  let pick = null;
  if (hitAt) {
    const tip0 = clamp(hitAt.s * JET_TIP_W, 14, 74);
    const tipW = clamp(tip0, mouthW * JET_TIP_MIN, mouthW * JET_TIP_MAX);
    const mid = { x: hitAt.x, y: hitAt.y - hitAt.s * 0.46 };
    const a0 = axisTo(mid);
    // sideways along the victim's OWN chassis, i.e. across the firing axis
    const px = -a0.uy;
    const py = a0.ux;
    const cands = [mid];
    for (const k of [0.55, -0.55, 0.95, -0.95]) {
      cands.push({ x: mid.x + px * hitAt.s * k, y: mid.y + py * hitAt.s * k * CONE_FLAT });
    }
    cands.push({ x: hitAt.x, y: hitAt.y - hitAt.s * 0.14 });
    // Centre of the front first, and the mouth this shot already used first of
    // all, so a plume that is clear stays exactly where it was last frame.
    const shifts = mem.shift != null
      ? [mem.shift, ...anchors.keys()] : [...anchors.keys()];
    for (const end of cands) {
      // An impact inside the minimap column is clipped out of this layer, so the
      // plume would stop dead in mid-air short of it: those candidates are only
      // taken if nothing else on the chassis works.
      const hud = hudBlocked(end.x, end.y) ? 4 : 0;
      for (const sh of shifts) {
        const a = axisTo(end, NOSE_OUT, sh);
        const clear = coneClear(a.mouth, mouthW, end, tipW) - hud;
        if (!pick || clear > pick.clear) pick = { end, a, clear, tipW, sh };
        if (clear >= JET_CLEAR) break;
      }
      if (pick && pick.clear >= JET_CLEAR) break;
    }
  }

  // A shot the sim fired at nobody stays a burst for its whole life, and a shot
  // with a victim stays a cone: the SHAPE is the sim's verdict, not a per-frame
  // screen test, so it cannot flicker between the two.
  if (b.dry) return dryBurst();
  // ...which means a targeted shot may NOT drop to a burst just because this one
  // frame could not solve an impact (the renderer shoulders, and sometimes drops,
  // the victim's sprite for a beat). The cone this shot was already drawing is
  // repainted where it was instead: a plume that becomes a sideways stub for a
  // single frame reads as the flame letting go of the kart it is burning.
  if (!pick) return mem.cone ? reCone(mem.cone, b) : dryBurst();

  let end = pick.end;
  // The victim can drift back onto our bumper late in the burn (we are closing on
  // a kart whose speed we just halved): the cone follows it, but never collapses
  // into a stub - the impact is pushed back out along the same heading.
  if (pick.a.len < JET_MIN_RUN) {
    const k = (JET_MIN_RUN + s * NOSE_OUT) / Math.max(1, pick.a.len + s * NOSE_OUT);
    end = { x: base.x + (end.x - base.x) * k, y: base.y + (end.y - base.y) * k };
  }
  // Eased towards the impact rather than snapped to it, so a victim the renderer
  // shoulders sideways for a frame cannot make the plume flick - but it always
  // FOLLOWS the kart it is burning: a plume left behind on the patch of road the
  // victim used to occupy is the "ends on empty tarmac" read all over again.
  if (mem.end) {
    end = {
      x: mem.end.x + (end.x - mem.end.x) * 0.82,
      y: mem.end.y + (end.y - mem.end.y) * 0.82,
    };
  }

  // The minimap column is clipped out of this layer, so an impact in there would
  // leave the plume stopping dead in mid-air short of its victim. Slide it back
  // along the axis onto the victim's near flank instead - still on the kart.
  // The mouth slide is re-solved for the impact that was actually chosen, with
  // last frame's slide tried FIRST: while it still clears, the mouth does not
  // move at all, so the plume cannot swing across the kart between frames.
  let axis = null;
  {
    const order = mem.shift != null ? [mem.shift, ...anchors.keys()] : [...anchors.keys()];
    let bestSh = null;
    for (const sh of order) {
      const a = axisTo(end, NOSE_OUT, sh);
      const cl = coneClear(a.mouth, mouthW, end, pick.tipW);
      if (!bestSh || cl > bestSh.cl) bestSh = { a, cl, sh };
      if (cl >= JET_CLEAR) break;
    }
    mem.shift = bestSh.sh;
    axis = bestSh.a;
  }
  if (hudBlocked(end.x, end.y)) {
    for (let k = 10; k <= hitAt.s * 1.3; k += 10) {
      const p = { x: end.x - axis.ux * k, y: end.y - axis.uy * k };
      if (!hudBlocked(p.x, p.y)) { end = p; axis = axisTo(end, NOSE_OUT, mem.shift); break; }
    }
  }
  mem.end = end;

  // ------------------------------------------------------------- the cone
  //
  // ONE shape, and only one: a flat near edge across the firer's nose and a round
  // cap that wraps the victim's chassis. No separate muzzle flare, no mid-air
  // segment, no impact sprite - each of those used to be its own drawing, and
  // three drawings is exactly how the effect fell apart into disconnected pieces.
  let noseW = clamp(mouthW * 0.78, 12, axis.len * 0.5);
  let tipW = clamp(pick.tipW, noseW * JET_TIP_MIN, noseW * JET_TIP_MAX);
  // Last safety valve: if the flame still grazes the character (a victim parked
  // almost directly behind their head), thin it until it does not, rather than
  // letting the cut-out bite a curved chunk out of the plume.
  let clear = coneClear(axis.mouth, noseW, end, tipW);
  for (let i = 0; i < 2 && clear < JET_CLEAR; i++) {
    noseW *= 0.9;
    tipW *= 0.9;
    clear = coneClear(axis.mouth, noseW, end, tipW);
  }
  // Last resort, for the one case the geometry cannot win: the victim is drawn
  // almost exactly behind the rider's head. Rather than thinning the flame to a
  // thread or letting the cut-out bite a crescent out of it, the plume is cut
  // SHORT at the character's outline - it reads as fire running up the road and
  // disappearing behind them, which is what is physically happening.
  if (clear < JET_CUT) {
    let lo = 0.42;
    let hi = 1;
    for (let i = 0; i < 6; i++) {
      const f = (lo + hi) / 2;
      const p = { x: axis.mouth.x + (end.x - axis.mouth.x) * f, y: axis.mouth.y + (end.y - axis.mouth.y) * f };
      if (coneClear(axis.mouth, noseW, p, noseW + (tipW - noseW) * f) >= JET_CLEAR) lo = f; else hi = f;
    }
    // A cut this deep is no longer "fire running up the road and disappearing
    // behind the rider" - it is a stub that has let go of the kart it is burning,
    // for the one frame the victim happens to line up with the rider's head.
    // While this shot already has an anchored cone on record, that one is
    // repainted: a plume 50 ms stale still ENDS on the victim, and the rider is
    // clipped out of this layer regardless.
    if (lo < 0.6 && mem.cone) return reCone(mem.cone, b);
    tipW = noseW + (tipW - noseW) * lo;
    end = { x: axis.mouth.x + (end.x - axis.mouth.x) * lo, y: axis.mouth.y + (end.y - axis.mouth.y) * lo };
    clear = coneClear(axis.mouth, noseW, end, tipW);
    // Even the cut cone can still graze the character on the odd frame. It is
    // STILL a cone: the rider is clipped out of this layer anyway, so the worst
    // case is a few flame pixels passing behind their shoulder - where dropping
    // to a burst would be the flame visibly letting go of its victim mid-burn.
    if (clear < JET_CUT && mem.cone) return reCone(mem.cone, b);
  }
  // The far cap is round, so its centre is pulled back inside the victim's
  // footprint: the fire closes OVER the chassis instead of shooting past it.
  const pull = tipW * 0.34;
  const tipEnd = axis.len > pull + 40
    ? { x: end.x - axis.ux * pull, y: end.y - axis.uy * pull }
    : end;
  const out = {
    cone: {
      x0: axis.root.x, y0: axis.root.y, r0: noseW,
      x1: tipEnd.x, y1: tipEnd.y, r1: tipW,
      clock: b.life,
    },
    dz: hitAt.dz,
    tip: hitAt,
    target: lock ? lock.racer : null,
    clear,
    shift: mem.shift,
  };
  // Remembered so a frame that cannot solve an impact can repaint this exact
  // cone instead of flipping the shot to a muzzle burst.
  mem.cone = out;
  return out;
}

function drawOrdnance(view3, race, w, h, t, occ) {
  for (const p of race.projectiles) {
    const d = gapTo(race.lapLen, cam.dist, p.dist);
    if (d < 10 || d > view3.maxZ * 0.5) continue;
    const at = placeWorld(view3, d, p.lane);
    if (!at) continue;
    const r = Math.max(3, Math.min(40, at.w * 0.055));
    behindKarts(c, occ, d, () => {
      paint.withAlpha(c, 1 - Math.min(0.85, at.fog), (cc) => {
        paint.projectile(cc, at.x, at.y - r * 1.3, r, p.color || '#e8433c', p.life * 6);
      });
    });
  }

  for (const b of race.beams) {
    const owner = race.racers.find((r) => r.id === b.owner);
    if (!owner) continue;
    const from = placeRacer(view3, race, owner, w, h);
    if (!from) continue;
    const lock = beamTarget(race, b, owner);
    const rig = kartRig(owner, from, w);
    const plume = beamPlume(view3, race, b, from, lock, w, h, rig);
    if (!plume) continue;
    const t01 = clamp(b.life / b.ttl, 0, 1);
    // Cosmetic-only trace of what the plume actually became this frame, so the
    // anchor can be measured (mouth vs rider silhouette) instead of eyeballed.
    // Never read by the sim, never part of state().
    if (typeof window !== 'undefined') {
      window.__pkrBeam = {
        life: +b.life.toFixed(3), mode: plume.dry ? 'burst' : 'cone',
        target: plume.target ? plume.target.id : null,
        cone: {
          x0: Math.round(plume.cone.x0), y0: Math.round(plume.cone.y0),
          r0: Math.round(plume.cone.r0),
          x1: Math.round(plume.cone.x1), y1: Math.round(plume.cone.y1),
          r1: Math.round(plume.cone.r1),
        },
        clear: plume.clear == null ? null : +plume.clear.toFixed(2),
        hit: plume.tip ? { x: Math.round(plume.tip.x), y: Math.round(plume.tip.y), s: Math.round(plume.tip.s), src: plume.tip.src } : null,
        shift: plume.shift == null ? null : +plume.shift.toFixed(2),
        from: { x: Math.round(from.x), y: Math.round(from.y), s: Math.round(from.s) },
        rider: (() => {
          const rc = rig.at(0, RIDER_Y, RIDER_Z);
          const re = rig.at(RIDER_RX, RIDER_Y, RIDER_Z);
          const rt = rig.at(0, RIDER_Y + RIDER_RY, RIDER_Z);
          return {
            x: Math.round(rc.x), y: Math.round(rc.y),
            rx: Math.round(Math.hypot(re.x - rc.x, re.y - rc.y)),
            ry: Math.round(Math.hypot(rt.x - rc.x, rt.y - rc.y)),
          };
        })(),
      };
    }

    // The jet travels away from its firer, so only karts between the camera and
    // the firer can be in front of it. The firer's own body is cut out too -
    // the flame streams out from under the nose instead of over the face.
    const near = mergeOccluders(occ.filter((o) => o.dz < from.dz - 8));
    c.save();
    c.beginPath();
    c.rect(0, 0, STAGE_W, STAGE_H);
    for (const o of near) {
      c.moveTo(o.x + o.rx, o.y);
      c.ellipse(o.x, o.y, o.rx, o.ry, 0, 0, Math.PI * 2, true);
    }
    // ...and never paint over the HUD. Inflated a little because this layer is
    // drawn inside the world's corner roll (rotate + 1.06 scale). The minimap
    // column is one of these zones, so no part of the cone can ever reach it.
    for (const z of HUD_ZONES) {
      c.rect(z.x - 24, z.y - 24, z.w + 48, z.h + 48);
    }
    c.clip('evenodd');

    // Second, INDEPENDENT clip: the firer's RIDER. Kept separate from the one
    // above (and from the chassis below) because an even-odd path XORs
    // overlapping cut-outs back open, while consecutive clips intersect - which
    // is what actually removes the UNION of the three silhouettes.
    //
    // The flame is breathed from the hood tip, which is the FURTHEST point of
    // our own kart from the chase camera; the character sits nearer. So the
    // plume has to pass BEHIND their head and shoulders, and the cut-out is the
    // whole character - head, chest and shoulder line - projected on the rider
    // plane through the kart's own rig. Anything less leaves fire smeared over a
    // cheek or a shoulder, which is exactly what read as "the beam crosses the
    // hero".
    c.beginPath();
    c.rect(0, 0, STAGE_W, STAGE_H);
    tracePlaneEllipse(c, rig, RIDER_Y, RIDER_Z, RIDER_RX, RIDER_RY);
    c.clip('evenodd');

    // Third clip: our own BODYWORK. The mouth sits over the hood tip, which is
    // the FURTHEST point of our kart from the chase camera, so any part of the
    // flame that lands on the deck or the flanks is behind them and must not be
    // painted. The cut is the projected hull of the body itself, so the fire
    // licks over the hood line exactly where the hood ends.
    c.beginPath();
    c.rect(0, 0, STAGE_W, STAGE_H);
    traceKartHull(c, rig);
    c.clip('evenodd');

    paint.flameCone(c, plume.cone, t01);
    c.restore();
  }
}

function drawEvents(view3, race, w, h, occ) {
  for (const item of live) {
    const { ev } = item;
    const t01 = clamp(item.age / item.life, 0, 1);
    if (ev.type === 'burst' || ev.type === 'hit') {
      // A Hyper Beam draws NOTHING here. The cone itself terminates on the kart
      // it burns - its far cap wraps that chassis - so an extra fireball stamped
      // on the victim is a second, unattached sprite, and a second sprite is
      // exactly what made the effect read as a flare plus a floating fireball
      // rather than one continuous breath of fire.
      const hitDef = getItem(ev.item);
      if (hitDef && hitDef.kind === 'beam') continue;
      const target = ev.type === 'hit' ? race.racers.find((r) => r.id === ev.id) : null;
      let at = null;
      let size = 40;
      let dz = Infinity;
      if (target) {
        let p = placeRacer(view3, race, target, w, h);
        if (!p) {
          // The renderer culls a rival that lands inside the hero silhouette.
          // Burn the patch of road it is standing on instead of dropping the
          // impact altogether - a beam that ends in nothing reads as a miss.
          const dz = gapTo(race.lapLen, cam.dist, target.dist);
          const on = dz > 24 ? placeWorld(view3, dz, target.lane) : null;
          if (on) p = { x: on.x, y: on.y, s: Math.max(16, on.w * 0.14), dz };
        }
        // capped: a fireball on the hero kart must engulf it, not the frame
        if (p) {
          at = { x: p.x, y: p.y - p.s * 0.40 };
          // rivals get engulfed; on the hero kart it stays a scorch so the
          // player can still see what they are driving
          size = target.isPlayer ? Math.min(p.s * 0.26, 40) : Math.min(p.s * 0.40, 56);
          dz = p.dz;
        }
      } else {
        const d = gapTo(race.lapLen, cam.dist, ev.dist || 0);
        const p = d > 8 ? placeWorld(view3, d, ev.lane || 0) : null;
        if (p) {
          at = { x: p.x, y: p.y - p.w * 0.08 };
          size = Math.min(70, p.w * 0.08);
          dz = d;
        }
      }
      if (!at) continue;
      const def = getItem(ev.item);
      // fire is for things that explode: a Thunderbolt zaps the whole field at
      // once, so it stays an electric pop or the frame turns into a bonfire
      const fiery = !def || def.kind === 'beam' || def.kind === 'projectile';
      // a blast wraps its own kart but still sits behind anything closer to the
      // camera, so the field never loses its depth order
      // a blast that lands ON a kart is drawn at that kart's own depth, so its
      // own silhouette does not clip the fire off it
      withHudMask(c, () => behindKarts(c, occ, target ? dz : dz + 6, () => {
        if (fiery) {
          // a kart taking a hit is swallowed by a fireball, the way the item
          // panel of the reference sheet shows it
          paint.fireBurst(c, at.x, at.y, size * (target ? 1.15 : 0.9), t01);
        }
        paint.burst(c, at.x, at.y, size * 0.8, def ? def.color : '#ffd63b', t01);
      }));
    }
  }
}

function drawFieldFlash(race, w, h) {
  const ev = live.find((l) => l.ev.type === 'field');
  if (!ev) return;
  paint.thunder(c, w, h, clamp(ev.age / ev.life, 0, 1), rnd);
}

// ---------------------------------------------------------------- provider

/**
 * Other overlay providers share this DOM layer and some of them rebuild it with
 * innerHTML, which would silently drop our canvas - so every frame checks that
 * it is still attached and re-adopts it if not.
 */
function ensureCanvas(layer) {
  if (canvas && canvas.parentNode === layer && canvas.isConnected) return;
  if (canvas && canvas.isConnected === false && canvas.getContext) {
    layer.appendChild(canvas);              // re-adopt, keep the backing store
    c = canvas.getContext('2d');
    return;
  }
  canvas = document.createElement('canvas');
  canvas.className = 'pkr-fx';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  layer.appendChild(canvas);
  c = canvas.getContext('2d');
}

function sizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const wantW = Math.round(STAGE_W * dpr);
  const wantH = Math.round(STAGE_H * dpr);
  if (canvas.width !== wantW || canvas.height !== wantH) {
    canvas.width = wantW;
    canvas.height = wantH;
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
}

register({
  id: 'race-effects',
  kind: 'overlay',
  screens: ['race'],
  priority: 5,

  mount(ctx) {
    ensureCanvas(ctx.layer);
    sizeCanvas();
    live = [];
    clock = 0;
    cam._init = false;
    roadId = null;
    if (ctx.state.race) updateCamera(cam, ctx.state.race, 1 / 120);
  },

  update(dt, ctx) {
    const race = ctx.state.race;
    clock += dt;
    if (!race) return;
    updateCamera(cam, race, dt);
    ingest(race);
    for (const l of live) l.age += dt;
    live = live.filter((l) => l.age < l.life);
  },

  render(ctx) {
    const race = ctx.state.race;
    ensureCanvas(ctx.layer);
    if (!canvas || !c) return;
    sizeCanvas();
    c.clearRect(0, 0, STAGE_W, STAGE_H);
    if (!race) return;

    const track = trackOf(ctx.state);
    if (track.id !== roadId) { road = buildRoad(track); roadId = track.id; }
    const w = STAGE_W;
    const h = STAGE_H;
    const view3 = projectRoad(road, cam, { w, h });
    const t = clock;

    // Mirror the world's corner roll so effects stay welded to the scene.
    const roll = clamp(cam.roll || 0, -0.034, 0.034);
    c.save();
    if (roll !== 0) {
      c.translate(w / 2, h / 2);
      c.rotate(roll);
      c.scale(1.06, 1.06);
      c.translate(-w / 2, -h / 2);
    }
    // one depth queue for the whole layer: the karts' screen silhouettes are
    // the occluders every pickup / projectile / beam is tested against
    const occ = kartOccluders(view3, race, w, h);
    // Every sprite on this layer - pickups, kart fx, ordnance, impacts - is
    // masked against the HUD zones (which include the minimap rect), so no
    // effect can ever bleed onto the instrument layer.
    withHudMask(c, () => {
      drawPickups(view3, race, w, h, t, occ);
      drawKartFx(view3, race, w, h, t, occ);
      drawOrdnance(view3, race, w, h, t, occ);
      drawEvents(view3, race, w, h, occ);
    });
    c.restore();

    drawFieldFlash(race, w, h);
  },

  unmount() {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
    c = null;
    live = [];
  },
});

export { cam };
