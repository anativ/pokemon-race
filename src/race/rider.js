/**
 * race-world / driver
 *
 * The Pokemon sitting in the kart's seat well. Everything is drawn inside
 * *kart-local planes* handed over by kart3d: `plane(frame, z)` installs a canvas
 * transform whose axes are the projected kart x/y axes at that depth, so the
 * rider is automatically foreshortened, leaned and shifted when the kart yaws
 * or rolls - no separate sprite, no symmetric cutout.
 *
 * Plane coordinates: +x right, +y UP, 1 unit = half the kart's body width,
 * y = 0 is the road.
 */
import { mix, roundRect } from './paint.js';
import { tint } from './kartBody.js';

export const SEAT_Z = -0.30;    // torso plane
export const HEAD_Z = -0.40;    // head plane
export const BACK_Z = -0.80;    // tail / rig plane
export const HEAD_Y = 1.50;
export const HEAD_R = 0.30;

/**
 * Install a canvas transform for the kart-local x/y plane at depth `z`.
 * Returns false (and installs nothing) if the plane is degenerate.
 */
export function plane(c, frame, z) {
  const o = frame.p(0, 0, z);
  const px = frame.p(1, 0, z);
  const py = frame.p(0, 1, z);
  const ex = px.x - o.x; const exy = px.y - o.y;
  const ey = py.x - o.x; const eyy = py.y - o.y;
  if (!isFinite(ex) || Math.abs(ex * eyy - ey * exy) < 1e-4) return false;
  c.save();
  c.transform(ex, exy, ey, eyy, o.x, o.y);
  return true;
}

/** Tail / back rigging drawn behind the seat. */
export function drawTail(c, frame, sp, time) {
  if (!plane(c, frame, BACK_Z)) return;
  const wag = Math.sin(time * 0.004) * 0.05;
  c.translate(-0.30, 0.86);
  c.rotate(-wag);
  c.scale(0.44, 0.44);
  const t = sp.tail;
  if (t === 'bolt') {
    const g = c.createLinearGradient(0, 0, -0.5, 1.5);
    g.addColorStop(0, mix(sp.fur, '#8a5a22', 0.55));
    g.addColorStop(0.35, sp.fur);
    g.addColorStop(1, mix(sp.fur, '#ffffff', 0.32));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-0.30, 0.30); c.lineTo(-0.02, 0.44); c.lineTo(-0.34, 0.86);
    c.lineTo(-0.06, 0.92); c.lineTo(-0.52, 1.52); c.lineTo(-0.86, 1.10);
    c.lineTo(-0.56, 1.02); c.lineTo(-0.80, 0.60); c.lineTo(-0.48, 0.52);
    c.lineTo(-0.60, 0.14);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(90,60,20,0.5)';
    c.lineWidth = 0.035;
    c.stroke();
  } else if (t === 'flame') {
    c.fillStyle = mix(sp.fur, '#000000', 0.12);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-0.55, 0.2, -0.62, 0.78);
    c.quadraticCurveTo(-0.44, 0.42, -0.12, 0.16);
    c.closePath();
    c.fill();
    const fg = c.createRadialGradient(-0.66, 0.94, 0.02, -0.66, 0.9, 0.36);
    fg.addColorStop(0, '#fff6c8');
    fg.addColorStop(0.4, '#ffb42a');
    fg.addColorStop(1, 'rgba(255,80,20,0)');
    c.fillStyle = fg;
    c.beginPath();
    c.moveTo(-0.66, 1.34 + Math.abs(wag));
    c.quadraticCurveTo(-0.36, 0.88, -0.66, 0.68);
    c.quadraticCurveTo(-0.96, 0.88, -0.66, 1.34);
    c.closePath();
    c.fill();
  } else if (t === 'curl' || t === 'fluffy') {
    const g = c.createLinearGradient(0, 0, -0.7, 0.7);
    g.addColorStop(0, mix(sp.fur, '#ffffff', 0.28));
    g.addColorStop(1, mix(sp.fur, '#000000', 0.3));
    c.fillStyle = g;
    c.beginPath();
    if (t === 'curl') {
      c.moveTo(0, 0);
      c.quadraticCurveTo(-0.86, 0.16, -0.62, 0.78);
      c.quadraticCurveTo(-0.44, 0.4, -0.06, 0.22);
    } else {
      c.ellipse(-0.42, 0.42, 0.44, 0.34, 0.6, 0, Math.PI * 2);
    }
    c.closePath();
    c.fill();
  } else if (t === 'spike') {
    c.fillStyle = mix(sp.fur, '#000000', 0.22);
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-(0.04 + i * 0.2), 0);
      c.lineTo(-(0.26 + i * 0.24), 0.5 + i * 0.16);
      c.lineTo(-(0.36 + i * 0.2), 0);
      c.closePath();
      c.fill();
    }
  } else if (t === 'coin') {
    c.strokeStyle = mix(sp.fur, '#000000', 0.18);
    c.lineWidth = 0.09;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-0.9, 0.1, -0.7, 0.72);
    c.stroke();
    c.fillStyle = '#f6c63c';
    c.beginPath();
    c.arc(-0.72, 0.8, 0.16, 0, Math.PI * 2);
    c.fill();
  } else if (t === 'leaf') {
    c.fillStyle = mix('#6fc44c', '#000000', 0.1);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-0.2, 0.9, -0.72, 0.9);
    c.quadraticCurveTo(-0.36, 0.4, 0, 0);
    c.fill();
  }
  c.restore();
}

