/**
 * Central game state + tiny pub/sub store. All screens read from here; the
 * debug surface (window.__pkr.state()) serialises a deterministic snapshot.
 */
import { DEFAULT_RACER_ID, FIELD_SIZE } from '../data/roster.js';
import { DEFAULT_TRACK_ID } from '../data/tracks.js';
import { q } from './rng.js';

export const SCREENS = Object.freeze([
  'title', 'character-select', 'track-select', 'race', 'results',
]);

export function createState() {
  return {
    screen: 'title',
    seed: 1,
    /** sim milliseconds since the current screen was entered */
    t: 0,
    frame: 0,
    /** menu / selection state shared by character + track select */
    select: {
      racerId: DEFAULT_RACER_ID,
      trackId: DEFAULT_TRACK_ID,
      racerCursor: 0,
      trackCursor: 0,
      confirmedRacer: false,
      confirmedTrack: false,
    },
    /** race state, rebuilt on every race entry (see sim.js) */
    race: null,
    /** results state, built when a race finishes or when ?screen=results */
    results: null,
    fieldSize: FIELD_SIZE,
  };
}

const listeners = new Set();

export const state = createState();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitChange(reason = 'change') {
  for (const fn of [...listeners]) {
    try { fn(state, reason); } catch (err) { console.warn('[pkr] listener failed', err); }
  }
}

/** Deterministic, JSON-safe snapshot. Numbers quantised to kill float noise. */
export function snapshot() {
  const s = state;
  const snap = {
    screen: s.screen,
    seed: s.seed,
    t: q(s.t, 3),
    frame: s.frame,
    select: { ...s.select },
    race: null,
    results: null,
  };
  if (s.race) {
    snap.race = {
      trackId: s.race.trackId,
      playerId: s.race.playerId,
      laps: s.race.laps,
      phase: s.race.phase,
      countdown: q(s.race.countdown, 3),
      elapsed: q(s.race.elapsed, 3),
      steps: s.race.steps,
      hud: {
        lap: s.race.hud.lap,
        pos: s.race.hud.pos,
        coins: s.race.hud.coins,
        item: s.race.hud.item,
      },
      racers: s.race.racers.map((r) => ({
        id: r.id,
        dist: q(r.dist, 3),
        speed: q(r.speed, 3),
        lane: q(r.lane, 4),
        lap: r.lap,
        pos: r.pos,
        coins: r.coins,
        item: r.item,
        boost: q(r.boost, 3),
        finished: r.finished,
      })),
    };
  }
  if (s.results) {
    snap.results = {
      trackId: s.results.trackId,
      coins: s.results.coins,
      rank: s.results.rank,
      order: s.results.order.map((o) => ({ id: o.id, time: q(o.time, 2) })),
    };
  }
  return snap;
}
