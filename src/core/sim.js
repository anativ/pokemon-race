/**
 * Deterministic race simulation (shell default).
 *
 * Determinism rules honoured here and required from any replacement 'sim'
 * provider: no Math.random, no Date.now, no wall-clock reads, no iteration over
 * unordered collections. All randomness comes from the seeded rng passed in.
 */
import { roster, racerOr, derive, FIELD_SIZE, DEFAULT_RACER_ID } from '../data/roster.js';
import { trackOr, sampleTrack } from '../data/tracks.js';
import { makeRng, hash } from './rng.js';

export const ITEMS = Object.freeze([
  { id: 'poke-ball', name: 'Poke Ball', kind: 'projectile', color: '#e8433c' },
  { id: 'thunderbolt', name: 'Thunderbolt', kind: 'field', color: '#ffd63b' },
  { id: 'green-shell', name: 'Leaf Shell', kind: 'projectile', color: '#5fc45a' },
  { id: 'hyper-beam', name: 'Hyper Beam', kind: 'beam', color: '#ffe98a' },
  { id: 'shadow-ball', name: 'Shadow Ball', kind: 'projectile', color: '#8e6bd6' },
  { id: 'boost-berry', name: 'Boost Berry', kind: 'boost', color: '#ff8a3c' },
]);

export function getItem(id) {
  return ITEMS.find((i) => i.id === id) || null;
}

const COUNTDOWN_S = 2.4;

/**
 * Build a fresh race. Pure function of (opts) - same inputs, same output.
 * @param {{trackId?:string, playerId?:string, seed?:number, laps?:number,
 *          startLap?:number, startPos?:number, coins?:number, item?:string}} opts
 */
export function initRace(opts = {}) {
  const track = trackOr(opts.trackId);
  const playerId = racerOr(opts.playerId || DEFAULT_RACER_ID).id;
  const seed = opts.seed ?? 1;
  const rng = makeRng(seed);
  const laps = opts.laps || track.laps;

  const rivals = roster.filter((r) => r.id !== playerId).map((r) => r.id);
  rng.shuffle(rivals);
  const field = [playerId, ...rivals.slice(0, FIELD_SIZE - 1)];

  // Grid: 2 karts per row, player mid-pack so the chase cam has company.
  const gridOrder = [...field];
  rng.shuffle(gridOrder);
  const startIdx = gridOrder.indexOf(playerId);
  if (startIdx > 0) { // keep player around 6th like the reference HUD
    const target = Math.min(5, gridOrder.length - 1);
    gridOrder.splice(startIdx, 1);
    gridOrder.splice(target, 0, playerId);
  }

  const racers = gridOrder.map((id, i) => {
    const def = racerOr(id);
    const phys = derive(def);
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? -0.5 : 0.5;
    return {
      id,
      name: def.name,
      color: def.color,
      accent: def.accent,
      kart: def.kart,
      shape: def.shape,
      phys,
      dist: -row * 78 - 24,
      speed: 0,
      lane: side,
      laneTarget: side,
      lap: 1,
      pos: i + 1,
      coins: 0,
      item: null,
      boost: 0,
      drift: 0,
      spun: 0,
      finished: false,
      finishTime: 0,
      isPlayer: id === playerId,
      /** stable per-racer noise phase */
      phase: (hash(id) % 1000) / 1000,
      aiSkill: 0.9 + rng.next() * 0.16,
      pickupIdx: 0,
    };
  });

  const race = {
    trackId: track.id,
    track,
    laps,
    playerId,
    racers,
    order: gridOrder.slice(),
    phase: 'countdown',
    countdown: COUNTDOWN_S,
    elapsed: 0,
    steps: 0,
    finishedCount: 0,
    endTimer: 0,
    rng,
    seed,
    events: [],
    camera: { dist: 0, curve: 0, lane: 0, shake: 0 },
    hud: { lap: 1, pos: 1, coins: 0, item: null, speedKph: 0, itemFlash: 0 },
  };

  applyRaceOverrides(race, opts);
  orderField(race);
  syncHud(race);
  return race;
}