/** Shell / bulb / wings mounted behind the seat. */
export function drawBackRig(c, frame, sp) {
  const k = sp.back;
  if (k === 'none') return;
  if (!plane(c, frame, BACK_Z + 0.06)) return;
  if (k === 'shell') {
    const g = c.createRadialGradient(-0.1, 1.05, 0.04, 0, 0.9, 0.6);
    g.addColorStop(0, '#c9853f');
    g.addColorStop(1, '#7a4a1e');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, 0.86, 0.52, 0.40, 0, 0, Math.PI);
    c.fill();
    c.strokeStyle = 'rgba(255,230,190,0.5)';
    c.lineWidth = 0.03;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(i * 0.24, 0.86);
      c.lineTo(i * 0.15, 1.22);
      c.stroke();
    }
  } else if (k === 'bulb') {
    const g = c.createRadialGradient(-0.1, 1.24, 0.03, 0, 1.06, 0.5);
    g.addColorStop(0, '#a8e878');
    g.addColorStop(1, '#3f7a4c');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, 1.04, 0.40, 0.38, 0, 0, Math.PI * 2);
    c.fill();
  } else if (k === 'wings') {
    c.fillStyle = tint(mix(sp.fur, '#000000', 0.3), 0.9);
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(sx * 0.26, 0.9);
      c.quadraticCurveTo(sx * 1.15, 1.75, sx * 0.95, 0.82);
      c.quadraticCurveTo(sx * 0.64, 0.98, sx * 0.26, 0.9);
      c.closePath();
      c.fill();
    }
  }
  c.restore();
}

