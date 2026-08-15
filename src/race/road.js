/**
 * race-world / road ribbon
 *
 * Draws the verge, banked asphalt, striped kerbs, painted lines and the guard
 * rails, near-to-far with occlusion clipping so crests hide what is behind
 * them. Every strip is expressed as a signed fraction of the road half width,
 * so banking tilts the whole ribbon consistently.
 */
import { rgba, mix, clamp } from './paint.js';
import { noise1 } from './geometry.js';
import { DRAW } from './projection.js';

/**
 * Crowned-surface shading bands: [from, to, signed strength]. Positive is a
 * highlight, negative a shadow. Tuned so the camber reads from the chase cam
 * without banding on the far slices.
 */
const CROWN = [
  [-1.00, -0.86, -0.20],
  [-0.86, -0.62, -0.11],
  [-0.62, -0.20, -0.035],
  [0.20, 0.62, -0.035],
  [0.62, 0.86, -0.11],
  [0.86, 1.00, -0.20],
  [-0.24, 0.24, 0.055],
];
const LIGHT_C = '#ffffff';
const SHADE_C = '#000000';

export function edgeX(p, f) { return p.x + p.w * f; }
/**
 * Screen y at lateral fraction f. The bank tilt stops growing past the verge
 * (|f| > 1.5) so consecutive quads tile exactly and no gaps open up.
 */
export function edgeY(p, f) {
  const ff = f < -1.5 ? -1.5 : f > 1.5 ? 1.5 : f;
  return p.yl + (p.yr - p.yl) * (ff + 1) * 0.5;
}

