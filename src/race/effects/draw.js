/**
 * racers-items-and-race-rules / effect painters
 *
 * Pure canvas routines - no state, no clock reads. Everything is driven by an
 * age `t` (0..1) handed in by the effects layer, so the same sim step always
 * paints the same frame.
 */

const TAU = Math.PI * 2;

export function withAlpha(c, a, fn) {
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha = Math.min(1, a);
  fn(c);
  c.restore();
}

/** Glossy Poke Ball - the near-field pickups the world renderer skips. */
export function pokeball(c, x, y, r, spin = 0) {
  c.save();
  c.translate(x, y);
  const g = c.createLinearGradient(-r, -r, r * 0.6, r);
  g.addColorStop(0, '#ff7a70');
  g.addColorStop(0.55, '#e8433c');
  g.addColorStop(1, '#9d1c1a');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, Math.PI, TAU); c.closePath(); c.fill();
  const g2 = c.createLinearGradient(-r, 0, r * 0.6, r);
  g2.addColorStop(0, '#ffffff');
  g2.addColorStop(1, '#c6d0dd');
  c.fillStyle = g2;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI); c.closePath(); c.fill();
  c.fillStyle = '#23272e';
  c.fillRect(-r, -r * 0.13, r * 2, r * 0.26);
  c.beginPath(); c.arc(0, 0, r * 0.34, 0, TAU); c.fill();
  c.fillStyle = '#f4f7fb';
  c.beginPath(); c.arc(0, 0, r * 0.23, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(20,24,30,.5)';
  c.lineWidth = Math.max(1, r * 0.07);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  // sheen
  withAlpha(c, 0.5, (cc) => {
    cc.fillStyle = '#ffffff';
    cc.beginPath();
    cc.ellipse(-r * 0.38, -r * 0.42, r * 0.26, r * 0.16, -0.6, 0, TAU);
    cc.fill();
  });
  // sparkle halo so it reads as a floating pickup
  withAlpha(c, 0.35 + Math.sin(spin) * 0.15, (cc) => {
    const halo = cc.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.9);
    halo.addColorStop(0, 'rgba(255,244,190,.85)');
    halo.addColorStop(1, 'rgba(255,214,59,0)');
    cc.fillStyle = halo;
    cc.beginPath(); cc.arc(0, 0, r * 1.9, 0, TAU); cc.fill();
  });
  c.restore();
}

/**
 * Hyper Beam: a hot lance that follows the road. `pts` runs from the kart's
 * nose to the far end of the blast, each entry { x, y, w } with `w` the local
 * half width, so the lance narrows into the distance and bends with the tarmac.
 */
export function beamPath(c, pts, t, color = '#ffe98a') {
  if (!pts || pts.length < 2) return;
  const fade = t < 0.10 ? t / 0.10 : (t > 0.72 ? Math.max(0, (1 - t) / 0.28) : 1);
  const pulse = 0.86 + Math.sin(t * 30) * 0.14;
  c.save();
  c.globalCompositeOperation = 'lighter';

  const ribbon = (scale, style, alpha) => {
    c.globalAlpha = alpha * fade;
    c.fillStyle = style;
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const w = p.w * scale * pulse;
      if (i === 0) c.moveTo(p.x - w, p.y); else c.lineTo(p.x - w, p.y);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      const w = p.w * scale * pulse;
      c.lineTo(p.x + w, p.y);
    }
    c.closePath();
    c.fill();
  };

  const a = pts[0];
  const b = pts[pts.length - 1];
  const grad = c.createLinearGradient(a.x, a.y, b.x, b.y);
  grad.addColorStop(0, color);
  grad.addColorStop(0.55, 'rgba(255,205,90,.75)');
  grad.addColorStop(1, 'rgba(255,150,40,0)');
  ribbon(1, grad, 0.7);
  ribbon(0.45, 'rgba(255,255,255,.95)', 0.9);

  // muzzle bloom at the kart's nose
  const r0 = a.w * 2.1;
  const bloom = c.createRadialGradient(a.x, a.y, 0, a.x, a.y, r0);
  bloom.addColorStop(0, 'rgba(255,255,240,.95)');
  bloom.addColorStop(0.4, 'rgba(255,220,110,.6)');
  bloom.addColorStop(1, 'rgba(255,160,40,0)');
  c.globalAlpha = fade;
  c.fillStyle = bloom;
  c.beginPath(); c.arc(a.x, a.y, r0, 0, TAU); c.fill();

  // energy rings travelling down the lance
  c.globalAlpha = 0.55 * fade;
  for (let i = 0; i < 5; i++) {
    const f = (t * 2.2 + i / 5) % 1;
    const idx = Math.min(pts.length - 2, Math.floor(f * (pts.length - 1)));
    const p = pts[idx];
    const rr = p.w * 1.5;
    if (rr <= 0.5) continue;
    c.strokeStyle = 'rgba(255,244,200,.85)';
    c.lineWidth = Math.max(1, rr * 0.24);
    c.beginPath(); c.ellipse(p.x, p.y, rr, rr * 0.36, 0, 0, TAU); c.stroke();
  }
  c.restore();
}

