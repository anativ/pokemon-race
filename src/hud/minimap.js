/**
 * Route-shaped minimap for the race HUD.
 * Draws the track's closed loop as a smooth white circuit ribbon and plots one
 * coloured dot per racer at its live lap fraction (player = big gold dot).
 */
import { racerOr } from '../data/roster.js';
import { pointOnLoop } from '../core/ui.js';

/** Catmull-Rom -> cubic bezier over a closed loop, so the route reads as a circuit. */
export function loopPath(points, scale = 100) {
  const n = points.length;
  const P = (i) => {
    const p = points[((i % n) + n) % n];
    return [p[0] * scale, p[1] * scale];
  };
  let d = `M ${P(0)[0].toFixed(2)} ${P(0)[1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1); const p1 = P(i); const p2 = P(i + 1); const p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)}, ${c2[0].toFixed(2)} ${c2[1].toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d} Z`;
}

/** Lap fraction (0..1) of a racer along the track. */
function fracOf(r, length) {
  const d = ((r.dist % length) + length) % length;
  return d / length;
}

/**
 * @param {object} track  data/tracks.js entry
 * @param {object|null} race  live race state
 * @param {number} size  px
 */
export function minimapSvg(track, race, size = 226) {
  const pts = track.minimap;
  const d = loopPath(pts, 100);
  const dots = [];
  if (race && race.racers) {
    // Player last so it paints on top of the pack.
    const list = [...race.racers].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
    for (const r of list) {
      const def = racerOr(r.id);
      const [x, y] = pointOnLoop(pts, fracOf(r, track.length));
      const cx = (x * 100).toFixed(2); const cy = (y * 100).toFixed(2);
      if (r.isPlayer) {
        dots.push(`<g class="mm-dot mm-me" data-dot="${r.id}">
          <circle cx="${cx}" cy="${cy}" r="7.6" fill="#ffd63b" opacity=".38"/>
          <circle cx="${cx}" cy="${cy}" r="4.6" fill="${def.color}" stroke="#fff6c6" stroke-width="2.1"/>
          <circle cx="${cx}" cy="${(y * 100 - 1.3).toFixed(2)}" r="1.5" fill="#fff" opacity=".85"/>
        </g>`);
      } else {
        dots.push(`<g class="mm-dot" data-dot="${r.id}">
          <circle cx="${cx}" cy="${cy}" r="3.5" fill="${def.color}" stroke="#0d1426" stroke-width="1.3"/>
          <circle cx="${cx}" cy="${(y * 100 - 1).toFixed(2)}" r="1.1" fill="#fff" opacity=".55"/>
        </g>`);
      }
    }
  }
  // Start/finish marker on the loop.
  const [sx, sy] = pointOnLoop(pts, 0);
  return `<svg class="mm-svg" viewBox="-9 -9 118 118" width="${size}" height="${size}" aria-hidden="true">
    <path d="${d}" fill="none" stroke="rgba(6,12,28,.55)" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#f7fbff" stroke-width="9.4" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#c8d6ea" stroke-width="6.4" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="3.2 3.6" opacity=".9"/>
    <g transform="translate(${(sx * 100).toFixed(2)},${(sy * 100).toFixed(2)})">
      <rect x="-4.6" y="-3.2" width="9.2" height="6.4" rx="1.4" fill="#fff" stroke="#131a2c" stroke-width="1.2"/>
      <path d="M-4.6 -3.2h2.3v2.1h2.3v2.1h2.3v2.2h-2.3v-2.2h-2.3v2.2h-2.3z" fill="#131a2c" opacity=".85"/>
    </g>
    ${dots.join('')}
  </svg>`;
}
