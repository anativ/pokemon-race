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

// The muzzle sits on the FRONT LIP of the hero's own hood - ahead of the
// rider, never on their chest or face. Measured against the kart projector
// (src/race/kart3d.js): with `s` = half the body width, the rear contact patch
// is at 0, the hood's front lip lands near -1.10 s and the rider's head fills
// -1.20 s .. -2.05 s, biased to +0.33 s by the chase yaw. So the muzzle is
// lifted a hair past the lip and parked on the hood corner the flame is
// heading for, so the cone never has to cross the character to reach its
// victim (the sign of JET_NOSE_DX is flipped per shot, see `side` below).
const JET_NOSE_LIFT = 1.14;  // muzzle height above the ground point, in kart sizes
// Pushed well out onto the hood CORNER on the target's side. The rider sits
// slightly right of the kart's centre line, and a muzzle parked underneath them
// leaves the widest, densest part of the cone - its mouth - hidden behind the
// character; out on the corner the whole taper is on screen.
// The chase yaw (kart3d draws the hero at yaw 0.17) slides the whole kart body
// about +0.28 s right of its ground anchor, and the rider with it. The mouth is
// therefore parked just LEFT of the kart's own centre line: still squarely on
// the hood, still a kart wide, but with its densest half running up the clear
// side of the character rather than haloing their head.
const JET_NOSE_DX = 0.00;    // muzzle offset across the hood, away from the rider
// WIDEST AT THE MUZZLE, at roughly the firing kart's own width, closing to the
// VICTIM's width where it lands. That is the only taper in the effect and it is
// the perspective-correct one: a constant-width breath of fire seen from behind
// is broad on our own nose and no wider than the chassis it terminates on.
const JET_NOSE_W = 0.96;     // half width AT the muzzle, in firer-kart sizes
const JET_TIP_W = 0.86;      // half width at the impact, in VICTIM-kart sizes
const JET_FREE_RUN = 120;    // forward run (world units) when nothing is in range
const JET_MIN_GAP = 66;      // below this the rival is not drawn clear of us
const JET_LOCK_LANE = 1.30;  // lane half-window the jet can lock onto
const JET_MIN_RUN = 155;     // shortest the cone may be on screen (px)

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
 * Build the plume: a ground-level flame cone that leaves the firer's nose at
 * road height, follows the tarmac forward (so it bends with the circuit and
 * never leaves the road plane) and terminates ON the struck kart.
 *
 * Returns `{ sp, tip }` where `sp` is the spine (`{x,y,w}` screen points) and
 * `tip` is the impact anchor, or `null` if nothing can be drawn this frame.
 */
