/**
 * race-world / tiny canvas helpers shared by the scenery, kart and road code.
 * Pure drawing - no state, no clock reads.
 */

export function roundRect(c, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.min(Math.abs(w), Math.abs(h)) / 2));
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();
}

export function poly(c, pts) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
}

/** Quad from four corners, filled. */
export function quad(c, x1, y1, x2, y2, x3, y3, x4, y4, fill, alpha) {
  if (alpha != null) { c.save(); c.globalAlpha = alpha; }
  c.beginPath();
  c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.lineTo(x4, y4);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (alpha != null) c.restore();
}

/** #rrggbb -> rgba() with alpha. */
export function rgba(hex, a) {
  const h = hex.replace('#', '');
  const v = h.length === 3
    ? h.split('').map((x) => parseInt(x + x, 16))
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return `rgba(${v[0]},${v[1]},${v[2]},${a})`;
}

/** Blend two hex colours, t=0 -> a. */
export function mix(a, b, t) {
  const pa = hexToRgb(a); const pb = hexToRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  if (h.length === 3) return h.split('').map((x) => parseInt(x + x, 16));
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** Soft radial glow blob. */
export function glow(c, x, y, r, color, a = 0.5) {
  const g = c.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.55, rgba(color, a * 0.32));
  g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
  c.fill();
}

export function ellipse(c, x, y, rx, ry, fill, alpha) {
  if (alpha != null) { c.save(); c.globalAlpha = alpha; }
  c.beginPath();
  c.ellipse(x, y, Math.max(0.4, rx), Math.max(0.4, ry), 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (alpha != null) c.restore();
}

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
