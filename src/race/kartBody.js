/**
 * race-world / kart bodywork
 *
 * A chunky Mario-Kart-ish car drawn rear three-quarter in local space:
 * origin sits where the rear tyres meet the road, -y is up, `s` is half the
 * kart's overall width. Everything is gradient shaded - no flat fills.
 */
import { rgba, mix, roundRect, ellipse } from './paint.js';

/** rgba() that also accepts the rgb(...) strings mix()/shade() return. */
export function tint(col, a) {
  if (col[0] === '#') return rgba(col, a);
  const m = /rgba?\(([^)]+)\)/.exec(col);
  if (!m) return col;
  const p = m[1].split(',').map((v) => parseFloat(v));
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
}

export function wheel(c, x, y, w, h, trim, detail) {
  const g = c.createLinearGradient(x - w, y, x + w, y);
  g.addColorStop(0, '#0a0c10');
  g.addColorStop(0.42, '#3a424d');
  g.addColorStop(0.72, '#20262e');
  g.addColorStop(1, '#08090c');
  c.fillStyle = g;
  roundRect(c, x - w, y - h, w * 2, h, w * 0.6);
  c.fill();
  if (!detail) return;
  const hg = c.createRadialGradient(x - w * 0.2, y - h * 0.62, w * 0.05, x, y - h * 0.5, w * 0.7);
  hg.addColorStop(0, mix(trim, '#ffffff', 0.72));
  hg.addColorStop(1, mix(trim, '#000000', 0.28));
  c.fillStyle = hg;
  c.beginPath();
  c.ellipse(x, y - h * 0.5, w * 0.5, h * 0.32, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.beginPath();
  c.ellipse(x - w * 0.16, y - h * 0.6, w * 0.18, h * 0.12, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.13)';
  roundRect(c, x - w * 0.92, y - h * 0.98, w * 0.5, h * 0.46, w * 0.2);
  c.fill();
}

/** Wheel arch / fender lobe over a tyre. */
function fender(c, x, y, r, body) {
  const g = c.createLinearGradient(x, y - r * 1.1, x, y);
  g.addColorStop(0, mix(body, '#ffffff', 0.22));
  g.addColorStop(0.6, mix(body, '#000000', 0.18));
  g.addColorStop(1, mix(body, '#000000', 0.5));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, y, r, r * 0.78, 0, Math.PI, Math.PI * 2);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = Math.max(0.5, r * 0.06);
  c.beginPath();
  c.ellipse(x, y, r, r * 0.78, 0, Math.PI, Math.PI * 2);
  c.stroke();
}

/** Side-pod glyph so each livery is distinguishable at a glance. */
export function emblem(c, x, y, r, kind, col) {
  c.save();
  c.translate(x, y);
  c.fillStyle = col;
  c.beginPath();
  if (kind === 'bolt') {
    c.moveTo(-r * 0.28, -r); c.lineTo(r * 0.52, -r * 0.14); c.lineTo(r * 0.08, -r * 0.1);
    c.lineTo(r * 0.36, r); c.lineTo(-r * 0.5, r * 0.06); c.lineTo(-r * 0.04, r * 0.02);
  } else if (kind === 'flame') {
    c.moveTo(0, -r); c.quadraticCurveTo(r * 0.9, -r * 0.1, r * 0.36, r * 0.9);
    c.quadraticCurveTo(0, r * 0.4, -r * 0.36, r * 0.9);
    c.quadraticCurveTo(-r * 0.8, -r * 0.1, 0, -r);
  } else if (kind === 'drop') {
    c.moveTo(0, -r); c.quadraticCurveTo(r * 0.85, r * 0.1, 0, r);
    c.quadraticCurveTo(-r * 0.85, r * 0.1, 0, -r);
  } else if (kind === 'leaf') {
    c.moveTo(-r * 0.7, r * 0.7); c.quadraticCurveTo(-r * 0.2, -r, r * 0.8, -r * 0.7);
    c.quadraticCurveTo(r * 0.5, r * 0.5, -r * 0.7, r * 0.7);
  } else if (kind === 'fist') {
    c.moveTo(-r * 0.7, -r * 0.4); c.lineTo(r * 0.7, -r * 0.7); c.lineTo(r * 0.7, r * 0.7);
    c.lineTo(-r * 0.7, r * 0.4);
  } else if (kind === 'gem') {
    c.moveTo(0, -r); c.lineTo(r * 0.8, -r * 0.2); c.lineTo(0, r); c.lineTo(-r * 0.8, -r * 0.2);
  } else if (kind === 'moon') {
    c.arc(0, 0, r, Math.PI * 0.35, Math.PI * 1.65);
    c.quadraticCurveTo(-r * 0.1, 0, r * 0.38, -r * 0.62);
  } else {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI * 2) / 5;
      const px = Math.cos(a) * r; const py = Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
  }
  c.closePath();
  c.fill();
  c.restore();
}

/**
 * Rear bumper: diffuser vents, brake lights, plate and exhaust tips.
 */
export function rearEnd(c, s, bw, body, trim, detail) {
  c.fillStyle = mix(body, '#000000', 0.6);
  roundRect(c, -bw * 1.0, -s * 0.26, bw * 2.0, s * 0.22, s * 0.08);
  c.fill();
  if (!detail) return;
  c.fillStyle = 'rgba(0,0,0,0.5)';
  for (let i = -2; i <= 2; i++) c.fillRect(i * bw * 0.24 - s * 0.02, -s * 0.22, s * 0.035, s * 0.15);
  for (const sx of [-1, 1]) {
    c.fillStyle = '#b8202a';
    roundRect(c, sx * bw * 0.66 - s * 0.13, -s * 0.60, s * 0.26, s * 0.17, s * 0.06);
    c.fill();
    const lg = c.createLinearGradient(0, -s * 0.6, 0, -s * 0.43);
    lg.addColorStop(0, '#ff7a6a');
    lg.addColorStop(1, '#e0281c');
    c.fillStyle = lg;
    roundRect(c, sx * bw * 0.66 - s * 0.105, -s * 0.575, s * 0.21, s * 0.115, s * 0.05);
    c.fill();
  }
  // number plate
  c.fillStyle = '#f4f6f8';
  roundRect(c, -s * 0.20, -s * 0.575, s * 0.40, s * 0.20, s * 0.04);
  c.fill();
  // exhaust tips
  for (const sx of [-1, 1]) {
    const g = c.createLinearGradient(sx * bw * 0.92 - s * 0.07, 0, sx * bw * 0.92 + s * 0.07, 0);
    g.addColorStop(0, '#6c757f');
    g.addColorStop(0.5, '#d6dde4');
    g.addColorStop(1, '#5a626b');
    c.fillStyle = g;
    roundRect(c, sx * bw * 0.92 - s * 0.075, -s * 0.34, s * 0.15, s * 0.19, s * 0.07);
    c.fill();
    c.fillStyle = '#181c22';
    c.beginPath();
    c.ellipse(sx * bw * 0.92, -s * 0.245, s * 0.05, s * 0.055, 0, 0, Math.PI * 2);
    c.fill();
  }
}

export { fender };
