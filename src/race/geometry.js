/**
 * race-world / geometry
 *
 * Turns the compact `segments` description in src/data/tracks.js into a fine
 * grained, looped road: one entry per SEG_LEN of track distance carrying the
 * local curvature, elevation, banking and a deterministic scenery slot.
 *
 * Nothing here reads the clock or Math.random - the road for a given track is
 * always byte-identical, which keeps `__pkr.state()` snapshots reproducible.
 */

export const SEG_LEN = 12;      // track distance units per rendered road slice
export const ROAD_W = 56;       // road half width in world units
export const KERB_W = 0.17;     // kerb width as a fraction of the half width
export const RAIL_OFF = 1.42;   // guard rail offset (x half widths)

/**
 * Peak elevation, in world units, of a segment whose `hill` is 1. The camera
 * flies ~88 units above the tarmac, so a crest has to gain tens of units
 * before it reads as a crest at all: at 78 a `hill: 0.5` segment becomes a
 * 39-unit brow and a `hill: 0.8` one an 62-unit brow that the road visibly
 * folds over, hiding the tarmac beyond it.
 */
export const HILL_K = 64;
/** amplitude of the two loop-closed terrain waves layered under the hills */
export const ROLL_A = [8, 4.5];
/** curvature -> banking (fraction of half width, before BANK_K). */
export const BANK_K_GEO = 0.20;

/** Deterministic 0..1 noise from an integer + salt. */
export function noise1(i, salt = 0) {
  let h = (i | 0) * 374761393 + (salt | 0) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h ^= h >>> 16;
  return ((h >>> 0) % 100000) / 100000;
}

function smoothstep(t) { return t * t * (3 - 2 * t); }

/** Raised ramp so a segment's curvature eases in and out instead of snapping. */
function ramp(t, ease = 0.34) {
  if (t < ease) return smoothstep(t / ease);
  if (t > 1 - ease) return smoothstep((1 - t) / ease);
  return 1;
}

const cache = new WeakMap();

/**
 * @param {any} track a frozen entry from src/data/tracks.js
 * @returns {{segs:Array, count:number, loopLen:number, segLen:number}}
 */
export function buildRoad(track) {
  const hit = cache.get(track);
  if (hit) return hit;

  const segs = [];
  let y = 0;
  let banked = 0;
  let heading = 0;
  let px = 0;
  let pz = 0;

  for (let si = 0; si < track.segments.length; si++) {
    const s = track.segments[si];
    const prev = track.segments[(si - 1 + track.segments.length) % track.segments.length];
    const n = Math.max(3, Math.round(s.len / SEG_LEN));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      // blend the previous segment's curve into this one over the first slice
      const blend = t < 0.22 ? smoothstep(t / 0.22) : 1;
      const curve = (prev.curve * (1 - blend) + s.curve * blend) * ramp(t, 0.28);
      // Elevation is absolute, not accumulated: a raised-cosine brow that
      // starts and ends flat (value AND slope zero at both ends), so a
      // `hill: 0.5` segment is a 65-unit crest that the road folds over and a
      // negative one is a dip - and the loop closes exactly with no drift.
      y = s.hill * HILL_K * 0.5 * (1 - Math.cos(t * Math.PI * 2));
      // banking lags the curvature slightly, like a real circuit's transitions
      const wantBank = Math.max(-0.62, Math.min(0.62, curve * BANK_K_GEO));
      banked += (wantBank - banked) * 0.16;

      // plan-view position, used to place scenery and the far backdrop
      heading += curve * 0.011;
      px += Math.sin(heading) * SEG_LEN;
      pz += Math.cos(heading) * SEG_LEN;

      segs.push({
        i: segs.length,
        curve,
        y,
        bank: banked,
        heading,
        px,
        pz,
        /** 0..1 stable per-slice noise for scenery / texture */
        n0: noise1(segs.length, 11),
        n1: noise1(segs.length, 97),
        n2: noise1(segs.length, 613),
      });
    }
  }

  // Layer two whole-number-harmonic waves over the authored hills so even the
  // "flat" segments breathe. Integer harmonics of the lap length means the
  // elevation loop closes exactly - a lap never steps at the finish line.
  const N = segs.length;
  for (let i = 0; i < N; i++) {
    const u = (i / N) * Math.PI * 2;
    segs[i].y += ROLL_A[0] * Math.sin(u * 3) + ROLL_A[1] * Math.sin(u * 7 + 1.1);
  }
  // per-slice grade, used by the shading + scenery passes to tell uphill from
  // downhill without re-differentiating the elevation themselves
  for (let i = 0; i < N; i++) {
    const nx = segs[(i + 1) % N];
    segs[i].grade = (nx.y - segs[i].y) / SEG_LEN;
  }

  const out = { segs, count: segs.length, loopLen: segs.length * SEG_LEN, segLen: SEG_LEN };
  cache.set(track, out);
  return out;
}

/** Slice index for a track distance (wrapped). */
export function segIndexAt(road, dist) {
  const i = Math.floor(dist / SEG_LEN);
  return ((i % road.count) + road.count) % road.count;
}

/** Interpolated elevation at a track distance. */
export function heightAt(road, dist) {
  const f = dist / SEG_LEN;
  const i = Math.floor(f);
  const t = f - i;
  const a = road.segs[((i % road.count) + road.count) % road.count];
  const b = road.segs[(((i + 1) % road.count) + road.count) % road.count];
  return a.y * (1 - t) + b.y * t;
}

export default buildRoad;
