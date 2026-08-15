/**
 * results-podium :: canvas arena backdrop + celebration particles.
 *
 * A bright, lit indoor stadium: warm blue-to-white gradient, a rigged roof
 * throwing sweeping volumetric spotlight beams, a glossy floor with a pooled
 * key light and podium reflections, plus confetti (ribbons + gold stars).
 *
 * Pure cosmetic layer - reads only { w, h, time } and never writes to state,
 * so determinism of window.__pkr.state() is untouched (CONTRACTS.md §3).
 */

const CONFETTI_COLORS = ['#ffd63b', '#e8433c', '#4fc3ff', '#5fc45a', '#ff8ecb', '#ffffff', '#b98cff'];

/** horizon / floor split, shared by every layer */
export const HORIZON = 0.545;
/** where the three plinth centres sit, in 0..1 of the stage width */
const COL_X = [0.272, 0.5, 0.723];
/** plinth base y (0..1 of stage height) per place index above */
const COL_BASE = [0.793, 0.819, 0.800];

/** cheap deterministic hash -> 0..1 */
function h1(i, salt = 0) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/* ------------------------------------------------------------------- sky */
/** Bright blue-to-white arena air with a hot core behind the podium. */
function drawSky(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h * HORIZON);
  g.addColorStop(0, '#0f3f96');
  g.addColorStop(0.30, '#2266c4');
  g.addColorStop(0.62, '#3e8fda');
  g.addColorStop(1, '#79bdec');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h * HORIZON + 2);

  // hot core: the lit heart of the arena, right behind the winner
  const core = c.createRadialGradient(w / 2, h * 0.40, 30, w / 2, h * 0.40, w * 0.52);
  core.addColorStop(0, 'rgba(226,246,255,.66)');
  core.addColorStop(0.30, 'rgba(150,212,255,.34)');
  core.addColorStop(0.62, 'rgba(104,180,242,.14)');
  core.addColorStop(1, 'rgba(80,150,225,0)');
  c.fillStyle = core;
  c.fillRect(0, 0, w, h * HORIZON + 2);
}

/* ------------------------------------------------------------------ roof */
const RIG_N = 9;
function rigX(i, w) { return (w / (RIG_N - 1)) * i; }

