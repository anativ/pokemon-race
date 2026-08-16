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
function placeRacer(view3, race, r, w, h) {
  if (r.isPlayer) {
    const raw = placeAt(view3, CAM_BACK, r.lane, 0);
    if (!raw) return null;
    const y = clamp(raw.y, h * 0.80, h * 0.93);
    const s = clamp(w * 0.092 + raw.w * 0.014, 106, 176);
    return { x: raw.x, y, s, fog: raw.fog, dz: CAM_BACK };
  }
  const loop = road ? road.loopLen : race.lapLen;
  let dz = r.dist - cam.dist;
  while (dz < -loop / 2) dz += loop;
  while (dz > loop / 2) dz -= loop;
  if (dz < 66 || dz > view3.maxZ * 0.5) return null;
  const at = placeAt(view3, dz, r.lane, 0);
  if (!at) return null;
  const s = Math.min(132, at.w * 0.155);
  if (s < 5) return null;
  return { x: at.x, y: at.y, s, fog: at.fog, dz };
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

const JET_NOSE_LIFT = 0.12;  // muzzle height above the ground point, in kart sizes
const JET_NOSE_W = 0.36;     // half width at the muzzle, in firer-kart sizes
const JET_FLOAT = 0.035;     // how far the flame core floats over the tarmac
const JET_FREE_RUN = 190;    // forward run (world units) when nothing is in range
const JET_MIN_GAP = 74;      // below this the world does not draw the rival at all
const JET_LOCK_LANE = 1.15;  // lane half-window the jet can lock onto
const JET_LOCK_MAX = 185;    // furthest kart the plume will stretch to reach
const JET_MAX_SPAN = 470;    // ...and the furthest it may stretch on screen (px)

/** Flame width profile: swells just off the muzzle, then narrows to the impact. */
function jetShape(f) {
  if (f < 0.16) return 0.84 + (f / 0.16) * 0.16;
  const k = (f - 0.16) / 0.84;
  return 1 - 0.34 * Math.pow(k, 1.6);
}

/**
 * The kart the jet is burning: the nearest rival ahead of the firer, inside the
 * beam's reach and roughly in the same lane band. It anchors the tip of the
 * plume, so the flame always ENDS on a kart instead of fading into thin air.
 */
function beamTarget(race, b, owner) {
  // the sim names the kart it is burning; fall back to a local search so the
  // plume still lands on something if a sim provider does not set it
  if (b.target) {
    const o = race.racers.find((r) => r.id === b.target);
    const g = o ? gapTo(race.lapLen, owner.dist, o.dist) : 0;
    if (o && !o.finished && g > JET_MIN_GAP) return { racer: o, gap: g };
  }
  let target = null;
  let bestGap = Infinity;
  for (const o of race.racers) {
    if (o.id === b.owner || o.finished) continue;
    const g = gapTo(race.lapLen, owner.dist, o.dist);
    if (g <= JET_MIN_GAP || g > (b.reach || 330) || g >= bestGap) continue;
    if (Math.abs(o.lane - b.lane) > JET_LOCK_LANE) continue;
    bestGap = g; target = o;
  }
  return target ? { racer: target, gap: bestGap } : null;
}

/**
 * Build the plume: a ground-level flame cone that leaves the firer's nose at
 * road height, follows the tarmac forward (so it bends with the circuit and
 * never leaves the road plane) and terminates ON the struck kart.
 *
 * Returns `{ sp, tip }` where `sp` is the spine (`{x,y,w}` screen points) and
 * `tip` is the impact anchor, or `null` if nothing can be drawn this frame.
 */
function beamPlume(view3, race, b, owner, from, lock, w, h) {
  // Depth is measured exactly the way the world renderer places karts: the hero
  // kart's sprite sits at CAM_BACK, a rival's at its raw gap from the camera.
  // Working in that same space is what welds the flame to what is on screen.
  const fromZ = from.dz;

  // how far the flame has licked down the road this frame - it grows out of the
  // nose over the first frames instead of popping in at full length
  const front = b.front == null ? JET_FREE_RUN : Math.max(30, b.front);

  // where the flame lands: the struck kart's own screen box, once the plume has
  // actually reached them
  let hitAt = null;
  if (lock && lock.gap <= front + 2 && lock.gap <= JET_LOCK_MAX) {
    hitAt = placeRacer(view3, race, lock.racer, w, h);
  }
  // a kart the world draws nearer than the firer cannot anchor a forward jet
  if (hitAt && hitAt.dz <= fromZ + 24) hitAt = null;
  // ...nor can one so far up the road that the jet would stripe the frame
  if (hitAt && Math.hypot(hitAt.x - from.x, hitAt.y - from.y) > JET_MAX_SPAN) hitAt = null;
  const toZ = hitAt
    ? hitAt.dz
    : fromZ + Math.min(front, JET_FREE_RUN);
  const aimLane = hitAt ? lock.racer.lane : b.lane;
  if (toZ <= fromZ + 8) return null;

  const muzzle = { x: from.x, y: from.y - from.s * JET_NOSE_LIFT };
  const tipLift = hitAt ? hitAt.s * 0.30 : 0;

  const tipW = hitAt ? Math.max(3, hitAt.s * 0.44) : Math.max(2, from.s * 0.10);
  const noseW = from.s * JET_NOSE_W;

  // Sample the tarmac between the two karts, stepping in 1/z so the samples
  // land evenly across the screen instead of piling up in the near field.
  const raw = [];
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const dz = (fromZ * toZ) / (toZ + f * (fromZ - toZ));
    const at = placeWorld(view3, dz, b.lane + (aimLane - b.lane) * f);
    if (!at) return null;
    raw.push({ f, x: at.x, y: at.y - at.w * JET_FLOAT, rw: at.w });
  }

  // Weld the ends: the near end onto the firer's nose, the far end onto the
  // struck kart. Both corrections are tiny in-plane nudges (the road sample at
  // the target's depth and lane already IS where its kart is drawn), so the
  // plume never leaves the road plane.
  const dx0 = muzzle.x - raw[0].x;
  const dy0 = muzzle.y - raw[0].y;
  const dx1 = (hitAt ? hitAt.x : raw[N].x) - raw[N].x;
  const dy1 = (hitAt ? hitAt.y - tipLift : raw[N].y) - raw[N].y;

  let sp = raw.map((p) => {
    // gentle, monotone weld - a steep decay here is what used to kick the near
    // end of the plume up off the tarmac in a hook
    const a = Math.pow(1 - p.f, 1.5);
    const bl = Math.pow(p.f, 1.5);
    return {
      x: p.x + dx0 * a + dx1 * bl,
      y: p.y + dy0 * a + dy1 * bl,
      w: Math.max(1.5, (noseW + (tipW - noseW) * p.f) * jetShape(p.f)),
    };
  });
  // With nothing to hit the plume still has to stop somewhere sane: cut it at a
  // fixed screen length rather than let it stripe the whole frame.
  let cut = sp.length - 1;
  if (!hitAt) {
    for (let i = 1; i < sp.length; i++) {
      if (Math.hypot(sp[i].x - sp[0].x, sp[i].y - sp[0].y) > JET_MAX_SPAN) { cut = i; break; }
    }
    if (cut < 3) cut = Math.min(3, sp.length - 1);
    sp = sp.slice(0, cut + 1);
  }

  // The plume ALWAYS ends in fire - on the struck kart when there is one, and
  // otherwise as a ball of flame rolling along the tarmac. It must never just
  // thin out into empty air.
  const end = sp[sp.length - 1];
  const burn = hitAt
    ? { x: hitAt.x, y: hitAt.y - hitAt.s * 0.50, r: Math.min(hitAt.s * 0.60, 78), dz: hitAt.dz }
    : { x: end.x, y: end.y, r: clamp(raw[cut].rw * 0.048, 12, 46), dz: raw[cut].f * (toZ - fromZ) + fromZ };
  return { sp, burn, tip: hitAt, target: lock ? lock.racer : null };
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
    const plume = beamPlume(view3, race, b, owner, from, lock, w, h);
    if (!plume) continue;
    const t01 = clamp(b.life / b.ttl, 0, 1);

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
    // Cut out the firer's rider and upper chassis - everything from ~0.5 kart
    // heights up - but leave the ground-level band around the nose open. The
    // flame is therefore always seen leaving the tarmac in front of the kart and
    // can never be painted across the rider's face.
    c.moveTo(from.x + from.s * 0.46, from.y - from.s * 1.30);
    c.ellipse(from.x, from.y - from.s * 1.30, from.s * 0.46, from.s * 0.80,
      0, 0, Math.PI * 2, true);
    c.clip('evenodd');
    paint.flameJet(c, plume.sp, t01);
    c.restore();

    // ...and it ends in a fireball rolling over the kart it is burning.
    // NOTE: the depth passed here is the target's own, not target+6 - a fireball
    // that is meant to engulf a kart must not be clipped by that kart.
    if (plume.burn) {
      const bn = plume.burn;
      behindKarts(c, occ, bn.dz, () => {
        paint.flameImpact(c, bn.x, bn.y, bn.r, t01, b.life);
      });
    }
  }
}

function drawEvents(view3, race, w, h, occ) {
  for (const item of live) {
    const { ev } = item;
    const t01 = clamp(item.age / item.life, 0, 1);
    if (ev.type === 'burst' || ev.type === 'hit') {
      const target = ev.type === 'hit' ? race.racers.find((r) => r.id === ev.id) : null;
      let at = null;
      let size = 40;
      let dz = Infinity;
      if (target) {
        const p = placeRacer(view3, race, target, w, h);
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
      behindKarts(c, occ, target ? dz : dz + 6, () => {
        if (fiery) {
          // a kart taking a hit is swallowed by a fireball, the way the item
          // panel of the reference sheet shows it
          paint.fireBurst(c, at.x, at.y, size * (target ? 1.15 : 0.9), t01);
        }
        paint.burst(c, at.x, at.y, size * 0.8, def ? def.color : '#ffd63b', t01);
      });
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
    drawPickups(view3, race, w, h, t, occ);
    drawKartFx(view3, race, w, h, t, occ);
    drawOrdnance(view3, race, w, h, t, occ);
    drawEvents(view3, race, w, h, occ);
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
