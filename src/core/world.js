/**
 * Shell fallback world renderer: pseudo-3D chase-cam road on a 2D canvas.
 * A dedicated 'world' provider (see registry.js) can replace this wholesale;
 * it exists so ?screen=race always renders a real scene.
 */
import { ballSvg } from './avatars.js';

const SEG_LEN = 20;          // track distance units per road segment
const ROAD_W = 58;           // half-width in world units
const CAM_H = 62;            // camera height above the road
const CAM_DEPTH = 0.84;      // 1/tan(fov/2)
const DRAW_SEGS = 220;

const roadCache = new WeakMap();

export function buildRoad(track) {
  let segs = roadCache.get(track);
  if (segs) return segs;
  segs = [];
  let y = 0;
  for (const s of track.segments) {
    const n = Math.max(2, Math.round(s.len / SEG_LEN));
    for (let i = 0; i < n; i++) {
      y += s.hill * 0.9 * Math.sin((i / n) * Math.PI);
      segs.push({ curve: s.curve, y });
    }
  }
  roadCache.set(track, segs);
  return segs;
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {{track:any, race:any, w:number, h:number, time:number}} view
 */
export function renderWorld(c, view) {
  const { track, race, w, h } = view;
  const th = track.theme;
  const segs = buildRoad(track);
  const camZ = race ? race.camera.dist : 0;
  const camX = (race ? race.camera.lane : 0) * ROAD_W * 0.55;
  const horizon = Math.round(h * 0.44);

  drawSky(c, th, w, h, horizon, view);
  drawBackdrop(c, th, w, h, horizon, view, camZ, race);
  c.fillStyle = th.ground;
  c.fillRect(0, horizon, w, h - horizon);

  // --- road ---------------------------------------------------------------
  const total = segs.length;
  const base = Math.floor(camZ / SEG_LEN);
  const baseSeg = segs[((base % total) + total) % total];
  const camY = CAM_H + baseSeg.y;
  const proj = [];
  let x = 0; let dx = 0;
  let maxY = h;

  for (let n = 0; n < DRAW_SEGS; n++) {
    const idx = ((base + n) % total + total) % total;
    const seg = segs[idx];
    const z = (base + n) * SEG_LEN + SEG_LEN - camZ;
    if (z <= 1) { proj.push(null); continue; }
    dx += seg.curve * 0.055;
    x += dx;
    const scale = CAM_DEPTH / z;
    const sx = w / 2 + scale * (x - camX) * (w / 2);
    const sy = horizon - scale * (seg.y - camY) * (h / 2);
    const sw = scale * ROAD_W * (w / 2);
    proj.push({ sx, sy, sw, z, idx, y: seg.y });
  }

  for (let n = 1; n < DRAW_SEGS; n++) {
    const p1 = proj[n - 1]; const p2 = proj[n];
    if (!p1 || !p2) continue;
    if (p2.sy >= maxY) continue;
    const light = (Math.floor((base + n) / 3) % 2) === 0;
    // grass / ground
    ground(c, p1.sy, p2.sy, w, light ? th.ground : th.groundAlt);
    // rumble strips
    const r1 = p1.sw * 1.16; const r2 = p2.sw * 1.16;
    band(c, p1.sx, p1.sy, r1, p2.sx, p2.sy, r2, light ? th.rumbleA : th.rumbleB);
    // road
    band(c, p1.sx, p1.sy, p1.sw, p2.sx, p2.sy, p2.sw, light ? th.road : th.roadAlt);
    // centre dashes
    if (light) {
      band(c, p1.sx, p1.sy, p1.sw * 0.035, p2.sx, p2.sy, p2.sw * 0.035, th.line, 0.85);
    }
    // lane edge lines
    band2(c, p1.sx + p1.sw * 0.92, p1.sy, p1.sw * 0.045, p2.sx + p2.sw * 0.92, p2.sy, p2.sw * 0.045, th.line, 0.5);
    band2(c, p1.sx - p1.sw * 0.92, p1.sy, p1.sw * 0.045, p2.sx - p2.sw * 0.92, p2.sy, p2.sw * 0.045, th.line, 0.5);
    maxY = p2.sy;
  }

  // --- sprites (pickups + rivals), far to near ----------------------------
  const sprites = [];
  if (race) {
    for (const r of race.racers) {
      if (r.isPlayer) continue;
      let dz = r.dist - camZ;
      const loopLen = total * SEG_LEN;
      while (dz < -loopLen / 2) dz += loopLen;
      while (dz > loopLen / 2) dz -= loopLen;
      if (dz < (view.minSpriteDist || 26) || dz > DRAW_SEGS * SEG_LEN * 0.7) continue;
      sprites.push({ kind: 'kart', dz, racer: r });
    }
  }
  const rowBase = Math.floor(camZ / (total * SEG_LEN));
  for (const t of track.itemRows) {
    for (let lapOff = 0; lapOff <= 1; lapOff++) {
      const z = (rowBase + lapOff) * total * SEG_LEN + t * total * SEG_LEN;
      const dz = z - camZ;
      if (dz < 8 || dz > DRAW_SEGS * SEG_LEN * 0.5) continue;
      for (const lane of [-0.62, 0, 0.62]) sprites.push({ kind: 'ball', dz, lane });
    }
  }
  sprites.sort((a, b) => b.dz - a.dz);
  for (const s of sprites) {
    const n = Math.min(DRAW_SEGS - 1, Math.max(1, Math.floor(s.dz / SEG_LEN)));
    const p = proj[n];
    if (!p) continue;
    if (s.kind === 'kart') {
      drawKart(c, p.sx + p.sw * s.racer.lane * 0.8, p.sy, p.sw * 0.24, s.racer, view);
    } else {
      drawBall(c, p.sx + p.sw * s.lane, p.sy - p.sw * 0.2, p.sw * 0.14, view);
    }
  }

  // --- player kart (chase cam) -------------------------------------------
  if (race && !view.hidePlayer) {
    const player = race.racers.find((r) => r.isPlayer);
    if (player) {
      const bob = Math.sin(view.time * 0.006) * 3;
      view.playerMoving = player.speed > 45;
      drawKart(c, w / 2 + player.lane * w * 0.06, h * 0.93 + bob, w * 0.135, player, view, true);
    }
  }
  if (th.key === 'neon') vignette(c, w, h, '#0a1030');
}

function drawSky(c, th, w, h, horizon, view) {
  const g = c.createLinearGradient(0, 0, 0, horizon + 40);
  g.addColorStop(0, th.skyTop);
  g.addColorStop(1, th.skyBottom);
  c.fillStyle = g;
  c.fillRect(0, 0, w, horizon + 40);
  if (th.key === 'grass' || th.key === 'snow') {
    c.fillStyle = th.cloud;
    c.globalAlpha = 0.75;
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 317 + 120) % (w + 200)) - 100;
      const cy = 40 + (i % 3) * 34;
      cloud(c, cx, cy, 52 + (i % 4) * 16);
    }
    c.globalAlpha = 1;
  }
  if (th.key === 'neon') {
    for (let i = 0; i < 40; i++) {
      const sx = (i * 197) % w;
      const sy = (i * 89) % horizon;
      c.fillStyle = i % 3 === 0 ? th.accent : th.neon;
      c.globalAlpha = 0.5;
      c.fillRect(sx, sy, 2, 2);
    }
    c.globalAlpha = 1;
  }
}