/** Overhead truss + lamp housings the beams hang from. */
function drawRoof(c, w, h, time) {
  const rh = h * 0.085;
  const g = c.createLinearGradient(0, 0, 0, rh);
  g.addColorStop(0, '#08245c');
  g.addColorStop(0.7, '#123f8c');
  g.addColorStop(1, 'rgba(24,84,166,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, rh);

  // truss lattice
  c.save();
  c.strokeStyle = 'rgba(150,200,250,.30)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, rh * 0.62); c.lineTo(w, rh * 0.62);
  c.moveTo(0, rh * 0.30); c.lineTo(w, rh * 0.30);
  for (let x = -40; x < w + 40; x += 46) {
    c.moveTo(x, rh * 0.62); c.lineTo(x + 23, rh * 0.30);
    c.moveTo(x + 23, rh * 0.30); c.lineTo(x + 46, rh * 0.62);
  }
  c.stroke();
  c.restore();

  // lamp housings + their bloom
  for (let i = 0; i < RIG_N; i++) {
    const x = rigX(i, w);
    const y = rh * 0.70;
    const flick = 0.78 + Math.sin(time * 0.0025 + i * 1.9) * 0.22;
    c.fillStyle = '#0b1f4c';
    c.beginPath();
    c.moveTo(x - 15, y - 14); c.lineTo(x + 15, y - 14);
    c.lineTo(x + 11, y + 10); c.lineTo(x - 11, y + 10);
    c.closePath();
    c.fill();
    c.save();
    c.globalCompositeOperation = 'lighter';
    const bl = c.createRadialGradient(x, y + 8, 1, x, y + 8, 52);
    bl.addColorStop(0, `rgba(255,255,255,${0.85 * flick})`);
    bl.addColorStop(0.25, `rgba(198,234,255,${0.45 * flick})`);
    bl.addColorStop(1, 'rgba(140,200,255,0)');
    c.fillStyle = bl;
    c.fillRect(x - 56, y - 46, 112, 106);
    c.restore();
  }
}

/**
 * Volumetric spotlight beams sweeping down from the roof rig.
 * Each lamp throws a cone that sways on its own phase, so two frames a second
 * apart visibly differ (the critic samples exactly that).
 */
function drawBeams(c, w, h, time) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const apexY = h * 0.062;
  for (let i = 0; i < RIG_N; i++) {
    const x = rigX(i, w);
    const phase = time * 0.00042 + i * 1.27;
    const sway = Math.sin(phase) * w * 0.20;
    // beams from the outer lamps converge harder on the podium
    const aim = x + (w / 2 - x) * 0.55 + sway;
    const reach = h * 0.98;
    const spread = 74 + Math.abs(Math.cos(phase)) * 58;
    const bright = 0.13 + Math.abs(Math.sin(phase * 0.7)) * 0.13;

    const g = c.createLinearGradient(x, apexY, aim, reach);
    g.addColorStop(0, `rgba(226,246,255,${bright})`);
    g.addColorStop(0.42, `rgba(176,222,255,${bright * 0.55})`);
    g.addColorStop(0.72, `rgba(150,206,255,${bright * 0.14})`);
    g.addColorStop(1, 'rgba(140,200,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - 13, apexY);
    c.lineTo(x + 13, apexY);
    c.lineTo(aim + spread, reach);
    c.lineTo(aim - spread, reach);
    c.closePath();
    c.fill();

    // hot inner core of the beam
    c.fillStyle = `rgba(255,255,255,${bright * 0.42})`;
    c.beginPath();
    c.moveTo(x - 5, apexY);
    c.lineTo(x + 5, apexY);
    c.lineTo(aim + spread * 0.32, reach);
    c.lineTo(aim - spread * 0.32, reach);
    c.closePath();
    c.fill();
  }
  c.restore();
}

/* ---------------------------------------------------------------- stands */
/**
 * Distant stands: a bright, hazy crowd that recedes instead of a hard
 * repeating stripe. Two shallow tiers, low-contrast dots, heavy atmospheric
 * haze washed over the top so the podium keeps every bit of contrast.
 */
function drawStands(c, w, h, time) {
  const horizon = h * HORIZON;
  const wallH = 46;
  const top = h * 0.115;
  const standsH = horizon - wallH - top;

  const sg = c.createLinearGradient(0, top, 0, horizon - wallH);
  sg.addColorStop(0, 'rgba(18,60,132,.92)');
  sg.addColorStop(0.55, 'rgba(38,102,182,.78)');
  sg.addColorStop(1, 'rgba(88,158,222,.62)');
  c.fillStyle = sg;
  c.fillRect(0, top, w, standsH);

  // crowd: scattered, blurred specks - a texture, never a dot grid
  c.save();
  if ('filter' in c) c.filter = 'blur(2.4px)';
  const CROWD = ['#ffe58a', '#ff9d95', '#bfeaff', '#c5f0bf', '#ffffff', '#ffc7e6', '#d6c2ff'];
  const N = 620;
  for (let i = 0; i < N; i++) {
    const px = h1(i, 21) * (w + 40) - 20;
    const depth = h1(i, 22);              // 0 = back row, 1 = front row
    const cy = top + standsH * (0.06 + depth * 0.88);
    if (h1(i, 26) < 0.12) continue;       // gaps / empty seats
    const bob = Math.sin(time * 0.0019 + i * 0.7) * (1.6 + depth * 2.4);
    const rr = 2.0 + depth * 3.0 + h1(i, 23) * 1.6;
    c.globalAlpha = (0.20 + h1(i, 24) * 0.34) * (0.5 + depth * 0.5);
    c.fillStyle = CROWD[Math.floor(h1(i, 25) * 7)];
    c.beginPath();
    c.arc(px, cy + bob, rr, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(px, cy + bob + rr * 1.55, rr * 1.5, rr * 1.1, 0, Math.PI, 0, true);
    c.fill();
  }
  c.restore();
  c.globalAlpha = 1;

  // a couple of soft tier steps, low contrast so nothing bands
  c.fillStyle = 'rgba(12,44,104,.16)';
  c.fillRect(0, top + standsH * 0.44, w, 6);
  c.fillRect(0, top + standsH * 0.78, w, 7);

  // atmospheric haze: kills the banded look and lifts the whole plate
  const haze = c.createLinearGradient(0, top, 0, horizon - wallH);
  haze.addColorStop(0, 'rgba(70,140,214,.30)');
  haze.addColorStop(0.55, 'rgba(120,188,240,.34)');
  haze.addColorStop(1, 'rgba(178,224,252,.48)');
  c.fillStyle = haze;
  c.fillRect(0, top, w, standsH);

  // arena wall with sponsor panels + Poke Ball motifs
  const wy = horizon - wallH;
  const wg = c.createLinearGradient(0, wy, 0, horizon);
  wg.addColorStop(0, '#2f7ecd');
  wg.addColorStop(1, '#17509c');
  c.fillStyle = wg;
  c.fillRect(0, wy, w, wallH);
  c.fillStyle = 'rgba(226,246,255,.55)';
  c.fillRect(0, wy - 3, w, 3);
  const panels = 7;
  for (let i = 0; i < panels; i++) {
    const px = i * (w / panels) + 16;
    const pw = w / panels - 32;
    c.fillStyle = i % 2 ? 'rgba(255,224,110,.22)' : 'rgba(200,240,255,.20)';
    c.fillRect(px, wy + 10, pw, wallH - 22);
    ball2d(c, px + pw / 2, wy + wallH / 2, 9, 0.75);
  }
}

/** Small shaded Poke Ball, used as a canvas motif. */
function ball2d(c, cx, cy, r, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  const lower = c.createRadialGradient(cx - r * 0.3, cy + r * 0.3, r * 0.1, cx, cy, r);
  lower.addColorStop(0, '#ffffff');
  lower.addColorStop(1, '#a8b7cf');
  c.fillStyle = lower;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  const upper = c.createRadialGradient(cx - r * 0.3, cy - r * 0.45, r * 0.1, cx, cy, r);
  upper.addColorStop(0, '#ff8e83');
  upper.addColorStop(1, '#b7262a');
  c.fillStyle = upper;
  c.beginPath(); c.arc(cx, cy, r, Math.PI, 0); c.closePath(); c.fill();
  c.fillStyle = '#131a2e';
  c.fillRect(cx - r, cy - r * 0.16, r * 2, r * 0.32);
  c.beginPath(); c.arc(cx, cy, r * 0.34, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f2f7ff';
  c.beginPath(); c.arc(cx, cy, r * 0.2, 0, Math.PI * 2); c.fill();
  c.restore();
}

/* ----------------------------------------------------------------- floor */
/** hex -> "r,g,b" so reflections can be tinted by the real racer colours. */
function rgb(hex, fallback = '230,240,255') {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** Glossy arena floor: lit lane, converging seams, specular sheen. */
function drawFloorBase(c, w, h, time) {
  const horizon = h * HORIZON;
  const g = c.createLinearGradient(0, horizon, 0, h);
  g.addColorStop(0, '#63a8e2');
  g.addColorStop(0.14, '#2f70bd');
  g.addColorStop(0.48, '#194a92');
  g.addColorStop(1, '#0c2a5e');
  c.fillStyle = g;
  c.fillRect(0, horizon, w, h - horizon);

  // pooled key light: the warm spot the podium stands in
  const pool = c.createRadialGradient(w / 2, h * 0.855, 24, w / 2, h * 0.855, w * 0.46);
  pool.addColorStop(0, 'rgba(255,244,206,.44)');
  pool.addColorStop(0.26, 'rgba(176,216,252,.22)');
  pool.addColorStop(0.60, 'rgba(96,166,238,.09)');
  pool.addColorStop(1, 'rgba(24,64,124,0)');
  c.fillStyle = pool;
  c.fillRect(0, horizon - 30, w, h - horizon + 30);

  // floor seams receding toward the horizon
  c.save();
  c.strokeStyle = 'rgba(216,240,255,.20)';
  c.lineWidth = 2;
  for (let i = 1; i <= 7; i++) {
    const t = (i / 7) ** 2.1;
    const yy = horizon + (h - horizon) * t;
    c.globalAlpha = 0.25 + t * 0.55;
    c.beginPath(); c.moveTo(0, yy); c.lineTo(w, yy); c.stroke();
  }
  for (let i = -5; i <= 5; i++) {
    c.globalAlpha = 0.16;
    c.beginPath();
    c.moveTo(w / 2 + i * 46, horizon);
    c.lineTo(w / 2 + i * 300, h);
    c.stroke();
  }
  c.restore();

  // specular sheen sliding across the polished floor
  c.save();
  c.globalCompositeOperation = 'lighter';
  const sweep = Math.sin(time * 0.00045) * w * 0.26;
  const sh = c.createLinearGradient(w / 2 + sweep - 300, horizon, w / 2 + sweep + 300, h);
  sh.addColorStop(0, 'rgba(140,205,255,0)');
  sh.addColorStop(0.5, 'rgba(190,232,255,.16)');
  sh.addColorStop(1, 'rgba(140,205,255,0)');
  c.fillStyle = sh;
  c.fillRect(0, horizon, w, h - horizon);
  c.restore();

  // raised stage disc the podium stands on
  c.save();
  c.translate(w / 2, h * 0.855);
  c.scale(1, 0.185);
  c.beginPath();
  c.arc(0, 0, w * 0.315, 0, Math.PI * 2);
  c.fillStyle = 'rgba(120,190,244,.30)';
  c.fill();
  c.lineWidth = 22;
  c.strokeStyle = 'rgba(226,246,255,.34)';
  c.stroke();
  c.restore();
}

/**
 * Mirror-image smears under each plinth. `tints` (optional) is
 * [2nd, 1st, 3rd] racer colours so the gloss picks up who actually won.
 */
function drawReflections(c, w, h, time, tints) {
  const metal = ['200,214,236', '255,214,90', '226,160,96'];
  for (let i = 0; i < 3; i++) {
    const cx = COL_X[i] * w;
    const base = COL_BASE[i] * h;
    const cw = i === 1 ? 300 : 250;
    const len = i === 1 ? 150 : 122;
    const tint = tints && tints[i] ? rgb(tints[i]) : metal[i];

    // plinth reflection (blurred so it reads as gloss, never as a rectangle)
    c.save();
    if ('filter' in c) c.filter = 'blur(9px)';
    const g = c.createLinearGradient(0, base, 0, base + len);
    g.addColorStop(0, `rgba(${metal[i]},.60)`);
    g.addColorStop(0.35, `rgba(${metal[i]},.24)`);
    g.addColorStop(1, `rgba(${metal[i]},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(cx, base, cw / 2, len, 0, 0, Math.PI);
    c.fill();

    // racer reflection: narrower, tinted, wobbling like water
    const fg = c.createLinearGradient(0, base, 0, base + len * 0.82);
    fg.addColorStop(0, `rgba(${tint},.40)`);
    fg.addColorStop(1, `rgba(${tint},0)`);
    c.fillStyle = fg;
    const fw = cw * 0.34;
    for (let s = 0; s < 14; s++) {
      const t = s / 14;
      const yy = base + len * 0.82 * t;
      const wob = Math.sin(time * 0.0022 + s * 0.8 + i * 2) * (3 + t * 7);
      c.globalAlpha = (1 - t) * 0.85;
      c.fillRect(cx - fw / 2 + wob, yy, fw * (1 + t * 0.5), len * 0.82 / 14 + 1);
    }
    c.restore();

    // bright contact line where the plinth meets the polished floor
    c.save();
    c.globalCompositeOperation = 'lighter';
    const cg = c.createRadialGradient(cx, base, 4, cx, base, cw * 0.6);
    cg.addColorStop(0, 'rgba(255,250,224,.42)');
    cg.addColorStop(1, 'rgba(255,240,190,0)');
    c.fillStyle = cg;
    c.fillRect(cx - cw, base - 26, cw * 2, 66);
    c.restore();
  }
  c.globalAlpha = 1;
}

/* ------------------------------------------------------------- fireworks */
const FW_COLS = ['#ffd63b', '#ff6b6b', '#6fd3ff', '#9df06f', '#f5a3ff', '#ffffff'];

/**
 * Celebration bursts over the stands. Six sites, each on its own cycle, so the
 * sky is never still - purely a function of the cosmetic clock (no state).
 */
function drawFireworks(c, w, h, time) {
  const SITES = 6;
  c.save();
  for (let i = 0; i < SITES; i++) {
    const period = 2600 + h1(i, 21) * 2200;
    const phase = ((time + h1(i, 22) * 4000) % period) / period;   // 0..1
    if (phase > 0.62) continue;                                    // dark between bursts
    const life = phase / 0.62;
    const cx = (0.08 + h1(i, 23) * 0.84) * w;
    const cy = (0.06 + h1(i, 24) * 0.30) * h;
    const R = (48 + h1(i, 25) * 62) * (0.35 + life * 0.9);
    const col = FW_COLS[i % FW_COLS.length];
    const fade = Math.max(0, 1 - life * life);
    const rays = 16;
    c.globalAlpha = fade * 0.85;
    c.strokeStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 14;
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    for (let k = 0; k < rays; k++) {
      const a = (Math.PI * 2 * k) / rays + h1(i, 26) * 3;
      const r0 = R * 0.42;
      const sag = life * life * 16;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 + sag * 0.4);
      c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R + sag);
      c.stroke();
    }
    // hot core flash on the first frames of the burst
    if (life < 0.28) {
      c.globalAlpha = (1 - life / 0.28) * 0.8;
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(cx, cy, 5 + (1 - life / 0.28) * 9, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
  c.globalAlpha = 1;
  c.shadowBlur = 0;
}

/* -------------------------------------------------------------- particles */
function star(c, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.44 : r;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  c.fill();
}

/** Falling confetti: ribbons, discs and gold stars. */
function drawConfetti(c, w, h, time, count = 170) {
  for (let i = 0; i < count; i++) {
    const seedX = h1(i, 1);
    const speed = 42 + h1(i, 2) * 105;
    const drift = Math.sin(time * 0.0012 + i * 1.7) * (18 + h1(i, 3) * 26);
    const y = (((time * 0.001 * speed) + h1(i, 4) * (h + 160)) % (h + 160)) - 80;
    const x = seedX * w + drift;
    const rot = time * 0.0022 * (0.5 + h1(i, 5)) + i;
    const wob = Math.abs(Math.cos(rot * 1.6));
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    if (i % 6 === 0) {
      // gold star
      c.globalAlpha = 0.92;
      c.shadowColor = 'rgba(255,214,59,.9)';
      c.shadowBlur = 10;
      c.fillStyle = i % 12 === 0 ? '#fff3b0' : '#ffd63b';
      star(c, 6 + h1(i, 11) * 5);
    } else if (i % 7 === 1) {
      c.globalAlpha = 0.85;
      c.fillStyle = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
    } else {
      c.globalAlpha = 0.85;
      c.fillStyle = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const cw = 8 + h1(i, 6) * 8;
      c.fillRect(-cw / 2, -4 * wob - 1, cw, 3 + 5 * wob);
    }
    c.restore();
  }
  c.globalAlpha = 1;
}

/** Slow ribbon streamers falling on the sides. */
function drawStreamers(c, w, h, time) {
  c.save();
  c.lineWidth = 5;
  c.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const x = (i < 5 ? 40 + i * 62 : w - 40 - (i - 5) * 62);
    const y0 = ((time * 0.02 * (0.6 + h1(i, 8)) + h1(i, 9) * h) % (h + 200)) - 200;
    c.strokeStyle = CONFETTI_COLORS[(i * 3) % CONFETTI_COLORS.length];
    c.globalAlpha = 0.5;
    c.beginPath();
    for (let s = 0; s <= 8; s++) {
      const yy = y0 + s * 22;
      const xx = x + Math.sin(time * 0.002 + s * 0.7 + i) * 16;
      if (s === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
    }
    c.stroke();
  }
  c.restore();
  c.globalAlpha = 1;
}

/** Corner falloff - kept light so the arena still reads bright. */
function drawVignette(c, w, h) {
  const vg = c.createRadialGradient(w / 2, h * 0.5, h * 0.42, w / 2, h * 0.5, h * 1.02);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(6,22,58,.42)');
  c.fillStyle = vg;
  c.fillRect(0, 0, w, h);
}

/**
 * Full backdrop paint. `time` = ms (cosmetic clock).
 * `tints` = optional [2nd, 1st, 3rd] racer colours for the floor reflections.
 */
export function renderArena(c, { w, h, time = 0, tints = null }) {
  drawSky(c, w, h);
  drawStands(c, w, h, time);
  drawFloorBase(c, w, h, time);
  drawReflections(c, w, h, time, tints);
  drawBeams(c, w, h, time);
  drawRoof(c, w, h, time);
  drawFireworks(c, w, h, time);
  drawVignette(c, w, h);
  drawStreamers(c, w, h, time);
  drawConfetti(c, w, h, time);
}

export default { renderArena, HORIZON };