/** ?lap=&pos=&coins=&item= put the race straight into a screenshot-ready pose. */
export function applyRaceOverrides(race, opts = {}) {
  const track = race.track;
  const player = race.racers.find((r) => r.isPlayer);
  if (!player) return;

  if (opts.coins != null) player.coins = clamp(Math.round(opts.coins), 0, 999);
  if (opts.item) player.item = getItem(opts.item) ? opts.item : player.item;

  const lap = opts.lap != null ? clamp(Math.round(opts.lap), 1, race.laps) : null;
  const pos = opts.pos != null ? clamp(Math.round(opts.pos), 1, race.racers.length) : null;

  if (lap != null || pos != null || opts.rolling) {
    // Skip the countdown and place the field mid-race.
    race.phase = 'racing';
    race.countdown = 0;
    const baseLap = lap != null ? lap : 2;
    const base = (baseLap - 1) * track.length + track.length * 0.34;
    race.racers.forEach((r, i) => {
      r.dist = base - i * 78;
      r.speed = r.phys.topSpeed * 0.82;
      r.lap = Math.max(1, Math.floor(r.dist / track.length) + 1);
    });
    if (pos != null) {
      // shift the player so that exactly (pos-1) racers are ahead
      const others = race.racers.filter((r) => !r.isPlayer)
        .sort((a, b) => b.dist - a.dist);
      const ahead = others[pos - 2];
      const behind = others[pos - 1];
      player.dist = ahead && behind ? (ahead.dist + behind.dist) / 2
        : ahead ? ahead.dist - 30 : (behind ? behind.dist + 30 : player.dist);
      player.lap = Math.max(1, Math.floor(player.dist / track.length) + 1);
    }
    race.elapsed = (baseLap - 1) * 42 + 14;
  }
}

/** Advance the whole race by dt seconds. */
export function updateRace(race, dt, controls = {}) {
  race.steps++;
  if (race.phase === 'countdown') {
    race.countdown -= dt;
    race.elapsed = 0;
    for (const r of race.racers) {
      // engine rev jitter, deterministic
      r.speed = Math.max(0, r.speed * 0.9);
    }
    if (race.countdown <= 0) {
      race.countdown = 0;
      race.phase = 'racing';
      race.events.push({ t: 0, type: 'go' });
    }
    updateCamera(race, dt);
    syncHud(race);
    return race;
  }

  if (race.phase === 'finished') {
    race.endTimer += dt;
    updateCamera(race, dt);
    return race;
  }

  race.elapsed += dt;
  const track = race.track;
  const leader = race.racers.reduce((a, b) => (b.dist > a.dist ? b : a), race.racers[0]);

  for (const r of race.racers) {
    if (r.finished) { r.speed *= 0.985; r.dist += r.speed * dt; continue; }

    const road = sampleTrack(track, r.dist);
    const curve = road.curve;

    // --- throttle -------------------------------------------------------
    let throttle = 1;
    let steer = 0;
    if (r.isPlayer && controls.manual) {
      throttle = controls.accel ? 1 : (controls.brake ? -0.75 : 0.08);
      steer = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    } else {
      // deterministic AI: hold the racing line, ease off in tight corners
      const rubber = 1 + clamp((leader.dist - r.dist) / 900, 0, 0.22)
        - clamp((r.dist - leader.dist) / 1200, 0, 0.1);
      throttle = clamp(r.aiSkill * rubber, 0.55, 1.18);
      const wobble = Math.sin((r.dist * 0.0032) + r.phase * 6.283) * 0.55;
      steer = clamp(-curve * 0.32 + wobble, -1, 1);
    }

    // --- longitudinal ---------------------------------------------------
    const top = r.phys.topSpeed * (1 + r.boost * 0.45);
    const cornerLimit = top * (0.72 + r.phys.grip * 0.28) / (1 + Math.abs(curve) * 0.14);
    const want = Math.min(top * Math.max(throttle, 0), cornerLimit);
    if (r.spun > 0) {
      r.spun -= dt;
      r.speed *= 0.93;
    } else if (r.speed < want) {
      r.speed = Math.min(want, r.speed + r.phys.accel * (1 + r.boost) * dt);
    } else {
      r.speed = Math.max(want, r.speed - 90 * dt);
    }
    if (throttle < 0) r.speed = Math.max(0, r.speed - 160 * dt);
    r.boost = Math.max(0, r.boost - dt * 0.8);

    // --- lateral --------------------------------------------------------
    const push = curve * 0.045 * (r.speed / 200) / r.phys.mass;
    r.lane += (steer * 0.9 * r.phys.grip - push) * dt;
    // drift back toward the centre-ish racing line
    r.lane += (-r.lane * 0.6) * dt;
    if (Math.abs(r.lane) > 1.05) {
      r.lane = clamp(r.lane, -1.05, 1.05);
      r.speed *= 1 - 0.9 * dt;         // off-road scrub
    }
    r.drift = Math.abs(steer) > 0.4 && r.speed > top * 0.6 ? Math.min(1, r.drift + dt * 2) : Math.max(0, r.drift - dt * 3);

    // --- progress -------------------------------------------------------
    const before = r.dist;
    r.dist += r.speed * dt;
    const lapNow = Math.max(1, Math.floor(r.dist / track.length) + 1);
    if (lapNow !== r.lap) {
      r.lap = lapNow;
      if (r.lap > race.laps) {
        r.finished = true;
        r.finishTime = race.elapsed;
        race.finishedCount++;
        race.events.push({ t: race.elapsed, type: 'finish', id: r.id });
      }
    }

    // --- pickups (coins + items) ----------------------------------------
    for (const rowT of track.itemRows) {
      const rowDist = rowT * track.length;
      const a = ((before % track.length) + track.length) % track.length;
      const b = ((r.dist % track.length) + track.length) % track.length;
      const crossed = a <= rowDist ? (b >= rowDist && b - a < track.length / 2) : (b >= rowDist && b < a);
      if (crossed) {
        r.coins += 1 + (race.rng.next() < 0.35 ? 1 : 0);
        if (!r.item) {
          const pool = ITEMS;
          r.item = pool[race.rng.int(0, pool.length - 1)].id;
        }
        r.boost = Math.min(1, r.boost + 0.12);
      }
    }
  }

  // --- kart contact (deterministic pairwise pass) -------------------------
  for (let i = 0; i < race.racers.length; i++) {
    for (let j = i + 1; j < race.racers.length; j++) {
      const a = race.racers[i]; const b = race.racers[j];
      if (Math.abs(a.dist - b.dist) > 22) continue;
      if (Math.abs(a.lane - b.lane) > 0.34) continue;
      const dir = a.lane <= b.lane ? -1 : 1;
      const total = a.phys.mass + b.phys.mass;
      a.lane += dir * 0.5 * dt * (b.phys.mass / total) * 3;
      b.lane -= dir * 0.5 * dt * (a.phys.mass / total) * 3;
      a.speed *= 1 - 0.25 * dt;
      b.speed *= 1 - 0.25 * dt;
    }
  }

  orderField(race);
  updateCamera(race, dt);
  syncHud(race);

  const player = race.racers.find((r) => r.isPlayer);
  if (player && player.finished && race.phase === 'racing') {
    race.phase = 'finished';
    race.endTimer = 0;
  }
  return race;
}

