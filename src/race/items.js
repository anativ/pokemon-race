/**
 * racers-items-and-race-rules / items
 *
 * Poke Ball pickups floating over the track, the position-weighted item
 * roulette, and every item's effect on the field (projectiles, beams, field
 * blasts, boosts). Everything is a pure function of (race, dt) plus the seeded
 * `race.rng`, so `__pkr.state()` stays byte-reproducible.
 *
 * Pickup lanes match the four columns the world renderer floats its Poke Balls
 * in (src/race/scenery.js -> drawItemBoxes), so driving through a ball on
 * screen is what actually collects it.
 */

/** Item ids MUST stay in sync with the HUD glyph table + ?item= values. */
export const ITEMS = Object.freeze([
  { id: 'poke-ball', name: 'Poke Ball', kind: 'projectile', color: '#e8433c',
    speed: 250, range: 900, spin: 0.85, weight: 'common' },
  { id: 'green-shell', name: 'Leaf Shell', kind: 'projectile', color: '#5fc45a',
    speed: 300, range: 1100, spin: 0.95, weight: 'common' },
  { id: 'shadow-ball', name: 'Shadow Ball', kind: 'projectile', color: '#8e6bd6',
    speed: 340, range: 1400, spin: 1.1, homing: true, weight: 'mid' },
  { id: 'boost-berry', name: 'Boost Berry', kind: 'boost', color: '#ff8a3c',
    boost: 1, weight: 'mid' },
  { id: 'thunderbolt', name: 'Thunderbolt', kind: 'field', color: '#ffd63b',
    spin: 0.7, weight: 'rare' },
  // reach is deliberately short: the flame has to END on a kart the player can
  // actually see burn, not mow down rivals somewhere off past the horizon.
  { id: 'hyper-beam', name: 'Hyper Beam', kind: 'beam', color: '#ffe98a',
    reach: 330, sweep: 2400, spin: 1.1, maxHits: 3, weight: 'rare' },
]);

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function getItem(id) { return BY_ID.get(id) || null; }

/** Lanes the pickups float in - same columns the world renderer draws. */
export const PICKUP_LANES = Object.freeze([-0.62, -0.21, 0.21, 0.62]);
/** Seconds a collected ball stays visually gone before it pops back in. */
export const PICKUP_RESPAWN = 1.25;
/** Lane half-width that counts as "drove through the ball". */
const PICKUP_LANE_R = 0.30;

/** Longest gap (in lap fraction) allowed between two rows of Poke Balls. */
const ROW_GAP = 0.12;

/**
 * Row positions for a track: the declared `itemRows` plus evenly spaced extra
 * rows filling any gap longer than ROW_GAP. The track data only names three or
 * four rows a lap, which leaves the road empty for most of a lap; the reference
 * shot has Poke Balls in view essentially all the time, so we subdivide.
 * Deterministic (pure function of the track), and the declared rows are always
 * kept exactly where the world renderer floats its own balls.
 */
export function pickupRows(track) {
  const src = track.itemRows.slice().sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < src.length; i++) {
    const a = src[i];
    const b = i + 1 < src.length ? src[i + 1] : src[0] + 1;
    out.push(a % 1);
    const n = Math.max(1, Math.round((b - a) / ROW_GAP));
    for (let k = 1; k < n; k++) out.push((a + ((b - a) * k) / n) % 1);
  }
  return out.sort((x, y) => x - y);
}

/**
 * One entity per (row, lane). `dist` is the lap-relative distance of the row,
 * `cool` counts down while the ball is missing.
 */
export function buildPickups(track) {
  const out = [];
  pickupRows(track).forEach((t, row) => {
    PICKUP_LANES.forEach((lane, col) => {
      out.push({
        key: `${row}:${col}`, row, col, lane,
        dist: t * track.length, cool: 0, taken: 0,
      });
    });
  });
  return out;
}

/** Distance (forward, wrapping) from `from` to the pickup row. */
export function aheadDist(lapLen, from, rowDist) {
  const a = ((from % lapLen) + lapLen) % lapLen;
  let d = rowDist - a;
  while (d < 0) d += lapLen;
  return d;
}

/** Did `r` cross `rowDist` between `before` and `after`? */
function crossedRow(lapLen, before, after, rowDist) {
  if (after <= before) return false;
  const a = ((before % lapLen) + lapLen) % lapLen;
  const travelled = after - before;
  let d = rowDist - a;
  while (d < 0) d += lapLen;
  return d <= travelled;
}

