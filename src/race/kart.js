/**
 * race-world / karts
 *
 * A hero-sized, species-liveried kart seen from behind three-quarter: the
 * bodywork wears the racer's colours, the nose is styled as that Pokemon's
 * face, and the driver in the seat has ears, eyes, cheeks, arms on the wheel
 * and a tail. Rivals use the same builder at a smaller scale, so all twelve
 * karts are individually recognisable.
 */
import { rgba, mix, roundRect, ellipse, clamp } from './paint.js';
import { speciesOf } from './species.js';
import { wheel, fender, emblem, rearEnd, tint } from './kartBody.js';
import { drawDriver, drawTail, drawBackRig, DECK } from './rider.js';
import { drawDrift, drawExhaust } from './fx.js';

const NOSE_Y = -1.00;   // top of the bonnet
const HOOD_Y = -0.60;   // where the bonnet meets the cabin

/** The Pokemon face moulded into the front of the kart, seen edge-on. */
function noseFace(c, s, sp, q) {
  const qq = clamp(q, -0.4, 0.4);
  const vis = Math.min(1, Math.abs(qq) / 0.3);
  if (vis < 0.12) return;
  // The moulded face lives ON the bonnet: its lateral travel with yaw must stay
  // well inside the front wheels, otherwise it detaches and reads as a second
  // head stuck to the kart's flank.
  const cx = qq * s * 0.46;
  const cy = s * (NOSE_Y + 0.24);
  const rx = s * 0.34 * (0.4 + vis * 0.6);
  const ry = s * 0.27;
  const g = c.createRadialGradient(cx - rx * 0.3, cy - ry * 0.4, ry * 0.1, cx, cy, ry * 1.6);
  g.addColorStop(0, mix(sp.fur, '#ffffff', 0.45));
  g.addColorStop(0.6, sp.fur);
  g.addColorStop(1, mix(sp.fur, '#000000', 0.3));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(40,26,10,0.28)';
  c.lineWidth = Math.max(0.5, s * 0.016);
  c.stroke();
  if (vis < 0.4) return;
  const dir = Math.sign(q) || 1;
  c.fillStyle = '#1b1720';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.ellipse(cx + sx * rx * 0.44 * dir + rx * 0.1 * dir, cy - ry * 0.22,
      rx * 0.14, ry * 0.2, 0, 0, Math.PI * 2);
    c.fill();
  }
  if (sp.cheek) {
    c.fillStyle = sp.cheek;
    c.beginPath();
    c.ellipse(cx + rx * 0.6 * dir, cy + ry * 0.3, rx * 0.16, ry * 0.16, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#1b1720';
  c.lineWidth = Math.max(0.6, s * 0.018);
  c.beginPath();
  c.moveTo(cx - rx * 0.2, cy + ry * 0.42);
  c.quadraticCurveTo(cx, cy + ry * 0.68, cx + rx * 0.2, cy + ry * 0.42);
  c.stroke();
}

/** Bonnet + front wheels: everything ahead of the cabin. */
function frontEnd(c, s, body, trim, q, detail) {
  const off = q * s;
  for (const sx of [-1, 1]) {
    wheel(c, sx * s * 0.9 + off * 0.6, s * -0.4, s * 0.15, s * 0.24, trim, detail);
  }
  const g = c.createLinearGradient(0, s * NOSE_Y, 0, s * HOOD_Y);
  g.addColorStop(0, mix(body, '#ffffff', 0.5));
  g.addColorStop(0.55, mix(body, '#ffffff', 0.16));
  g.addColorStop(1, mix(body, '#000000', 0.24));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-s * 0.86 + off * 0.3, s * HOOD_Y);
  c.lineTo(-s * 0.66 + off, s * (NOSE_Y + 0.1));
  c.quadraticCurveTo(off, s * (NOSE_Y - 0.09), s * 0.66 + off, s * (NOSE_Y + 0.1));
  c.lineTo(s * 0.86 + off * 0.3, s * HOOD_Y);
  c.closePath();
  c.fill();
  if (detail) {
    c.fillStyle = 'rgba(255,255,255,0.28)';
    c.beginPath();
    c.moveTo(-s * 0.3 + off, s * (NOSE_Y + 0.12));
    c.lineTo(s * 0.1 + off, s * (NOSE_Y + 0.12));
    c.lineTo(s * 0.02 + off * 0.5, s * (HOOD_Y - 0.02));
    c.lineTo(-s * 0.34 + off * 0.5, s * (HOOD_Y - 0.02));
    c.closePath();
    c.fill();
  }
}