function drawBackdrop(c, th, w, h, horizon, view, camZ, race) {
  const shift = -((camZ * 0.04) % (w * 2));
  c.save();
  // far hills / skyline, twice for wrap
  for (let pass = 0; pass < 2; pass++) {
    const ox = shift + pass * w * 2;
    if (th.key === 'neon') {
      for (let i = 0; i < 16; i++) {
        const bw = 70 + ((i * 53) % 90);
        const bh = 110 + ((i * 97) % 240);
        const bx = ox + i * 130;
        const bg = c.createLinearGradient(0, horizon - bh, 0, horizon);
        bg.addColorStop(0, th.hillNear);
        bg.addColorStop(1, th.hillFar);
        c.fillStyle = bg;
        c.fillRect(bx, horizon - bh, bw, bh + 10);
        // lit windows
        c.fillStyle = i % 3 === 0 ? th.accent : th.neon;
        c.globalAlpha = 0.55;
        for (let r = 0; r < Math.floor(bh / 26); r++) {
          for (let col = 0; col < Math.floor(bw / 22); col++) {
            if ((i + r * 3 + col * 7) % 3) continue;
            c.fillRect(bx + 8 + col * 22, horizon - bh + 12 + r * 26, 9, 12);
          }
        }
        c.globalAlpha = 1;
        // rooftop sign
        if (i % 4 === 1) {
          c.fillStyle = th.accent;
          c.globalAlpha = 0.85;
          c.fillRect(bx + 6, horizon - bh - 16, bw - 12, 10);
          c.globalAlpha = 1;
        }
      }
      // billboard glow band
      c.fillStyle = th.neon;
      c.globalAlpha = 0.16;
      c.fillRect(ox, horizon - 26, w * 2, 26);
      c.globalAlpha = 1;
    } else {
      c.fillStyle = th.hillFar;
      hills(c, ox, horizon + 6, w * 2, 150, 3);
      c.fillStyle = th.hillNear;
      hills(c, ox - 120, horizon + 10, w * 2, 96, 5);
      if (th.key === 'grass') {
        c.fillStyle = '#2f6b3a';
        for (let i = 0; i < 22; i++) {
          const tx = ox + i * 96 + ((i * 37) % 40);
          tree(c, tx, horizon + 8, 16 + (i % 3) * 6);
        }
      }
    }
  }
  c.restore();
}

