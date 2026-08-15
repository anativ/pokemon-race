/**
 * race-world / driver
 *
 * The Pokemon in the seat, seen from behind with the head turned just enough
 * that one eye, the muzzle and a cheek patch read. Local space matches the kart
 * body: origin at the rear contact patch, -y up, `s` = half the kart's width.
 */
import { mix, roundRect } from './paint.js';
import { tint } from './kartBody.js';

const DECK = -0.78;     // top of the bodywork
const HEAD = -1.22;     // head centre

/** Tail / back rigging drawn *behind* the driver. */
export function drawTail(c, s, sp, time) {
  const wag = Math.sin(time * 0.004) * 0.06;
  c.save();
  c.translate(-s * 0.34, s * DECK + s * 0.18);
  c.rotate(wag);
  c.scale(0.74, 0.74);
  const t = sp.tail;
  if (t === 'bolt') {
    const g = c.createLinearGradient(0, 0, -s * 0.5, -s * 1.5);
    g.addColorStop(0, mix(sp.fur, '#8a5a22', 0.55));
    g.addColorStop(0.35, mix(sp.fur, '#000000', 0.05));
    g.addColorStop(1, mix(sp.fur, '#ffffff', 0.3));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-s * 0.30, -s * 0.30);
    c.lineTo(-s * 0.02, -s * 0.44);
    c.lineTo(-s * 0.34, -s * 0.86);
    c.lineTo(-s * 0.06, -s * 0.92);
    c.lineTo(-s * 0.52, -s * 1.52);
    c.lineTo(-s * 0.86, -s * 1.10);
    c.lineTo(-s * 0.56, -s * 1.02);
    c.lineTo(-s * 0.80, -s * 0.60);
    c.lineTo(-s * 0.48, -s * 0.52);
    c.lineTo(-s * 0.60, -s * 0.14);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(90,60,20,0.5)';
    c.lineWidth = Math.max(0.6, s * 0.014);
    c.stroke();
  } else if (t === 'flame') {
    c.fillStyle = mix(sp.fur, '#000000', 0.12);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-s * 0.55, -s * 0.2, -s * 0.62, -s * 0.78);
    c.quadraticCurveTo(-s * 0.44, -s * 0.42, -s * 0.12, -s * 0.16);
    c.closePath();
    c.fill();
    const fg = c.createRadialGradient(-s * 0.66, -s * 0.94, s * 0.02, -s * 0.66, -s * 0.9, s * 0.36);
    fg.addColorStop(0, '#fff6c8');
    fg.addColorStop(0.4, '#ffb42a');
    fg.addColorStop(1, 'rgba(255,80,20,0)');
    c.fillStyle = fg;
    c.beginPath();
    c.moveTo(-s * 0.66, -s * 1.34 - Math.abs(wag) * s);
    c.quadraticCurveTo(-s * 0.36, -s * 0.88, -s * 0.66, -s * 0.68);
    c.quadraticCurveTo(-s * 0.96, -s * 0.88, -s * 0.66, -s * 1.34);
    c.closePath();
    c.fill();
  } else if (t === 'curl' || t === 'fluffy') {
    const g = c.createLinearGradient(0, 0, -s * 0.7, -s * 0.7);
    g.addColorStop(0, mix(sp.fur, '#ffffff', 0.28));
    g.addColorStop(1, mix(sp.fur, '#000000', 0.3));
    c.fillStyle = g;
    c.beginPath();
    if (t === 'curl') {
      c.moveTo(0, 0);
      c.quadraticCurveTo(-s * 0.86, -s * 0.16, -s * 0.62, -s * 0.78);
      c.quadraticCurveTo(-s * 0.44, -s * 0.4, -s * 0.06, -s * 0.22);
    } else {
      c.ellipse(-s * 0.42, -s * 0.42, s * 0.44, s * 0.34, -0.6, 0, Math.PI * 2);
    }
    c.closePath();
    c.fill();
  } else if (t === 'spike') {
    c.fillStyle = mix(sp.fur, '#000000', 0.22);
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-s * (0.04 + i * 0.2), 0);
      c.lineTo(-s * (0.26 + i * 0.24), -s * (0.5 + i * 0.16));
      c.lineTo(-s * (0.36 + i * 0.2), 0);
      c.closePath();
      c.fill();
    }
  } else if (t === 'coin') {
    c.fillStyle = mix(sp.fur, '#000000', 0.18);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-s * 0.9, -s * 0.1, -s * 0.7, -s * 0.72);
    c.lineWidth = s * 0.09;
    c.strokeStyle = mix(sp.fur, '#000000', 0.18);
    c.stroke();
    c.fillStyle = '#f6c63c';
    c.beginPath();
    c.arc(-s * 0.72, -s * 0.8, s * 0.16, 0, Math.PI * 2);
    c.fill();
  } else if (t === 'leaf') {
    c.fillStyle = mix('#6fc44c', '#000000', 0.1);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-s * 0.2, -s * 0.9, -s * 0.72, -s * 0.9);
    c.quadraticCurveTo(-s * 0.36, -s * 0.4, 0, 0);
    c.fill();
  }
  c.restore();
}