/**
 * Position-weighted roulette, Mario-Kart style: the leader draws banana-tier
 * items, the tail of the field draws the race-changing ones.
 * @param {any} race
 * @param {any} r
 */
export function rollItem(race, r) {
  const n = race.racers.length;
  const f = n > 1 ? (r.pos - 1) / (n - 1) : 0;   // 0 leader .. 1 last
  const table = [];
  const push = (id, w) => { if (w > 0) table.push([id, w]); };
  push('poke-ball', 38 - f * 16);
  push('green-shell', 30 - f * 10);
  push('boost-berry', 14 + f * 30);
  push('shadow-ball', 5 + f * 13);
  push('thunderbolt', 1 + f * 7);
  push('hyper-beam', 0.5 + f * 7);
  let total = 0;
  for (const [, w] of table) total += w;
  let roll = race.rng.next() * total;
  for (const [id, w] of table) {
    roll -= w;
    if (roll <= 0) return id;
  }
  return table[0][0];
}

/**
 * Pickup pass for one racer. Called after `dist` advanced from `before`.
 * Grants coins + an item and flags the ball as collected so the world stops
 * floating it for a beat.
 */
export function collectPickups(race, r, before) {
  const lapLen = race.lapLen;
  for (const p of race.pickups) {
    // The ball only *looks* gone while it respawns - a whole pack sweeping the
    // same row all get their item, the way a kart racer expects.
    if (Math.abs(r.lane - p.lane) > PICKUP_LANE_R) continue;
    if (!crossedRow(lapLen, before, r.dist, p.dist)) continue;
    p.cool = PICKUP_RESPAWN;
    p.taken++;
    const bonus = race.rng.next() < 0.34 ? 2 : 1;
    r.coins = Math.min(999, r.coins + bonus);
    if (!r.item) {
      r.item = rollItem(race, r);
      r.itemHeld = 0;
    }
    r.pickupGlow = 0.9;
    pushFx(race, {
      type: 'pickup', id: r.id, lane: p.lane, dist: r.dist,
      coins: bonus, isPlayer: r.isPlayer,
    });
  }
}

/** Tick pickup respawn timers. */
export function updatePickups(race, dt) {
  for (const p of race.pickups) if (p.cool > 0) p.cool = Math.max(0, p.cool - dt);
}

/** Effects feed for the cosmetic layer. Bounded so it can never grow forever. */
export function pushFx(race, ev) {
  ev.t = race.elapsed;
  race.fx.push(ev);
  if (race.fx.length > 48) race.fx.splice(0, race.fx.length - 48);
  return ev;
}

// ---------------------------------------------------------------- firing

/**
 * Spend `r`'s held item. Returns the item definition (or null).
 * Projectiles are entities on `race.projectiles`; beams live on `race.beams`;
 * boosts and field blasts apply immediately.
 */
export function fireItem(race, r) {
  if (!r || !r.item || r.finished) return null;
  const item = getItem(r.item);
  if (!item) { r.item = null; return null; }
  r.item = null;
  r.itemHeld = 0;
  race.events.push({ t: race.elapsed, type: 'item', id: item.id, by: r.id });
  pushFx(race, { type: 'use', id: r.id, item: item.id, isPlayer: r.isPlayer });

  if (item.kind === 'boost') {
    r.boost = Math.max(r.boost, item.boost || 1);
    r.boostT = 2.1;
    pushFx(race, { type: 'boost', id: r.id, isPlayer: r.isPlayer });
    return item;
  }

  if (item.kind === 'field') {
    // Thunderbolt: everyone else shrinks + spins for a moment.
    let hits = 0;
    for (const o of race.racers) {
      if (o === r || o.finished) continue;
      applyHit(race, o, item, r);
      hits++;
    }
    race.shock = 0.9;
    pushFx(race, { type: 'field', id: r.id, item: item.id, hits, isPlayer: r.isPlayer });
    return item;
  }

  if (item.kind === 'beam') {
    // Hyper Beam: a sustained lance down the road that mows down anything in
    // front of the firer for as long as it burns.
    race.beams.push({
      owner: r.id, item: item.id, lane: r.lane, dist: r.dist,
      reach: item.reach || 330, sweep: item.sweep || 900,
      // `front` is how far down the road the flame has actually licked; it
      // grows over the first frames so a rival is struck when the plume gets
      // to them, and the burst lands where the flame tip is on screen.
      front: 0, life: 0, ttl: 1.15, hits: [], target: null,
      isPlayer: r.isPlayer, color: item.color,
    });
    race.shock = Math.max(race.shock, 0.55);
    return item;
  }

  // Projectile: launched from the nose of the kart, aimed straight ahead.
  race.projectiles.push({
    owner: r.id, item: item.id, kind: item.kind, color: item.color,
    dist: r.dist + 42, lane: r.lane, speed: (r.speed || 0) + (item.speed || 260),
    life: 0, ttl: (item.range || 900) / (item.speed || 260) + 0.6,
    homing: !!item.homing, isPlayer: r.isPlayer,
  });
  return item;
}

