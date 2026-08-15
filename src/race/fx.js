/**
 * race-world / kart VFX
 *
 * Drift sparks off the rear tyres, tyre smoke, boost flame and the exhaust
 * plume that trails the player. Cosmetic only: driven by `time`, never writes
 * to sim state.
 */
import { rgba, mix } from './paint.js';
import { noise1 } from './geometry.js';

const SPARK_COLORS = ['#fff3b0', '#ffd23c', '#ff9a1e', '#ff5f1e'];

/** Four-point star spark. */
function star(c, x, y, r, col, a) {
  c.globalAlpha = a;
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  c.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  c.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  c.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  c.closePath();
  c.fill();
}

/**
 * Sparks + smoke thrown by the rear tyres while drifting, plus the boost
 * flame. (x, y) is the kart's rear contact patch, `s` its half width.
 */
export function drawDrift(c, x, y, s, amount, boost, time, color) {
  const amt = Math.max(0, Math.min(1.4, amount));
  if (amt <= 0.02 && boost <= 0.02) return;
  c.save();

  // tyre smoke
  if (amt > 0.14) for (const sx of [-1, 1]) {
    const bx = x + sx * s * 0.9;
    for (let i = 0; i < 6; i++) {
      const t = (i + (time * 0.0016 % 1)) / 6;
      const rr = s * (0.08 + t * 0.24) * (0.45 + amt * 0.7);
      c.globalAlpha = (0.22 - t * 0.05) * Math.min(1, amt * 0.9 + boost * 0.4);
      const px = bx + sx * t * s * 0.66 + Math.sin(time * 0.006 + i * 2.1) * s * 0.07;
      const py = y - t * s * 0.5 - s * 0.06;
      // soft-edged puff: a hard-edged disc reads as a pasted circle
      const pg = c.createRadialGradient(px, py, 0, px, py, rr);
      const col = i % 2 ? '#eef2f7' : '#c9d3de';
      pg.addColorStop(0, rgba(col, 0.9));
      pg.addColorStop(0.55, rgba(col, 0.5));
      pg.addColorStop(1, rgba(col, 0));
      c.fillStyle = pg;
      c.beginPath();
      c.arc(px, py, rr, 0, Math.PI * 2);
      c.fill();
    }
  }

  // sparks
  const heat = Math.min(1, amt * 0.8 + boost);
  const n = Math.round(6 + heat * 8);
  for (const sx of [-1, 1]) {
    const bx = x + sx * s * 0.84;
    for (let i = 0; i < n; i++) {
      const ph = (time * 0.0022 + noise1(i, sx > 0 ? 31 : 77)) % 1;
      const spread = 0.25 + noise1(i, 5) * 1.0;
      const px = bx + sx * spread * s * ph * 1.5 + (noise1(i, 9) - 0.5) * s * 0.3;
      const py = y - ph * s * (0.55 + noise1(i, 13) * 0.7) + s * 0.05;
      const rr = s * (0.05 + noise1(i, 21) * 0.09) * (1 - ph * 0.55) * (0.7 + heat * 0.8);
      const col = SPARK_COLORS[i % SPARK_COLORS.length];
      star(c, px, py, rr, col, (1 - ph) * Math.min(1, amt * 0.9 + boost * 0.6));
    }
  }
  // hot glow at the contact patches
  if (heat > 0.16) {
    c.globalAlpha = Math.min(0.5, (heat - 0.16) * 0.7);
    for (const sx of [-1, 1]) {
      const gx = x + sx * s * 0.9;
      const gy = y - s * 0.02;
      const g = c.createRadialGradient(gx, gy, 0, gx, gy, s * 0.22);
      g.addColorStop(0, 'rgba(255,214,90,0.9)');
      g.addColorStop(1, 'rgba(255,120,20,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(gx, gy, s * 0.22, 0, Math.PI * 2);
      c.fill();
    }
  }

  // boost flames out of the pipes
  if (boost > 0.02) {
    for (const sx of [-1, 1]) {
      const bx = x + sx * s * 0.60;
      c.globalAlpha = Math.min(0.95, boost);
      const g = c.createLinearGradient(bx, y - s * 0.34, bx, y + s * 0.55);
      g.addColorStop(0, rgba('#ffffff', 0.95));
      g.addColorStop(0.35, rgba(color && color[0] === '#' ? color : '#ffd63b', 0.85));
      g.addColorStop(1, rgba('#ff5a2a', 0));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(bx - s * 0.15, y - s * 0.34);
      c.lineTo(bx + s * 0.15, y - s * 0.34);
      c.lineTo(bx + Math.sin(time * 0.02 + sx) * s * 0.06, y + s * 0.6);
      c.closePath();
      c.fill();
    }
  }
  c.restore();
}

/**
 * Exhaust plume trailing behind the kart - a stack of soft puffs that grow and
 * fade with distance. Draw this *before* the kart so it sits behind it.
 */
export function drawExhaust(c, x, y, s, speedT, time, tintCol) {
  const power = Math.max(0, Math.min(1, speedT));
  if (power < 0.04) return;
  c.save();
  const base = tintCol || '#dfe6ee';
  for (const sx of [-1, 1]) {
    const bx = x + sx * s * 0.5;
    for (let i = 0; i < 7; i++) {
      const ph = ((time * 0.0011) + i / 7) % 1;
      const rr = s * (0.07 + ph * 0.3) * (0.5 + power * 0.8);
      const px = bx + sx * ph * s * 0.5 + Math.sin(time * 0.003 + i * 1.7) * s * 0.08;
      const py = y - s * 0.06 + ph * s * 0.34;
      c.globalAlpha = (1 - ph) * 0.15 * (0.3 + power);
      const col = i % 3 === 0 ? '#f4f7fb' : '#a9b4c1';
      const pg = c.createRadialGradient(px, py, 0, px, py, rr);
      pg.addColorStop(0, rgba(col, 0.85));
      pg.addColorStop(1, rgba(col, 0));
      c.fillStyle = pg;
      c.beginPath();
      c.arc(px, py, rr, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

export default drawDrift;
