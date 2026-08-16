/**
 * racers-items-and-race-rules / the field + race rules
 *
 * Builds the 12-kart grid, drives it (player + 11 AI), runs the item game and
 * the lap/position rules, and registers itself as the `sim` provider so the
 * shell hands it the race.
 *
 * Determinism contract (CONTRACTS.md #3): no Math.random, no wall clock, fixed
 * timestep, stable iteration order. All randomness comes from `race.rng`.
 */
import { register } from '../core/registry.js';
import { roster, racerOr, derive, FIELD_SIZE, DEFAULT_RACER_ID } from '../data/roster.js';
import { trackOr, sampleTrack } from '../data/tracks.js';
import { makeRng, hash } from '../core/rng.js';
import { makeBrain, driveAI, drivePlayer, aiUseItem } from './ai.js';
import {
  ITEMS, getItem, buildPickups, collectPickups, updatePickups,
  updateOrdnance, fireItem, pushFx,
} from './items.js';
import { orderField, updateLaps, buildResults } from './standings.js';

// Cosmetic layer (boost flames, projectiles, beams, near-field Poke Balls).
// Loaded lazily so a missing/late world module can never take the sim down.
import('./effects/index.js').catch((err) => {
  console.warn('[pkr] race effects layer unavailable:', err && err.message);
});

export { ITEMS, getItem };

const COUNTDOWN_S = 2.4;

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

/**
 * Pick the 12 starters: the player plus 11 rivals drawn from the roster in a
 * seeded shuffle, then laid out two-per-row on the grid with the player around
 * mid-pack so the chase cam always has company.
 */
export function buildField(race, opts) {
  const { rng, playerId } = race;
  const rivals = roster.filter((r) => r.id !== playerId).map((r) => r.id);
  rng.shuffle(rivals);
  const field = [playerId, ...rivals.slice(0, FIELD_SIZE - 1)];

  const grid = [...field];
  rng.shuffle(grid);
  const at = grid.indexOf(playerId);
  const seat = Math.min(5, grid.length - 1);
  if (at !== seat) { grid.splice(at, 1); grid.splice(seat, 0, playerId); }

  return grid.map((id, i) => makeRacer(race, id, i, opts));
}

/** One racer entry: cosmetics + physics + a driving brain. */
export function makeRacer(race, id, gridIndex, opts = {}) {
  const def = racerOr(id);
  const phys = derive(def);
  // Compress the roster spread. The raw stats span 202..280 top speed, which
  // pulls the field into a string of lone karts within a lap; a kart racer
  // wants a pack, so the stat differences stay ordered but tighter.
  phys.topSpeed = 206 + (phys.topSpeed - 202) * 0.55;
  phys.accel = 70 + (phys.accel - 82) * 0.5;
  // Four across, three rows deep: the field fans out over the width of the
  // road instead of forming one file behind the hero, which is what puts
  // rival karts on both shoulders of the chase cam from the first corner.
  const COLS = [-0.66, -0.24, 0.24, 0.66];
  const row = Math.floor(gridIndex / 4);
  const side = COLS[gridIndex % 4];
  return {
    id,
    name: def.name,
    color: def.color,
    accent: def.accent,
    kart: def.kart,
    shape: def.shape,
    type: def.type,
    signature: def.item,
    phys,
    grid: gridIndex,
    dist: -row * 96 - 24,
    speed: 0,
    lane: side,
    laneTarget: side,
    lap: 1,
    pos: gridIndex + 1,
    coins: 0,
    item: null,
    itemHeld: 0,
    boost: 0,
    boostT: 0,
    drift: 0,
    driftT: 0,
    spun: 0,
    spinDir: 1,
    hitFlash: 0,
    hitBy: null,
    pickupGlow: 0,
    stuckT: 0,
    finished: false,
    finishTime: 0,
    finishPos: 0,
    isPlayer: id === race.playerId,
    phase: (hash(id) % 1000) / 1000,
    brain: makeBrain(race.rng, def, phys),
  };
}