/** Knock a racer about. Weight softens the hit; a spin always costs speed. */
export function applyHit(race, target, item, from) {
  if (!target || target.finished) return;
  const soften = 1 / (0.75 + target.phys.mass * 0.35);
  target.spun = Math.max(target.spun, (item.spin || 1) * soften);
  target.spinDir = target.lane >= 0 ? 1 : -1;
  // Immediate knock, so the hit shows up in state() on the very same step even
  // if the field is stationary (e.g. an item fired on the grid).
  target.lane = Math.max(-1.02, Math.min(1.02, target.lane + target.spinDir * 0.14));
  target.speed *= 0.55;
  target.boost = 0;
  target.boostT = 0;
  target.hitFlash = 1;
  target.hitBy = item.id;
  race.events.push({ t: race.elapsed, type: 'hit', id: target.id, item: item.id });
  pushFx(race, {
    type: 'hit', id: target.id, item: item.id, dist: target.dist,
    lane: target.lane, by: from ? from.id : null, isPlayer: target.isPlayer,
  });
}

// ---------------------------------------------------------------- flight

/** Advance projectiles + beams and resolve their hits. */
export function updateOrdnance(race, dt) {
  const lapLen = race.lapLen;

  for (let i = race.projectiles.length - 1; i >= 0; i--) {
    const p = race.projectiles[i];
    p.life += dt;
    p.dist += p.speed * dt;
    const item = getItem(p.item);

    // Shadow Ball tracks the nearest kart ahead of it.
    if (p.homing) {
      let best = null; let bestD = Infinity;
      for (const o of race.racers) {
        if (o.id === p.owner || o.finished) continue;
        const d = o.dist - p.dist;
        if (d > -8 && d < bestD && d < 700) { bestD = d; best = o; }
      }
      if (best) p.lane += Math.max(-1.6 * dt, Math.min(1.6 * dt, best.lane - p.lane));
    }

    let hit = null;
    for (const o of race.racers) {
      if (o.id === p.owner || o.finished || o.spun > 0.6) continue;
      const gap = o.dist - p.dist;
      if (gap > 4 || gap < -34) continue;
      if (Math.abs(o.lane - p.lane) > 0.42) continue;
      hit = o;
      break;
    }
    if (hit) {
      applyHit(race, hit, item || { spin: 1.1 }, null);
      pushFx(race, { type: 'burst', item: p.item, dist: p.dist, lane: p.lane });
      race.projectiles.splice(i, 1);
      continue;
    }
    if (p.life > p.ttl) {
      pushFx(race, { type: 'burst', item: p.item, dist: p.dist, lane: p.lane, fizzle: 1 });
      race.projectiles.splice(i, 1);
    }
  }

  for (let i = race.beams.length - 1; i >= 0; i--) {
    const b = race.beams[i];
    b.life += dt;
    const owner = race.racers.find((r) => r.id === b.owner);
    if (owner) { b.dist = owner.dist; b.lane += (owner.lane - b.lane) * Math.min(1, dt * 6); }
    b.front = Math.min(b.reach, b.front + (b.sweep || 900) * dt);
    const item = getItem(b.item) || { spin: 1.5 };
    const cap = (getItem(b.item) || {}).maxHits || 3;
    // the nearest rival still in the cone is the one the flame is burning; the
    // effects layer pins the plume's fireball onto them.
    let lockGap = Infinity;
    b.target = null;
    for (const o of race.racers) {
      if (o.id === b.owner || o.finished) continue;
      let gap = o.dist - b.dist;
      while (gap < -lapLen / 2) gap += lapLen;
      if (gap < 12 || gap > b.reach) continue;
      if (Math.abs(o.lane - b.lane) > 1.15) continue;
      if (gap < lockGap) { lockGap = gap; b.target = o.id; }
      if (b.hits.length >= cap || b.hits.includes(o.id)) continue;
      if (gap > b.front || Math.abs(o.lane - b.lane) > 0.85) continue;
      b.hits.push(o.id);
      applyHit(race, o, item, owner);
    }
    if (b.life > b.ttl) race.beams.splice(i, 1);
  }
}

export default ITEMS;

