/**
 * racers-items-and-race-rules / standings + race rules
 *
 * Live positions 1..N, lap counting, finish detection and the final results
 * payload. Everything here is a pure function of the race object - no clock, no
 * Math.random - so `__pkr.state()` stays byte-reproducible.
 */

/** Total distance covered since the start line (laps are baked into `dist`). */
export function progressOf(r) {
  return r.dist;
}

/**
 * Sort the field and stamp `pos` 1..N. Finished racers are locked to the order
 * they crossed the line; everyone else is ranked by raw distance. Ties are
 * broken by grid index so two racers can never share a position.
 */
export function orderField(race) {
  const sorted = [...race.racers].sort((a, b) => {
    if (a.finished && b.finished) {
      if (a.finishTime !== b.finishTime) return a.finishTime - b.finishTime;
      return a.grid - b.grid;
    }
    if (a.finished) return -1;
    if (b.finished) return 1;
    const d = b.dist - a.dist;
    if (d !== 0) return d;
    return a.grid - b.grid;
  });
  for (let i = 0; i < sorted.length; i++) sorted[i].pos = i + 1;
  race.order = sorted.map((r) => r.id);
  race.leader = sorted[0];
  return sorted;
}

/**
 * Advance lap bookkeeping for one racer after `dist` changed.
 * Returns true when the racer just crossed the finish line for the last time.
 */
export function updateLaps(race, r) {
  const lapLen = race.lapLen;
  const lapNow = Math.max(1, Math.floor(r.dist / lapLen) + 1);
  if (lapNow === r.lap) return false;
  r.lap = lapNow;
  if (r.isPlayer) race.events.push({ t: race.elapsed, type: 'lap', id: r.id, lap: lapNow });
  if (r.lap > race.laps && !r.finished) {
    r.finished = true;
    r.finishTime = race.elapsed;
    r.finishPos = ++race.finishedCount;
    r.item = null;
    race.events.push({ t: race.elapsed, type: 'finish', id: r.id, pos: r.finishPos });
    return true;
  }
  return false;
}

/** 0 (leading) .. 1 (last) - drives rubber-banding and the item roulette. */
export function positionFactor(race, r) {
  const n = race.racers.length;
  return n > 1 ? (r.pos - 1) / (n - 1) : 0;
}

/** Gap in world units to the racer directly ahead (Infinity for the leader). */
export function gapAhead(race, r) {
  let best = Infinity;
  for (const o of race.racers) {
    if (o === r || o.finished) continue;
    const d = o.dist - r.dist;
    if (d > 0 && d < best) best = d;
  }
  return best;
}

/** The racer directly ahead of `r` on the road (or null). */
export function racerAhead(race, r, maxGap = Infinity) {
  let best = null;
  let bestD = Infinity;
  for (const o of race.racers) {
    if (o === r || o.finished) continue;
    const d = o.dist - r.dist;
    if (d > 0 && d < bestD && d <= maxGap) { bestD = d; best = o; }
  }
  return best;
}

/**
 * Final standings payload for the results screen. Works mid-race too: racers
 * that have not crossed yet get an extrapolated time from their gap to the
 * leader, so the podium always shows a complete 1..N order.
 */
export function buildResults(race) {
  const sorted = orderField(race);
  const player = race.racers.find((r) => r.isPlayer) || sorted[0];
  const total = race.laps * race.lapLen;
  const winnerTime = sorted[0].finished ? sorted[0].finishTime
    : Math.max(race.elapsed, total / Math.max(60, sorted[0].speed || 200));
  let prev = 0;
  const order = sorted.map((r, i) => {
    let time;
    if (r.finished) {
      time = r.finishTime;
    } else {
      const remaining = Math.max(0, total - r.dist);
      time = Math.max(winnerTime, race.elapsed) + remaining / Math.max(70, r.speed || 180);
    }
    if (time <= prev) time = prev + 0.42;
    prev = time;
    return {
      id: r.id,
      name: r.name,
      color: r.color,
      accent: r.accent,
      kart: r.kart,
      shape: r.shape,
      isPlayer: r.isPlayer,
      pos: i + 1,
      time,
      coins: r.coins,
      laps: Math.min(race.laps, r.lap),
    };
  });
  return {
    trackId: race.trackId,
    playerId: race.playerId,
    coins: player.coins,
    rank: player.pos,
    laps: race.laps,
    order,
    stats: player.phys,
  };
}

export default orderField;