/** Build a fresh race. Pure function of `opts`. */
export function initRace(opts = {}) {
  const track = trackOr(opts.trackId);
  const playerId = racerOr(opts.playerId || DEFAULT_RACER_ID).id;
  const seed = opts.seed ?? 1;
  const laps = Math.max(1, opts.laps || track.laps);

  const race = {
    trackId: track.id,
    track,
    lapLen: track.length,
    laps,
    playerId,
    racers: [],
    order: [],
    leader: null,
    phase: 'countdown',
    countdown: COUNTDOWN_S,
    elapsed: 0,
    steps: 0,
    finishedCount: 0,
    endTimer: 0,
    rng: makeRng(seed),
    seed,
    events: [],
    fx: [],
    projectiles: [],
    beams: [],
    shock: 0,
    assist: true,
    pickups: buildPickups(track),
    camera: { dist: 0, curve: 0, lane: 0, shake: 0 },
    hud: { lap: 1, pos: 1, coins: 0, item: null, speedKph: 0, itemFlash: 0 },
  };
  race.racers = buildField(race, opts);
  // Non-authoritative debug handle (read-only aid for critics/tests).
  if (typeof window !== 'undefined') window.__pkrRace = race;
  applyRaceOverrides(race, opts);
  orderField(race);
  syncHud(race);
  return race;
}

/** ?lap= / ?pos= / ?coins= / ?item= / ?rolling=1 poses for screenshots. */
export function applyRaceOverrides(race, opts = {}) {
  const player = race.racers.find((r) => r.isPlayer);
  if (!player) return;
  if (opts.coins != null) player.coins = clamp(Math.round(opts.coins), 0, 999);
  if (opts.item && getItem(opts.item)) { player.item = opts.item; player.itemHeld = 0; }

  const lap = opts.lap != null ? clamp(Math.round(opts.lap), 1, race.laps) : null;
  const pos = opts.pos != null ? clamp(Math.round(opts.pos), 1, race.racers.length) : null;
  if (lap == null && pos == null && !opts.rolling) return;

  race.phase = 'racing';
  race.countdown = 0;
  const baseLap = lap != null ? lap : 2;
  const base = (baseLap - 1) * race.lapLen + race.lapLen * 0.30;
  race.racers.forEach((r, i) => {
    r.dist = base - i * 74;
    r.speed = r.phys.topSpeed * 0.84;
    r.lap = Math.max(1, Math.floor(r.dist / race.lapLen) + 1);
    r.lane = clamp(r.brain.home * 0.7 + (i % 2 ? 0.3 : -0.3), -0.8, 0.8);
  });
  if (pos != null) {
    const others = race.racers.filter((r) => !r.isPlayer).sort((a, b) => b.dist - a.dist);
    const ahead = others[pos - 2];
    const behind = others[pos - 1];
    player.dist = ahead && behind ? (ahead.dist + behind.dist) / 2
      : ahead ? ahead.dist - 30 : (behind ? behind.dist + 30 : player.dist);
    player.lap = Math.max(1, Math.floor(player.dist / race.lapLen) + 1);
  }
  race.elapsed = (baseLap - 1) * 42 + 14;
}

// ---------------------------------------------------------------- the tick