/** Straight-line variant (kept for simple two-point effects). */
export function beam(c, from, to, width, t, color = '#ffe98a') {
  const fade = t < 0.12 ? t / 0.12 : (t > 0.75 ? (1 - t) / 0.25 : 1);
  const w0 = width * (0.55 + Math.sin(t * 26) * 0.08);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const grad = c.createLinearGradient(from.x, from.y, to.x, to.y);
  grad.addColorStop(0, 'rgba(255,255,255,.95)');
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, 'rgba(255,180,60,0)');
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const nx = Math.sin(ang);
  const ny = -Math.cos(ang);
  c.globalAlpha = 0.85 * fade;
  c.fillStyle = grad;
  c.beginPath();
  c.moveTo(from.x + nx * w0, from.y + ny * w0);
  c.lineTo(to.x + nx * w0 * 0.22, to.y + ny * w0 * 0.22);
  c.lineTo(to.x - nx * w0 * 0.22, to.y - ny * w0 * 0.22);
  c.lineTo(from.x - nx * w0, from.y - ny * w0);
  c.closePath();
  c.fill();
  // white core
  c.globalAlpha = fade;
  c.strokeStyle = 'rgba(255,255,255,.95)';
  c.lineWidth = Math.max(2, w0 * 0.36);
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(to.x, to.y); c.stroke();
  // muzzle bloom
  const bloom = c.createRadialGradient(from.x, from.y, 0, from.x, from.y, w0 * 3.4);
  bloom.addColorStop(0, 'rgba(255,255,235,.95)');
  bloom.addColorStop(0.4, 'rgba(255,215,90,.55)');
  bloom.addColorStop(1, 'rgba(255,160,40,0)');
  c.globalAlpha = fade;
  c.fillStyle = bloom;
  c.beginPath(); c.arc(from.x, from.y, w0 * 3.4, 0, TAU); c.fill();
  // rings running down the lance
  c.globalAlpha = 0.5 * fade;
  for (let i = 0; i < 5; i++) {
    const f = ((t * 2.4 + i / 5) % 1);
    const x = from.x + (to.x - from.x) * f;
    const y = from.y + (to.y - from.y) * f;
    const rr = w0 * (1.5 - f) * 1.1;
    if (rr <= 0) continue;
    c.strokeStyle = 'rgba(255,240,190,.8)';
    c.lineWidth = Math.max(1, rr * 0.22);
    c.beginPath(); c.ellipse(x, y, rr, rr * 0.42, 0, 0, TAU); c.stroke();
  }
  c.restore();
}

/** In-flight item: a spinning orb with a comet tail. */
export function projectile(c, x, y, r, color, t, tail = 1) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, r * 2.6);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r * 2.6, 0, TAU); c.fill();
  c.restore();
  // trail
  withAlpha(c, 0.55 * tail, (cc) => {
    const tg = cc.createLinearGradient(x, y, x, y + r * 6);
    tg.addColorStop(0, color);
    tg.addColorStop(1, 'rgba(255,255,255,0)');
    cc.fillStyle = tg;
    cc.beginPath();
    cc.moveTo(x - r * 0.8, y);
    cc.lineTo(x + r * 0.8, y);
    cc.lineTo(x, y + r * 5.5);
    cc.closePath();
    cc.fill();
  });
  // body
  c.save();
  c.translate(x, y);
  c.rotate(t * 9);
  c.fillStyle = color;
  c.strokeStyle = 'rgba(255,255,255,.9)';
  c.lineWidth = Math.max(1, r * 0.22);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.beginPath(); c.ellipse(-r * 0.3, -r * 0.3, r * 0.3, r * 0.2, -0.5, 0, TAU); c.fill();
  c.restore();
}