function hills(c, x0, baseY, width, amp, count) {
  c.beginPath();
  c.moveTo(x0, baseY);
  const step = width / (count * 2);
  for (let i = 0; i <= count * 2; i++) {
    const x = x0 + i * step;
    const y = baseY - (i % 2 === 0 ? amp * 0.45 : amp) * (0.7 + ((i * 31) % 10) / 20);
    c.quadraticCurveTo(x - step / 2, y - amp * 0.3, x, i % 2 === 0 ? baseY - amp * 0.2 : y);
  }
  c.lineTo(x0 + width, baseY);
  c.closePath();
  c.fill();
}

function tree(c, x, y, r) {
  c.beginPath();
  c.moveTo(x - r, y);
  c.lineTo(x, y - r * 2.4);
  c.lineTo(x + r, y);
  c.closePath();
  c.fill();
}

function cloud(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r * 0.5, 0, Math.PI * 2);
  c.arc(x + r * 0.45, y - r * 0.16, r * 0.36, 0, Math.PI * 2);
  c.arc(x - r * 0.45, y + r * 0.05, r * 0.3, 0, Math.PI * 2);
  c.fill();
}

function ground(c, y1, y2, w, color) {
  c.fillStyle = color;
  c.fillRect(0, y2, w, Math.max(1, y1 - y2 + 1));
}

function band(c, x1, y1, w1, x2, y2, w2, color, alpha = 1) {
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x1 - w1, y1);
  c.lineTo(x2 - w2, y2);
  c.lineTo(x2 + w2, y2);
  c.lineTo(x1 + w1, y1);
  c.closePath();
  c.fill();
  c.globalAlpha = 1;
}

function band2(c, x1, y1, w1, x2, y2, w2, color, alpha) {
  band(c, x1, y1, w1, x2, y2, w2, color, alpha);
}