/** Shell / bulb / wings mounted behind the seat. */
export function drawBackRig(c, s, sp) {
  const k = sp.back;
  if (k === 'none') return;
  c.save();
  if (k === 'shell') {
    const g = c.createRadialGradient(-s * 0.1, s * DECK - s * 0.16, s * 0.04, 0, s * DECK, s * 0.6);
    g.addColorStop(0, '#c9853f');
    g.addColorStop(1, '#7a4a1e');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, s * DECK + s * 0.02, s * 0.56, s * 0.42, 0, Math.PI, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,230,190,0.5)';
    c.lineWidth = Math.max(0.6, s * 0.02);
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(i * s * 0.26, s * DECK + s * 0.02);
      c.lineTo(i * s * 0.16, s * DECK - s * 0.36);
      c.stroke();
    }
  } else if (k === 'bulb') {
    const g = c.createRadialGradient(-s * 0.1, s * DECK - s * 0.3, s * 0.03, 0, s * DECK - s * 0.16, s * 0.5);
    g.addColorStop(0, '#a8e878');
    g.addColorStop(1, '#3f7a4c');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, s * DECK - s * 0.06, s * 0.42, s * 0.40, 0, 0, Math.PI * 2);
    c.fill();
  } else if (k === 'wings') {
    c.fillStyle = tint(mix(sp.fur, '#000000', 0.3), 0.92);
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(sx * s * 0.30, s * DECK + s * 0.06);
      c.quadraticCurveTo(sx * s * 1.25, s * DECK - s * 0.9, sx * s * 1.02, s * DECK + s * 0.16);
      c.quadraticCurveTo(sx * s * 0.7, s * DECK - s * 0.04, sx * s * 0.30, s * DECK + s * 0.06);
      c.closePath();
      c.fill();
    }
  }
  c.restore();
}