function beamPlume(view3, race, b, owner, from, lock, w, h) {
  const fromZ = from.dz;

  // ------------------------------------------------------------ end points
  //
  // BOTH ends come from what the renderer actually PUT on screen - the firer's
  // own sprite box and the victim's sprite box - never from a road sample taken
  // at the hero's own depth. At CAM_BACK the tarmac projects far below the
  // viewport, and welding a spine onto that is what used to send the plume
  // diving off the bottom of the frame behind the player.
  //
  // The victim's ROAD point is the anchor of record. Its sprite refines it when
  // the renderer is drawing it, but the renderer shoulders (and sometimes
  // drops) a rival that intersects the hero, and a kart the beam just slowed
  // slides in and out of that band - which is exactly how the plume used to
  // snap back to a free-run stub half a second after firing.
  let hitAt = null;
  if (lock) {
    const dz = Math.max(fromZ + 24, fromZ + lock.gap);
    const on = placeWorld(view3, dz, lock.racer.lane);
    const at = placeRacer(view3, race, lock.racer, w, h);
    if (at && at.dz > fromZ + 18 && at.s > 5) {
      hitAt = { x: at.x, y: at.y, s: at.s, dz: at.dz };
    } else if (on) {
      // not drawn this frame - burn the patch of road it is standing on
      hitAt = { x: on.x, y: on.y, s: Math.max(14, on.w * 0.15), dz };
    }
  }

  let end;
  let toZ;
  let endW;
  if (hitAt) {
    // dead centre of the victim's chassis: the flame goes INTO the kart
    // mid-chassis, not the roof: a flatter run keeps the cone on the road
    // plane and out of the hero rider's face on its way there.
    end = { x: hitAt.x, y: hitAt.y - hitAt.s * 0.60 };
    toZ = hitAt.dz;
    // target-SIZED: the mouth of fire closes down to roughly the struck kart's
    // own width, so the far cap WRAPS that chassis - the flame swallows it
    // instead of stopping short of it or ballooning past it.
    endW = clamp(hitAt.s * JET_TIP_W, 16, 86);
  } else {
    toZ = fromZ + JET_FREE_RUN;
    const road = placeWorld(view3, toZ, b.lane);
    if (!road) return null;
    end = { x: road.x, y: road.y - road.w * 0.05 };
    // never thins to a needle: with nothing to burn the flame still has to end
    // in a ball of fire rolling over the tarmac
    endW = clamp(road.w * 0.045, 18, 44);
  }
  // ------------------------------------------------------------ the muzzle
  //
  // Pinned to the PROJECTED NOSE of the firing kart, on its centre line. Against
  // the kart projector (src/race/kart3d.js), with `s` = half the body width the
  // rear contact patch is at 0 and the hood's front lip lands near -1.10 s, so
  // the cone's mouth is parked just past the lip and nudged a touch towards the
  // target. Everything at or below the lip is our own chassis and is clipped out
  // of the cone in `drawOrdnance`, so the flame reads as leaving the nose rather
  // than as a flare stuck on the flank or the rear deck.
  // ...and slid along the hood to the CORNER on the victim's side. The rider
  // sits on the kart's centre line (which the chase yaw parks about +0.26 s
  // right of the ground anchor) and the cone has to pass them to reach anything
  // up the road; starting from the corner keeps the character on ONE edge of
  // the cone instead of dead in its middle, where the cut-out that hides them
  // splits the flame into two slivers.
  const riderX = from.x + from.s * 0.26;
  const face = end.x >= riderX ? 1 : -1;
  const muzzle = {
    x: clamp(riderX + from.s * (JET_NOSE_DX + 0.56 * face),
      from.x - from.s * 0.58, from.x + from.s * 1.06),
    y: from.y - from.s * JET_NOSE_LIFT,
  };

  // Burning a kart makes us close on it fast, so by the end of the burn the
  // victim can be alongside rather than up the road. The cone follows it there
  // (a flame that let go of its victim is exactly what read as "unconnected"),
  // but it is never allowed to collapse into a stub on our own bumper: if the
  // run gets too short the impact is pushed back out along the same heading.
  let dx = end.x - muzzle.x;
  let dy = end.y - muzzle.y;
  let len = Math.hypot(dx, dy);
  if (len < JET_MIN_RUN) {
    if (len < 1) { dx = 0; dy = -1; len = 1; }
    const k = JET_MIN_RUN / len;
    end = { x: muzzle.x + dx * k, y: muzzle.y + dy * k };
    len = JET_MIN_RUN;
  }

  // ------------------------------------------------------------- the cone
  //
  // ONE shape, and only one: the convex hull of a circle on our nose (at kart
  // width) and a circle on the victim's projected footprint (at THEIR kart
  // width). There is no separate muzzle flare, no mid-air segment and no impact
  // sprite - each of those used to be its own drawing, and three drawings is
  // exactly how the effect fell apart into disconnected pieces.
  const noseW = clamp(from.s * JET_NOSE_W, 34, len * 0.72);
  // Floored against the mouth: the flame must still be a substantial plume
  // where it lands. A tip that pinches to a needle gets sliced in two by the
  // rider cut-out below and reads as two unrelated slivers of fire.
  const tipW = clamp(endW, Math.max(24, noseW * 0.50), noseW * 0.80);
  // The far cap is round, so its centre is pulled back inside the victim's
  // footprint: the fire closes OVER the chassis instead of shooting past it.
  const pull = tipW * 0.34;
  const ux = (end.x - muzzle.x) / len;
  const uy = (end.y - muzzle.y) / len;
  if (len > pull + 40) {
    end = { x: end.x - ux * pull, y: end.y - uy * pull };
  }
  return {
    cone: {
      x0: muzzle.x, y0: muzzle.y, r0: noseW,
      x1: end.x, y1: end.y, r1: tipW,
      clock: b.life,
    },
    dz: hitAt ? hitAt.dz : toZ,
    tip: hitAt,
    target: lock ? lock.racer : null,
  };
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
    // ...and never paint over the HUD. Inflated a little because this layer is
    // drawn inside the world's corner roll (rotate + 1.06 scale). The minimap
    // column is one of these zones, so no part of the cone can ever reach it.
    for (const z of HUD_ZONES) {
      c.rect(z.x - 24, z.y - 24, z.w + 48, z.h + 48);
    }
    c.clip('evenodd');

    // Second, INDEPENDENT clip for our own kart. Kept separate from the one
    // above because an even-odd path XORs overlapping cut-outs back open, and a
    // rival drawn close behind us overlaps the chassis box below.
    c.beginPath();
    c.rect(0, 0, STAGE_W, STAGE_H);
    // Cut the firer's RIDER out. The flame is breathed from the hood in front
    // of them, so it is physically further from the camera than the character
    // is: it has to pass BEHIND the head and shoulders, never across the face.
    // (Everything below the lip is the hood itself, which the muzzle sits on -
    // cutting the whole body out would leave nothing of the cone on screen.)
    // The chase yaw parks the rider slightly right of the kart's centre line,
    // which is also why the muzzle is nudged the other way.
    // Sized to the actual head+shoulders: the plume has to vanish cleanly
    // BEHIND the rider on its way up the road (a target dead ahead always sits
    // directly past them), which reads as depth. A cut that is too small just
    // smears fire across the character's cheek.
    const hx = from.x + from.s * 0.26;
    const hy = from.y - from.s * 1.52;
    c.moveTo(hx + from.s * 0.23, hy);
    c.ellipse(hx, hy, from.s * 0.23, from.s * 0.29, 0, 0, Math.PI * 2, true);
    // Cut our own CHASSIS out too, everything from the hood lip down. The cone's
    // mouth is anchored on the nose, which is the furthest point of our kart
    // from the camera - so the half of the mouth that would fall on the bodywork
    // behind it is hidden by the bodywork. What is left is a flame that starts
    // exactly at the hood lip, which is the whole read the reference has.
    c.rect(from.x - from.s * 0.86, from.y - from.s * 0.88, from.s * 2.26, from.s * 2.60);
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
