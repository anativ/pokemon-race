/**
 * race-world / roadside crowd sprites
 *
 * The verge in the reference shot is lined with *identifiable* Pokemon, not
 * generic mascots, so the crowd is built from the one canonical art source
 * (`src/core/avatars.js`, also reachable as `window.__pkr.art`) rather than
 * from a local pear-shaped blob template.
 *
 * Pipeline per (species, size bucket, theme):
 *   1. rasterise the canonical <svg> silhouette once into an <img>,
 *   2. bake a lit copy into an offscreen canvas - rim halo on the key-light
 *      side, a soft occlusion gradient on the shaded side, and a theme tint,
 *   3. blit that cached canvas as a billboard, grounded by scenery.js's cast
 *      streak + contact patch.
 *
 * Everything is deterministic (species chosen by the per-slice noise) and the
 * bake is pure drawing, so `__pkr.state()` is untouched.
 */
import { avatarSvg, hasSpecies, SPECIES_IDS } from '../core/avatars.js';
import { roster } from '../data/roster.js';
import { rgba, clamp } from './paint.js';

/** Image ground line inside the 100x100 avatar viewBox (contract 4b). */
const GROUND = 0.92;
/** Raster resolution: one high-res source per species, scaled down on blit. */
const SRC_PX = 192;

const IMAGES = new Map();   // id -> HTMLImageElement
const BAKED = new Map();    // `${id}|${bucket}|${themeKey}` -> canvas

function racerOf(id) {
  return roster.find((r) => r.id === id) || roster[0];
}

/** Rasterise (once) the canonical silhouette for a roster id. */
export function crowdImage(id) {
  let img = IMAGES.get(id);
  if (img) return img;
  const racer = racerOf(id);
  // avatarSvg() is authored for inline embedding, where the SVG namespace is
  // implied. Loaded through an <img src="data:image/svg+xml,...">, an SVG root
  // without an explicit xmlns fails silently (complete=true, naturalWidth=0),
  // which is exactly how a crowd quietly falls back to blobs.
  const svg = avatarSvg(racer, SRC_PX)
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  img = new Image(SRC_PX, SRC_PX);
  img.decoding = 'sync';
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  IMAGES.set(id, img);
  return img;
}

/** Warm the raster cache at boot so the first rendered frame already has art. */
export function preloadCrowd(ids) {
  const list = ids && ids.length ? ids : SPECIES_IDS;
  for (const id of list) if (hasSpecies(id)) crowdImage(id);
}

function ready(img) {
  return !!img && img.complete && img.naturalWidth > 0;
}

const BUCKETS = [20, 28, 40, 56, 80, 112, 156, 216];
function bucketFor(px) {
  for (const b of BUCKETS) if (px <= b) return b;
  return BUCKETS[BUCKETS.length - 1];
}

/**
 * Bake a lit sprite: the flat vector avatar gains a light side, a shaded side
 * and a rim, which is what separates a "volumetric creature standing in the
 * grass" from a sticker pasted on the lawn.
 */
function bake(id, bucket, scene, light) {
  const key = `${id}|${bucket}|${scene.key}`;
  const hit = BAKED.get(key);
  if (hit) return hit;
  const img = crowdImage(id);
  if (!ready(img)) return null;

  const pad = Math.ceil(bucket * 0.14);
  const S = bucket + pad * 2;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d');
  const dirX = light && light.dirX != null ? light.dirX : -0.9;
  // shadows fall away from the key light, so the LIT side is the opposite one
  const litX = -Math.sign(dirX || -1);

  // --- rim halo: a tinted silhouette nudged toward the key light -----------
  const sil = document.createElement('canvas');
  sil.width = S; sil.height = S;
  const sg = sil.getContext('2d');
  sg.drawImage(img, pad, pad, bucket, bucket);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = (scene.light && scene.light.rim) || '#fff4c8';
  sg.fillRect(0, 0, S, S);

  const off = Math.max(1.5, bucket * 0.075);
  g.globalAlpha = scene.key === 'neon' ? 0.9 : 0.8;
  g.drawImage(sil, litX * off, -off * 0.55);
  g.globalAlpha = 0.45;
  g.drawImage(sil, litX * off * 1.9, -off * 1.0);
  g.globalAlpha = 1;

  // --- the creature itself -------------------------------------------------
  g.drawImage(img, pad, pad, bucket, bucket);

  // --- directional shading, clipped to the silhouette ----------------------
  g.globalCompositeOperation = 'source-atop';
  const shadeCol = (light && light.color) || '#17364f';
  const lx = litX < 0 ? 0 : S;
  const grd = g.createLinearGradient(lx, 0, S - lx, S * 0.4);
  grd.addColorStop(0, rgba('#ffffff', scene.key === 'neon' ? 0.05 : 0.16));
  grd.addColorStop(0.42, rgba(shadeCol, 0));
  grd.addColorStop(1, rgba(shadeCol, scene.key === 'snow' ? 0.30 : 0.38));
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);

  // ambient occlusion: the ground darkens the feet
  const ao = g.createLinearGradient(0, pad + bucket * 0.60, 0, pad + bucket * GROUND);
  ao.addColorStop(0, rgba(shadeCol, 0));
  ao.addColorStop(1, rgba(shadeCol, 0.34));
  g.fillStyle = ao;
  g.fillRect(0, pad + bucket * 0.55, S, bucket * 0.45);

  // theme wash (night city cools the crowd so the neon stays the brightest)
  const tint = scene.fanTint;
  if (tint) {
    g.globalAlpha = tint.amount;
    g.fillStyle = tint.color;
    g.fillRect(0, 0, S, S);
    g.globalAlpha = 1;
  }
  g.globalCompositeOperation = 'source-over';

  BAKED.set(key, { cv, pad, bucket, S });
  return BAKED.get(key);
}

/**
 * Draw one crowd Pokemon standing on the verge.
 * @param {number} x,y ground contact point
 * @param {number} s   pixel height of the creature (feet -> top of head)
 */
export function drawCrowd(c, x, y, s, scene, light, id, seed) {
  if (s < 3) return false;
  const bucket = bucketFor(s * 1.25);
  const b = bake(id, bucket, scene, light);
  if (!b) return false;
  // the avatar art occupies 0..GROUND of its box; scale so that span == s
  const k = s / (b.bucket * GROUND);
  const w = b.S * k;
  const hgt = b.S * k;
  const gy = (b.pad + b.bucket * GROUND) * k;
  // a hair of per-fan lean so a row of fans is not a row of identical statues
  const lean = (seed - 0.5) * 0.12;
  c.save();
  c.translate(x, y);
  if (lean) c.rotate(lean * 0.35);
  c.drawImage(b.cv, -w * 0.5, -gy, w, hgt);
  c.restore();
  return true;
}

/** Species line-up for a theme, filtered to ids that actually have art. */
export function fansFor(scene) {
  const want = (scene && scene.fans) || [];
  const ok = want.filter((id) => hasSpecies(id));
  return ok.length ? ok : ['eevee', 'pikachu', 'charmander', 'jigglypuff'];
}

/** Deterministic species pick for a scenery slot. */
export function fanId(scene, seed) {
  const list = fansFor(scene);
  return list[Math.floor(clamp(seed, 0, 0.999) * list.length) % list.length];
}

// Warm every silhouette at import time: boot happens long before the first
// screenshot, so the crowd is never missing from a captured frame.
if (typeof Image !== 'undefined' && typeof document !== 'undefined') {
  try { preloadCrowd(); } catch { /* headless test harness - ignore */ }
}

export default drawCrowd;
