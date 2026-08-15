/**
 * racers-items-and-race-rules / rival AI
 *
 * Twelve karts that drive the circuit on their own: they hold a racing line,
 * brake for corners, hunt the Poke Ball rows when their item slot is empty,
 * shoulder past traffic and fire their items when a target is worth it.
 *
 * Deterministic: the only randomness is `race.rng` (drawn at a fixed rate) and
 * per-racer noise derived from a stable hash - never a wall clock.
 */
import { sampleTrack } from '../data/tracks.js';
import { getItem, fireItem, aheadDist, PICKUP_LANES } from './items.js';
import { racerAhead, positionFactor } from './standings.js';

/** Per-racer driving personality, seeded once at grid time. */
export function makeBrain(rng, def, phys) {
  const stats = def.stats;
  return {
    /** overall pace multiplier */
    skill: 0.955 + rng.next() * 0.075 + stats.speed * 0.006,
    /** how hard they attack corners (higher = later lift) */
    bravery: 0.80 + rng.next() * 0.28 + stats.handling * 0.02,
    /** how far off the ideal line they wander */
    wobble: 0.10 + rng.next() * 0.22 - stats.handling * 0.012,
    /** eagerness to swerve for a Poke Ball row */
    greed: 0.45 + rng.next() * 0.55,
    /** how quickly they use a held item (seconds of holding) */
    trigger: 1.5 + rng.next() * 3.4,
    /** lane they prefer to sit in on a straight */
    home: (rng.next() - 0.5) * 1.1,
    /** stable phase so two karts never weave in lockstep */
    phase: rng.next() * 6.283,
    reaction: 0.18 + rng.next() * 0.22,
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

/** Curvature a little way down the road - what a driver actually steers for. */
function lookahead(race, r) {
  const t = race.track;
  const near = sampleTrack(t, r.dist + 90).curve;
  const mid = sampleTrack(t, r.dist + 240).curve;
  const far = sampleTrack(t, r.dist + 460).curve;
  return { near, mid, far, blend: near * 0.5 + mid * 0.34 + far * 0.16 };
}

/**
 * Where this kart wants to be across the road (-1 .. 1).
 * Racing line first, then Poke Ball rows, then traffic.
 */
export function targetLane(race, r, look) {
  const brain = r.brain;
  // Apex the inside of the bend, drift out on exit.
  let want = clamp(-look.blend * 0.26, -0.72, 0.72) + brain.home * 0.35;

  // Poke Ball hunting: aim at the nearest free ball when the slot is empty.
  if (!r.item) {
    let best = null; let bestD = Infinity;
    for (const p of race.pickups) {
      if (p.cool > 0) continue;
      const d = aheadDist(race.lapLen, r.dist, p.dist);
      const cost = d + Math.abs(p.lane - r.lane) * 90;
      if (d < 520 && cost < bestD) { bestD = cost; best = p; }
    }
    if (best) {
      const urgency = clamp(1 - bestD / 620, 0, 1) * brain.greed;
      want = want * (1 - urgency) + best.lane * urgency;
    }
  }

  // Traffic: slide around anything close ahead in the same slot.
  const front = racerAhead(race, r, 96);
  if (front && Math.abs(front.lane - r.lane) < 0.34) {
    const side = front.lane <= r.lane ? 1 : -1;
    want = clamp(want + side * 0.62, -0.95, 0.95);
  }

  // Never park in the dirt.
  return clamp(want, -0.92, 0.92);
}

/**
 * Full AI control vector for one racer.
 * @returns {{throttle:number, steer:number, drift:boolean}}
 */
export function driveAI(race, r, dt) {
  const brain = r.brain;
  const look = lookahead(race, r);
  const leader = race.leader || race.racers[0];

  // --- rubber band: the tail of the field runs a touch harder, the runaway
  // leader a touch softer, so the pack stays photogenic without cheating.
  const mean = race.meanDist != null ? race.meanDist : leader.dist;
  const behind = clamp((mean - r.dist) / 500, 0, 1);
  const ahead = clamp((r.dist - mean) / 620, 0, 1);
  const band = 1 + behind * 0.24 - ahead * 0.13 + positionFactor(race, r) * 0.05;

  // --- corner lift: heavier karts and timid brains lift earlier.
  const bend = Math.abs(look.blend);
  const lift = clamp(1 - (bend * 0.10) / brain.bravery, 0.62, 1);

  let throttle = clamp(brain.skill * band * lift, 0.5, 1.2);
  if (r.spun > 0) throttle = 0.35;

  // --- steering toward the wanted lane
  const want = targetLane(race, r, look);
  r.laneTarget = want;
  const wob = Math.sin(r.dist * 0.0016 + brain.phase) * brain.wobble * 0.35;
  let steer = clamp((want - r.lane) * 2.4 + wob, -1, 1);

  // --- unstick: a kart that has stopped making progress gets a shove and
  // aims back at the centre line. Nothing in this field is ever allowed to
  // sit still on the tarmac.
  if (r.stuckT > 0.9) {
    throttle = 1.2;
    steer = clamp(-r.lane * 2.6, -1, 1);
  }

  return { throttle, steer, drift: bend > 1.1 && r.speed > r.phys.topSpeed * 0.72 };
}

/** Should this AI pull the trigger this tick? */
export function aiUseItem(race, r, dt) {
  if (!r.item || r.finished || r.spun > 0) return;
  r.itemHeld = (r.itemHeld || 0) + dt;
  const item = getItem(r.item);
  if (!item) { r.item = null; return; }
  if (r.itemHeld < r.brain.trigger) return;

  if (item.kind === 'boost') {
    // Save the berry for a straight.
    const bend = Math.abs(sampleTrack(race.track, r.dist + 120).curve);
    if (bend < 0.9 || r.itemHeld > 5) fireItem(race, r);
    return;
  }
  if (item.kind === 'field') {
    // Thunderbolt is worth most when there is a pack in front.
    const packAhead = race.racers.filter((o) => !o.finished && o.dist > r.dist).length;
    if (packAhead >= 2 || r.itemHeld > 6) fireItem(race, r);
    return;
  }
  const target = racerAhead(race, r, item.kind === 'beam' ? (item.reach || 1400) : (item.range || 900));
  if (target || r.itemHeld > 7) fireItem(race, r);
}

/** Player control vector. Falls back to assisted driving until a pedal is used. */
export function drivePlayer(race, r, controls, dt) {
  const look = lookahead(race, r);
  const pedals = !!(controls.accel || controls.brake);
  if (pedals) race.assist = false;
  if (race.assist) {
    const auto = driveAI(race, r, dt);
    const steer = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    return steer !== 0 ? { throttle: auto.throttle, steer, drift: !!controls.drift } : auto;
  }
  const throttle = controls.accel ? 1 : (controls.brake ? -0.85 : 0.1);
  const steer = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
  return { throttle, steer, drift: !!controls.drift, look };
}

export { PICKUP_LANES };
export default driveAI;