/** Ears / crest behind the head. */
function drawEars(c, s, sp, hx, hy, r) {
  const k = sp.ear;
  if (k === 'none') return;
  const base = mix(sp.fur, '#000000', 0.06);
  const tip = sp.earTip || base;
  c.fillStyle = base;
  if (k === 'long') {
    for (const sx of [-1, 1]) {
      const lean = sx * 0.1;
      c.save();
      c.translate(hx + sx * r * 0.42, hy - r * 0.62);
      c.rotate(lean);
      c.beginPath();
      c.moveTo(-r * 0.26, r * 0.16);
      c.quadraticCurveTo(sx * r * 0.34, -r * 1.5, sx * r * 0.52, -r * 1.72);
      c.quadraticCurveTo(sx * r * 0.86, -r * 1.5, r * 0.30, r * 0.1);
      c.closePath();
      c.fill();
      c.fillStyle = tip;
      c.beginPath();
      c.moveTo(sx * r * 0.16, -r * 1.16);
      c.quadraticCurveTo(sx * r * 0.34, -r * 1.5, sx * r * 0.52, -r * 1.72);
      c.quadraticCurveTo(sx * r * 0.86, -r * 1.5, sx * r * 0.62, -r * 1.04);
      c.closePath();
      c.fill();
      c.fillStyle = base;
      c.restore();
    }
  } else if (k === 'cat') {
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.2, hy - r * 0.7);
      c.lineTo(hx + sx * r * 0.86, hy - r * 1.7);
      c.lineTo(hx + sx * r * 1.08, hy - r * 0.44);
      c.closePath();
      c.fill();
      c.fillStyle = tip;
      c.beginPath();
      c.moveTo(hx + sx * r * 0.55, hy - r * 1.16);
      c.lineTo(hx + sx * r * 0.86, hy - r * 1.7);
      c.lineTo(hx + sx * r * 0.95, hy - r * 0.96);
      c.closePath();
      c.fill();
      c.fillStyle = base;
    }
  } else if (k === 'round') {
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.ellipse(hx + sx * r * 0.86, hy - r * 0.72, r * 0.34, r * 0.44, sx * 0.4, 0, Math.PI * 2);
      c.fill();
    }
  } else if (k === 'spike') {
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(hx + sx * r * (0.3 + i * 0.28), hy - r * 0.75);
        c.lineTo(hx + sx * r * (0.62 + i * 0.34), hy - r * (1.7 - i * 0.3));
        c.lineTo(hx + sx * r * (0.78 + i * 0.28), hy - r * 0.6);
        c.closePath();
        c.fill();
      }
    }
  } else if (k === 'horn') {
    for (const sx of [-1, 1]) {
      c.fillStyle = tip;
      c.beginPath();
      c.moveTo(hx + sx * r * 0.36, hy - r * 0.86);
      c.quadraticCurveTo(hx + sx * r * 1.4, hy - r * 1.5, hx + sx * r * 1.3, hy - r * 1.9);
      c.quadraticCurveTo(hx + sx * r * 0.92, hy - r * 1.2, hx + sx * r * 0.62, hy - r * 0.72);
      c.closePath();
      c.fill();
    }
  } else if (k === 'fin') {
    c.fillStyle = tip;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.5, hy - r * 0.5);
      c.quadraticCurveTo(hx + sx * r * 1.5, hy - r * 0.9, hx + sx * r * 1.55, hy - r * 0.1);
      c.quadraticCurveTo(hx + sx * r * 1.0, hy - r * 0.24, hx + sx * r * 0.5, hy - r * 0.5);
      c.closePath();
      c.fill();
    }
  } else if (k === 'crest') {
    c.fillStyle = tip;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(hx + i * r * 0.3, hy - r * 0.8);
      c.lineTo(hx + i * r * 0.62, hy - r * (1.86 - Math.abs(i) * 0.34));
      c.lineTo(hx + i * r * 0.3 + r * 0.26, hy - r * 0.74);
      c.closePath();
      c.fill();
    }
  } else if (k === 'antenna') {
    c.strokeStyle = tip;
    c.lineWidth = Math.max(0.8, r * 0.1);
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * r * 0.34, hy - r * 0.82);
      c.quadraticCurveTo(hx + sx * r * 1.0, hy - r * 1.7, hx + sx * r * 0.72, hy - r * 2.0);
      c.stroke();
      c.fillStyle = tip;
      c.beginPath();
      c.arc(hx + sx * r * 0.72, hy - r * 2.02, r * 0.17, 0, Math.PI * 2);
      c.fill();
    }
  }
}