/** Advance the whole race by `dt` seconds. */
export function updateRace(race, dt, controls = {}) {
  race.steps++;
  race.shock = Math.max(0, race.shock - dt * 1.6);

  if (race.phase === 'countdown') {
    race.countdown -= dt;
    race.elapsed = 0;
    for (const r of race.racers) {
      r.speed = Math.max(0, r.speed * 0.9);
      if (r.spun > 0) {                       // hit on the grid: keep spinning
        r.spun = Math.max(0, r.spun - dt * 1.35);
        r.lane = clamp(r.lane + r.spinDir * 0.35 * dt, -1.02, 1.02);
      }
      decay(r, dt);
    }
    if (race.countdown <= 0) {
      race.countdown = 0;
      race.phase = 'racing';
      race.events.push({ t: 0, type: 'go' });
      pushFx(race, { type: 'go' });
    }
    // An item fired on the grid still has to fly, so ordnance keeps ticking
    // through the countdown.
    updateOrdnance(race, dt);
    updatePickups(race, dt);
    updateCamera(race, dt);
    syncHud(race);
    return race;
  }

  if (race.phase === 'finished') race.endTimer += dt;
  race.elapsed += dt;

  // Field centre of gravity - what the rubber band pulls toward, so the pack
  // stays photogenic instead of stringing out into twelve lonely karts.
  let sum = 0;
  for (const r of race.racers) sum += r.dist;
  race.meanDist = sum / race.racers.length;

  for (const r of race.racers) {
    driveOne(race, r, dt, controls);
  }

  contact(race, dt);
  updatePickups(race, dt);
  updateOrdnance(race, dt);
  orderField(race);
  updateCamera(race, dt);
  syncHud(race);

  const player = race.racers.find((r) => r.isPlayer);
  if (player && player.finished && race.phase === 'racing') {
    race.phase = 'finished';
    race.endTimer = 0;
    pushFx(race, { type: 'finish', id: player.id, isPlayer: true });
  }
  return race;
}

/** One kart: controls -> longitudinal + lateral -> progress -> pickups. */
function driveOne(race, r, dt, controls) {
  const track = race.track;

  if (r.finished) {
    r.speed = Math.max(60, r.speed * (1 - 0.5 * dt));
    r.dist += r.speed * dt;
    r.lane += (-r.lane * 0.8) * dt;
    decay(r, dt);
    return;
  }

  const road = sampleTrack(track, r.dist);
  const curve = road.curve;
  const manual = r.isPlayer && controls.manual;
  const ctrl = manual ? drivePlayer(race, r, controls, dt) : driveAI(race, r, dt);
  if (!r.isPlayer) aiUseItem(race, r, dt);

  // --- spin-out ---------------------------------------------------------
  if (r.spun > 0) {
    r.spun = Math.max(0, r.spun - dt * 1.35);
    r.speed = Math.max(r.phys.topSpeed * 0.24, r.speed * (1 - 1.6 * dt));
    r.lane = clamp(r.lane + r.spinDir * 0.55 * dt, -1.0, 1.0);
    r.drift = Math.max(0, r.drift - dt * 2);
  } else {
    // --- longitudinal ---------------------------------------------------
    const boosting = r.boostT > 0;
    // Slipstream: tucked in behind another kart is worth a few extra km/h,
    // which is what keeps a train of karts nose-to-tail down a straight.
    let draft = 0;
    for (const o of race.racers) {
      if (o === r || o.finished) continue;
      const gap = o.dist - r.dist;
      if (gap > 26 && gap < 150 && Math.abs(o.lane - r.lane) < 0.45) { draft = 0.07; break; }
    }
    const top = r.phys.topSpeed * (1 + r.boost * 0.5 + draft);
    const grip = r.phys.grip;
    const cornerLimit = top * (0.74 + grip * 0.26) / (1 + Math.abs(curve) * 0.11);
    const want = Math.min(top * Math.max(ctrl.throttle, 0), boosting ? top * 1.2 : cornerLimit);
    if (r.speed < want) {
      r.speed = Math.min(want, r.speed + r.phys.accel * (1 + r.boost * 1.4) * dt);
    } else {
      r.speed = Math.max(want, r.speed - (ctrl.throttle < 0 ? 220 : 92) * dt);
    }
    if (ctrl.throttle < 0) r.speed = Math.max(0, r.speed - 170 * dt);

    // --- lateral --------------------------------------------------------
    const push = curve * 0.05 * (r.speed / 210) / r.phys.mass;
    r.lane += (ctrl.steer * 0.95 * grip - push) * dt;
    r.lane += (-r.lane * 0.35) * dt;
    if (Math.abs(r.lane) > 1.02) {
      r.lane = clamp(r.lane, -1.06, 1.06);
      r.speed *= 1 - 1.0 * dt;                    // off-road scrub
      r.offroad = 1;
    } else r.offroad = 0;

    const hard = Math.abs(ctrl.steer) > 0.42 || ctrl.drift;
    r.drift = hard && r.speed > r.phys.topSpeed * 0.55
      ? Math.min(1, r.drift + dt * 2.2) : Math.max(0, r.drift - dt * 3);
    r.driftT = r.drift > 0.6 ? r.driftT + dt : 0;
    if (r.driftT > 1.5) {                          // mini-turbo out of a drift
      r.driftT = 0;
      r.boost = Math.max(r.boost, 0.55);
      r.boostT = Math.max(r.boostT, 0.9);
      pushFx(race, { type: 'boost', id: r.id, mini: 1, isPlayer: r.isPlayer });
    }
  }

  // boost burn-down
  if (r.boostT > 0) r.boostT = Math.max(0, r.boostT - dt);
  else r.boost = Math.max(0, r.boost - dt * 1.1);

  // Nothing is ever allowed to stall on the tarmac: below a floor speed the
  // kart keeps rolling and the brain gets a "get going" flag.
  const floor = r.phys.topSpeed * 0.16;
  if (r.speed < floor && r.spun <= 0) {
    r.stuckT += dt;
    r.speed = Math.max(r.speed, floor * 0.75);
  } else r.stuckT = 0;

  const before = r.dist;
  r.dist += r.speed * dt;
  updateLaps(race, r);
  collectPickups(race, r, before);
  decay(r, dt);
}

