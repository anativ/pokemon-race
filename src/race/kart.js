/**
 * race-world / karts
 *
 * One kart = one small polygon mesh (src/race/kartBody.js) pushed through the
 * chase-camera projection in src/race/kart3d.js, plus a seated rider drawn in
 * kart-local planes (src/race/rider.js). Because the whole thing is driven by a
 * yaw / roll / steer state instead of a mirrored sprite, the kart genuinely
 * turns into corners: the nose swings, the body banks, the front wheels point
 * where the driver is steering and the far flank disappears behind the near one.
 *
 * (x, y) is where the rear tyres meet the road; `s` is half the body width.
 */
import { rgba, clamp } from './paint.js';
import { speciesOf } from './species.js';
import { buildKart, emblem, tint, hexish, liveryOf } from './kartBody.js';
import { makeFrame, paint } from './kart3d.js';
import { drawDriver, drawTail, drawBackRig } from './rider.js';
import { drawDrift, drawExhaust } from './fx.js';

/** Ambient-occlusion pool under the chassis, in screen space. */
function underBody(c, x, y, s, light) {
  const col = (light && light.color) || '#0b1420';
  const dx = (light && light.dirX != null ? light.dirX : -0.9) * s * 0.22;
  c.save();
  c.translate(x + dx, y + s * 0.04);
  c.scale(1, 0.22);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, s * 1.30);
  g.addColorStop(0, rgba(col, 0.60));
  g.addColorStop(0.55, rgba(col, 0.40));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, s * 1.30, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {number} x  screen x of the rear contact patch
 * @param {number} y  screen y of the rear contact patch
 * @param {number} s  half the body width in pixels
 * @param {object} racer roster entry
 * @param {object} opts { yaw, steer, drift, roll, pitch, spin, time, bounce, light, ambient }
 */
export function drawKart(c, x, y, s, racer, opts = {}) {
  const sp = speciesOf(racer);
  const body = hexish(racer.kart || racer.color || '#ffcf2a');
  const trim = hexish(racer.accent || '#38424f');
  const livery = liveryOf(body, racer.accent, sp.hat);
  const detail = s > 26;

  const steer = clamp(opts.steer != null ? opts.steer : (opts.lean || 0), -1, 1);
  const drift = clamp(opts.drift || 0, 0, 1);
  const base = opts.yaw != null ? opts.yaw : 0.18;
  const yaw = clamp(base + steer * 0.42 + drift * Math.sign(steer || 1) * 0.18, -0.95, 0.95);
  const roll = clamp((opts.roll || 0) - steer * 0.13, -0.20, 0.20);
  const pitch = clamp(opts.pitch || 0, -0.12, 0.12);
  const wheelSteer = clamp(steer * 0.55, -0.6, 0.6);
  const spin = opts.spin || 0;

  c.save();
  c.translate(x, y + (opts.bounce || 0));

  underBody(c, 0, 0, s, opts.light);

  const frame = makeFrame(s, { yaw, roll, pitch });
  drawTail(c, frame, sp, opts.time || 0);
  drawBackRig(c, frame, sp);
  paint(c, frame, buildKart({ body, trim, livery, steer: wheelSteer, spin }), {
    ambient: opts.ambient || 0,
  });
  drawDriver(c, frame, sp, racer, { grip: steer, detail, livery });

  if (detail && Math.abs(yaw) < 0.62) {
    const p = frame.p(0, 0.34, -1.27);
    const u = frame.unit(-1.27);
    emblem(c, p.x, p.y, u * 0.085, sp.emblem, tint(livery, 0.95));
  }

  c.restore();
}

export { drawDrift, drawExhaust };
export default drawKart;