/** Impact: a shock ring plus a starburst of shards. */
export function burst(c, x, y, r, color, t) {
  const e = 1 - (1 - t) * (1 - t);
  const a = 1 - t;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = a;
  c.strokeStyle = color;
  c.lineWidth = Math.max(1.5, r * 0.16 * (1 - t));
  c.beginPath(); c.ellipse(x, y, r * (0.3 + e * 1.5), r * (0.3 + e * 1.5) * 0.62, 0, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * TAU + t * 1.4;
    const d = r * (0.4 + e * 1.9);
    const px = x + Math.cos(ang) * d;
    const py = y + Math.sin(ang) * d * 0.6;
    const s = r * 0.22 * (1 - t);
    c.beginPath(); c.arc(px, py, Math.max(0.6, s), 0, TAU); c.fill();
  }
  const g = c.createRadialGradient(x, y, 0, x, y, r * 1.6);
  g.addColorStop(0, 'rgba(255,255,255,.85)');
  g.addColorStop(0.5, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = a * 0.8;
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r * 1.6 * (1 - t * 0.4), 0, TAU); c.fill();
  c.restore();
}

/** Boost: a licking flame trail behind a kart. */
export function boostTrail(c, x, y, s, t, color = '#ff8a3c') {
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const f = (i / 7 + t * 1.6) % 1;
    const wob = Math.sin(t * 22 + i * 1.7) * s * 0.14;
    const px = x + wob + (i % 2 ? s * 0.28 : -s * 0.28);
    const py = y + f * s * 1.5;
    const rr = s * (0.34 - f * 0.22);
    if (rr <= 0.4) continue;
    const g = c.createRadialGradient(px, py, 0, px, py, rr * 2.2);
    g.addColorStop(0, 'rgba(255,255,225,.9)');
    g.addColorStop(0.35, color);
    g.addColorStop(1, 'rgba(255,80,20,0)');
    c.globalAlpha = 0.75 * (1 - f);
    c.fillStyle = g;
    c.beginPath(); c.arc(px, py, rr * 2.2, 0, TAU); c.fill();
  }
  c.restore();
}

/** Spin-out: stars orbiting a dizzy kart. */
export function spinStars(c, x, y, s, t, n = 4) {
  c.save();
  for (let i = 0; i < n; i++) {
    const ang = t * 7 + (i / n) * TAU;
    const px = x + Math.cos(ang) * s * 0.72;
    const py = y - s * 0.5 + Math.sin(ang) * s * 0.22;
    const sc = s * (0.10 + Math.max(0, Math.sin(ang)) * 0.05);
    star(c, px, py, sc, '#ffe14a');
  }
  c.restore();
}

function star(c, x, y, r, fill) {
  c.save();
  c.translate(x, y);
  c.fillStyle = fill;
  c.strokeStyle = 'rgba(120,70,0,.7)';
  c.lineWidth = Math.max(0.8, r * 0.18);
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
  c.stroke();
  c.restore();
}

/** Coin + sparkle popping off a collected Poke Ball. */
export function pickupPop(c, x, y, r, t, coins = 1) {
  const rise = t * r * 2.2;
  withAlpha(c, 1 - t, (cc) => {
    cc.strokeStyle = 'rgba(255,236,150,.95)';
    cc.lineWidth = Math.max(1.5, r * 0.18 * (1 - t));
    cc.beginPath(); cc.ellipse(x, y, r * (0.4 + t * 1.7), r * (0.4 + t * 1.7) * 0.5, 0, 0, TAU); cc.stroke();
    for (let i = 0; i < coins; i++) {
      const cx = x + (i - (coins - 1) / 2) * r * 0.9;
      const cy = y - rise - r * 0.4;
      const cr = r * 0.34;
      cc.fillStyle = '#ffcf3b';
      cc.strokeStyle = '#a06a10';
      cc.lineWidth = Math.max(1, cr * 0.2);
      cc.beginPath(); cc.ellipse(cx, cy, cr * (0.5 + Math.abs(Math.cos(t * 8)) * 0.5), cr, 0, 0, TAU);
      cc.fill(); cc.stroke();
    }
  });
}

/** Thunderbolt: a full-frame flash with forked bolts. */
export function thunder(c, w, h, t, rnd) {
  const a = (1 - t) * (t < 0.1 ? t / 0.1 : 1);
  withAlpha(c, a * 0.5, (cc) => {
    cc.fillStyle = '#fff8c8';
    cc.fillRect(0, 0, w, h);
  });
  withAlpha(c, a, (cc) => {
    cc.strokeStyle = '#fff6b0';
    cc.shadowColor = '#ffd63b';
    cc.shadowBlur = 24;
    for (let b = 0; b < 3; b++) {
      const x0 = w * (0.2 + rnd(b * 3) * 0.6);
      cc.lineWidth = 3.5 + rnd(b * 3 + 1) * 3;
      cc.beginPath();
      cc.moveTo(x0, 0);
      let x = x0;
      for (let y = 0; y < h * 0.72; y += h * 0.09) {
        x += (rnd(b * 20 + y) - 0.5) * w * 0.09;
        cc.lineTo(x, y);
      }
      cc.stroke();
    }
  });
}