/** Ears / crest, in plane coords (+y up) above a head of radius r at (hx, hy). */
function drawEars(c, sp, hx, hy, r, turn) {
  const k = sp.ear;
  if (k === 'none') return;
  const base = mix(sp.fur, '#000000', 0.06);
  const tip = sp.earTip || base;
  c.fillStyle = base;
  if (k === 'long') {
    for (const sx of [-1, 1]) {
      c.save();
      c.translate(hx + sx * r * 0.42 + turn * r * 0.3, hy + r * 0.62);
      c.rotate(sx * 0.12);
      c.beginPath();
      c.moveTo(-r * 0.26, -r * 0.16);
      c.quadraticCurveTo(sx * r * 0.34, r * 1.5, sx * r * 0.52, r * 1.72);
      c.quadraticCurveTo(sx * r * 0.86, r * 1.5, r * 0.30, -r * 0.1);
      c.closePath();
      c.fill();
      c.fillStyle = tip;
      c.beginPath();
      c.moveTo(sx * r * 0.16, r * 1.16);
      c.quadraticCurveTo(sx * r * 0.34, r * 1.5, sx * r * 0.52, r * 1.72);
      c.quadraticCurveTo(sx * r * 0.86, r * 1.5, sx * r * 0.62, r * 1.04);
      c.closePath();
      c.fill();
      c.fillStyle = base;
      c.restore();
    }
  } else if (k === 'cat') {
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.2, hy + r * 0.7);
      c.lineTo(hx + sx * r * 0.86, hy + r * 1.7);
      c.lineTo(hx + sx * r * 1.08, hy + r * 0.44);
      c.closePath();
      c.fill();
      c.fillStyle = tip;
      c.beginPath();
      c.moveTo(hx + sx * r * 0.55, hy + r * 1.16);
      c.lineTo(hx + sx * r * 0.86, hy + r * 1.7);
      c.lineTo(hx + sx * r * 0.95, hy + r * 0.96);
      c.closePath();
      c.fill();
      c.fillStyle = base;
    }
  } else if (k === 'round') {
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.ellipse(hx + sx * r * 0.86, hy + r * 0.72, r * 0.34, r * 0.44, sx * 0.4, 0, Math.PI * 2);
      c.fill();
    }
  } else if (k === 'spike') {
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(hx + sx * r * (0.3 + i * 0.28), hy + r * 0.75);
        c.lineTo(hx + sx * r * (0.62 + i * 0.34), hy + r * (1.7 - i * 0.3));
        c.lineTo(hx + sx * r * (0.78 + i * 0.28), hy + r * 0.6);
        c.closePath();
        c.fill();
      }
    }
  } else if (k === 'horn') {
    c.fillStyle = tip;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.36, hy + r * 0.86);
      c.quadraticCurveTo(hx + sx * r * 1.4, hy + r * 1.5, hx + sx * r * 1.3, hy + r * 1.9);
      c.quadraticCurveTo(hx + sx * r * 0.92, hy + r * 1.2, hx + sx * r * 0.62, hy + r * 0.72);
      c.closePath();
      c.fill();
    }
  } else if (k === 'fin') {
    c.fillStyle = tip;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.5, hy + r * 0.5);
      c.quadraticCurveTo(hx + sx * r * 1.5, hy + r * 0.9, hx + sx * r * 1.55, hy + r * 0.1);
      c.quadraticCurveTo(hx + sx * r * 1.0, hy + r * 0.24, hx + sx * r * 0.5, hy + r * 0.5);
      c.closePath();
      c.fill();
    }
  } else if (k === 'crest') {
    c.fillStyle = tip;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(hx + i * r * 0.3, hy + r * 0.8);
      c.lineTo(hx + i * r * 0.62, hy + r * (1.86 - Math.abs(i) * 0.34));
      c.lineTo(hx + i * r * 0.3 + r * 0.26, hy + r * 0.74);
      c.closePath();
      c.fill();
    }
  } else if (k === 'antenna') {
    c.strokeStyle = tip;
    c.lineWidth = r * 0.11;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.34, hy + r * 0.82);
      c.quadraticCurveTo(hx + sx * r * 1.0, hy + r * 1.7, hx + sx * r * 0.72, hy + r * 2.0);
      c.stroke();
      c.fillStyle = tip;
      c.beginPath();
      c.arc(hx + sx * r * 0.72, hy + r * 2.02, r * 0.17, 0, Math.PI * 2);
      c.fill();
    }
  }
}

