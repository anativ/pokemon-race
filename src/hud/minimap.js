/**
 * Route-shaped minimap for the race HUD.
 *
 * The reference floats a long pale route ribbon - a meandering serpentine with
 * ~10 bends filling the whole bottom-right corner - carrying identifiable
 * per-racer icon chips (a Pikachu head for the player, creature faces for the
 * rivals) sitting *centred on* the ribbon, not anonymous colour balls hanging
 * off its edge. So the geometry comes from `route.js` (arc-length parameterised,
 * so a chip is always on the drawn stroke), chips are sized to the ribbon, and
 * a spreading pass keeps all twelve legible even on the start grid.
 *
 * Chips are built once (`minimapSvg`) and only re-positioned per frame
 * (`updateMinimap`), so 12 full creature silhouettes cost nothing at runtime.
 */
import { racerOr } from '../data/roster.js';
import { creatureMarkup } from '../core/avatars.js';
import { buildRoute, pointAtLength, spreadAlong } from './route.js';

/* Ribbon + chip metrics, in the route's 0..100 space. */
const RIBBON = { edge: 11.4, fill: 9.5, gloss: 4.2 };
const CHIP = { rival: 4.15, player: 4.95 };
export const VIEWBOX = { x: 4, y: -1, w: 95, h: 106 };

const routeCache = new Map();
export function routeFor(track) {
  const id = track && track.id ? track.id : 'pallet-town';
  if (!routeCache.has(id)) routeCache.set(id, buildRoute(id));
  return routeCache.get(id);
}

/** Kept for compatibility: svg path for an arbitrary point loop. */
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

/* ------------------------------------------------------------------ colour */
function hex2rgb(h) {
  const s = String(h || '#888').replace('#', '');
  const v = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const n = parseInt(v.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, s, l];
}
function hsl(h, s, l) {
  return `hsl(${h.toFixed(1)} ${Math.round(Math.min(1, Math.max(0, s)) * 100)}% ${Math.round(Math.min(1, Math.max(0, l)) * 100)}%)`;
}

/** hex -> { fill, rim, crown } chip palette (backing disc behind the face). */
export function chipColors(hex) {
  const [h, s0, l0] = rgb2hsl(...hex2rgb(hex));
  const s = Math.min(0.92, Math.max(0.5, s0 * 1.18 + 0.12));
  const l = Math.min(0.74, Math.max(0.56, l0 * 0.82 + 0.18));
  return {
    fill: hsl(h, s, l),
    rim: hsl(h, Math.min(1, s + 0.06), Math.max(0.18, l - 0.3)),
    crown: hsl(h, Math.min(1, s * 0.85), Math.min(0.93, l + 0.2)),
  };
}

/* ------------------------------------------------------------------- chips */

/**
 * One racer chip: the creature's own silhouette, cropped to its head, sitting
 * on a light disc inside a white rim. Same crop the roster tokens use, so the
 * face on the map is the same face on the select grid.
 */
function chipMarkup(def, r, isPlayer) {
  const k = chipColors(def.color);
  // token crop: face box is 76/90 of the disc, inset 12/90 from its edge.
  const fw = (76 / 90) * (r * 2);
  const fo = -r + (12 / 90) * (r * 2);
  const face = `<svg x="${fo.toFixed(2)}" y="${(fo + r * 0.06).toFixed(2)}" width="${fw.toFixed(2)}" height="${fw.toFixed(2)}"
      viewBox="20 26 60 60">${creatureMarkup(def)}</svg>`;
  if (isPlayer) {
    return `<circle r="${(r + 1.7).toFixed(2)}" fill="#ffd63b"/>
      <circle r="${(r + 0.85).toFixed(2)}" fill="#ffffff"/>
      <circle r="${r.toFixed(2)}" fill="${k.fill}"/>
      ${face}
      <circle r="${r.toFixed(2)}" fill="none" stroke="${k.rim}" stroke-width=".6" opacity=".7"/>
      <circle r="${(r + 1.7).toFixed(2)}" fill="none" stroke="#8a5f05" stroke-width=".8" opacity=".85"/>`;
  }
  return `<circle r="${(r + 1).toFixed(2)}" fill="#ffffff"/>
    <circle r="${r.toFixed(2)}" fill="${k.fill}"/>
    ${face}
    <circle r="${r.toFixed(2)}" fill="none" stroke="${k.rim}" stroke-width=".6" opacity=".65"/>
    <circle r="${(r + 1).toFixed(2)}" fill="none" stroke="rgba(28,38,62,.5)" stroke-width=".7"/>`;
}

