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

/**
 * Big glossy Poke Ball pickup - a shaded sphere, not a flat disc: red dome with
 * a lit top-left and a dark terminator, white lower hemisphere with bounced
 * light, a chunky black equator band, the rimmed centre button, a rim light on
 * the shaded side and two specular highlights. This is the near-field pickup
 * that fills the frame in the reference grass shot, so it has to hold up big.
 */
export function pokeball(c, x, y, r, spin = 0) {
  c.save();
  c.translate(x, y);

  // outer glow so it pops off the tarmac
  const halo = c.createRadialGradient(0, 0, r * 0.86, 0, 0, r * 1.75);
  halo.addColorStop(0, 'rgba(255,246,196,.55)');
  halo.addColorStop(0.45, 'rgba(255,214,90,.22)');
  halo.addColorStop(1, 'rgba(255,190,40,0)');
  c.globalAlpha = 0.55 + Math.sin(spin) * 0.14;
  c.fillStyle = halo;
  c.beginPath(); c.arc(0, 0, r * 1.75, 0, TAU); c.fill();
  c.globalAlpha = 1;

  // upper hemisphere: shaded red sphere
  const top = c.createRadialGradient(-r * 0.42, -r * 0.55, r * 0.06, 0, 0, r * 1.28);
  top.addColorStop(0, '#ff9c8e');
  top.addColorStop(0.30, '#f4584a');
  top.addColorStop(0.72, '#d22a24');
  top.addColorStop(1, '#8d1613');
  c.fillStyle = top;
  c.beginPath(); c.arc(0, 0, r, Math.PI, TAU); c.closePath(); c.fill();

  // lower hemisphere: white shell with occlusion at the bottom
  const bot = c.createRadialGradient(-r * 0.34, r * 0.18, r * 0.05, 0, r * 0.15, r * 1.32);
  bot.addColorStop(0, '#ffffff');
  bot.addColorStop(0.52, '#eef2f8');
  bot.addColorStop(0.82, '#c3cbd8');
  bot.addColorStop(1, '#8f99a8');
  c.fillStyle = bot;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI); c.closePath(); c.fill();

  // equator band, thicker toward the silhouette edges like a real sphere
  c.fillStyle = '#1c2027';
  c.beginPath();
  c.ellipse(0, 0, r * 1.002, r * 0.155, 0, 0, TAU);
  c.fill();
  c.fillRect(-r, -r * 0.115, r * 2, r * 0.23);

  // centre button: dark rim, chrome ring, white face
  c.fillStyle = '#1c2027';
  c.beginPath(); c.arc(0, 0, r * 0.38, 0, TAU); c.fill();
  const ring = c.createLinearGradient(-r * 0.3, -r * 0.3, r * 0.3, r * 0.3);
  ring.addColorStop(0, '#ffffff');
  ring.addColorStop(1, '#9aa5b4');
  c.fillStyle = ring;
  c.beginPath(); c.arc(0, 0, r * 0.30, 0, TAU); c.fill();
  c.fillStyle = '#2b3038';
  c.beginPath(); c.arc(0, 0, r * 0.215, 0, TAU); c.fill();
  const face = c.createRadialGradient(-r * 0.06, -r * 0.06, 0, 0, 0, r * 0.18);
  face.addColorStop(0, '#ffffff');
  face.addColorStop(1, '#d8dee8');
  c.fillStyle = face;
  c.beginPath(); c.arc(0, 0, r * 0.165, 0, TAU); c.fill();

  // rim light along the shaded lower-right limb
  c.save();
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
  c.globalCompositeOperation = 'lighter';
  const rim = c.createRadialGradient(r * 0.42, r * 0.44, r * 0.2, r * 0.34, r * 0.36, r * 1.15);
  rim.addColorStop(0, 'rgba(255,236,190,0)');
  rim.addColorStop(0.72, 'rgba(255,228,170,0)');
  rim.addColorStop(0.94, 'rgba(255,240,205,.55)');
  rim.addColorStop(1, 'rgba(255,240,205,0)');
  c.fillStyle = rim;
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.restore();

  // outline keeps it readable against bright grass
  c.strokeStyle = 'rgba(24,28,34,.55)';
  c.lineWidth = Math.max(1, r * 0.055);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();

  // speculars
  c.globalAlpha = 0.92;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.ellipse(-r * 0.40, -r * 0.46, r * 0.27, r * 0.155, -0.62, 0, TAU);
  c.fill();
  c.globalAlpha = 0.55;
  c.beginPath();
  c.ellipse(-r * 0.13, -r * 0.72, r * 0.11, r * 0.06, -0.5, 0, TAU);
  c.fill();
  c.globalAlpha = 0.4;
  c.beginPath();
  c.ellipse(r * 0.30, r * 0.52, r * 0.16, r * 0.075, 0.5, 0, TAU);
  c.fill();

  // twinkle so it reads as "pick me up"
  c.globalAlpha = 0.35 + Math.abs(Math.sin(spin * 0.7)) * 0.5;
  c.globalCompositeOperation = 'lighter';
  const tw = r * 0.5;
  c.fillStyle = 'rgba(255,255,235,.95)';
  c.beginPath();
  c.moveTo(r * 0.72, -r * 0.78 - tw);
  c.lineTo(r * 0.72 + tw * 0.22, -r * 0.78);
  c.lineTo(r * 0.72 + tw, -r * 0.78);
  c.lineTo(r * 0.72 + tw * 0.22, -r * 0.78 + tw * 0.22);
  c.lineTo(r * 0.72, -r * 0.78 + tw);
  c.lineTo(r * 0.72 - tw * 0.22, -r * 0.78 + tw * 0.22);
  c.lineTo(r * 0.72 - tw, -r * 0.78);
  c.lineTo(r * 0.72 - tw * 0.22, -r * 0.78 - tw * 0.22);
  c.closePath();
  c.fill();
  c.restore();
}