/** Cabin: side pods, seat back, livery. */
function cabin(c, s, body, trim, sp, detail) {
  const bw = s * 0.96;
  // side pods with fender lobes
  for (const sx of [-1, 1]) fender(c, sx * s * 0.84, s * -0.16, s * 0.42, body);
  const g = c.createLinearGradient(0, s * (DECK - 0.06), 0, s * -0.06);
  g.addColorStop(0, mix(body, '#ffffff', 0.4));
  g.addColorStop(0.45, body);
  g.addColorStop(1, mix(body, '#000000', 0.42));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-bw, s * -0.1);
  c.lineTo(-bw * 0.96, s * (DECK + 0.14));
  c.quadraticCurveTo(-bw * 0.78, s * (DECK - 0.04), -bw * 0.42, s * (DECK - 0.04));
  c.lineTo(bw * 0.42, s * (DECK - 0.04));
  c.quadraticCurveTo(bw * 0.78, s * (DECK - 0.04), bw * 0.96, s * (DECK + 0.14));
  c.lineTo(bw, s * -0.1);
  c.quadraticCurveTo(0, s * 0.06, -bw, s * -0.1);
  c.closePath();
  c.fill();
  // cockpit well
  c.fillStyle = 'rgba(18,16,26,0.6)';
  roundRect(c, -s * 0.52, s * (DECK - 0.06), s * 1.04, s * 0.26, s * 0.1);
  c.fill();
  if (!detail) return;
  // dark sill along the bottom of the flanks so the bodywork has an edge
  c.fillStyle = tint(mix(body, '#000000', 0.55), 0.85);
  c.beginPath();
  c.moveTo(-bw * 0.99, s * -0.12);
  c.quadraticCurveTo(0, s * 0.04, bw * 0.99, s * -0.12);
  c.quadraticCurveTo(0, s * -0.26, -bw * 0.99, s * -0.12);
  c.closePath();
  c.fill();
  // livery band sweeping up the flanks in the racer's accent
  c.fillStyle = tint(mix(trim, '#000000', 0.32), 0.95);
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * bw * 0.99, s * -0.34);
    c.quadraticCurveTo(sx * bw * 0.72, s * -0.56, sx * bw * 0.3, s * (DECK + 0.14));
    c.lineTo(sx * bw * 0.58, s * (DECK + 0.14));
    c.quadraticCurveTo(sx * bw * 0.88, s * -0.5, sx * bw * 0.99, s * -0.46);
    c.closePath();
    c.fill();
  }
}

/** Rear wing across the tail. */
function spoiler(c, s, body, trim) {
  // twin tail fins at the rear corners, like the reference car
  for (const sx of [-1, 1]) {
    const bx = sx * s * 0.74;
    const g = c.createLinearGradient(bx, s * -0.94, bx, s * -0.52);
    g.addColorStop(0, mix(trim, '#ffffff', 0.6));
    g.addColorStop(0.55, trim);
    g.addColorStop(1, mix(trim, '#000000', 0.4));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(bx - sx * s * 0.11, s * -0.5);
    c.lineTo(bx - sx * s * 0.13, s * -0.86);
    c.quadraticCurveTo(bx, s * -0.98, bx + sx * s * 0.13, s * -0.82);
    c.lineTo(bx + sx * s * 0.12, s * -0.5);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath();
    c.moveTo(bx - sx * s * 0.11, s * -0.82);
    c.lineTo(bx - sx * s * 0.13, s * -0.86);
    c.quadraticCurveTo(bx, s * -0.98, bx + sx * s * 0.13, s * -0.82);
    c.closePath();
    c.fill();
  }
}

/** Ambient-occlusion pool under the chassis, in kart-local space. */
function underBody(c, s, light) {
  const col = (light && light.color) || '#0b1420';
  const dx = (light && light.dirX != null ? light.dirX : -0.9) * s * 0.30;
  c.save();
  c.translate(dx * 0.5, s * 0.05);
  c.scale(1, 0.24);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, s * 1.22);
  g.addColorStop(0, rgba(col, 0.62));
  g.addColorStop(0.55, rgba(col, 0.42));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, s * 1.22, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/**
 * Rear three-quarter kart with driver. (x, y) is where the rear tyres touch
 * the road, `s` is roughly half the kart's overall width in pixels.
 */
export function drawKart(c, x, y, s, racer, opts = {}) {
  const sp = speciesOf(racer);
  const body = racer.kart || racer.color || '#ffcf2a';
  const trim = racer.accent || '#333';
  const lean = opts.lean || 0;
  const detail = s > 26;
  const q = clamp((opts.yaw != null ? opts.yaw : 0.2) + lean * 0.34, -0.62, 0.62);

  c.save();
  c.translate(x, y + (opts.bounce || 0));
  c.rotate(lean * 0.07);

  // under-body occlusion: the darkest part of the shadow, hard against the
  // tyres, drawn as a gradient so the kart is bedded into the road rather
  // than stamped on top of it (the long cast shadow is laid down by world.js)
  underBody(c, s, opts.light);

  drawTail(c, s, sp, opts.time || 0);
  drawBackRig(c, s, sp);
  frontEnd(c, s, body, trim, q, detail);
  cabin(c, s, body, trim, sp, detail);
  if (sp.nose === 'face') noseFace(c, s, sp, q);
  drawDriver(c, s, sp, racer, lean, detail);
  rearEnd(c, s, s * 0.64, body, trim, detail);
  if (detail) emblem(c, 0, s * -0.475, s * 0.085, sp.emblem, tint(mix(trim, '#000000', 0.3), 0.98));
  for (const sx of [-1, 1]) {
    wheel(c, sx * s * 0.92, 0, s * 0.26, s * 0.52, trim, detail);
  }
  spoiler(c, s, body, trim);

  c.restore();
}

export { drawDrift, drawExhaust };
export default drawKart;
