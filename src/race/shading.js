/**
 * race-world / grounding + surfacing
 *
 * Two jobs, both about making the scene read as a lit 3D place instead of a
 * stack of flat vector stickers:
 *
 *  1. TEXTURE - baked, deterministic noise tiles (asphalt grain, grass tufts,
 *     wind-blown snow, wet plaza flecks) painted through a perspective-scaled
 *     CanvasPattern so the surface grain compresses toward the horizon.
 *  2. SHADOWS - every object that touches the ground gets a soft elliptical
 *     contact patch plus a long cast shadow sheared away from the theme's key
 *     light (sun / neon sign / overcast snow glare).
 *
 * Everything here is pure drawing from deterministic noise; no clock reads that
 * reach the sim, so `__pkr.state()` stays byte-identical.
 */
import { noise1 } from './geometry.js';
import { edgeX, edgeY } from './road.js';
import { DRAW } from './projection.js';
import { rgba, clamp } from './paint.js';

/* --------------------------------------------------------------- tiles --- */

const TILES = new Map();

function tile(key, size, paint) {
  let t = TILES.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d');
  paint(g, size);
  TILES.set(key, cv);
  return cv;
}

/** Dot/scuff field helper: deterministic, seamless-ish (wraps at the edges). */
function speckle(g, size, count, salt, spec) {
  for (let i = 0; i < count; i++) {
    const x = noise1(i, salt) * size;
    const y = noise1(i, salt + 1) * size;
    const s = spec.min + noise1(i, salt + 2) * (spec.max - spec.min);
    const dark = noise1(i, salt + 3) > spec.lightRatio;
    g.globalAlpha = spec.aMin + noise1(i, salt + 4) * (spec.aMax - spec.aMin);
    g.fillStyle = dark ? spec.dark : spec.light;
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      g.beginPath();
      g.ellipse(x + ox, y + oy, s, s * (spec.squash || 1), 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;
}

/** Asphalt: fine aggregate grain + a few long tar seams and scuffs. */
export function asphaltTile(scene) {
  const key = `asp:${scene.key}`;
  return tile(key, 128, (g, S) => {
    speckle(g, S, 460, 1201, {
      min: 0.5, max: 1.9, dark: '#000000', light: '#ffffff',
      lightRatio: 0.42, aMin: 0.05, aMax: 0.20,
    });
    // coarse aggregate blobs
    speckle(g, S, 70, 1301, {
      min: 1.6, max: 3.4, dark: '#000000', light: '#ffffff',
      lightRatio: 0.55, aMin: 0.04, aMax: 0.12, squash: 0.8,
    });
    // patch repairs: soft darker rectangles
    for (let i = 0; i < 5; i++) {
      g.globalAlpha = 0.05 + noise1(i, 1409) * 0.05;
      g.fillStyle = '#000000';
      g.fillRect(noise1(i, 1411) * S, noise1(i, 1413) * S,
        14 + noise1(i, 1417) * 40, 10 + noise1(i, 1419) * 26);
    }
    g.globalAlpha = 1;
  });
}

/**
 * Grass: broad clover clumps, dense blade strokes and a light scatter of
 * wildflowers. Painted at 256 so the near field still has real detail once the
 * pattern is scaled up by perspective.
 */
export function grassTile(scene) {
  const P = scene.groundTex || {};
  const D = scene.detail || {};
  const key = `grs:${scene.key}`;
  return tile(key, 256, (g, S) => {
    // 1. broad clumps: soft irregular patches of lighter / darker turf
    for (let i = 0; i < 34; i++) {
      const x = noise1(i, 2101) * S;
      const y = noise1(i, 2103) * S;
      const r = 8 + noise1(i, 2105) * 22;
      g.globalAlpha = 0.07 + noise1(i, 2107) * 0.13;
      g.fillStyle = noise1(i, 2109) > 0.5 ? (P.light || '#b6ef8a') : (P.dark || '#1d5b28');
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
        g.beginPath();
        g.ellipse(x + ox, y + oy, r, r * 0.62, noise1(i, 2111) * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    // 2. fine grain
    speckle(g, S, 620, 2201, {
      min: 1.0, max: 2.8, dark: P.dark || '#1d5b28', light: P.light || '#b6ef8a',
      lightRatio: 0.5, aMin: 0.10, aMax: 0.36, squash: 0.62,
    });
    // 3. blade strokes - the thing that actually reads as grass
    g.lineCap = 'round';
    for (let i = 0; i < 620; i++) {
      const x = noise1(i, 2301) * S;
      const y = noise1(i, 2303) * S;
      const l = 3 + noise1(i, 2305) * 8;
      g.globalAlpha = 0.10 + noise1(i, 2307) * 0.26;
      g.strokeStyle = noise1(i, 2309) > 0.5 ? (P.light || '#c9f79b') : (P.dark || '#1f5f2a');
      g.lineWidth = 0.8 + noise1(i, 2311) * 1.2;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (noise1(i, 2313) - 0.5) * 3, y - l * 0.6,
        x + (noise1(i, 2313) - 0.5) * 6, y - l);
      g.stroke();
    }
    // 4. wildflowers
    const fl = D.flower || ['#ffffff', '#ffd63b', '#ff88b0'];
    for (let i = 0; i < 46; i++) {
      g.globalAlpha = 0.35 + noise1(i, 2405) * 0.45;
      g.fillStyle = fl[i % fl.length];
      g.beginPath();
      g.arc(noise1(i, 2401) * S, noise1(i, 2403) * S, 0.9 + noise1(i, 2407) * 1.3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  });
}

/** Snow: wind ripples, sparkle grains, blue shadow hollows. */
export function snowTile(scene) {
  const P = scene.groundTex || {};
  const key = `snw:${scene.key}`;
  return tile(key, 128, (g, S) => {
    for (let i = 0; i < 26; i++) {
      const y = noise1(i, 3101) * S;
      g.globalAlpha = 0.06 + noise1(i, 3103) * 0.12;
      g.strokeStyle = P.dark || '#9fb6d8';
      g.lineWidth = 1.5 + noise1(i, 3105) * 5;
      g.beginPath();
      g.moveTo(-10, y);
      g.bezierCurveTo(S * 0.3, y + (noise1(i, 3107) - 0.5) * 9,
        S * 0.7, y + (noise1(i, 3109) - 0.5) * 9, S + 10, y);
      g.stroke();
    }
    speckle(g, S, 190, 3201, {
      min: 0.6, max: 1.7, dark: P.dark || '#8fa9cc', light: '#ffffff',
      lightRatio: 0.45, aMin: 0.10, aMax: 0.38,
    });
    g.globalAlpha = 1;
  });
}

/** City plaza: cracked slabs, wet flecks, neon-reflecting puddle edges. */
export function plazaTile(scene) {
  const P = scene.groundTex || {};
  const key = `plz:${scene.key}`;
  return tile(key, 128, (g, S) => {
    g.globalAlpha = 0.16;
    g.strokeStyle = P.dark || '#0b1030';
    g.lineWidth = 1.2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(0, (i * S) / 4); g.lineTo(S, (i * S) / 4); g.stroke();
      g.beginPath(); g.moveTo((i * S) / 4, 0); g.lineTo((i * S) / 4, S); g.stroke();
    }
    speckle(g, S, 150, 4101, {
      min: 0.8, max: 2.6, dark: P.dark || '#050a26', light: P.light || '#6fe6ff',
      lightRatio: 0.68, aMin: 0.05, aMax: 0.22,
    });
    g.globalAlpha = 1;
  });
}

export function groundTileFor(scene) {
  if (scene.key === 'snow') return snowTile(scene);
  if (scene.key === 'neon') return plazaTile(scene);
  return grassTile(scene);
}

/* ------------------------------------------------ perspective texturing --- */

const ROAD_HALF = 56;          // world half width (geometry.ROAD_W)
const TILE_WORLD = 26;         // world units covered by one 128px tile
const CHUNK = 3;               // slices per textured band

function patFor(c, img, cache, key) {
  let p = cache.get(key);
  if (!p) { p = c.createPattern(img, 'repeat'); cache.set(key, p); }
  return p;
}

/**
 * Paint asphalt grain over the road ribbon and tuft/ripple grain over the
 * verges, band by band, with the pattern scaled by that band's perspective so
 * the texture tightens toward the horizon. Called right after renderRoad().
 */
export function paintSurfaceTexture(c, view3, scene, opts = {}) {
  if (typeof DOMMatrix === 'undefined') return;
  const { pts, horizon, w, h } = view3;
  const asp = asphaltTile(scene);
  const grd = groundTileFor(scene);
  const cache = opts.cache || (paintSurfaceTexture._c || (paintSurfaceTexture._c = new Map()));
  const roadPat = patFor(c, asp, cache, `r:${scene.key}`);
  const gndPat = patFor(c, grd, cache, `g:${scene.key}`);
  const roadA = scene.tex && scene.tex.roadAlpha != null ? scene.tex.roadAlpha : 0.55;
  const gndA = scene.tex && scene.tex.groundAlpha != null ? scene.tex.groundAlpha : 0.6;
  const scroll = (view3.camZ % TILE_WORLD) / TILE_WORLD;

  let maxY = h + 40;
  let p1 = null;
  let chunk = 0;
  for (let n = 0; n < DRAW; n++) {
    const p2 = pts[n];
    if (!p2) continue;
    if (!p1) { p1 = p2; continue; }
    if (p2.y >= maxY) continue;
    if (p2.y < horizon - 1) break;
    if (chunk++ % CHUNK !== 0) { maxY = p2.y; continue; }

    const px = p2.w / ROAD_HALF;                  // screen px per world unit
    const kR = (TILE_WORLD * px) / asp.width;
    const kG = (TILE_WORLD * px) / grd.width;
    const k = kR;
    if (k > 0.006 && p2.w > 3) {
      const fade = 1 - Math.min(1, p2.fog);
      const ty = p2.y - scroll * TILE_WORLD * px * 3;
      const m = new DOMMatrix().translateSelf(p2.x, ty).scaleSelf(kR, kR * 0.55);
      const mG = new DOMMatrix().translateSelf(p2.x, ty).scaleSelf(kG, kG * 0.55);
      // ---- verges -------------------------------------------------------
      const far = Math.min(300, w / Math.max(0.5, p2.w) + 2.5);
      if (gndA > 0 && fade > 0.05) {
        c.save();
        c.beginPath();
        for (const s of [-1, 1]) {
          const a = s * 1.06; const b = s * far;
          c.moveTo(edgeX(p1, a), edgeY(p1, a));
          c.lineTo(edgeX(p2, a), edgeY(p2, a));
          c.lineTo(edgeX(p2, b), edgeY(p2, b));
          c.lineTo(edgeX(p1, b), edgeY(p1, b));
          c.closePath();
        }
        c.clip();
        gndPat.setTransform(mG);
        c.globalAlpha = gndA * fade;
        c.fillStyle = gndPat;
        c.fillRect(0, Math.min(p2.y, p1.y) - 2, w, Math.abs(p1.y - p2.y) + 4);
        c.restore();
      }
      // ---- asphalt ------------------------------------------------------
      if (roadA > 0 && fade > 0.04) {
        c.save();
        c.beginPath();
        c.moveTo(edgeX(p1, -1), edgeY(p1, -1));
        c.lineTo(edgeX(p2, -1), edgeY(p2, -1));
        c.lineTo(edgeX(p2, 1), edgeY(p2, 1));
        c.lineTo(edgeX(p1, 1), edgeY(p1, 1));
        c.closePath();
        c.clip();
        roadPat.setTransform(m);
        c.globalAlpha = roadA * fade;
        c.fillStyle = roadPat;
        c.fillRect(0, Math.min(p2.y, p1.y) - 2, w, Math.abs(p1.y - p2.y) + 4);
        c.restore();
      }
    }
    maxY = p2.y;
    p1 = p2;
  }
}

/**
 * Transverse tar seams across the asphalt every few slices - the single
 * clearest cue that the road is a paved surface receding away from you.
 */
export function paintSeams(c, view3, scene) {
  const { pts, horizon, h } = view3;
  const col = (scene.road && scene.road.seam) || 'rgba(0,0,0,0.30)';
  let maxY = h + 40;
  let p1 = null;
  for (let n = 0; n < DRAW; n++) {
    const p2 = pts[n];
    if (!p2) continue;
    if (!p1) { p1 = p2; continue; }
    if (p2.y >= maxY) continue;
    if (p2.y < horizon - 1) break;
    const gi = view3.base + n;
    if (((gi % 11) + 11) % 11 === 0 && p2.w > 26) {
      const a = (1 - Math.min(1, p2.fog)) * 0.55;
      c.save();
      c.globalAlpha = a;
      c.strokeStyle = col;
      c.lineWidth = Math.max(0.8, p2.w * 0.012);
      c.beginPath();
      c.moveTo(edgeX(p2, -1), edgeY(p2, -1));
      c.lineTo(edgeX(p2, 1), edgeY(p2, 1));
      c.stroke();
      c.restore();
    }
    maxY = p2.y;
    p1 = p2;
  }
}

/* ------------------------------------------------------------- shadows --- */

const TAU = Math.PI * 2;

/** Per-theme key light: which way shadows fall, how long and how dark. */
export const LIGHTS = {
  // sunlit shadows are sky-lit, so they read blue-grey rather than black
  grass: { dirX: -0.95, len: 1.15, alpha: 0.42, color: '#17364f', streak: 0.9 },
  neon: { dirX: 0.55, len: 0.85, alpha: 0.55, color: '#03051a', streak: 0.7 },
  snow: { dirX: -0.75, len: 1.0, alpha: 0.34, color: '#4a6c9c', streak: 0.8 },
};

export function lightOf(scene) {
  return (scene && scene.light2) || LIGHTS[scene && scene.key] || LIGHTS.grass;
}

/**
 * Soft elliptical ground shadow for anything that stands on the surface:
 * a dark contact core right under the footprint plus a longer, softer body
 * sheared away from the key light.
 *
 * @param {number} x,y ground contact point
 * @param {number} r   footprint radius in px
 */
export function groundShadow(c, x, y, r, opts = {}) {
  if (r < 0.6) return;
  const L = opts.light || LIGHTS.grass;
  const len = (opts.len != null ? opts.len : 1) * (L.len || 1);
  const alpha = (opts.alpha != null ? opts.alpha : 1) * (L.alpha || 0.4);
  const col = opts.color || L.color || '#0d1a24';
  const dirX = L.dirX != null ? L.dirX : -0.9;
  const squash = opts.squash != null ? opts.squash : 0.30;

  const rx = r * (1 + 0.42 * len);
  const ry = Math.max(0.5, r * squash);
  const cx = x + dirX * r * len * 0.40;

  // Concentric solid ellipses rather than one radial gradient: a gradient fill
  // through a non-uniform transform loses almost all of its density, which is
  // exactly how objects end up looking unglued from the ground.
  const rings = [
    [1.00, 0.16], [0.82, 0.30], [0.62, 0.46], [0.40, 0.62],
  ];
  c.save();
  const ga = c.globalAlpha;          // respect the caller's fog fade
  for (const [k, a] of rings) {
    c.globalAlpha = alpha * a * ga;
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(cx, y, Math.max(0.4, rx * k), Math.max(0.4, ry * k), 0, 0, TAU);
    c.fill();
  }
  // tight contact core: what actually glues an object to the ground
  c.globalAlpha = Math.min(0.9, alpha * 0.85) * ga;
  c.beginPath();
  c.ellipse(x, y, Math.max(0.4, r * 0.62), Math.max(0.4, ry * 0.66), 0, 0, TAU);
  c.fill();
  c.restore();
}

/**
 * Long directional cast streak for a standing object of pixel height `hgt`
 * (tree, pole, rail post, arch leg). Tapers and fades along its length.
 */
export function castStreak(c, x, y, hgt, width, opts = {}) {
  const L = opts.light || LIGHTS.grass;
  const s = (L.streak != null ? L.streak : 0.9) * (opts.len != null ? opts.len : 1);
  if (s <= 0 || hgt < 3) return;
  const dx = (L.dirX != null ? L.dirX : -0.9) * hgt * s;
  const dy = Math.max(2, hgt * 0.16 * s);
  const col = opts.color || L.color || '#0d1a24';
  const a = (L.alpha || 0.4) * (opts.alpha != null ? opts.alpha : 0.85);
  const g = c.createLinearGradient(x, y, x + dx, y + dy);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.45, rgba(col, a * 0.45));
  g.addColorStop(1, rgba(col, 0));
  c.save();
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(x - width * 0.5, y);
  c.lineTo(x + width * 0.5, y);
  c.lineTo(x + dx + width * 0.95, y + dy);
  c.lineTo(x + dx - width * 0.95, y + dy);
  c.closePath();
  c.fill();
  c.restore();
}

/**
 * Wet-floor reflection: draws `paint` again, mirrored below the contact point
 * and squashed, so karts and signs smear into the rain-slick tarmac. Only the
 * neon circuit is wet enough to warrant it.
 *
 * @param {(c:CanvasRenderingContext2D)=>void} paint re-draw callback
 */
export function reflection(c, x, y, alpha, squash, paint) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale(1, -(squash || 0.5));
  c.translate(-x, -y);
  paint(c);
  c.restore();
}

/**
 * Thin atmospheric band where the ground meets the sky, so the far end of the
 * circuit dissolves into haze instead of ending on a hard line.
 */
export function horizonHaze(c, view3, scene) {
  const { horizon, w } = view3;
  // A tall aerial-perspective wedge. The projected road runs out of slices a
  // dozen pixels short of the vanishing point, and the verge either side of it
  // is one flat fill all the way to the horizon; sinking both into the sky
  // colour over ~13% of the frame turns that hard edge into distance instead
  // of a green tabletop with a road painted on it.
  const band = Math.max(30, view3.h * 0.135);
  const col = (scene.fog && scene.fog.color) || '#cfeaff';
  const base = col.startsWith('#') ? col : '#cfeaff';
  const top = horizon - band * 0.10;
  const g = c.createLinearGradient(0, top, 0, horizon + band);
  const peak = scene.key === 'neon' ? 0.62 : 0.78;
  g.addColorStop(0, rgba(base, peak));
  g.addColorStop(0.16, rgba(base, peak * 0.82));
  g.addColorStop(0.42, rgba(base, peak * 0.34));
  g.addColorStop(0.72, rgba(base, peak * 0.10));
  g.addColorStop(1, rgba(base, 0));
  c.fillStyle = g;
  c.fillRect(0, top, w, band * 1.10);
}

/**
 * Depth grading: the near foreground sits in a slightly deeper, warmer shadow
 * than the middle distance, which is what stops the ground reading as one flat
 * colour field. A hair of contrast, applied to everything below the horizon.
 */
export function depthGrade(c, view3, scene) {
  const { horizon, w, h } = view3;
  const dark = scene.key === 'neon' ? '#02030f' : scene.key === 'snow' ? '#4a6c9c' : '#0d2033';
  const g = c.createLinearGradient(0, horizon, 0, h);
  g.addColorStop(0, rgba(dark, 0));
  g.addColorStop(0.5, rgba(dark, 0.035));
  g.addColorStop(1, rgba(dark, scene.key === 'snow' ? 0.12 : 0.16));
  c.fillStyle = g;
  c.fillRect(0, horizon, w, h - horizon);
}