function decay(r, dt) {
  r.hitFlash = Math.max(0, r.hitFlash - dt * 1.6);
  r.pickupGlow = Math.max(0, r.pickupGlow - dt * 1.8);
}

/** Deterministic pairwise shoving - heavier karts win the exchange. */
function contact(race, dt) {
  const list = race.racers;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]; const b = list[j];
      if (Math.abs(a.dist - b.dist) > 24) continue;
      if (Math.abs(a.lane - b.lane) > 0.36) continue;
      const dir = a.lane <= b.lane ? -1 : 1;
      const total = a.phys.mass + b.phys.mass;
      a.lane = clamp(a.lane + dir * 1.7 * dt * (b.phys.mass / total), -1.06, 1.06);
      b.lane = clamp(b.lane - dir * 1.7 * dt * (a.phys.mass / total), -1.06, 1.06);
      const heavy = a.phys.mass >= b.phys.mass ? a : b;
      const light = heavy === a ? b : a;
      heavy.speed *= 1 - 0.10 * dt;
      light.speed *= 1 - 0.45 * dt;
    }
  }
}

function updateCamera(race, dt) {
  const p = race.racers.find((r) => r.isPlayer) || race.racers[0];
  const road = sampleTrack(race.track, p.dist);
  race.camera.dist = p.dist;
  race.camera.curve += (road.curve - race.camera.curve) * Math.min(1, dt * 4);
  race.camera.lane += (p.lane - race.camera.lane) * Math.min(1, dt * 6);
  race.camera.shake = Math.max(0, race.camera.shake - dt * 2) + (p.hitFlash > 0.8 ? 0.6 : 0);
}

function syncHud(race) {
  const p = race.racers.find((r) => r.isPlayer) || race.racers[0];
  race.hud.lap = Math.min(race.laps, p.lap);
  race.hud.pos = p.pos;
  race.hud.coins = p.coins;
  race.hud.item = p.item;
  race.hud.speedKph = Math.round(p.speed * 0.62);
  race.hud.itemFlash = Math.max(0, race.hud.itemFlash - 0.02);
}

/** Player pressed the item key. */
export function useItem(race) {
  const p = race && race.racers.find((r) => r.isPlayer);
  if (!p) return null;
  const item = fireItem(race, p);
  if (item) race.hud.itemFlash = 1;
  return item;
}

export function results(race) { return buildResults(race); }

register({
  id: 'race-sim',
  kind: 'sim',
  screens: ['race'],
  priority: 5,
  init: (opts) => initRace(opts),
  update: (race, dt, controls) => updateRace(race, dt, controls),
  useItem: (race) => useItem(race),
  results: (race) => buildResults(race),
});

export default initRace;
