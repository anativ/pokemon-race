/**
 * race-world / themed skybox + backdrop
 *
 * Everything above the horizon: gradient, sun or moon, stars, clouds, a city
 * skyline (neon) and parallax ridge lines. Pans horizontally with the road's
 * heading so the world reads as a closed circuit you actually turn through.
 */
import { noise1 } from './geometry.js';
import { rgba, mix, clamp, lerp } from './paint.js';

/** Cached offscreen sky strips, keyed by theme + size. */
const skyCache = new Map();

function gradient(c, stops, x, y, w, h) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  for (const [t, col] of stops) g.addColorStop(clamp(t, 0, 1), col);
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
}

/** Sun / moon disc with a wide halo. */
function celestial(c, sky, w, horizon, pan) {
  const s = sky.sun;
  if (!s) return;
  const cx = ((s.x * w - pan * 0.35) % (w * 2) + w * 2) % (w * 2) - w * 0.5;
  const cy = s.y * horizon;
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, s.r);
  g.addColorStop(0, rgba(s.core, s.soft ? 0.55 : 0.95));
  g.addColorStop(0.16, rgba(s.core, s.soft ? 0.28 : 0.7));
  g.addColorStop(0.42, rgba(s.halo, s.soft ? 0.16 : 0.34));
  g.addColorStop(1, rgba(s.halo, 0));
  c.fillStyle = g;
  c.fillRect(cx - s.r, cy - s.r, s.r * 2, s.r * 2);
  if (!s.soft) {
    c.fillStyle = rgba(s.core, 0.95);
    c.beginPath();
    c.arc(cx, cy, s.r * 0.16, 0, Math.PI * 2);
    c.fill();
  }
}

function stars(c, count, w, horizon, pan) {
  for (let i = 0; i < count; i++) {
    const bx = noise1(i, 31) * w * 2;
    const x = ((bx - pan * 0.12) % (w * 2) + w * 2) % (w * 2) - w * 0.5;
    const y = noise1(i, 77) * horizon * 0.92;
    const r = 0.6 + noise1(i, 133) * 1.5;
    const a = 0.25 + noise1(i, 199) * 0.7;
    c.fillStyle = `rgba(255,255,255,${a})`;
    c.fillRect(x, y, r, r);
    if (r > 1.6) {
      c.fillStyle = `rgba(180,220,255,${a * 0.4})`;
      c.fillRect(x - r, y + r * 0.4, r * 3, 0.7);
      c.fillRect(x + r * 0.4, y - r, 0.7, r * 3);
    }
  }
}

