/**
 * race-world / roadside prop billboards
 *
 * Each prop is drawn from a ground-contact point (x, y) with a pixel height
 * `s`. Shapes are stacked shaded polygons - never flat single-colour blobs -
 * so they still read as objects when the fog thins them out.
 * `seed` is the deterministic per-slot noise from geometry.js.
 */
import { rgba, mix, roundRect, ellipse, clamp } from './paint.js';
import { noise1 } from './geometry.js';
import { drawCrowd, fanId } from './crowd.js';
import { lightOf, groundShadow } from './shading.js';

/**
 * Per-prop contact shadows are laid down centrally by scenery.js (which knows
 * the theme's key light), so the individual prop bodies only add a faint
 * ambient darkening right at their own footprint.
 */
function shadow(c, x, y, rx) {
  ellipse(c, x, y, rx * 0.8, rx * 0.22, 'rgba(0,0,0,1)', 0.10);
}

/**
 * Ground footprint profile per prop type: `r` is the footprint radius as a
 * fraction of the prop's pixel height, `tall` how much of that height throws a
 * long cast streak (0 = flat on the ground, 1 = a full pole).
 */
export const FOOTPRINT = {
  tree: { r: 0.42, tall: 0.62 },
  tree2: { r: 0.40, tall: 0.60 },
  bush: { r: 0.44, tall: 0.30 },
  flowers: { r: 0.30, tall: 0.20 },
  tuft: { r: 0.34, tall: 0.10 },
  fence: { r: 0.30, tall: 0.45 },
  sign: { r: 0.22, tall: 0.70 },
  balloon: { r: 0.10, tall: 0.08 },
  spectator: { r: 0.46, tall: 0.50 },
  billboard: { r: 0.30, tall: 0.75 },
  tower: { r: 0.34, tall: 0.85 },
  streetlight: { r: 0.16, tall: 0.85 },
  neonsign: { r: 0.24, tall: 0.70 },
  chevron: { r: 0.26, tall: 0.40 },
  palmneon: { r: 0.22, tall: 0.72 },
  pine: { r: 0.36, tall: 0.66 },
  snowbank: { r: 0.58, tall: 0.16 },
  crystal: { r: 0.30, tall: 0.55 },
  rock: { r: 0.46, tall: 0.32 },
  cliff: { r: 0.85, tall: 0.55 },
};

/* ---------------------------------------------------- foliage primitives */

/** rgba() only understands #rrggbb; fall back to a warm rim for anything else. */
function hex(v) { return typeof v === 'string' && v[0] === '#' ? v : '#fff4c8'; }

/** Which way the key light comes FROM (shadows fall the other way). */
function litSide(sc) {
  const L = lightOf(sc);
  const d = L && L.dirX != null ? L.dirX : -0.9;
  return d < 0 ? 1 : -1;
}

/**
 * Scalloped foliage outline: an ellipse whose radius wobbles per lobe, so the
 * silhouette reads as clustered leaves rather than as a drawn circle. `salt`
 * makes every canopy on the track a different shape.
 */
function leafPath(c, cx, cy, rx, ry, lobes, salt, amt = 0.13) {
  const n = Math.max(6, lobes);
  const pt = (i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const k = 1 + amt * (noise1(((i % n) + n) % n + salt, 617) - 0.42) * 2;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  };
  // Catmull-Rom-ish: draw through the lobe points with quadratic midpoints so
  // the outline is a soft cluster of leaves, never a spiky star.
  c.beginPath();
  let prev = pt(0);
  const first = [(prev[0] + pt(1)[0]) / 2, (prev[1] + pt(1)[1]) / 2];
  c.moveTo(first[0], first[1]);
  for (let i = 1; i <= n; i++) {
    const cur = pt(i);
    const nxt = pt(i + 1);
    c.quadraticCurveTo(cur[0], cur[1], (cur[0] + nxt[0]) / 2, (cur[1] + nxt[1]) / 2);
    prev = cur;
  }
  c.closePath();
}

/**
 * One shaded foliage mass: base tone, a lit crown lobe on the sun side, a
 * cool bounce on the shaded underside and a thin rim along the sunward edge.
 */