/** Quad strip between fractions f0..f1 across two projected slices. */
export function strip(c, p1, p2, f0, f1, fill, alpha) {
  if (alpha != null) { c.save(); c.globalAlpha = alpha; }
  c.beginPath();
  c.moveTo(edgeX(p1, f0), edgeY(p1, f0));
  c.lineTo(edgeX(p2, f0), edgeY(p2, f0));
  c.lineTo(edgeX(p2, f1), edgeY(p2, f1));
  c.lineTo(edgeX(p1, f1), edgeY(p1, f1));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (alpha != null) c.restore();
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {any} view3 projectRoad() result
 * @param {any} scene theme from ./tracks/
 * @param {{w:number,h:number,base:number,finishSeg:number,time:number}} v
 */
export function renderRoad(c, view3, scene, v) {
  const { pts, horizon, w, h } = view3;
  const R = scene.road;
  const G = scene.ground;
  const K = scene.kerb;
  const K2 = scene.kerbAlt || K;
  const fog = scene.fog;

  // Ground plane under everything. Not a flat fill: the verge quads only reach
  // as far as the projected slices do, so a solid rectangle left a hard band of
  // untouched colour between the last slice and the vanishing point - the
  // "green tabletop with a road painted on it" look. Grading it into the fog
  // colour over the first fifth turns that band into distance.
  const gg = c.createLinearGradient(0, horizon - 2, 0, horizon + (h - horizon) * 0.34);
  gg.addColorStop(0, fog.color);
  gg.addColorStop(0.18, mix(fog.color, G.far, 0.55));
  gg.addColorStop(0.52, mix(fog.color, G.far, 0.88));
  gg.addColorStop(1, G.far);
  c.fillStyle = gg;
  c.fillRect(0, horizon - 2, w, h - horizon + 2);

  const kerbW = K.width;
  let maxY = h + 40;
  let prevTop = h + 40;   // exact band tiling: no 1px bleed over nearer slices

  let p1 = null;
  for (let n = 0; n < DRAW; n++) {
    const p2 = pts[n];
    if (!p2) continue;
    if (!p1) { p1 = p2; continue; }
    // a crest can hide the next slice entirely - keep the previous anchor so
    // the ribbon never opens a gap that the verge shows through
    if (p2.y >= maxY) continue;
    if (p2.y < horizon - 1) break;

    const gi = view3.base + n;
    const light = (Math.floor(gi / 3) % 2) === 0;
    const mow = (Math.floor(gi / 7) % 2) === 0;
    const kband = (gi % 2) === 0;
    const bandTop = Math.floor(p2.y);
    const bandH = Math.max(1, prevTop - bandTop);
    prevTop = bandTop;
    // Far slices are a pixel tall and half a fog away: the crown shading,
    // grain, racing line and painted markings are invisible there but cost the
    // same as the near ones. Detail is a strict function of the projected
    // width, so a slice never flickers between the two paths.
    const detail = p2.w > 15;

    // --- verge (tilted quads, so nothing shows through on a banked slice) --
    const far = Math.min(320, w / Math.max(0.5, p2.w) + 2.5);
    const gcol = mow ? G.near : G.alt;
    strip(c, p1, p2, -far, -1.04, gcol);
    strip(c, p1, p2, 1.04, far, gcol);
    if (!detail) {
      strip(c, p1, p2, -1.06, 1.06, R.apron);
      strip(c, p1, p2, -1, 1, light ? R.base : R.alt);
      strip(c, p1, p2, -1 - kerbW, -1, kband ? K.a : K.b);
      strip(c, p1, p2, 1, 1 + kerbW, kband ? K2.b : K2.a);
      if (p2.fog > 0.004) {
        c.save();
        const cap0 = fog.max + (1 - fog.max) * p2.tail;
        c.globalAlpha = Math.min(cap0, Math.pow(p2.fog, fog.power * 0.55));
        c.fillStyle = fog.color;
        c.fillRect(0, bandTop, w, bandH);
        c.restore();
      }
      maxY = p2.y;
      p1 = p2;
      continue;
    }
    if (!mow && G.stripeAlpha) {
      strip(c, p1, p2, -far, -1.04, G.stripe, G.stripeAlpha * 0.55);
      strip(c, p1, p2, 1.04, far, G.stripe, G.stripeAlpha * 0.55);
    }
    // soft dirt shoulder just outside the kerbs
    strip(c, p1, p2, -1.62, -1 - kerbW, G.shoulder, 0.30);
    strip(c, p1, p2, 1 + kerbW, 1.62, G.shoulder, 0.30);
    // mottled ground: irregular lighter/darker patches so the verge is not one
    // flat fill (grass clumps, drifted snow, cracked plaza slabs).
    if (G.patch && p2.w > 10) {
      // patches fade out in the very near field, where a hard-edged quad would
      // read as a rectangle rather than as ground texture
      const near = clamp((70 - p2.w) / 40, 0, 1);
      const pa = G.patchAlpha * (1 - Math.min(0.9, p2.fog)) * near;
      if (pa > 0.01) {
        for (let k = 0; k < 2; k++) {
          const seedN = gi * 2 + k;
          if (noise1(seedN, 331) > 0.40) continue;
          const side = noise1(seedN, 337) > 0.5 ? 1 : -1;
          const cx = side * (1.95 + noise1(seedN, 349) * 3.4);
          const cw = 0.18 + noise1(seedN, 353) * 0.55;
          strip(c, p1, p2, cx - cw, cx + cw,
            noise1(seedN, 359) > 0.5 ? G.patch : G.patch2 || G.patch, pa);
        }
      }
    }

    // --- asphalt ---------------------------------------------------------
    strip(c, p1, p2, -1.06, 1.06, R.apron);
    strip(c, p1, p2, -1, 1, light ? R.base : R.alt);
    // worn racing line: two darker tyre bands
    strip(c, p1, p2, -0.60, -0.24, R.worn, R.wornAlpha * 0.8);
    strip(c, p1, p2, 0.24, 0.60, R.worn, R.wornAlpha * 0.8);
    // asphalt grain speckle: a few short scuffs per slice
    if (R.grainAlpha && p2.w > 22) {
      for (let k = 0; k < 3; k++) {
        const gx = (noise1(gi * 3 + k, 7) * 1.9 - 0.95);
        const gw = 0.02 + noise1(gi * 3 + k, 19) * 0.07;
        strip(c, p1, p2, gx - gw, gx + gw,
          noise1(gi + k, 29) > 0.5 ? R.grain : R.worn, R.grainAlpha * (1 - p2.fog));
      }
    }
    // --- surface lighting -------------------------------------------------
    // The road is crowned: it falls away toward both kerbs, so the centre
    // catches the sky light and the edges sink into shadow. Six thin bands
    // fake that cylindrical shading and stop the asphalt reading as one
    // flat fill.
    const lit = 1 - Math.min(0.85, p2.fog);
    for (let s = 0; s < CROWN.length; s++) {
      const b = CROWN[s];
      strip(c, p1, p2, b[0], b[1], b[2] > 0 ? LIGHT_C : SHADE_C,
        Math.abs(b[2]) * lit);
    }
    // sun-side sheen: a soft specular band sliding with the slice depth
    if (R.sheen) {
      const sx = R.sheenSide * (0.30 + 0.34 * Math.sin(gi * 0.035));
      strip(c, p1, p2, sx - 0.30, sx + 0.30, R.sheen, R.sheenAlpha * lit);
    }
    // contact shadow where the verge meets the kerb
    strip(c, p1, p2, -1 - kerbW * 1.9, -1 - kerbW, '#000000', 0.16 * lit);
    strip(c, p1, p2, 1 + kerbW, 1 + kerbW * 1.9, '#000000', 0.16 * lit);

    // --- kerbs -----------------------------------------------------------
    const kl = kband ? K.a : K.b;
    const kr = kband ? K2.b : K2.a;
    strip(c, p1, p2, -1 - kerbW, -1, kl);
    strip(c, p1, p2, 1, 1 + kerbW, kr);
    // kerb highlight edge
    strip(c, p1, p2, -1 - kerbW, -1 - kerbW * 0.72, '#ffffff', 0.22);
    strip(c, p1, p2, 1 + kerbW * 0.72, 1 + kerbW, '#ffffff', 0.22);

    // --- ploughed snow bank hugging the kerbs (snow theme) ---------------
    if (R.berm && p2.w > 6) {
      const bh1 = R.berm.height * p1.scale * view3.hh;
      const bh2 = R.berm.height * p2.scale * view3.hh;
      for (const side of [-1, 1]) {
        const fi = side * (1 + kerbW);
        const fo = side * (1 + kerbW + 0.44);
        c.fillStyle = R.berm.shade;
        c.beginPath();
        c.moveTo(edgeX(p1, fi), edgeY(p1, fi));
        c.lineTo(edgeX(p2, fi), edgeY(p2, fi));
        c.lineTo(edgeX(p2, fo), edgeY(p2, fo) - bh2);
        c.lineTo(edgeX(p1, fo), edgeY(p1, fo) - bh1);
        c.closePath();
        c.fill();
        c.fillStyle = R.berm.color;
        c.beginPath();
        c.moveTo(edgeX(p1, fo), edgeY(p1, fo) - bh1);
        c.lineTo(edgeX(p2, fo), edgeY(p2, fo) - bh2);
        c.lineTo(edgeX(p2, side * (1 + kerbW + 0.95)), edgeY(p2, side * 1.5));
        c.lineTo(edgeX(p1, side * (1 + kerbW + 0.95)), edgeY(p1, side * 1.5));
        c.closePath();
        c.fill();
      }
    }

    // --- wet-tarmac neon smears (neon theme) ------------------------------
    if (R.wet && p2.w > 14) {
      const cols = R.wet.colors;
      const a = R.wet.alpha * (1 - Math.min(0.92, p2.fog));
      for (let k = 0; k < 2; k++) {
        const seedN = Math.floor(gi / 5) * 2 + k;
        const side = k ? 1 : -1;
        const rx = side * (0.42 + noise1(seedN, 71) * 0.5);
        strip(c, p1, p2, rx - 0.14, rx + 0.14,
          cols[Math.floor(noise1(seedN, 83) * cols.length) % cols.length], a);
      }
    }

    // --- painted lines ---------------------------------------------------
    strip(c, p1, p2, -0.965, -0.905, R.edge, 0.85);
    strip(c, p1, p2, 0.905, 0.965, R.edge, 0.85);
    if ((Math.floor(gi / 4) % 2) === 0) {
      strip(c, p1, p2, -0.022, 0.022, R.line, 0.9);
    }
    // cyan light-strips (neon theme)
    if (R.lightStrip) {
      const LS = R.lightStrip;
      strip(c, p1, p2, -1 - LS.width, -1 + LS.width * 0.3, LS.color, 0.9);
      strip(c, p1, p2, 1 - LS.width * 0.3, 1 + LS.width, LS.color, 0.9);
    }
    if (R.ice && (Math.floor(gi / 7) % 3) === 0) {
      const ix = noise1(gi, 23) * 1.4 - 0.7;
      strip(c, p1, p2, ix - 0.18, ix + 0.18, R.ice.color, R.ice.alpha);
    }

    // --- start / finish line ---------------------------------------------
    if (v.finishSeg != null) {
      const laps = view3.loopSegs || 0;
      if (laps && ((gi % laps) + laps) % laps === v.finishSeg) {
        checker(c, p1, p2);
      }
    }

    // --- distance fog ----------------------------------------------------
    if (p2.fog > 0.004) {
      c.save();
      // fog.max keeps mid-distance tarmac readable; the tail term forces the
      // final slices all the way to opaque so the draw limit never shows.
      const cap = fog.max + (1 - fog.max) * p2.tail;
      c.globalAlpha = Math.min(cap, Math.pow(p2.fog, fog.power * 0.55));
      c.fillStyle = fog.color;
      c.fillRect(0, bandTop, w, bandH);
      c.restore();
    }

    maxY = p2.y;
    p1 = p2;
  }
}

function checker(c, p1, p2) {
  const cols = 10;
  for (let i = 0; i < cols; i++) {
    const f0 = -1 + (2 * i) / cols;
    const f1 = -1 + (2 * (i + 1)) / cols;
    strip(c, p1, p2, f0, f1, i % 2 ? '#12161f' : '#ffffff', 0.96);
  }
}

/**
 * Guard rails / barrier walls. Drawn after the road so they sit on top of the
 * verge, still near-to-far for correct occlusion.
 */
export function renderRails(c, view3, scene) {
  const { pts, horizon, h } = view3;
  const RL = scene.rail;
  if (!RL) return;
  const railF = 1.30;
  let maxY = h + 40;

  let p1 = null;
  for (let n = 0; n < DRAW; n++) {
    const p2 = pts[n];
    if (!p2) continue;
    if (!p1) { p1 = p2; continue; }
    if (p2.y >= maxY) continue;
    if (p2.y < horizon - 1) break;
    maxY = p2.y;
    const gi = view3.base + n;
    const fade = 1 - Math.min(0.95, p2.fog);
    if (fade < 0.06) continue;

    for (const side of [-1, 1]) {
      const f = railF * side;
      const x1 = edgeX(p1, f); const y1 = edgeY(p1, f);
      const x2 = edgeX(p2, f); const y2 = edgeY(p2, f);
      const hh1 = RL.height * p1.scale * view3.hh * 0.5;
      const hh2 = RL.height * p2.scale * view3.hh * 0.5;
      if (hh1 < 0.7) continue;

      // the barrier lays a shadow across the verge, away from the key light
      if (RL.shadow !== false && hh1 > 1.6) {
        const sd = RL.shadowDir != null ? RL.shadowDir : -0.9;
        const dx1 = sd * hh1;
        const dx2 = sd * hh2;
        c.save();
        c.globalAlpha = fade * (RL.shadowAlpha || 0.22);
        c.fillStyle = RL.shadowColor || '#17364f';
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x2, y2);
        c.lineTo(x2 + dx2, y2 + hh2 * 0.20);
        c.lineTo(x1 + dx1, y1 + hh1 * 0.20);
        c.closePath();
        c.fill();
        c.restore();
      }

      // posts
      if (gi % RL.every === 0 && hh1 > 2.4) {
        c.fillStyle = RL.shade;
        c.fillRect(x1 - Math.max(0.7, hh1 * 0.09), y1 - hh1, Math.max(1.4, hh1 * 0.18), hh1);
      }
      // beam
      c.save();
      c.globalAlpha = fade;
      c.beginPath();
      c.moveTo(x1, y1 - hh1);
      c.lineTo(x2, y2 - hh2);
      c.lineTo(x2, y2 - hh2 * 0.36);
      c.lineTo(x1, y1 - hh1 * 0.36);
      c.closePath();
      c.fillStyle = RL.beam;
      c.fill();
      // top rail highlight
      c.beginPath();
      c.moveTo(x1, y1 - hh1);
      c.lineTo(x2, y2 - hh2);
      c.lineTo(x2, y2 - hh2 * 0.82);
      c.lineTo(x1, y1 - hh1 * 0.82);
      c.closePath();
      c.fillStyle = RL.post;
      c.fill();
      if (RL.glow) {
        // layered strokes instead of shadowBlur - same look, ~30x cheaper
        c.strokeStyle = RL.glow;
        c.globalAlpha = fade * 0.16;
        c.lineWidth = Math.max(2.5, hh1 * 0.42);
        c.beginPath();
        c.moveTo(x1, y1 - hh1 * 0.98);
        c.lineTo(x2, y2 - hh2 * 0.98);
        c.stroke();
        c.globalAlpha = fade * 0.95;
        c.lineWidth = Math.max(1, hh1 * 0.11);
        c.beginPath();
        c.moveTo(x1, y1 - hh1 * 0.98);
        c.lineTo(x2, y2 - hh2 * 0.98);
        c.stroke();
      }
      c.restore();
    }
    p1 = p2;
  }
}

export default renderRoad;