/** Arms + steering wheel, drawn over the torso. */
function drawArms(c, s, sp, trim, grip) {
  const sy = s * (DECK - 0.16);
  const hy = s * (DECK - 0.04);
  const hx = s * 0.26;
  c.strokeStyle = mix(sp.fur, '#000000', 0.14);
  c.lineWidth = s * 0.11;
  c.lineCap = 'round';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * s * 0.26, sy);
    c.quadraticCurveTo(sx * s * 0.36, hy + s * 0.02, sx * hx + grip * s * 0.05, hy);
    c.stroke();
  }
  // wheel rim
  c.strokeStyle = '#20242c';
  c.lineWidth = s * 0.06;
  c.beginPath();
  c.ellipse(grip * s * 0.05, hy - s * 0.02, s * 0.28, s * 0.1, grip * 0.22, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = mix(trim, '#ffffff', 0.25);
  c.lineWidth = s * 0.024;
  c.beginPath();
  c.ellipse(grip * s * 0.05, hy - s * 0.03, s * 0.28, s * 0.1, grip * 0.22, Math.PI, Math.PI * 2);
  c.stroke();
  // paws on the rim
  c.fillStyle = mix(sp.fur, '#ffffff', 0.18);
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.ellipse(sx * hx + grip * s * 0.05, hy - s * 0.02, s * 0.08, s * 0.065, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.lineCap = 'butt';
}

/** Eyes / cheeks / mouth on a head of radius r centred at (hx, hy). */
function drawFace(c, sp, hx, hy, r) {
  const dark = '#1b1720';
  if (sp.cheek) {
    for (const sx of [-1, 1]) {
      const g = c.createRadialGradient(hx + sx * r * 0.7, hy + r * 0.2, r * 0.03,
        hx + sx * r * 0.72, hy + r * 0.22, r * 0.3);
      g.addColorStop(0, mix(sp.cheek, '#ffffff', 0.4));
      g.addColorStop(1, sp.cheek);
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(hx + sx * r * 0.72, hy + r * 0.22, r * 0.25, r * 0.22, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  for (const sx of [-1, 1]) {
    c.fillStyle = dark;
    c.beginPath();
    if (sp.eye === 'sleepy') {
      c.ellipse(hx + sx * r * 0.38, hy - r * 0.08, r * 0.2, r * 0.06, 0, 0, Math.PI * 2);
    } else if (sp.eye === 'sharp') {
      c.moveTo(hx + sx * r * 0.16, hy - r * 0.26);
      c.lineTo(hx + sx * r * 0.62, hy - r * 0.12);
      c.lineTo(hx + sx * r * 0.5, hy + r * 0.14);
      c.lineTo(hx + sx * r * 0.2, hy + r * 0.04);
      c.closePath();
    } else {
      c.ellipse(hx + sx * r * 0.4, hy - r * 0.1, r * 0.19, r * 0.23, 0, 0, Math.PI * 2);
    }
    c.fill();
    if (sp.eye !== 'sleepy') {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(hx + sx * r * 0.44, hy - r * 0.2, r * 0.075, r * 0.09, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  // muzzle + mouth
  c.fillStyle = mix(sp.skin, '#ffffff', 0.12);
  c.beginPath();
  c.ellipse(hx, hy + r * 0.42, r * 0.34, r * 0.24, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = dark;
  c.lineWidth = Math.max(0.7, r * 0.08);
  c.beginPath();
  c.moveTo(hx - r * 0.2, hy + r * 0.34);
  c.quadraticCurveTo(hx - r * 0.06, hy + r * 0.52, hx, hy + r * 0.34);
  c.quadraticCurveTo(hx + r * 0.06, hy + r * 0.52, hx + r * 0.2, hy + r * 0.34);
  c.stroke();
  c.fillStyle = dark;
  c.beginPath();
  c.ellipse(hx, hy + r * 0.22, r * 0.07, r * 0.05, 0, 0, Math.PI * 2);
  c.fill();
}

/** Helmet / cap sitting on the crown, brim to one side. */
function drawHelmet(c, hx, hy, r, col) {
  const g = c.createLinearGradient(hx, hy - r * 1.1, hx, hy - r * 0.1);
  g.addColorStop(0, mix(col, '#ffffff', 0.42));
  g.addColorStop(1, mix(col, '#000000', 0.22));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(hx, hy - r * 0.16, r * 1.02, r * 0.92, 0, Math.PI * 1.03, Math.PI * 1.97);
  c.closePath();
  c.fill();
  c.fillStyle = mix(col, '#000000', 0.36);
  c.beginPath();
  c.ellipse(hx + r * 0.5, hy - r * 0.42, r * 0.66, r * 0.2, 0.12, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.beginPath();
  c.ellipse(hx - r * 0.36, hy - r * 0.72, r * 0.26, r * 0.13, -0.5, 0, Math.PI * 2);
  c.fill();
}

/**
 * Full driver: torso, arms on the wheel, head with face, ears and helmet.
 * `grip` in -1..1 leans the shoulders and steering into the corner.
 */
export function drawDriver(c, s, sp, racer, grip, detail) {
  const trim = racer.accent || '#444';
  const r = s * 0.29;
  const hx = grip * s * 0.05;
  const hy = s * HEAD;

  // torso
  const tg = c.createLinearGradient(0, s * (DECK - 0.28), 0, s * (DECK + 0.06));
  tg.addColorStop(0, mix(sp.fur, '#ffffff', 0.2));
  tg.addColorStop(1, mix(sp.fur, '#000000', 0.4));
  c.fillStyle = tg;
  roundRect(c, -s * 0.36, s * (DECK - 0.3), s * 0.72, s * 0.36, s * 0.16);
  c.fill();
  // racing bib
  c.fillStyle = tint(mix(trim, '#ffffff', 0.1), 0.9);
  roundRect(c, -s * 0.22, s * (DECK - 0.28), s * 0.44, s * 0.22, s * 0.09);
  c.fill();

  drawEars(c, s, sp, hx, hy, r);
  if (detail) drawArms(c, s, sp, trim, grip);

  // head
  const hg = c.createRadialGradient(hx - r * 0.3, hy - r * 0.36, r * 0.06, hx, hy, r * 1.35);
  hg.addColorStop(0, mix(sp.fur, '#ffffff', 0.42));
  hg.addColorStop(0.55, sp.fur);
  hg.addColorStop(1, mix(sp.fur, '#000000', 0.3));
  c.fillStyle = hg;
  c.beginPath();
  c.ellipse(hx, hy, r * 1.04, r, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(40,26,10,0.25)';
  c.lineWidth = Math.max(0.6, r * 0.06);
  c.stroke();

  if (detail) drawFace(c, sp, hx, hy + r * 0.06, r);
  drawHelmet(c, hx, hy, r, sp.hat || trim);
}

export { drawEars, DECK, HEAD };