/** One fluffy cumulus made of overlapping lobes with a shaded underside. */
function puff(c, x, y, r, color, shade, alpha) {
  c.save();
  c.globalAlpha = alpha;
  const lobes = [
    [-1.35, 0.22, 0.62], [-0.62, -0.22, 0.86], [0.16, -0.40, 1.0],
    [0.92, -0.12, 0.78], [1.52, 0.24, 0.55], [0.2, 0.24, 0.9],
  ];
  c.fillStyle = shade;
  for (const [dx, dy, s] of lobes) {
    c.beginPath();
    c.arc(x + dx * r, y + dy * r + r * 0.26, r * s, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = color;
  for (const [dx, dy, s] of lobes) {
    c.beginPath();
    c.arc(x + dx * r, y + dy * r, r * s, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function clouds(c, cfg, w, horizon, pan) {
  if (!cfg || cfg.kind === 'none') return;
  const span = w * 2.4;
  for (let i = 0; i < cfg.count; i++) {
    const par = 0.10 + noise1(i, 5) * 0.16;
    const bx = noise1(i, 41) * span;
    const x = ((bx - pan * par) % span + span) % span - w * 0.35;
    const y = (0.10 + noise1(i, 83) * 0.62) * horizon;
    const r = (18 + noise1(i, 17) * 40) * (cfg.kind === 'wispy' ? 1.5 : 1);
    if (cfg.kind === 'wispy') {
      c.save();
      c.globalAlpha = cfg.alpha * 0.7;
      c.fillStyle = cfg.color;
      c.beginPath();
      c.ellipse(x, y, r * 2.6, r * 0.34, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    } else {
      puff(c, x, y, r, cfg.color, cfg.shade, cfg.alpha);
    }
  }
}

/**
 * Silhouette height for a ridge layer. Three octaves of a smooth wave, sampled
 * finely enough that the crest never aliases into a sawtooth - the earlier
 * version stepped ~4 radians per sample and turned rolling hills into noise.
 */
function ridgeY(L, x, off, horizon) {
  const u = (x + off) * L.freq;
  let s = Math.sin(u) * 0.58
    + Math.sin(u * 0.41 + 2.1) * 0.30
    + Math.sin(u * 2.30 + 4.3) * 0.12;
  // `peak` sharpens the crests into alpine ridges instead of rolling dunes
  if (L.peak) {
    // triangle wave riding the smooth ridge -> alpine summits, not dunes
    const tri = (p) => 1 - Math.abs(((p / Math.PI) % 2 + 2) % 2 - 1) * 2;
    s = s * (1 - L.peak * 0.45)
      + tri(u * 9 + 0.7) * L.peak * 0.62
      + tri(u * 21 + 2.3) * L.peak * 0.18;
  }
  return horizon - L.base - (s + 0.85) * L.amp * 0.5;
}

/** Layered ridge silhouettes sitting on the horizon. */
function ridges(c, hills, w, horizon, pan) {
  for (let li = 0; li < hills.length; li++) {
    const L = hills[li];
    const off = pan * L.parallax;
    c.beginPath();
    c.moveTo(-4, horizon + 6);
    const step = 3;
    const ys = [];
    for (let x = -4; x <= w + 8; x += step) {
      const y = ridgeY(L, x, off, horizon);
      ys.push([x, y]);
      c.lineTo(x, y);
    }
    c.lineTo(w + 8, horizon + 6);
    c.closePath();
    const body = L.haze ? mix(L.color, '#dff0ff', L.haze * 0.55) : L.color;
    c.fillStyle = body;
    c.fill();

    // volume: the crest catches the light, the foot sinks into haze
    c.save();
    c.clip();
    let top = horizon;
    for (const p of ys) if (p[1] < top) top = p[1];
    const vg = c.createLinearGradient(0, top, 0, horizon + 6);
    vg.addColorStop(0, rgba(L.lit || '#ffffff', L.litAlpha != null ? L.litAlpha : 0.22));
    vg.addColorStop(0.55, rgba(L.lit || '#ffffff', 0));
    vg.addColorStop(1, rgba(L.foot || '#0d2b4a', 0.16));
    c.fillStyle = vg;
    c.fillRect(-8, top - 4, w + 24, horizon - top + 14);
    // canopy bumps: rounded crowns riding the crest turn a bare ridge into
    // forested hillside
    if (L.canopy) {
      const stepC = L.canopy.step;
      for (let x = -stepC; x <= w + stepC; x += stepC) {
        const gi = Math.round((x + off) / stepC);
        const bx = x - ((off % stepC) + stepC) % stepC;
        const r = stepC * (0.42 + noise1(gi, 61) * 0.42);
        const by = ridgeY(L, bx, off, horizon) + r * (0.35 + noise1(gi, 67) * 0.4);
        c.fillStyle = noise1(gi, 71) > 0.5 ? L.canopy.a : L.canopy.b;
        c.beginPath();
        c.arc(bx, by, r, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();

    if (L.snowcap) {
      // snow caps: fill the top ~26% of each peak
      c.save();
      c.globalAlpha = 0.85;
      c.fillStyle = L.snowcap;
      c.beginPath();
      for (let i = 0; i < ys.length; i++) {
        if (i === 0) c.moveTo(ys[i][0], ys[i][1]); else c.lineTo(ys[i][0], ys[i][1]);
      }
      const depth = L.snowDepth != null ? L.snowDepth : 0.16;
      for (let i = ys.length - 1; i >= 0; i--) {
        c.lineTo(ys[i][0], ys[i][1] + 5 + (horizon - ys[i][1]) * depth);
      }
      c.closePath();
      c.fill();
      c.restore();
    }
  }
}

/** Blocky lit towers along the horizon (neon theme). */
function skyline(c, cfg, w, horizon, pan) {
  if (!cfg) return;
  for (let li = 0; li < cfg.layers.length; li++) {
    const L = cfg.layers[li];
    const off = pan * L.parallax;
    const span = L.w;
    const first = Math.floor((off - w * 0.2) / span) - 1;
    const n = Math.ceil(w * 1.5 / span) + 3;
    for (let k = 0; k < n; k++) {
      const gi = first + k;
      const x = gi * span - off;
      if (x > w + span || x < -span * 2) continue;
      const bw = span * (0.55 + noise1(gi, 200 + li) * 0.4);
      const bh = L.h * (0.42 + noise1(gi, 300 + li) * 0.95);
      const y = horizon - bh;
      c.fillStyle = L.color;
      c.fillRect(Math.round(x), Math.round(y), Math.ceil(bw), Math.ceil(bh + 4));
      // roof accent
      const nn2 = cfg.neon.length;
      c.fillStyle = rgba(cfg.neon[((gi % nn2) + nn2) % nn2], 0.55);
      c.fillRect(Math.round(x), Math.round(y) - 2, Math.ceil(bw), 2);
      // windows
      const cols = Math.max(2, Math.floor(bw / 9));
      const rows = Math.max(3, Math.floor(bh / 11));
      for (let cx = 0; cx < cols; cx++) {
        for (let ry = 0; ry < rows; ry++) {
          const nn = noise1(gi * 91 + cx * 7 + ry * 13, 500 + li);
          if (nn > 0.52) continue;
          c.fillStyle = rgba(L.win, L.winAlpha * (0.5 + nn));
          c.fillRect(x + 3 + cx * (bw - 6) / cols, y + 4 + ry * (bh - 8) / rows,
            Math.max(1.5, (bw - 6) / cols - 3), Math.max(1.5, (bh - 8) / rows - 4));
        }
      }
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {any} scene theme from ./tracks/
 * @param {{w:number,h:number,horizon:number,pan:number,lift?:number}} v
 *   `lift` is the elevation the road ahead has gained on the camera, in px:
 *   the ridges and skyline ride up over a crest and sink into a dip, while the
 *   sky gradient and the sun stay put.
 */
export function renderSky(c, scene, v) {
  const { w, h, horizon, pan } = v;
  const lift = v.lift || 0;
  const sky = scene.sky;
  const top = Math.min(0, horizon - h);
  gradient(c, sky.stops, 0, top - 40, w, horizon - top + 44);
  if (sky.stars) stars(c, sky.stars, w, horizon, pan);
  celestial(c, sky, w, horizon, pan);
  clouds(c, sky.clouds, w, horizon, pan);
  const hz = horizon + lift;
  if (scene.skyline) skyline(c, scene.skyline, w, hz, pan);
  if (scene.hills) ridges(c, scene.hills, w, hz, pan);
  // horizon haze so the ground meets the sky softly
  const gh = 46;
  const g = c.createLinearGradient(0, horizon - gh, 0, horizon + 10);
  g.addColorStop(0, rgba(scene.fog.color, 0));
  g.addColorStop(1, rgba(scene.fog.color, 0.85));
  c.fillStyle = g;
  c.fillRect(0, horizon - gh, w, gh + 10);
}

export default renderSky;