/** Player uses an item (deterministic effect on the field). */
export function useItem(race) {
  const player = race.racers.find((r) => r.isPlayer);
  if (!player || !player.item) return null;
  const item = getItem(player.item);
  player.item = null;
  race.hud.itemFlash = 1;
  race.events.push({ t: race.elapsed, type: 'item', id: item.id });
  if (item.kind === 'boost') {
    player.boost = 1;
  } else if (item.kind === 'field') {
    for (const r of race.racers) if (!r.isPlayer) { r.spun = 0.9; }
  } else {
    // hit the racer directly ahead
    const ahead = race.racers.filter((r) => r.dist > player.dist)
      .sort((a, b) => a.dist - b.dist)[0];
    if (ahead) ahead.spun = 1.1;
  }
  return item;
}

export function orderField(race) {
  const sorted = [...race.racers].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.dist - a.dist;
  });
  sorted.forEach((r, i) => { r.pos = i + 1; });
  race.order = sorted.map((r) => r.id);
  return sorted;
}

function updateCamera(race, dt) {
  const p = race.racers.find((r) => r.isPlayer) || race.racers[0];
  const road = sampleTrack(race.track, p.dist);
  race.camera.dist = p.dist;
  race.camera.curve += (road.curve - race.camera.curve) * Math.min(1, dt * 4);
  race.camera.lane += (p.lane - race.camera.lane) * Math.min(1, dt * 6);
  race.camera.shake = Math.max(0, race.camera.shake - dt * 2);
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

/** Final standings for the results screen (works mid-race too). */
export function buildResults(race) {
  const sorted = orderField(race);
  const player = race.racers.find((r) => r.isPlayer) || sorted[0];
  // plausible race times even when the standings were only simulated
  const base = race.elapsed > 40 ? race.elapsed : race.laps * 46 + 12 + race.elapsed;
  return {
    trackId: race.trackId,
    playerId: race.playerId,
    coins: player.coins,
    rank: player.pos,
    laps: race.laps,
    order: sorted.map((r, i) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      accent: r.accent,
      shape: r.shape,
      isPlayer: r.isPlayer,
      time: r.finished ? r.finishTime : base + (i + 1) * 1.85,
      coins: r.coins,
    })),
    stats: player.phys,
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
