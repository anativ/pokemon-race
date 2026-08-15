/**
 * Deterministic RNG (mulberry32). The ONLY randomness allowed anywhere in
 * simulation code - never Math.random() in anything that lands in state().
 * Purely cosmetic, non-state randomness may use rng.forkCosmetic().
 */
export function makeRng(seed = 1) {
  let a = (seed >>> 0) || 1;
  const rng = {
    seed: seed >>> 0,
    calls: 0,
    /** float in [0,1) */
    next() {
      rng.calls++;
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** float in [min,max) */
    range(min, max) { return min + rng.next() * (max - min); },
    /** integer in [min,max] */
    int(min, max) { return Math.floor(rng.range(min, max + 1)); },
    pick(arr) { return arr[rng.int(0, arr.length - 1)]; },
    /** In-place deterministic Fisher-Yates. */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    },
    /** Independent stream derived from this seed (stable, no shared cursor). */
    fork(tag = 0) { return makeRng((rng.seed ^ (tag * 0x9e3779b9)) >>> 0); },
    reset(newSeed = rng.seed) { a = (newSeed >>> 0) || 1; rng.seed = newSeed >>> 0; rng.calls = 0; },
  };
  return rng;
}

/** Stable string -> uint32 hash, handy for per-racer noise offsets. */
export function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Round for state snapshots so float noise never breaks determinism diffs. */
export function q(n, places = 4) {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}
