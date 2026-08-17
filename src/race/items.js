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
  // ONE victim, always: the flame terminates on the kart it burns, so the sim
  // must never damage a second rival the plume is not drawn on.
  // `reach` is mid-range, not short: the victim has to be far enough up the road
  // to be DRAWN clear of the firer's own rider (a kart a kart-length ahead
  // projects straight behind the hero's head, where a cone would be sliced in two
  // by the rider cut-out) and near enough to still be a chassis rather than a
  // speck for the flame to close over. See BEAM_MIN_GAP / BEAM_SWEET.
  // `knock` is deliberately tiny: it nudges the burning kart a little further off
  // our own line so it stays drawn clear of our rider for the whole burn, and is
  // turned back inwards near the barrier, where the renderer stops drawing it at
  // all (a flame landing on a kart nobody can see reads as a flame hitting road).
  { id: 'hyper-beam', name: 'Hyper Beam', kind: 'beam', color: '#ffe98a',
    reach: 330, sweep: 3400, spin: 1.35, maxHits: 1, knock: 0.28, weight: 'rare' },
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
    const nominal = item.reach || 360;
    const victim = pickBeamTarget(race, r, nominal);
    // The flame ALWAYS ends on a kart: if the only rival in front sits past the
    // nominal reach, the beam stretches to exactly that kart rather than
    // stopping short on bare tarmac. `reach` is therefore per-shot, not a
    // constant, and the hit test below uses it.
    const gap0 = victim ? forwardGap(race, r.dist, victim.dist) : 0;
    const reach = victim ? Math.max(nominal, gap0 + 12) : nominal;
    race.beams.push({
      owner: r.id, item: item.id, lane: r.lane, dist: r.dist,
      reach, sweep: item.sweep || 2600,
      // `front` is how far down the road the flame has actually licked; it
      // grows out of the nose over the first frames, and the rival is struck
      // on the step the plume actually reaches them.
      // starts already licking out of the nose so the very first fire frame
      // reads as a cone, not a spark, and burns long enough to still read at
      // 400 ms (the frame the reference item panel is judged on).
      // already licking all the way to the victim on the very first frame, so
      // the fire-frame reads as a cone landing ON a kart instead of a stub.
      front: victim ? Math.max(150, gap0) : 150,
      life: 0,
      // A shot with nobody in front is SPENT, and it says so: it burns for half
      // as long and the effects layer draws it as a short muzzle burst off the
      // nose instead of a plume down the road. Kept dry for its whole life (see
      // `dry` below) so it can never mutate into a full cone half a beat after
      // the player watched it fizzle - and still alight 400 ms in, which is the
      // frame the fizzle is judged on.
      // The live burn is long enough to read as a sustained blast, and short
      // enough that it ENDS before the kart whose speed it just halved has slid
      // back alongside us: a plume whose victim is level with the hero has
      // nothing up the road to terminate on, and stretching it sideways is
      // exactly what read as a frame-crossing lance.
      ttl: victim ? 0.92 : 0.58,
      dry: !victim,
      hits: [],
      maxHits: item.maxHits || 1,
      // locked at fire time: the flame is drawn ending on THIS kart and no
      // other kart is ever damaged by it.
      target: victim ? victim.id : null,
      gap: gap0,
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

/**
 * Closest gap this racer may be from the muzzle and still be drawn clear.
 * Anything nearer than this is swallowed by the hero's own silhouette on
 * screen (the renderer shoulders or drops rivals that intersect it), so the
 * flame could never be seen ENDING on it.
 *
 * Burning a kart halves its speed, so we close on the victim for the rest of the
 * burn: locking onto someone barely a kart length ahead means that by the 400 ms
 * frame they are alongside us and the cone has nothing up the road to end on.
 * Not TOO generous either - out past the sweet band the victim is a speck, and a
 * cone drawn all the way to it is the frame-crossing lance we do not want.
 */
const BEAM_MIN_GAP = 150;
/**
 * Ideal gap for the shot, in world units: far enough that the victim is drawn
 * clear of the hero's own kart, near enough that it is still a chassis rather
 * than a speck for the far cap to close over. Scoring below pulls the lock
 * towards this band instead of simply towards the nearest kart.
 */
const BEAM_SWEET = 215;
/**
 * Lane offset (in lanes) that fully earns the "drawn clear" bonus below. On a
 * chase camera the hero's rider stands in the middle of the road ahead: a victim
 * in OUR lane projects directly behind their head, where no cone can be drawn
 * without being sliced in two by the character. Half a lane over is already ~180
 * screen pixels to the side of them, which is exactly where the plume reads.
 */
const BEAM_OFFSET = 0.5;
/**
 * Lane half-window the flame can be aimed across. Wide enough that a rival a
 * whole lane over is still fair game (refusing those left the beam burning bare
 * tarmac on tracks where nobody sat in our own lane), but not the full width of
 * the road: a victim right out at the barrier is drawn under the minimap column,
 * where the effects layer has to clip the flame and it cannot be seen landing.
 */
const BEAM_LANE = 1.05;
/**
 * How far past the nominal reach the flame will stretch to find a kart. Kept
 * tight on purpose: past this the rival is a speck near the horizon (or a lap
 * behind us, which `forwardGap` wraps into a huge "gap ahead"), and a cone drawn
 * all the way out to them is the full-length plume into empty road that a dry
 * shot must NOT look like. Out here the shot simply has no victim, and the
 * effects layer draws it as the short muzzle burst it is.
 */
const BEAM_FAR = 1.4;

/** Forward (wrapping) gap from `a` to `b` along the lap, signed to +-half lap. */
export function forwardGap(race, aDist, bDist) {
  const half = race.lapLen / 2;
  let gap = bDist - aDist;
  while (gap < -half) gap += race.lapLen;
  while (gap > half) gap -= race.lapLen;
  return gap;
}

/**
 * The single rival a Hyper Beam burns: the nearest kart ahead of `from`, inside
 * the beam's reach and roughly in its lane. Locked once at fire time and kept
 * for the beam's whole life, so the kart the flame is DRAWN on is exactly the
 * kart that takes the damage. Pure + stable order -> determinism holds.
 */
export function pickBeamTarget(race, from, reach) {
  if (!from) return null;
  let best = null;
  let bestScore = Infinity;
  let far = null;
  let farGap = Infinity;
  for (const o of race.racers) {
    if (o === from || o.id === from.id || o.finished) continue;
    const gap = forwardGap(race, from.dist, o.dist);
    if (gap < BEAM_MIN_GAP) continue;
    // Signed, because the two sides are NOT equivalent on screen: the whole
    // right-hand column of the frame belongs to the HUD (minimap, standings,
    // position badge), and the flame is clipped out of it - so a victim that
    // drifts over there gets a plume that stops dead in mid-air short of the
    // chassis. A rival on the camera-LEFT half is always in clear air, which is
    // where the cone can actually be drawn landing on it.
    const side = o.lane - from.lane;
    const off = Math.abs(side);
    if (gap <= reach && off <= BEAM_LANE) {
      // Lane offset DOMINATES the gap, and it is a bonus rather than a penalty:
      // the one thing that decides whether the flame can be drawn is whether the
      // victim sits beside the firer's rider instead of directly behind their
      // head. The gap term only breaks ties, pulling the lock towards the sweet
      // band - near enough to be a chassis, far enough to be clear of our nose.
      // A HUGE offset is no better than a healthy one, and is often worse: the
      // victim ends up out at the frame edge under the minimap column, where the
      // flame is clipped and cannot be seen landing on it.
      const score = Math.abs(gap - BEAM_SWEET) / Math.max(1, reach) * 0.6
        - Math.max(0, Math.min(-side, BEAM_OFFSET)) / BEAM_OFFSET
        - Math.min(off, BEAM_OFFSET) / BEAM_OFFSET * 0.25
        + Math.max(0, off - BEAM_OFFSET * 1.5) * 1.2;
      if (score < bestScore) { bestScore = score; best = o; }
    } else if (gap <= reach * BEAM_FAR && gap < farGap) {
      // nothing in the nominal window: stretch to the nearest kart in front so
      // the plume still terminates on a chassis rather than fizzling.
      farGap = gap; far = o;
    }
  }
  return best || far;
}

/** Knock a racer about. Weight softens the hit; a spin always costs speed. */
export function applyHit(race, target, item, from, opts = {}) {
  if (!target || target.finished) return;
  const soften = 1 / (0.75 + target.phys.mass * 0.35);
  target.spun = Math.max(target.spun, (item.spin || 1) * soften);
  // `opts.dir` lets a beam spin its victim TOWARDS the road centre. The default
  // (outward) shove walks a kart that is already near the edge into the
  // barrier, where the renderer stops drawing it - and a flame drawn onto a
  // kart nobody can see reads as a flame that hit nothing.
  target.spinDir = opts.dir || (target.lane >= 0 ? 1 : -1);
  // Immediate knock, so the hit shows up in state() on the very same step even
  // if the field is stationary (e.g. an item fired on the grid).
  const shove = opts.shove == null ? 0.14 : opts.shove;
  target.lane = Math.max(-1.02, Math.min(1.02, target.lane + target.spinDir * shove));
  // `opts.slow` softens the speed loss. A Hyper Beam uses it: the victim being
  // dragged backwards into the firer's own bumper is what ends a burn with the
  // plume drawn onto a kart that is no longer up the road at all.
  target.speed *= opts.slow == null ? 0.55 : opts.slow;
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

/** Seconds a beam's sideways `knock` is spread over. */
const KNOCK_T = 0.18;

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
    b.front = Math.min(b.reach, b.front + (b.sweep || 2600) * dt);
    const item = getItem(b.item) || { spin: 1.5 };
    // The victim is locked: acquired at fire time, re-acquired only while the
    // beam still has nobody. Whatever the flame is drawn on is what burns.
    let victim = b.target ? race.racers.find((r) => r.id === b.target) : null;
    if (victim && victim.finished) victim = null;
    if (!victim && !b.dry && owner && b.hits.length < (b.maxHits || 1)) {
      victim = pickBeamTarget(race, owner, b.reach);
      b.target = victim ? victim.id : null;
    }
    if (victim) {
      let gap = victim.dist - b.dist;
      while (gap < -lapLen / 2) gap += lapLen;
      while (gap > lapLen / 2) gap -= lapLen;
      b.gap = gap;
      if (!b.hits.includes(victim.id) && gap <= b.front + 6 && gap <= b.reach) {
        b.hits.push(victim.id);
        // Slew the burning kart a little further OFF the firer's own line, so it
        // stays drawn clear of the firer's rider (in a chase view a victim slewed
        // back into our lane ends up directly behind the hero's head, where the
        // flame cannot be drawn landing on it) - unless it is already near the
        // barrier, where the renderer would stop drawing it altogether.
        const away = Math.sign(victim.lane - (owner ? owner.lane : 0)) || 1;
        b.knockDir = Math.abs(victim.lane) > 0.60 ? -Math.sign(victim.lane) : away;
        applyHit(race, victim, item, owner, { dir: b.knockDir, shove: 0.10, slow: 0.78 });
      }
      // The burnt kart slews OFF the racing line while it burns - spread over
      // KNOCK_T rather than teleported, so the frame the flame lands on still
      // shows it dead ahead. It also keeps it on camera: the renderer culls a
      // rival that ends up inside the hero's own silhouette, and a victim that
      // vanished two frames after the hit is what made the flame look like it
      // terminated on nobody.
      // BUDGETED: the slew is spent over KNOCK_T and then stops. Left running
      // for the whole burn it walks the victim right across the road and
      // out of frame, which is the bug that made the flame look unattached.
      if (b.hits.includes(victim.id) && item.knock && (b.knocked || 0) < item.knock) {
        const step = Math.min((item.knock * dt) / KNOCK_T, item.knock - (b.knocked || 0));
        b.knocked = (b.knocked || 0) + step;
        victim.lane = Math.max(-1.02, Math.min(1.02,
          victim.lane + (b.knockDir || 1) * step));
      }
    } else {
      b.gap = 0;
    }
    if (b.life > b.ttl) race.beams.splice(i, 1);
  }
}

export default ITEMS;