/** Eyes / cheeks / muzzle, shifted around the skull by `turn` (-1..1). */
function drawFace(c, sp, hx, hy, r, turn) {
  const dark = '#1b1720';
  const ox = turn * r * 0.52;
  const squash = 1 - Math.abs(turn) * 0.34;
  if (sp.cheek) {
    for (const sx of [-1, 1]) {
      const cx = hx + ox + sx * r * 0.66 * squash;
      const g = c.createRadialGradient(cx, hy - r * 0.2, r * 0.03, cx, hy - r * 0.22, r * 0.3);
      g.addColorStop(0, mix(sp.cheek, '#ffffff', 0.4));
      g.addColorStop(1, sp.cheek);
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(cx, hy - r * 0.22, r * 0.25, r * 0.22, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  for (const sx of [-1, 1]) {
    const ex = hx + ox + sx * r * 0.38 * squash;
    c.fillStyle = dark;
    c.beginPath();
    if (sp.eye === 'sleepy') {
      c.ellipse(ex, hy + r * 0.08, r * 0.2 * squash, r * 0.06, 0, 0, Math.PI * 2);
    } else if (sp.eye === 'sharp') {
      c.moveTo(ex - r * 0.2 * squash, hy + r * 0.26);
      c.lineTo(ex + r * 0.22 * squash, hy + r * 0.12);
      c.lineTo(ex + r * 0.12 * squash, hy - r * 0.14);
      c.lineTo(ex - r * 0.18 * squash, hy - r * 0.04);
      c.closePath();
    } else {
      c.ellipse(ex, hy + r * 0.1, r * 0.19 * squash, r * 0.23, 0, 0, Math.PI * 2);
    }
    c.fill();
    if (sp.eye !== 'sleepy') {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(ex + r * 0.04, hy + r * 0.2, r * 0.075 * squash, r * 0.09, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  // muzzle
  c.fillStyle = mix(sp.skin, '#ffffff', 0.12);
  c.beginPath();
  c.ellipse(hx + ox * 1.25, hy - r * 0.4, r * 0.34 * squash, r * 0.24, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = dark;
  c.lineWidth = r * 0.08;
  c.beginPath();
  c.moveTo(hx + ox * 1.25 - r * 0.2 * squash, hy - r * 0.34);
  c.quadraticCurveTo(hx + ox * 1.25 - r * 0.06, hy - r * 0.52, hx + ox * 1.25, hy - r * 0.34);
  c.quadraticCurveTo(hx + ox * 1.25 + r * 0.06, hy - r * 0.52, hx + ox * 1.25 + r * 0.2 * squash, hy - r * 0.34);
  c.stroke();
  c.fillStyle = dark;
  c.beginPath();
  c.ellipse(hx + ox * 1.25, hy - r * 0.22, r * 0.07, r * 0.05, 0, 0, Math.PI * 2);
  c.fill();
}

/** Racing cap: crown across the skull, peak pointing where the driver looks. */
function drawHelmet(c, hx, hy, r, col, turn) {
  const g = c.createLinearGradient(0, hy + r * 1.1, 0, hy + r * 0.1);
  g.addColorStop(0, mix(col, '#ffffff', 0.45));
  g.addColorStop(1, mix(col, '#000000', 0.2));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(hx, hy + r * 0.16, r * 1.03, r * 0.94, 0, 0, Math.PI);
  c.closePath();
  c.fill();
  c.fillStyle = mix(col, '#000000', 0.34);
  c.beginPath();
  c.ellipse(hx + turn * r * 0.72, hy + r * 0.4, r * 0.62, r * 0.19, -turn * 0.14, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.42)';
  c.beginPath();
  c.ellipse(hx - r * 0.34, hy + r * 0.7, r * 0.26, r * 0.12, 0.42, 0, Math.PI * 2);
  c.fill();
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * Full driver, seated. `frame` is a kart3d frame, `grip` in -1..1 is the
 * steering input (leans the shoulders and turns the wheel).
 */
export function drawDriver(c, frame, sp, racer, opts = {}) {
  const grip = opts.grip || 0;
  const detail = opts.detail !== false;
  const trim = opts.livery || racer.accent || '#444';
  const turn = clamp(Math.sin(frame.yaw) * 1.45 + grip * 0.2, -0.92, 0.92);
  const lean = grip * 0.07;

  // ---- torso, in the seat plane ----------------------------------------
  if (plane(c, frame, SEAT_Z)) {
    c.translate(0, 0.62);
    c.rotate(-lean);
    c.translate(0, -0.62);
    const tg = c.createLinearGradient(0, 1.28, 0, 0.56);
    tg.addColorStop(0, mix(sp.fur, '#ffffff', 0.24));
    tg.addColorStop(1, mix(sp.fur, '#000000', 0.42));
    c.fillStyle = tg;
    roundRect(c, -0.33, 0.58, 0.66, 0.68, 0.20);
    c.fill();
    c.strokeStyle = 'rgba(48,32,12,0.30)';
    c.lineWidth = 0.022;
    c.stroke();
    // racing bib
    c.fillStyle = tint(mix(trim, '#ffffff', 0.12), 0.92);
    roundRect(c, -0.21, 0.74, 0.42, 0.42, 0.13);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.30)';
    roundRect(c, -0.30, 1.00, 0.16, 0.22, 0.07);
    c.fill();
    c.restore();
  }

  // ---- steering wheel + arms -------------------------------------------
  if (detail) {
    const u = frame.unit(0.18);
    if (plane(c, frame, 0.18)) {
      c.strokeStyle = '#20242c';
      c.lineWidth = 0.075;
      c.beginPath();
      c.ellipse(0, 0.98, 0.27, 0.13, grip * 0.2, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = mix(trim, '#ffffff', 0.3);
      c.lineWidth = 0.028;
      c.beginPath();
      c.ellipse(0, 0.99, 0.27, 0.13, grip * 0.2, Math.PI, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    c.save();
    c.strokeStyle = mix(sp.fur, '#000000', 0.16);
    c.lineWidth = Math.max(1, u * 0.15);
    c.lineCap = 'round';
    for (const sx of [-1, 1]) {
      const sh = frame.p(sx * 0.30, 1.10, SEAT_Z);
      const gp = frame.p(sx * 0.25, 1.00 + sx * grip * 0.09, 0.18);
      c.beginPath();
      c.moveTo(sh.x, sh.y);
      c.quadraticCurveTo((sh.x + gp.x) / 2 + sx * u * 0.09, (sh.y + gp.y) / 2, gp.x, gp.y);
      c.stroke();
    }
    // gloves: the paws must not vanish into a same-coloured body
    c.fillStyle = mix(trim, '#ffffff', 0.34);
    c.strokeStyle = 'rgba(30,22,10,0.4)';
    c.lineWidth = Math.max(0.6, u * 0.014);
    for (const sx of [-1, 1]) {
      const gp = frame.p(sx * 0.25, 1.00 + sx * grip * 0.09, 0.18);
      c.beginPath();
      c.ellipse(gp.x, gp.y, u * 0.10, u * 0.085, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.lineCap = 'butt';
    c.restore();
  }

  // ---- head -------------------------------------------------------------
  if (!plane(c, frame, HEAD_Z)) return;
  const r = HEAD_R;
  const hx = grip * 0.05 - lean * 0.4;
  const hy = HEAD_Y;
  drawEars(c, sp, hx, hy, r, turn);
  const hg = c.createRadialGradient(hx - r * 0.32, hy + r * 0.36, r * 0.06, hx, hy, r * 1.36);
  hg.addColorStop(0, mix(sp.fur, '#ffffff', 0.44));
  hg.addColorStop(0.55, sp.fur);
  hg.addColorStop(1, mix(sp.fur, '#000000', 0.32));
  c.fillStyle = hg;
  c.beginPath();
  c.ellipse(hx, hy, r * 1.05, r, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(40,26,10,0.24)';
  c.lineWidth = r * 0.06;
  c.stroke();
  if (detail) drawFace(c, sp, hx, hy - r * 0.06, r, turn);
  drawHelmet(c, hx, hy, r, sp.hat || trim, turn);
  c.restore();
}

export { drawEars };