function drawBall(c, x, y, r, view) {
  if (r < 1.2) return;
  c.save();
  c.translate(x, y);
  const glow = c.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
  glow.addColorStop(0, 'rgba(255,255,255,0.65)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = glow;
  c.beginPath(); c.arc(0, 0, r * 2.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f7f9fc';
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e8433c';
  c.beginPath(); c.arc(0, 0, r, Math.PI, Math.PI * 2); c.fill();
  c.strokeStyle = '#15181f'; c.lineWidth = Math.max(1, r * 0.16);
  c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.34, 0, Math.PI * 2);
  c.fillStyle = '#f7f9fc'; c.fill(); c.stroke();
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  c.restore();
}

/** Procedural rear-view kart: wheels, bodywork, driver, exhaust. */
function drawKart(c, x, y, size, racer, view, isPlayer = false) {
  if (size < 2.5) return;
  const w = size * 2;            // overall kart width
  const bodyH = size * 0.62;
  c.save();
  c.translate(x, y);

  // ground shadow
  c.fillStyle = 'rgba(4,12,24,0.34)';
  c.beginPath(); c.ellipse(0, 0, w * 0.6, size * 0.2, 0, 0, Math.PI * 2); c.fill();

  // exhaust puffs behind the hero kart
  if (isPlayer) {
    for (let i = 0; i < 6; i++) {
      const t = (view.time * 0.004 + i * 0.7) % 3;
      const px = (i % 2 ? -1 : 1) * (w * 0.34 + t * size * 0.3);
      const py = -bodyH * 0.35 - t * size * 0.25;
      c.fillStyle = `rgba(238,244,255,${0.32 - t * 0.09})`;
      c.beginPath(); c.arc(px, py, size * (0.16 + t * 0.13), 0, Math.PI * 2); c.fill();
    }
  }

  // rear wheels
  const wheelW = w * 0.3; const wheelH = size * 0.62;
  c.fillStyle = '#15181f';
  rr(c, -w * 0.62, -wheelH, wheelW, wheelH, size * 0.12);
  rr(c, w * 0.62 - wheelW, -wheelH, wheelW, wheelH, size * 0.12);
  c.fillStyle = racer.accent;
  rr(c, -w * 0.56, -wheelH * 0.78, wheelW * 0.6, wheelH * 0.42, size * 0.06);
  rr(c, w * 0.56 - wheelW * 0.6, -wheelH * 0.78, wheelW * 0.6, wheelH * 0.42, size * 0.06);

  // chassis + bodywork
  const g = c.createLinearGradient(0, -bodyH * 1.9, 0, 0);
  g.addColorStop(0, lighten(racer.kart, 0.32));
  g.addColorStop(0.55, racer.kart);
  g.addColorStop(1, shade(racer.kart, 0.35));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-w * 0.52, -size * 0.12);
  c.lineTo(-w * 0.46, -bodyH * 1.1);
  c.quadraticCurveTo(0, -bodyH * 1.5, w * 0.46, -bodyH * 1.1);
  c.lineTo(w * 0.52, -size * 0.12);
  c.closePath(); c.fill();
  // rear diffuser / bumper
  c.fillStyle = shade(racer.kart, 0.5);
  rr(c, -w * 0.5, -size * 0.24, w, size * 0.2, size * 0.06);
  // spoiler sitting on the tail
  c.fillStyle = shade(racer.kart, 0.3);
  rr(c, -w * 0.3, -bodyH * 1.62, size * 0.1, size * 0.3, size * 0.04);
  rr(c, w * 0.3 - size * 0.1, -bodyH * 1.62, size * 0.1, size * 0.3, size * 0.04);
  c.fillStyle = racer.accent;
  rr(c, -w * 0.36, -bodyH * 1.78, w * 0.72, size * 0.12, size * 0.05);
  // brake lights
  c.fillStyle = '#ff5a4a';
  rr(c, -w * 0.4, -bodyH * 0.78, size * 0.22, size * 0.11, size * 0.04);
  rr(c, w * 0.4 - size * 0.22, -bodyH * 0.78, size * 0.22, size * 0.11, size * 0.04);

  // driver
  const headR = size * 0.36;
  const headY = -bodyH * 1.5 - headR * 0.95;
  c.fillStyle = racer.color;
  // ears / crest first so they sit behind the head
  c.beginPath();
  c.moveTo(-headR * 0.55, headY - headR * 0.5);
  c.lineTo(-headR * 1.25, headY - headR * 2.3);
  c.lineTo(-headR * 0.05, headY - headR * 0.95);
  c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(headR * 0.55, headY - headR * 0.5);
  c.lineTo(headR * 1.25, headY - headR * 2.3);
  c.lineTo(headR * 0.05, headY - headR * 0.95);
  c.closePath(); c.fill();
  c.fillStyle = racer.color;
  c.beginPath(); c.arc(0, headY, headR, 0, Math.PI * 2); c.fill();
  c.strokeStyle = racer.accent; c.lineWidth = Math.max(0.8, size * 0.055); c.stroke();
  // helmet cap + visor strap
  c.fillStyle = 'rgba(246,249,255,0.95)';
  c.beginPath(); c.arc(0, headY - headR * 0.3, headR * 0.94, Math.PI, 0); c.fill();
  c.fillStyle = racer.accent;
  rr(c, -headR * 0.94, headY - headR * 0.38, headR * 1.88, headR * 0.24, headR * 0.1);
  // eyes
  c.fillStyle = '#151b28';
  c.beginPath(); c.arc(-headR * 0.34, headY + headR * 0.22, headR * 0.14, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(headR * 0.34, headY + headR * 0.22, headR * 0.14, 0, Math.PI * 2); c.fill();

  // drift sparks
  if (isPlayer && view.playerMoving) {
    c.strokeStyle = racer.accent;
    c.globalAlpha = 0.75;
    c.lineWidth = Math.max(1, size * 0.05);
    for (let i = 0; i < 5; i++) {
      const dir = i % 2 ? 1 : -1;
      const sx = dir * w * 0.6;
      const off = ((view.time * 0.02 + i * 13) % 20) * size * 0.02;
      c.beginPath();
      c.moveTo(sx, -size * 0.2 - off);
      c.lineTo(sx + dir * size * 0.42, size * 0.12 - off);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  c.restore();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) * (1 - amt));
  const g = Math.max(0, ((n >> 8) & 255) * (1 - amt));
  const b = Math.max(0, (n & 255) * (1 - amt));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function rr(c, x, y, w, h, r) {
  c.beginPath();
  const rad = Math.min(r, w / 2, h / 2);
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
  c.fill();
}

function vignette(c, w, h, color) {
  const g = c.createRadialGradient(w / 2, h * 0.55, h * 0.3, w / 2, h * 0.55, h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, color);
  c.globalAlpha = 0.55;
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.globalAlpha = 1;
}

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + amt * 255);
  const g = Math.min(255, ((n >> 8) & 255) + amt * 255);
  const b = Math.min(255, (n & 255) + amt * 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export { ballSvg };