function foliage(c, cx, cy, rx, ry, base, lite, dark, rim, side, salt, lobes = 9) {
  // shaded base mass
  leafPath(c, cx, cy, rx, ry, lobes, salt);
  c.fillStyle = dark;
  c.fill();
  // main body, lifted toward the light
  leafPath(c, cx + side * rx * 0.06, cy - ry * 0.08, rx * 0.94, ry * 0.94, lobes, salt + 31);
  c.fillStyle = base;
  c.fill();
  // sunlit crown: a smaller cluster riding the top-sun quadrant, faded into
  // the mass so it reads as light falling on leaves, not as a pasted decal
  const ccx = cx + side * rx * 0.30;
  const ccy = cy - ry * 0.34;
  const cr = Math.max(1, rx * 0.60);
  const lg = c.createRadialGradient(ccx + side * cr * 0.2, ccy - cr * 0.25, cr * 0.08,
    ccx, ccy, cr);
  lg.addColorStop(0, lite);
  lg.addColorStop(0.55, rgba(hex(lite), 0.72));
  lg.addColorStop(1, rgba(hex(lite), 0));
  leafPath(c, ccx, ccy, rx * 0.58, ry * 0.52, Math.max(6, lobes - 2), salt + 61, 0.20);
  c.fillStyle = lg;
  c.fill();
  // volume gradient across the whole mass (lit -> shadow)
  const g = c.createLinearGradient(cx + side * rx, cy - ry, cx - side * rx, cy + ry);
  g.addColorStop(0, rgba('#ffffff', 0.20));
  g.addColorStop(0.45, rgba('#ffffff', 0));
  g.addColorStop(1, rgba('#04240f', 0.34));
  leafPath(c, cx, cy, rx * 1.03, ry * 1.03, lobes, salt);
  c.fillStyle = g;
  c.fill();
  // leaf grain: a scatter of clustered dots so a big canopy is not one smooth
  // dome. Only worth the cost once the mass is a decent size on screen.
  if (rx > 14) {
    c.save();
    leafPath(c, cx, cy, rx, ry, lobes, salt);
    c.clip();
    for (let i = 0; i < 26; i++) {
      const a = noise1(salt + i, 701) * Math.PI * 2;
      const rr = Math.sqrt(noise1(salt + i, 703)) * 0.95;
      const px = cx + Math.cos(a) * rx * rr;
      const py = cy + Math.sin(a) * ry * rr;
      const up = noise1(salt + i, 705) > 0.5;
      c.globalAlpha = 0.10 + noise1(salt + i, 707) * 0.13;
      c.fillStyle = up ? lite : dark;
      c.beginPath();
      c.ellipse(px, py, rx * 0.10, ry * 0.07, a, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // rim light: an inner stroke that only survives on the top-sun edge, because
  // its own stroke gradient fades to nothing across the mass
  if (rx > 7) {
    c.save();
    leafPath(c, cx, cy, rx, ry, lobes, salt);
    c.clip();
    const rg = c.createLinearGradient(cx + side * rx, cy - ry, cx - side * rx * 0.4, cy + ry * 0.7);
    rg.addColorStop(0, rgba(hex(rim), 0.62));
    rg.addColorStop(0.42, rgba(hex(rim), 0.10));
    rg.addColorStop(1, rgba(hex(rim), 0));
    c.strokeStyle = rg;
    c.lineWidth = Math.max(1.2, rx * 0.16);
    leafPath(c, cx, cy, rx, ry, lobes, salt);
    c.stroke();
    c.restore();
  }
}

/** Tapered trunk with a root flare, a lit face and bark striations. */
function trunk(c, x, y, hgt, wid, col, side) {
  const top = y - hgt;
  c.beginPath();
  c.moveTo(x - wid * 1.55, y);
  c.quadraticCurveTo(x - wid * 0.86, y - hgt * 0.22, x - wid * 0.52, top);
  c.lineTo(x + wid * 0.52, top);
  c.quadraticCurveTo(x + wid * 0.86, y - hgt * 0.22, x + wid * 1.55, y);
  c.closePath();
  const g = c.createLinearGradient(x - wid * 1.6, 0, x + wid * 1.6, 0);
  const a = side > 0 ? 0 : 1;
  g.addColorStop(a, mix(col, '#ffe0a8', 0.42));
  g.addColorStop(0.5, col);
  g.addColorStop(1 - a, mix(col, '#20140a', 0.55));
  c.fillStyle = g;
  c.fill();
  if (wid > 1.4) {
    c.save();
    c.globalAlpha = 0.22;
    c.strokeStyle = '#2a1a0e';
    c.lineWidth = Math.max(0.6, wid * 0.22);
    for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.moveTo(x + (i ? wid * 0.35 : -wid * 0.30), y - hgt * 0.06);
      c.lineTo(x + (i ? wid * 0.20 : -wid * 0.16), top + hgt * 0.1);
      c.stroke();
    }
    c.restore();
  }
}

/* ------------------------------------------------------------------ grass */

export function tree(c, x, y, s, sc, seed) {
  const P = sc.palette;
  const side = litSide(sc);
  const salt = Math.floor(seed * 7919);
  const tw = Math.max(1.0, s * 0.055);
  shadow(c, x, y, s * 0.34);
  trunk(c, x, y, s * 0.50, tw, P.trunk, side);
  // a fork branch reaching into the canopy
  c.save();
  c.strokeStyle = mix(P.trunk, '#20140a', 0.3);
  c.lineWidth = Math.max(0.8, tw * 0.8);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x, y - s * 0.36);
  c.lineTo(x - side * s * 0.11, y - s * 0.55);
  c.stroke();
  c.restore();

  const dark = mix(P.treeB, '#062a12', 0.42);
  const rim = (sc.light && sc.light.rim) || '#fff4c8';
  // three overlapping masses -> a canopy with real internal depth
  foliage(c, x - side * s * 0.19, y - s * 0.56, s * 0.27, s * 0.24,
    P.treeB, P.treeA, dark, rim, side, salt + 3, 8);
  foliage(c, x + side * s * 0.20, y - s * 0.62, s * 0.26, s * 0.23,
    P.treeB, P.treeA, dark, rim, side, salt + 9, 8);
  foliage(c, x + side * s * 0.02, y - s * 0.80, s * 0.34, s * 0.30,
    P.treeA, P.treeC, mix(P.treeB, '#062a12', 0.25), rim, side, salt + 17, 10);
  // occlusion where the canopy sits down over the trunk
  c.save();
  c.globalAlpha = 0.26;
  c.fillStyle = '#062a12';
  c.beginPath();
  c.ellipse(x, y - s * 0.50, s * 0.20, s * 0.08, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Rounder, apple-tree style silhouette for variety. */
export function tree2(c, x, y, s, sc, seed) {
  const P = sc.palette;
  const side = litSide(sc);
  const salt = Math.floor(seed * 6151) + 101;
  shadow(c, x, y, s * 0.3);
  trunk(c, x, y, s * 0.44, Math.max(0.9, s * 0.048), P.trunk, side);
  const rim = (sc.light && sc.light.rim) || '#fff4c8';
  foliage(c, x, y - s * 0.66, s * 0.36, s * 0.31,
    P.treeB, P.treeC, mix(P.treeB, '#062a12', 0.45), rim, side, salt, 11);
  if (seed > 0.5) {
    // fruit, tucked into the shaded half so they read as hanging in the leaves
    for (let i = 0; i < 4; i++) {
      const fx = x + (noise1(i + salt, 3) - 0.5) * s * 0.52;
      const fy = y - s * (0.54 + noise1(i + salt, 9) * 0.22);
      const r = s * 0.036;
      ellipse(c, fx, fy, r, r, '#c9241f');
      ellipse(c, fx - side * r * 0.3, fy - r * 0.32, r * 0.42, r * 0.34, '#ff7a62', 0.85);
    }
  }
}

export function bush(c, x, y, s, sc, seed = 0.5) {
  const P = sc.palette;
  const side = litSide(sc);
  const salt = Math.floor(seed * 4093) + 211;
  const rim = (sc.light && sc.light.rim) || '#fff4c8';
  const dark = mix(P.treeB, '#062a12', 0.45);
  shadow(c, x, y, s * 0.3);
  foliage(c, x - side * s * 0.20, y - s * 0.20, s * 0.24, s * 0.20,
    P.treeB, P.treeA, dark, rim, side, salt, 8);
  foliage(c, x + side * s * 0.19, y - s * 0.24, s * 0.25, s * 0.21,
    P.treeB, P.treeA, dark, rim, side, salt + 13, 8);
  foliage(c, x, y - s * 0.34, s * 0.27, s * 0.23,
    P.treeA, P.treeC, dark, rim, side, salt + 29, 9);
  // a few berry specks so a hedge is not one green lump
  if (s > 16 && seed > 0.4) {
    for (let i = 0; i < 3; i++) {
      ellipse(c, x + (noise1(i + salt, 71) - 0.5) * s * 0.5,
        y - s * (0.18 + noise1(i + salt, 73) * 0.28), s * 0.026, s * 0.026, '#ffd63b', 0.9);
    }
  }
}

/**
 * A clump of standing grass blades (or a wind-carved snow lump on the snow
 * theme). Small, dense and scattered thickly, this is what makes the verge read
 * as a textured field instead of a green gradient.
 */
export function tuft(c, x, y, s, sc, seed) {
  const D = sc.detail || {};
  const cols = D.tuft || ['#3f9c46', '#59c05a', '#2c7a38'];
  const salt = Math.floor(seed * 8191) + 5;
  if (D.lump) {
    // wind drift: a long low ridge, lit crown, cool shaded skirt. Aspect and
    // angle vary per lump so a field of them reads as blown snow, not pebbles.
    const side = litSide(sc);
    const el = 1.0 + noise1(salt, 601) * 1.9;
    const rot = (noise1(salt, 603) - 0.5) * 0.5;
    c.save();
    c.translate(x, y);
    c.rotate(rot * 0.25);
    c.globalAlpha *= 0.85;
    ellipse(c, 0, 0, s * 0.42 * el, s * 0.13, mix(cols[2] || '#b6ccdf', '#8aa6c2', 0.25));
    ellipse(c, -side * s * 0.05, -s * 0.05, s * 0.36 * el, s * 0.11, cols[1] || '#ffffff');
    ellipse(c, side * s * 0.10 * el, -s * 0.07, s * 0.18 * el, s * 0.05, '#ffffff', 0.7);
    c.restore();
    return;
  }
  // soft base shadow so the clump is planted, not floating
  ellipse(c, x, y, s * 0.42, s * 0.12, '#0d3a18', 0.16);
  c.lineCap = 'round';
  const n = 7;
  for (let i = 0; i < n; i++) {
    const dx = (noise1(salt + i, 811) - 0.5) * s * 0.9;
    const hgt = s * (0.42 + noise1(salt + i, 821) * 0.72);
    const bend = (noise1(salt + i, 823) - 0.5) * s * 0.42;
    c.strokeStyle = cols[(salt + i) % cols.length];
    c.lineWidth = Math.max(0.7, s * 0.055);
    c.beginPath();
    c.moveTo(x + dx, y);
    c.quadraticCurveTo(x + dx + bend * 0.4, y - hgt * 0.6, x + dx + bend, y - hgt);
    c.stroke();
  }
  // a couple of blossoms on top of the clump
  const fl = D.flower || ['#ffffff', '#ffd63b'];
  if (s > 5 && noise1(salt, 829) < (D.flowerRate != null ? D.flowerRate : 0.3)) {
    for (let i = 0; i < 2; i++) {
      const fx = x + (noise1(salt + i, 831) - 0.5) * s * 0.8;
      const fy = y - s * (0.55 + noise1(salt + i, 833) * 0.5);
      const r = Math.max(0.6, s * 0.062);
      ellipse(c, fx, fy, r, r * 0.9, fl[(salt + i) % fl.length]);
      ellipse(c, fx, fy, r * 0.36, r * 0.32, '#ffd63b', 0.9);
    }
  }
}

/**
 * A flowerbed: a low mound of foliage with a dozen small blossoms sitting in
 * it. Small heads, many of them - a handful of big floating discs is exactly
 * what made the old verge read as clip-art.
 */
export function flowers(c, x, y, s, sc, seed) {
  const D = sc.detail || {};
  const cols = D.flower || ['#ff6f9c', '#ffd63b', '#ffffff', '#8fd8ff'];
  const leaf = (D.tuft && D.tuft[0]) || '#3f9c46';
  const salt = Math.floor(seed * 3571) + 17;
  ellipse(c, x, y, s * 0.5, s * 0.13, '#0d3a18', 0.16);
  // foliage mound
  ellipse(c, x, y - s * 0.10, s * 0.46, s * 0.17, mix(leaf, '#0d3a18', 0.32));
  ellipse(c, x - s * 0.04, y - s * 0.15, s * 0.40, s * 0.14, leaf);
  c.strokeStyle = mix(leaf, '#0d3a18', 0.2);
  c.lineWidth = Math.max(0.6, s * 0.026);
  c.lineCap = 'round';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const dx = (noise1(salt + i, 55) - 0.5) * s * 1.05;
    const hgt = s * (0.24 + noise1(salt + i, 66) * 0.34);
    c.beginPath();
    c.moveTo(x + dx * 0.85, y - s * 0.10);
    c.quadraticCurveTo(x + dx, y - hgt * 0.6, x + dx * 1.06, y - hgt);
    c.stroke();
  }
  for (let i = 0; i < n; i++) {
    const dx = (noise1(salt + i, 55) - 0.5) * s * 1.05;
    const hgt = s * (0.24 + noise1(salt + i, 66) * 0.34);
    const r = Math.max(0.7, s * 0.048);
    const col = cols[(salt + i) % cols.length];
    ellipse(c, x + dx * 1.06, y - hgt, r, r * 0.92, col);
    ellipse(c, x + dx * 1.06, y - hgt, r * 0.34, r * 0.30, '#ffd63b', 0.9);
  }
}

export function fence(c, x, y, s, sc) {
  const col = '#f4f7fb';
  const dk = '#c6d2df';
  for (const px of [-0.58, 0, 0.58]) {
    c.fillStyle = dk;
    c.fillRect(x + px * s - s * 0.06, y - s * 0.5, s * 0.12, s * 0.5);
    c.fillStyle = col;
    c.fillRect(x + px * s - s * 0.06, y - s * 0.5, s * 0.08, s * 0.5);
  }
  c.fillStyle = col;
  c.fillRect(x - s * 0.6, y - s * 0.42, s * 1.2, s * 0.08);
  c.fillRect(x - s * 0.6, y - s * 0.22, s * 1.2, s * 0.08);
  c.fillStyle = rgba('#000000', 0.12);
  c.fillRect(x - s * 0.6, y - s * 0.36, s * 1.2, s * 0.02);
}

export function sign(c, x, y, s, sc, seed) {
  shadow(c, x, y, s * 0.2);
  c.fillStyle = '#8a9099';
  c.fillRect(x - s * 0.035, y - s * 0.62, s * 0.07, s * 0.62);
  const w = s * 0.52; const hgt = s * 0.34;
  c.fillStyle = seed > 0.5 ? '#ffd63b' : '#2f8ede';
  roundRect(c, x - w / 2, y - s * 0.98, w, hgt, s * 0.06);
  c.fill();
  c.strokeStyle = '#ffffff';
  c.lineWidth = Math.max(1, s * 0.03);
  roundRect(c, x - w / 2 + s * 0.03, y - s * 0.95, w - s * 0.06, hgt - s * 0.06, s * 0.05);
  c.stroke();
  c.fillStyle = '#ffffff';
  c.fillRect(x - w * 0.22, y - s * 0.86, w * 0.44, hgt * 0.14);
}

export function balloon(c, x, y, s, sc, seed) {
  const cols = ['#e8433c', '#ffd63b', '#2f8ede', '#5fd08a'];
  const col = cols[Math.floor(seed * 4) % 4];
  const by = y - s * 1.25;
  c.strokeStyle = rgba('#ffffff', 0.5);
  c.lineWidth = Math.max(0.6, s * 0.015);
  c.beginPath();
  c.moveTo(x, y - s * 0.1);
  c.lineTo(x, by + s * 0.28);
  c.stroke();
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x, by, s * 0.28, s * 0.32, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = rgba('#ffffff', 0.35);
  c.beginPath();
  c.ellipse(x - s * 0.09, by - s * 0.1, s * 0.09, s * 0.12, -0.4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = mix(col, '#000000', 0.35);
  c.beginPath();
  c.moveTo(x - s * 0.05, by + s * 0.3);
  c.lineTo(x + s * 0.05, by + s * 0.3);
  c.lineTo(x, by + s * 0.38);
  c.closePath();
  c.fill();
}

/* ------------------------------------------------------------------- neon */

function neonText(c, x, y, w, h, col, seed) {
  // abstract "signage": glowing bars standing in for letters
  c.save();
  // shadowBlur is the single most expensive canvas op in the neon theme;
  // reserve it for the near-field signs where the bloom actually reads.
  if (h > 70) { c.shadowColor = col; c.shadowBlur = Math.min(20, h * 0.5); }
  c.fillStyle = col;
  const n = 3 + Math.floor(seed * 3);
  for (let i = 0; i < n; i++) {
    const bw = w / (n * 1.7);
    c.fillRect(x - w / 2 + i * (w / n) + bw * 0.3, y - h * (0.35 + noise1(i, 12) * 0.35),
      bw, h * (0.3 + noise1(i, 44) * 0.4));
  }
  c.restore();
}

export function billboard(c, x, y, s, sc, seed) {
  const P = sc.palette;
  const cols = [P.neonA, P.neonB, P.neonC, P.neonD];
  const col = cols[Math.floor(seed * 4) % 4];
  const w = s * 1.05; const hgt = s * 0.62;
  const top = y - s * 1.32;
  // legs
  c.fillStyle = '#232c55';
  c.fillRect(x - s * 0.05, top + hgt, s * 0.045, s * 1.32 - hgt);
  c.fillRect(x + s * 0.02, top + hgt, s * 0.045, s * 1.32 - hgt);
  // panel
  c.fillStyle = '#0d1230';
  roundRect(c, x - w / 2, top, w, hgt, s * 0.05);
  c.fill();
  const g = c.createLinearGradient(0, top, 0, top + hgt);
  g.addColorStop(0, rgba(col, 0.42));
  g.addColorStop(1, rgba(col, 0.10));
  c.fillStyle = g;
  roundRect(c, x - w / 2, top, w, hgt, s * 0.05);
  c.fill();
  c.strokeStyle = rgba(col, 0.95);
  c.lineWidth = Math.max(1, s * 0.028);
  c.save();
  if (s > 95) { c.shadowColor = col; c.shadowBlur = Math.min(22, s * 0.3); }
  roundRect(c, x - w / 2, top, w, hgt, s * 0.05);
  c.stroke();
  c.restore();
  neonText(c, x, top + hgt * 0.62, w * 0.72, hgt * 0.7, col, seed);
  // spill onto the ground
  c.save();
  c.globalAlpha = 0.18;
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x, y, w * 0.7, s * 0.09, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export function tower(c, x, y, s, sc, seed) {
  const P = sc.palette;
  const w = s * 0.72;
  const hgt = s * (1.5 + seed * 1.4);
  c.fillStyle = '#111838';
  c.fillRect(x - w / 2, y - hgt, w, hgt);
  c.fillStyle = '#1b2350';
  c.fillRect(x - w / 2, y - hgt, w * 0.36, hgt);
  const cols = Math.max(2, Math.floor(w / 8));
  const rows = Math.max(4, Math.floor(hgt / 13));
  for (let cx = 0; cx < cols; cx++) {
    for (let ry = 0; ry < rows; ry++) {
      const nn = noise1(Math.floor(x) * 13 + cx * 5 + ry * 29, 71);
      if (nn > 0.55) continue;
      c.fillStyle = rgba(nn > 0.3 ? '#ffd36a' : '#8fd8ff', 0.4 + nn);
      c.fillRect(x - w / 2 + 2 + cx * (w - 4) / cols, y - hgt + 4 + ry * (hgt - 8) / rows,
        Math.max(1.5, (w - 4) / cols - 3), Math.max(1.5, (hgt - 8) / rows - 5));
    }
  }
  const col = [P.neonA, P.neonB, P.neonD][Math.floor(seed * 3) % 3];
  c.save();
  if (s > 95) { c.shadowColor = col; c.shadowBlur = Math.min(20, s * 0.26); }
  c.fillStyle = col;
  c.fillRect(x - w / 2, y - hgt - s * 0.03, w, Math.max(1.5, s * 0.035));
  c.restore();
}

export function streetlight(c, x, y, s, sc, seed) {
  const col = sc.palette.neonA;
  const hgt = s * 1.15;
  c.fillStyle = '#2b3560';
  c.fillRect(x - s * 0.035, y - hgt, s * 0.07, hgt);
  c.fillRect(x - s * 0.035, y - hgt, s * 0.3, s * 0.05);
  c.save();
  if (s > 90) { c.shadowColor = col; c.shadowBlur = Math.min(22, s * 0.4); }
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x + s * 0.26, y - hgt + s * 0.06, s * 0.075, s * 0.05, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  const g = c.createLinearGradient(x, y - hgt, x, y);
  g.addColorStop(0, rgba(col, 0.30));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(x + s * 0.26, y - hgt + s * 0.08);
  c.lineTo(x + s * 0.72, y);
  c.lineTo(x - s * 0.2, y);
  c.closePath();
  c.fill();
}

export function neonsign(c, x, y, s, sc, seed) {
  const P = sc.palette;
  const col = [P.neonB, P.neonC, P.neonA][Math.floor(seed * 3) % 3];
  const hgt = s * 1.0;
  c.fillStyle = '#1a2148';
  c.fillRect(x - s * 0.03, y - hgt, s * 0.06, hgt);
  c.save();
  if (s > 90) { c.shadowColor = col; c.shadowBlur = Math.min(22, s * 0.4); }
  c.strokeStyle = col;
  c.lineWidth = Math.max(1.2, s * 0.05);
  c.beginPath();
  c.arc(x, y - hgt - s * 0.16, s * 0.24, 0.2, Math.PI * 1.8);
  c.stroke();
  c.beginPath();
  c.moveTo(x - s * 0.3, y - hgt + s * 0.22);
  c.lineTo(x + s * 0.3, y - hgt + s * 0.22);
  c.stroke();
  c.restore();
}

export function chevron(c, x, y, s, sc, seed) {
  const dir = seed > 0.5 ? 1 : -1;
  c.fillStyle = '#1c2450';
  c.fillRect(x - s * 0.5, y - s * 0.5, s, s * 0.5);
  c.fillStyle = '#ffd63b';
  for (let i = 0; i < 3; i++) {
    const bx = x - s * 0.34 + i * s * 0.32;
    c.beginPath();
    c.moveTo(bx, y - s * 0.44);
    c.lineTo(bx + dir * s * 0.16, y - s * 0.25);
    c.lineTo(bx, y - s * 0.06);
    c.lineTo(bx - dir * s * 0.06, y - s * 0.06);
    c.lineTo(bx + dir * s * 0.1, y - s * 0.25);
    c.lineTo(bx - dir * s * 0.06, y - s * 0.44);
    c.closePath();
    c.fill();
  }
}

export function palmneon(c, x, y, s, sc, seed) {
  const col = sc.palette.neonB;
  c.strokeStyle = '#2a3560';
  c.lineWidth = Math.max(1.2, s * 0.06);
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x + s * 0.08, y - s * 0.6, x + s * 0.02, y - s * 1.0);
  c.stroke();
  c.save();
  if (s > 90) { c.shadowColor = col; c.shadowBlur = Math.min(18, s * 0.34); }
  c.strokeStyle = col;
  c.lineWidth = Math.max(1, s * 0.04);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * 0.85 + i * 0.42;
    c.beginPath();
    c.moveTo(x + s * 0.02, y - s * 1.0);
    c.quadraticCurveTo(x + Math.cos(a) * s * 0.3, y - s * 1.0 + Math.sin(a) * s * 0.24,
      x + Math.cos(a) * s * 0.52, y - s * 0.92 + Math.sin(a) * s * 0.3);
    c.stroke();
  }
  c.restore();
}

/* ------------------------------------------------------------------- snow */

export function pine(c, x, y, s, sc, seed) {
  const P = sc.palette;
  const side = litSide(sc);
  const salt = Math.floor(seed * 5171) + 7;
  shadow(c, x, y, s * 0.26);
  trunk(c, x, y, s * 0.24, Math.max(0.8, s * 0.036), P.trunk, side);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const wid = s * (0.38 - t * 0.24);
    const by = y - s * (0.16 + t * 0.60);
    const ty = by - s * (0.30 - t * 0.06);
    // ragged bough edge rather than a clean triangle
    c.beginPath();
    c.moveTo(x, ty);
    const steps = 5;
    for (let k = 1; k <= steps; k++) {
      const f = k / steps;
      const jag = 0.82 + noise1(salt + i * 11 + k, 233) * 0.32;
      c.lineTo(x + wid * f * jag, by - wid * 0.10 * (1 - f));
      c.lineTo(x + wid * f * jag * 0.86, by + s * 0.012);
    }
    for (let k = steps; k >= 1; k--) {
      const f = k / steps;
      const jag = 0.82 + noise1(salt + i * 11 + k, 239) * 0.32;
      c.lineTo(x - wid * f * jag * 0.86, by + s * 0.012);
      c.lineTo(x - wid * f * jag, by - wid * 0.10 * (1 - f));
    }
    c.closePath();
    const g = c.createLinearGradient(x + side * wid, ty, x - side * wid, by);
    g.addColorStop(0, mix(i % 2 ? P.pineB : P.pineA, '#dff4ff', 0.28));
    g.addColorStop(0.5, i % 2 ? P.pineB : P.pineA);
    g.addColorStop(1, mix(i % 2 ? P.pineB : P.pineA, '#04121f', 0.45));
    c.fillStyle = g;
    c.fill();
    // snow load piled on the upper faces of the bough
    c.save();
    c.globalAlpha = 0.9;
    c.fillStyle = P.snow;
    c.beginPath();
    c.moveTo(x, ty);
    for (let k = 1; k <= steps; k++) {
      const f = k / steps;
      const jag = 0.80 + noise1(salt + i * 11 + k, 233) * 0.30;
      c.lineTo(x + side * wid * f * jag, by - wid * 0.12 * (1 - f));
    }
    c.lineTo(x + side * wid * 0.55, by - wid * 0.02);
    c.lineTo(x + side * wid * 0.12, by - s * 0.06);
    c.closePath();
    c.fill();
    c.restore();
  }
}

export function snowbank(c, x, y, s, sc) {
  const P = sc.palette;
  c.fillStyle = '#c3d8e8';
  c.beginPath();
  c.ellipse(x, y, s * 0.75, s * 0.26, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = P.snow;
  c.beginPath();
  c.ellipse(x - s * 0.08, y - s * 0.05, s * 0.66, s * 0.22, 0, Math.PI, 0);
  c.fill();
  c.save();
  c.globalAlpha = 0.35;
  c.fillStyle = '#8fc4e8';
  c.beginPath();
  c.ellipse(x + s * 0.3, y - s * 0.02, s * 0.3, s * 0.09, 0, Math.PI, 0);
  c.fill();
  c.restore();
}

export function crystal(c, x, y, s, sc, seed) {
  const cols = ['#7fdcff', '#a9c8ff', '#c9f0ff'];
  for (let i = 0; i < 3; i++) {
    const dx = (noise1(i, 21) - 0.5) * s * 0.7;
    const hgt = s * (0.5 + noise1(i, 27) * 0.7);
    const wid = s * (0.10 + noise1(i, 33) * 0.09);
    c.fillStyle = cols[i % 3];
    c.beginPath();
    c.moveTo(x + dx, y - hgt);
    c.lineTo(x + dx + wid, y - hgt * 0.42);
    c.lineTo(x + dx + wid * 0.7, y);
    c.lineTo(x + dx - wid * 0.7, y);
    c.lineTo(x + dx - wid, y - hgt * 0.42);
    c.closePath();
    c.fill();
    c.save();
    c.globalAlpha = 0.5;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(x + dx, y - hgt);
    c.lineTo(x + dx + wid * 0.35, y - hgt * 0.4);
    c.lineTo(x + dx, y);
    c.closePath();
    c.fill();
    c.restore();
  }
}

export function rock(c, x, y, s, sc, seed) {
  c.fillStyle = '#6f7d8c';
  c.beginPath();
  c.moveTo(x - s * 0.42, y);
  c.lineTo(x - s * 0.30, y - s * 0.36);
  c.lineTo(x - s * 0.02, y - s * 0.52);
  c.lineTo(x + s * 0.30, y - s * 0.34);
  c.lineTo(x + s * 0.44, y);
  c.closePath();
  c.fill();
  c.fillStyle = '#8b98a6';
  c.beginPath();
  c.moveTo(x - s * 0.30, y - s * 0.36);
  c.lineTo(x - s * 0.02, y - s * 0.52);
  c.lineTo(x + s * 0.06, y - s * 0.2);
  c.lineTo(x - s * 0.2, y - s * 0.1);
  c.closePath();
  c.fill();
  c.fillStyle = '#f2fbff';
  c.beginPath();
  c.moveTo(x - s * 0.32, y - s * 0.34);
  c.lineTo(x - s * 0.02, y - s * 0.52);
  c.lineTo(x + s * 0.28, y - s * 0.33);
  c.lineTo(x + s * 0.05, y - s * 0.30);
  c.closePath();
  c.fill();
}

/**
 * Grey rock cliff face, snow-dusted on every ledge. The snow reference frames
 * the pass with rock walls rather than open white field, so these line the
 * verge and give the theme its "mountain pass" read.
 */
export function cliff(c, x, y, s, sc, seed) {
  const rock = '#7b8798';
  const dark = '#5c687a';
  const lite = '#98a5b6';
  const snow = (sc.palette && sc.palette.snow) || '#f6fbff';
  const w = s * (0.62 + seed * 0.5);
  const hgt = s * (0.9 + noise1(Math.floor(seed * 7919), 3) * 0.8);
  shadow(c, x, y, w * 0.9);
  // two overlapping faceted slabs so the wall has a lit and a shaded face
  const jag = (n, salt) => noise1(Math.floor(seed * 7919) + n, salt);
  for (let k = 0; k < 2; k++) {
    const off = k ? w * 0.34 : -w * 0.28;
    const kh = hgt * (k ? 0.78 : 1);
    const kw = w * (k ? 0.72 : 0.9);
    c.beginPath();
    c.moveTo(x + off - kw, y);
    c.lineTo(x + off - kw * 0.82, y - kh * 0.46);
    c.lineTo(x + off - kw * (0.22 + jag(k, 11) * 0.3), y - kh);
    c.lineTo(x + off + kw * (0.28 + jag(k, 13) * 0.34), y - kh * (0.74 + jag(k, 17) * 0.2));
    c.lineTo(x + off + kw * 0.88, y - kh * 0.34);
    c.lineTo(x + off + kw, y);
    c.closePath();
    c.fillStyle = k ? lite : rock;
    c.fill();
    // shaded right flank
    c.beginPath();
    c.moveTo(x + off + kw * (0.28 + jag(k, 13) * 0.34), y - kh * (0.74 + jag(k, 17) * 0.2));
    c.lineTo(x + off + kw * 0.88, y - kh * 0.34);
    c.lineTo(x + off + kw, y);
    c.lineTo(x + off + kw * 0.2, y);
    c.closePath();
    c.fillStyle = dark;
    c.fill();
    // snow on the crest
    c.beginPath();
    c.moveTo(x + off - kw * 0.82, y - kh * 0.46);
    c.lineTo(x + off - kw * (0.22 + jag(k, 11) * 0.3), y - kh);
    c.lineTo(x + off + kw * (0.28 + jag(k, 13) * 0.34), y - kh * (0.74 + jag(k, 17) * 0.2));
    c.lineTo(x + off + kw * 0.1, y - kh * 0.58);
    c.lineTo(x + off - kw * 0.4, y - kh * 0.66);
    c.closePath();
    c.fillStyle = snow;
    c.fill();
  }
}

/* ------------------------------------------------- roadside spectators */

/**
 * Cheering crowd creatures. The reference shot lines the verge with little
 * Pokemon waving the field past, so the grandstand is made of species rather
 * than generic people: each entry carries its own body colour, ear silhouette
 * and marking so no two neighbours read as the same blob.
 */
const FANS = [
  { fur: '#c9a06a', belly: '#f0dcb8', ear: 'long', tuft: '#f0dcb8', mark: 'collar' },
  { fur: '#b06a3c', belly: '#f2d9a8', ear: 'round', mark: 'stripe' },
  { fur: '#f2d24a', belly: '#fdf0b0', ear: 'spike', mark: 'cheek' },
  { fur: '#8fd06a', belly: '#dff0c0', ear: 'leaf', mark: 'none' },
  { fur: '#7fb8e8', belly: '#dcf0ff', ear: 'fin', mark: 'stripe' },
  { fur: '#e58aa8', belly: '#ffdfe8', ear: 'round', mark: 'cheek' },
  { fur: '#a48ce0', belly: '#e2d8ff', ear: 'spike', mark: 'none' },
  { fur: '#6f6f7a', belly: '#cfd2dc', ear: 'cat', mark: 'collar' },
];

export function spectator(c, x, y, s, sc, seed) {
  // Preferred path: the canonical per-species silhouettes from core/avatars.js,
  // baked with a light side, a rim and foot occlusion (see ./crowd.js), drawn
  // as a little knot of 1-3 different species the way the reference lines its
  // verge. The hand-drawn fallback below only runs while a raster is decoding.
  const L = lightOf(sc);
  const salt = Math.floor(seed * 9973);
  const n = 1 + (noise1(salt, 131) > 0.42 ? 1 : 0) + (noise1(salt, 137) > 0.74 ? 1 : 0);
  let drew = 0;
  for (let i = n - 1; i >= 0; i--) {
    // back rows stand slightly further away: smaller, higher, dimmed
    const depth = i / Math.max(1, n);
    const sd = noise1(salt + i * 7, 149);
    const ss = s * (1 - depth * 0.24) * (0.86 + noise1(salt + i * 7, 151) * 0.30);
    const ox = (i === 0 ? 0 : (sd - 0.5) * s * 1.5);
    const oy = -depth * s * 0.16;
    c.save();
    if (i > 0) c.globalAlpha *= 0.94;
    groundShadow(c, x + ox, y + oy, ss * 0.30, { light: L, alpha: 0.9, len: 0.7 });
    if (drawCrowd(c, x + ox, y + oy, ss, sc, L, fanId(sc, noise1(salt + i * 7, 157)), sd)) drew++;
    c.restore();
  }
  if (drew) return;
  const raw = FANS[Math.floor(seed * FANS.length) % FANS.length];
  // Night themes darken the crowd so the self-lit signage and karts stay the
  // brightest things on screen.
  const tint = sc.fanTint;
  const f = tint
    ? { ...raw, fur: mix(raw.fur, tint.color, tint.amount),
      belly: mix(raw.belly, tint.color, tint.amount),
      tuft: raw.tuft ? mix(raw.tuft, tint.color, tint.amount) : raw.tuft }
    : raw;
  const wave = noise1(Math.floor(seed * 9973), 5) > 0.5 ? 1 : -1;
  const bw = s * 0.40;          // body half width
  const bh = s * 0.42;          // body half height
  const cy = y - bh;            // body centre
  const hr = s * 0.30;          // head radius
  const hy = cy - bh * 0.82 - hr * 0.5;
  shadow(c, x, y, bw * 1.05);

  // ears / crest, behind the head
  c.fillStyle = f.fur;
  if (f.ear === 'long') {
    for (const d of [-1, 1]) {
      c.save();
      c.translate(x + d * hr * 0.44, hy - hr * 0.5);
      c.rotate(d * 0.30);
      roundRect(c, -hr * 0.17, -hr * 1.35, hr * 0.34, hr * 1.5, hr * 0.17);
      c.fill();
      c.fillStyle = f.tuft || mix(f.fur, '#000000', 0.35);
      roundRect(c, -hr * 0.11, -hr * 1.28, hr * 0.22, hr * 0.5, hr * 0.11);
      c.fill();
      c.fillStyle = f.fur;
      c.restore();
    }
  } else if (f.ear === 'spike' || f.ear === 'cat') {
    for (const d of [-1, 1]) {
      c.beginPath();
      c.moveTo(x + d * hr * 0.30, hy - hr * 0.62);
      c.lineTo(x + d * hr * 1.02, hy - hr * 1.42);
      c.lineTo(x + d * hr * 0.86, hy - hr * 0.38);
      c.closePath();
      c.fill();
    }
  } else if (f.ear === 'leaf') {
    c.beginPath();
    c.ellipse(x + hr * 0.1, hy - hr * 1.05, hr * 0.52, hr * 0.26, -0.5, 0, Math.PI * 2);
    c.fillStyle = mix(f.fur, '#1d6b2c', 0.55);
    c.fill();
    c.fillStyle = f.fur;
  } else if (f.ear === 'fin') {
    c.beginPath();
    c.moveTo(x - hr * 0.5, hy - hr * 0.7);
    c.lineTo(x, hy - hr * 1.5);
    c.lineTo(x + hr * 0.5, hy - hr * 0.7);
    c.closePath();
    c.fillStyle = mix(f.fur, '#ffffff', 0.35);
    c.fill();
    c.fillStyle = f.fur;
  }

  // feet, then body
  ellipse(c, x - bw * 0.46, y - s * 0.03, bw * 0.30, s * 0.05, mix(f.fur, '#000000', 0.22));
  ellipse(c, x + bw * 0.46, y - s * 0.03, bw * 0.30, s * 0.05, mix(f.fur, '#000000', 0.22));
  ellipse(c, x, cy, bw, bh, f.fur);
  ellipse(c, x, cy + bh * 0.20, bw * 0.62, bh * 0.62, f.belly);
  if (f.mark === 'stripe') ellipse(c, x, cy - bh * 0.34, bw * 0.78, bh * 0.16, mix(f.fur, '#000000', 0.3));
  if (f.mark === 'collar') ellipse(c, x, cy - bh * 0.62, bw * 0.86, bh * 0.22, f.belly);

  // waving arm + planted arm
  c.fillStyle = f.fur;
  c.save();
  c.translate(x + wave * bw * 0.82, cy - bh * 0.18);
  c.rotate(wave * -0.95);
  roundRect(c, -s * 0.06, -s * 0.30, s * 0.12, s * 0.34, s * 0.06);
  c.fill();
  c.restore();
  roundRect(c, x - wave * bw * 0.96, cy - bh * 0.10, s * 0.12, s * 0.30, s * 0.06);
  c.fill();

  // head + face
  ellipse(c, x, hy, hr, hr * 0.94, f.fur);
  ellipse(c, x, hy + hr * 0.28, hr * 0.56, hr * 0.42, f.belly);
  if (f.mark === 'cheek') {
    ellipse(c, x - hr * 0.62, hy + hr * 0.18, hr * 0.20, hr * 0.16, '#ff5c5c', 0.85);
    ellipse(c, x + hr * 0.62, hy + hr * 0.18, hr * 0.20, hr * 0.16, '#ff5c5c', 0.85);
  }
  const er = Math.max(0.7, hr * 0.15);
  ellipse(c, x - hr * 0.34, hy - hr * 0.06, er, er * 1.15, '#241d19');
  ellipse(c, x + hr * 0.34, hy - hr * 0.06, er, er * 1.15, '#241d19');
  ellipse(c, x - hr * 0.30, hy - hr * 0.14, er * 0.4, er * 0.4, '#ffffff');
  ellipse(c, x + hr * 0.38, hy - hr * 0.14, er * 0.4, er * 0.4, '#ffffff');
  ellipse(c, x, hy + hr * 0.30, hr * 0.13, hr * 0.09, '#241d19');
}

export const PROPS = {
  tree, tree2, bush, flowers, fence, sign, balloon, spectator, tuft,
  billboard, tower, streetlight, neonsign, chevron, palmneon,
  pine, snowbank, crystal, rock, cliff,
};

export default PROPS;