/** Soft contact shadow the pickups drop on the tarmac. */
export function ballShadow(c, x, y, r, lift = 0) {
  const a = 0.42 - lift * 0.14;
  if (a <= 0.02) return;
  c.save();
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(16,22,28,${a})`);
  g.addColorStop(0.6, `rgba(16,22,28,${a * 0.5})`);
  g.addColorStop(1, 'rgba(16,22,28,0)');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(x, y, r, r * 0.34, 0, 0, TAU); c.fill();
  c.restore();
}

/** Deterministic scatter for flame turbulence. */
function fnoise(n) {
  const x = Math.sin(n * 91.7 + 13.13) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Unit normal of the spine at index i (perpendicular to the local tangent).
 */
function normalAt(sp, i) {
  const a = sp[Math.max(0, i - 1)];
  const b = sp[Math.min(sp.length - 1, i + 1)];
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  const m = Math.hypot(dx, dy) || 1;
  dx /= m; dy /= m;
  return { x: -dy, y: dx };
}

/**
 * One closed ribbon around the spine, `k` scaling the local half width. The
 * muzzle end is capped with a round arc so the jet does not read as a cut-off
 * rectangle, and the tip converges to a point.
 */
function ribbonPath(c, sp, k) {
  const n0 = normalAt(sp, 0);
  c.beginPath();
  const w0 = sp[0].w * k;
  c.moveTo(sp[0].x + n0.x * w0, sp[0].y + n0.y * w0);
  for (let i = 1; i < sp.length; i++) {
    const n = normalAt(sp, i);
    const w = sp[i].w * k;
    c.lineTo(sp[i].x + n.x * w, sp[i].y + n.y * w);
  }
  for (let i = sp.length - 1; i >= 0; i--) {
    const n = normalAt(sp, i);
    const w = sp[i].w * k;
    c.lineTo(sp[i].x - n.x * w, sp[i].y - n.y * w);
  }
  // rounded cap behind the muzzle
  const tan = { x: n0.y, y: -n0.x };
  c.quadraticCurveTo(
    sp[0].x - n0.x * w0 - tan.x * w0 * 0.24, sp[0].y - n0.y * w0 - tan.y * w0 * 0.24,
    sp[0].x - tan.x * w0 * 0.30, sp[0].y - tan.y * w0 * 0.30,
  );
  c.quadraticCurveTo(
    sp[0].x + n0.x * w0 - tan.x * w0 * 0.24, sp[0].y + n0.y * w0 - tan.y * w0 * 0.24,
    sp[0].x + n0.x * w0, sp[0].y + n0.y * w0,
  );
  c.closePath();
}

// The gradients run muzzle -> impact and stay LIT all the way to the far end:
// this jet terminates on the kart it is burning, so it must not thin out into
// nothing halfway down the road.
const JET_SHELLS = [
  { k: 1.85, blur: 26, comp: 'lighter', stops: [[0, 'rgba(255,90,20,.10)'], [0.30, 'rgba(255,112,26,.22)'], [0.78, 'rgba(255,150,46,.24)'], [1, 'rgba(255,170,60,.26)']] },
  { k: 1.00, blur: 14, comp: 'source-over', stops: [[0, 'rgba(226,58,10,.34)'], [0.24, 'rgba(228,62,10,.70)'], [0.66, 'rgba(238,86,14,.72)'], [1, 'rgba(236,74,12,.66)']] },
  { k: 0.74, blur: 10, comp: 'source-over', stops: [[0, 'rgba(255,124,22,.42)'], [0.26, 'rgba(255,134,28,.92)'], [0.70, 'rgba(255,158,38,.92)'], [1, 'rgba(255,148,32,.86)']] },
  { k: 0.48, blur: 7, comp: 'source-over', stops: [[0, 'rgba(255,206,86,.46)'], [0.32, 'rgba(255,200,70,.96)'], [0.74, 'rgba(255,190,58,.92)'], [1, 'rgba(255,206,96,.90)']] },
  { k: 0.24, blur: 5, comp: 'lighter', stops: [[0, 'rgba(255,255,246,.42)'], [0.34, 'rgba(255,250,222,.92)'], [0.70, 'rgba(255,232,160,.80)'], [1, 'rgba(255,240,190,.86)']] },
];

/**
 * Hyper Beam: a short, dense, tapering flame plume - the Charizard fire-breath
 * jet of the reference item panel, seen from behind the kart.
 *
 * `sp` is the plume spine, running from the muzzle at the kart's nose forward
 * along the racing line; each entry is `{ x, y, w }` with `w` the local half
 * width in screen px. The body is painted as four nested ribbons filled with a
 * *continuous* linear gradient along the axis (deep red shell -> orange ->
 * gold -> white core), blurred where the browser supports it, so there are no
 * stamped circles anywhere in it.
 */
export function flameJet(c, sp, t, opts = {}) {
  if (!sp || sp.length < 2) return;
  // snaps on almost instantly: pressing the item key has to read as a hit
  const fade = t < 0.035 ? t / 0.035 : (t > 0.70 ? Math.max(0, (1 - t) / 0.30) : 1);
  if (fade <= 0.01) return;
  const pulse = 0.94 + Math.sin(t * 40) * 0.06;
  const a = sp[0];
  const z = sp[sp.length - 1];
  const canBlur = opts.blur !== false && typeof c.filter === 'string';

  c.save();
  c.globalAlpha = fade;
  for (const sh of JET_SHELLS) {
    const g = c.createLinearGradient(a.x, a.y, z.x, z.y);
    for (const [at, col] of sh.stops) g.addColorStop(at, col);
    c.globalCompositeOperation = sh.comp;
    c.fillStyle = g;
    if (canBlur) c.filter = `blur(${sh.blur}px)`;
    ribbonPath(c, sp, sh.k * pulse);
    c.fill();
  }
  if (canBlur) c.filter = 'none';

  // muzzle bloom: a tight hot core at the nose, not a starburst
  c.globalCompositeOperation = 'lighter';
  const r0 = Math.max(4, a.w * 0.46);
  const bloom = c.createRadialGradient(a.x, a.y, 0, a.x, a.y, r0);
  bloom.addColorStop(0, 'rgba(255,255,248,.92)');
  bloom.addColorStop(0.36, 'rgba(255,228,140,.58)');
  bloom.addColorStop(1, 'rgba(255,132,30,0)');
  c.globalAlpha = fade * 0.5;
  c.fillStyle = bloom;
  c.beginPath(); c.arc(a.x, a.y, r0, 0, TAU); c.fill();

  // a few embers riding inside the plume (never outside its silhouette)
  const seed = Math.floor(t * 40);
  c.globalAlpha = fade * 0.8;
  for (let i = 0; i < 9; i++) {
    const f = (fnoise(i * 5 + 3) + t * 1.4) % 1;
    const idx = Math.min(sp.length - 1, Math.floor(f * (sp.length - 1)));
    const p = sp[idx];
    const n = normalAt(sp, idx);
    const off = (fnoise(i * 9 + seed) - 0.5) * p.w * 0.9;
    const rr = Math.max(0.9, p.w * 0.10 * (1 - f * 0.6));
    c.fillStyle = i % 3 ? 'rgba(255,224,140,.95)' : 'rgba(255,255,240,.95)';
    c.beginPath();
    c.arc(p.x + n.x * off, p.y + n.y * off, rr, 0, TAU);
    c.fill();
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

/**
 * Fire burst: a billowing fireball that engulfs a struck kart, with smoke
 * puffs peeling off the top and sparks flying out. `r` is roughly the kart's
 * on-screen half size; the ball grows to about 2x that.
 */
export function fireBurst(c, x, y, r, t) {
  const e = 1 - (1 - t) * (1 - t);      // ease-out growth
  const a = t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / 0.88);
  if (a <= 0.01) return;
  const seed = Math.floor(t * 40);
  c.save();

  // outer smoke, rising and spreading
  c.globalAlpha = a * 0.45;
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * TAU + fnoise(i) * 1.6;
    const d = r * (0.35 + e * 1.5);
    const px = x + Math.cos(ang) * d;
    const py = y + Math.sin(ang) * d * 0.55 - e * r * 0.9;
    const rr = r * (0.45 + fnoise(i * 3) * 0.4) * (0.6 + e * 0.9);
    const g = c.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, 'rgba(94,80,74,.75)');
    g.addColorStop(1, 'rgba(94,80,74,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(px, py, rr, 0, TAU); c.fill();
  }

  // fireball lobes
  const shells = [
    { k: 1.30, col: 'rgba(198,38,12,.66)' },
    { k: 0.98, col: 'rgba(255,108,20,.84)' },
    { k: 0.64, col: 'rgba(255,182,50,.86)' },
    { k: 0.32, col: 'rgba(255,242,196,.80)' },
  ];
  for (const sh of shells) {
    c.globalAlpha = a;
    c.fillStyle = sh.col;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU + t * 1.1 + fnoise(i * 5) * 0.9;
      const d = r * (0.18 + e * 0.72) * (0.7 + fnoise(i * 7 + seed) * 0.6);
      const px = x + Math.cos(ang) * d;
      const py = y + Math.sin(ang) * d * 0.66 - e * r * 0.22;
      const rr = r * sh.k * (0.42 + e * 0.5) * (0.75 + fnoise(i * 11 + seed) * 0.5);
      if (rr <= 0.5) continue;
      c.beginPath(); c.ellipse(px, py, rr, rr * 0.88, 0, 0, TAU); c.fill();
    }
  }

  // hot core + sparks
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = a;
  const g = c.createRadialGradient(x, y, 0, x, y, r * 1.5);
  g.addColorStop(0, 'rgba(255,255,240,.95)');
  g.addColorStop(0.4, 'rgba(255,190,70,.6)');
  g.addColorStop(1, 'rgba(255,90,20,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r * 1.5, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,232,150,.95)';
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * TAU + fnoise(i * 13) * 2;
    const d = r * (0.5 + e * 2.1) * (0.6 + fnoise(i * 17) * 0.8);
    const px = x + Math.cos(ang) * d;
    const py = y + Math.sin(ang) * d * 0.6 - e * r * 0.5;
    const rr = Math.max(0.8, r * 0.11 * (1 - t));
    c.beginPath(); c.arc(px, py, rr, 0, TAU); c.fill();
  }
  c.restore();
}

/**
 * Sustained impact fire: the rolling fireball that sits ON the kart a Hyper
 * Beam is burning, for as long as the beam burns. Unlike `fireBurst` (a one-off
 * explosion that grows and dies) this holds a steady, churning ball so the jet
 * always terminates on a target instead of fading out in mid air.
 *
 * `t` is the beam's 0..1 life (used for the fade in/out), `clock` its raw age in
 * seconds (used to churn the lobes).
 */
export function flameImpact(c, x, y, r, t, clock = 0) {
  const a = t < 0.05 ? t / 0.05 : (t > 0.74 ? Math.max(0, (1 - t) / 0.26) : 1);
  if (a <= 0.01 || r <= 1) return;
  const swell = 0.86 + Math.sin(clock * 17) * 0.07 + Math.min(0.22, t * 0.6);
  const seed = Math.floor(clock * 22);
  c.save();

  // smoke curling up off the burning kart
  c.globalAlpha = a * 0.34;
  for (let i = 0; i < 5; i++) {
    const f = (fnoise(i * 7 + 1) + clock * 0.7) % 1;
    const px = x + (fnoise(i * 3) - 0.5) * r * 1.1;
    const py = y - f * r * 1.5;
    const rr = r * (0.34 + f * 0.6);
    const g = c.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, 'rgba(92,78,72,.7)');
    g.addColorStop(1, 'rgba(92,78,72,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(px, py, rr, 0, TAU); c.fill();
  }

  // churning fire lobes wrapped around the kart
  const shells = [
    { k: 1.02, col: 'rgba(196,40,12,.62)' },
    { k: 0.78, col: 'rgba(255,110,22,.86)' },
    { k: 0.52, col: 'rgba(255,184,54,.90)' },
    { k: 0.28, col: 'rgba(255,244,204,.88)' },
  ];
  for (const sh of shells) {
    c.globalAlpha = a;
    c.fillStyle = sh.col;
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * TAU + clock * 2.4 + fnoise(i * 5) * 1.2;
      const d = r * 0.46 * (0.6 + fnoise(i * 7 + seed) * 0.7);
      const px = x + Math.cos(ang) * d;
      const py = y + Math.sin(ang) * d * 0.62 - r * 0.10;
      const rr = r * sh.k * swell * (0.5 + fnoise(i * 11 + seed) * 0.42);
      if (rr <= 0.5) continue;
      c.beginPath(); c.ellipse(px, py, rr, rr * 0.9, 0, 0, TAU); c.fill();
    }
  }

  // white-hot core + sparks flying off the strike
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = a * 0.9;
  const g = c.createRadialGradient(x, y, 0, x, y, r * 1.25);
  g.addColorStop(0, 'rgba(255,255,244,.95)');
  g.addColorStop(0.38, 'rgba(255,196,80,.55)');
  g.addColorStop(1, 'rgba(255,96,20,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r * 1.25, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,236,164,.95)';
  for (let i = 0; i < 10; i++) {
    const f = (fnoise(i * 9 + 5) + clock * 1.9) % 1;
    const ang = fnoise(i * 13) * TAU;
    const d = r * (0.5 + f * 1.5);
    const px = x + Math.cos(ang) * d;
    const py = y + Math.sin(ang) * d * 0.55 - f * r * 0.8;
    const rr = Math.max(0.9, r * 0.075 * (1 - f));
    c.beginPath(); c.arc(px, py, rr, 0, TAU); c.fill();
  }
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
  // a rim flash, not a full bleach - the scene must stay readable underneath
  withAlpha(c, a * 0.34, (cc) => {
    const g = cc.createRadialGradient(w * 0.5, h * 0.42, h * 0.18, w * 0.5, h * 0.42, h * 0.95);
    g.addColorStop(0, 'rgba(255,248,200,0)');
    g.addColorStop(0.55, 'rgba(255,248,200,.35)');
    g.addColorStop(1, 'rgba(255,236,140,.95)');
    cc.fillStyle = g;
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