/**
 * Chip placement for the whole field: lap fraction -> arc length on the drawn
 * ribbon, then a circular spreading pass so overlapping racers stay readable.
 * Player is placed last in the DOM so its bigger chip paints on top.
 */
export function chipLayout(track, race) {
  const route = routeFor(track);
  const L = route.length;
  const len = track.length || 1;
  const items = race.racers.map((r) => ({ id: r.id, s: fracOf(r, len) * L, lane: r.lane || 0, isPlayer: !!r.isPlayer }));
  const gap = (CHIP.rival + 1) * 2 * 1.06;
  const spread = spreadAlong(items, L, gap);
  const out = new Map();
  for (const it of spread) {
    const [x, y, tx, ty] = pointAtLength(route, it.s);
    // a whisper of lane offset - chips must stay centred on the ribbon.
    const off = Math.max(-1, Math.min(1, it.lane / 1.6)) * 0.9;
    out.set(it.id, [x - ty * off, y + tx * off]);
  }
  return { route, pos: out };
}

/* ------------------------------------------------------------------ render */

/**
 * Full minimap svg: serpentine route ribbon + start line + one icon chip per
 * racer, all inside the corner card.
 * @param {object} track  data/tracks.js entry
 * @param {object|null} race  live race state
 * @param {number} width  px
 */
export function minimapSvg(track, race, width = 300) {
  const { route, pos } = race && race.racers
    ? chipLayout(track, race)
    : { route: routeFor(track), pos: new Map() };
  const d = route.d;
  const chips = [];
  if (race && race.racers) {
    const order = [...race.racers].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
    for (const r of order) {
      const def = racerOr(r.id);
      const p = pos.get(r.id) || [50, 50];
      chips.push(`<g class="mm-dot${r.isPlayer ? ' mm-me' : ''}" data-dot="${r.id}"
        transform="translate(${p[0].toFixed(2)},${p[1].toFixed(2)})">${chipMarkup(def, r.isPlayer ? CHIP.player : CHIP.rival, !!r.isPlayer)}</g>`);
    }
  }
  const [sx, sy, stx, sty] = pointAtLength(route, 0);
  const ang = (Math.atan2(sty, stx) * 180) / Math.PI + 90;
  const vb = VIEWBOX;
  const height = Math.round((width * vb.h) / vb.w);
  return `<svg class="mm-svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${width}" height="${height}" aria-hidden="true">
    <!-- Dark casing under the ribbon. Without it the pale grey edge below
         vanishes against Mt Coronet's snow field, where the whole route reads
         as white-on-white; this keeps the map legible on every track theme. -->
    <path d="${d}" fill="none" stroke="rgba(20,28,46,.42)" stroke-width="${RIBBON.edge + 3.4}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#5d6b83" stroke-width="${RIBBON.edge + 1.1}" stroke-linejoin="round" stroke-linecap="round" opacity=".75"/>
    <path d="${d}" fill="none" stroke="#b3bdcd" stroke-width="${RIBBON.edge}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#eef2f8" stroke-width="${RIBBON.fill}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#ffffff" stroke-width="${RIBBON.gloss}" stroke-linejoin="round" stroke-linecap="round" opacity=".5"/>
    <g transform="translate(${sx.toFixed(2)},${sy.toFixed(2)}) rotate(${ang.toFixed(1)})">
      <rect x="-4.6" y="-2.2" width="9.2" height="4.4" rx=".9" fill="#fff" stroke="#5b6779" stroke-width=".8"/>
      <path d="M-4.6 -2.2h2.3v1.47h2.3v1.46h2.3v1.47h-2.3v-1.47h-2.3v1.47h-2.3z" fill="#59677c" opacity=".85"/>
    </g>
    <g class="mm-chips" data-chips>${chips.join('')}</g>
  </svg>`;
}

/**
 * Per-frame update: move the existing chips instead of re-serialising 12
 * silhouettes. Returns false if the chip set no longer matches the field, so
 * the caller can rebuild.
 */
export function updateMinimap(host, track, race) {
  if (!host || !race || !race.racers) return false;
  const chips = host.querySelector('[data-chips]');
  if (!chips) return false;
  if (chips.children.length !== race.racers.length) return false;
  const { pos } = chipLayout(track, race);
  for (const r of race.racers) {
    const g = chips.querySelector(`[data-dot="${r.id}"]`);
    if (!g) return false;
    const p = pos.get(r.id) || [50, 50];
    g.setAttribute('transform', `translate(${p[0].toFixed(2)},${p[1].toFixed(2)})`);
  }
  return true;
}
