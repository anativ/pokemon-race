/**
 * Track diorama art for the TRACK SELECTION screen (thumbnails + big preview).
 *
 * Pure procedural SVG built from the shared theme in src/data/tracks.js - no
 * external assets. Everything is drawn in a perspective frame: a sampled road
 * ribbon from the horizon to the bottom of the frame, kerbs, guard rails,
 * banded ground and roadside props that shrink with distance, so each of the
 * three tracks reads as a place rather than a flat wedge.
 *
 * Owned by the build piece "character-and-track-select".
 */

/* ------------------------------------------------------------- perspective */

const STEPS = 26;

/**
 * Perspective mapping. `t` runs 0 (horizon) .. 1 (bottom of the frame).
 * @returns {{y:(t:number)=>number, half:(t:number)=>number, cx:(t:number)=>number}}
 */
function persp(w, h, horizon, curve) {
  const depth = h - horizon;
  return {
    y: (t) => horizon + depth * Math.pow(t, 2.05),
    half: (t) => w * 0.011 + (w * 0.40 - w * 0.011) * Math.pow(t, 1.6),
    cx: (t) => w * 0.5 + curve * w * 0.34 * Math.pow(1 - t, 2.2),
  };
}

const f = (n) => (Math.round(n * 10) / 10).toString();

/** Filled quad between two depth samples on one side of the road. */
function bandQuad(P, t0, t1, from, to, colour, opacity = 1) {
  const y0 = P.y(t0); const y1 = P.y(t1);
  const h0 = P.half(t0); const h1 = P.half(t1);
  const c0 = P.cx(t0); const c1 = P.cx(t1);
  const a0 = c0 + h0 * from; const b0 = c0 + h0 * to;
  const a1 = c1 + h1 * from; const b1 = c1 + h1 * to;
  return `<path d="M${f(a0)} ${f(y0)} L${f(b0)} ${f(y0)} L${f(b1)} ${f(y1)} L${f(a1)} ${f(y1)} Z" fill="${colour}"${
    opacity === 1 ? '' : ` opacity="${opacity}"`}/>`;
}

/* -------------------------------------------------------------------- sky */

function sunOrMoon(w, h, horizon, t, id) {
  if (t.key === 'neon') {
    return `<circle cx="${f(w * 0.78)}" cy="${f(horizon * 0.3)}" r="${f(h * 0.15)}" fill="url(#${id}-glow)"/>
      <circle cx="${f(w * 0.78)}" cy="${f(horizon * 0.3)}" r="${f(h * 0.055)}" fill="#eaf3ff"/>
      <circle cx="${f(w * 0.762)}" cy="${f(horizon * 0.275)}" r="${f(h * 0.045)}" fill="${t.skyTop}" opacity=".85"/>`;
  }
  return `<circle cx="${f(w * 0.8)}" cy="${f(horizon * 0.34)}" r="${f(h * 0.17)}" fill="url(#${id}-glow)"/>
    <circle cx="${f(w * 0.8)}" cy="${f(horizon * 0.34)}" r="${f(h * 0.068)}" fill="#fff8d0"/>`;
}

function clouds(w, h, horizon, t) {
  if (t.key === 'neon') {
    let stars = '';
    for (let i = 0; i < 34; i++) {
      const x = ((i * 137.7) % 100) / 100 * w;
      const y = ((i * 61.3) % 100) / 100 * horizon * 0.86;
      const r = 0.6 + ((i * 7) % 3) * 0.5;
      stars += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * (h / 470) * 2.2)}" fill="#dff0ff" opacity="${0.25 + ((i * 13) % 5) * 0.13}"/>`;
    }
    return stars;
  }
  const puff = (cx, cy, s, o) => `<g opacity="${o}" fill="${t.cloud}">
      <ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(s * 1.5)}" ry="${f(s * 0.62)}"/>
      <circle cx="${f(cx - s * 0.6)}" cy="${f(cy - s * 0.12)}" r="${f(s * 0.55)}"/>
      <circle cx="${f(cx + s * 0.15)}" cy="${f(cy - s * 0.42)}" r="${f(s * 0.68)}"/>
      <circle cx="${f(cx + s * 0.78)}" cy="${f(cy - s * 0.05)}" r="${f(s * 0.48)}"/>
    </g>`;
  return puff(w * 0.16, horizon * 0.34, h * 0.062, 0.92)
    + puff(w * 0.42, horizon * 0.2, h * 0.045, 0.7)
    + puff(w * 0.63, horizon * 0.46, h * 0.038, 0.55)
    + puff(w * 0.93, horizon * 0.6, h * 0.05, 0.5);
}

/* ---------------------------------------------------------- far backdrops */

function ridge(w, horizon, pts, fill, extra = '') {
  const d = pts.map(([x, y]) => `L${f(x * w)} ${f(y)}`).join(' ');
  return `<path d="M0 ${f(horizon)} ${d} L${f(w)} ${f(horizon)} Z" fill="${fill}"/>${extra}`;
}

/** Two-tone triangular peak: lit left face, shaded right face. */
function peak(w, h, horizon, cx, height, wide, dark, light) {
  const x = cx * w; const top = horizon - height; const half = wide * w;
  return `<path d="M${f(x - half)} ${f(horizon)} L${f(x)} ${f(top)} L${f(x + half)} ${f(horizon)} Z" fill="${light}"/>
    <path d="M${f(x)} ${f(top)} L${f(x + half)} ${f(horizon)} L${f(x + half * 0.05)} ${f(horizon)} Z" fill="${dark}"/>`;
}

function grassBack(w, h, horizon, t) {
  const far = ridge(w, horizon, [
    [0, horizon - h * 0.1], [0.13, horizon - h * 0.2], [0.27, horizon - h * 0.09],
    [0.42, horizon - h * 0.24], [0.58, horizon - h * 0.11], [0.72, horizon - h * 0.26],
    [0.88, horizon - h * 0.12], [1, horizon - h * 0.2],
  ], t.hillFar);
  const near = ridge(w, horizon + 1, [
    [0, horizon - h * 0.05], [0.2, horizon - h * 0.14], [0.36, horizon - h * 0.03],
    [0.55, horizon - h * 0.17], [0.74, horizon - h * 0.04], [0.9, horizon - h * 0.13], [1, horizon - h * 0.05],
  ], t.hillNear);
  const lit = peak(w, h, horizon, 0.42, h * 0.26, 0.15, t.hillFar, t.hillNear)
    + peak(w, h, horizon, 0.72, h * 0.29, 0.17, t.hillFar, t.hillNear)
    + peak(w, h, horizon, 0.13, h * 0.2, 0.12, t.hillFar, t.hillNear);
  // tree line along the base of the hills
  let line = '';
  for (let i = 0; i < 30; i++) {
    const x = (i / 29) * w + (((i * 37) % 11) - 5) * (w * 0.004);
    const s = h * (0.016 + ((i * 17) % 7) * 0.0022);
    line += `<path d="M${f(x)} ${f(horizon)} l${f(s * 0.7)} 0 l-${f(s * 0.35)} -${f(s * 1.5)} Z" fill="#20603a" opacity=".55"/>`;
  }
  return far + lit + near + line;
}

function snowBack(w, h, horizon, t) {
  const far = ridge(w, horizon, [
    [0, horizon - h * 0.16], [0.18, horizon - h * 0.36], [0.33, horizon - h * 0.14],
    [0.5, horizon - h * 0.28], [0.63, horizon - h * 0.42], [0.8, horizon - h * 0.15],
    [0.92, horizon - h * 0.3], [1, horizon - h * 0.14],
  ], t.hillFar);
  const cap = (cx, top, wd) => `<path d="M${f(w * cx)} ${f(top)} l${f(w * wd)} ${f(h * 0.075)} q-${f(w * wd * 0.55)} -${f(h * 0.02)} -${f(w * wd)} ${f(h * 0.012)} q-${f(w * wd * 0.5)} ${f(h * 0.014)} -${f(w * wd)} -${f(h * 0.012)} Z" fill="#ffffff" opacity=".95"/>`;
  const caps = cap(0.18, horizon - h * 0.36, 0.055) + cap(0.63, horizon - h * 0.42, 0.06) + cap(0.92, horizon - h * 0.3, 0.045);
  const near = ridge(w, horizon + 1, [
    [0, horizon - h * 0.08], [0.25, horizon - h * 0.2], [0.46, horizon - h * 0.06],
    [0.7, horizon - h * 0.18], [0.88, horizon - h * 0.05], [1, horizon - h * 0.12],
  ], t.hillNear);
  return far + caps + near;
}

function neonBack(w, h, horizon, t) {
  let out = `<rect y="${f(horizon - h * 0.34)}" width="${f(w)}" height="${f(h * 0.34)}" fill="${t.hillFar}" opacity=".55"/>`;
  const n = 15;
  for (let i = 0; i < n; i++) {
    const bw = (w / n) * 0.82;
    const x = i * (w / n) + (w / n) * 0.09;
    const bh = horizon * (0.3 + (((i * 53) % 61) / 100));
    const top = horizon - bh;
    const glass = i % 2 ? t.hillNear : '#101a3d';
    out += `<rect x="${f(x)}" y="${f(top)}" width="${f(bw)}" height="${f(bh)}" rx="${f(bw * 0.06)}" fill="${glass}"
       stroke="rgba(150,225,255,.3)" stroke-width="1"/>`;
    const rows = Math.max(3, Math.round(bh / (h * 0.05)));
    for (let r = 0; r < rows; r++) {
      const wy = top + bh * 0.1 + r * (bh * 0.82 / rows);
      const lit = (i * 7 + r * 11) % 4;
      out += `<rect x="${f(x + bw * 0.13)}" y="${f(wy)}" width="${f(bw * 0.74)}" height="${f(Math.max(1.2, bh * 0.028))}"
        fill="${lit === 0 ? t.accent : lit === 1 ? t.neon : '#7fd6ff'}" opacity="${lit === 3 ? 0.22 : 0.8}"/>`;
    }
    if (i % 3 === 0) {
      out += `<rect x="${f(x + bw * 0.22)}" y="${f(top - h * 0.028)}" width="${f(bw * 0.56)}" height="${f(h * 0.022)}" rx="2"
        fill="${i % 2 ? t.accent : t.neon}" opacity=".95"/>`;
    }
    out += `<rect x="${f(x + bw * 0.42)}" y="${f(top - h * 0.05)}" width="${f(bw * 0.05)}" height="${f(h * 0.05)}" fill="rgba(150,225,255,.4)"/>`;
  }
  return out;
}

/* ----------------------------------------------------------------- ground */

/** Perspective mowed bands, so the ground reads as receding rather than flat. */
function groundBands(w, P, t, id) {
  let out = `<path d="M0 ${f(P.y(0))} L${f(w)} ${f(P.y(0))} L${f(w)} ${f(P.y(1))} L0 ${f(P.y(1))} Z" fill="url(#${id}-gnd)"/>`;
  for (let i = 0; i < STEPS; i += 2) {
    const y0 = P.y(i / STEPS); const y1 = P.y((i + 1) / STEPS);
    out += `<rect y="${f(y0)}" width="${f(w)}" height="${f(Math.max(0.6, y1 - y0))}" fill="${t.groundAlt}" opacity=".72"/>`;
  }
  // haze that melts the ground into the horizon line
  out += `<rect y="${f(P.y(0))}" width="${f(w)}" height="${f(P.y(0.34) - P.y(0))}" fill="url(#${id}-haze)"/>`;
  return out;
}

/* ------------------------------------------------------------------- road */

function roadRibbon(w, h, P, t, id) {
  const L = []; const R = [];
  for (let i = 0; i <= STEPS; i++) {
    const s = i / STEPS;
    const y = P.y(s); const hw = P.half(s); const c = P.cx(s);
    L.push(`${f(c - hw)} ${f(y)}`); R.push(`${f(c + hw)} ${f(y)}`);
  }
  let out = `<path d="M${L.join(' L')} L${R.reverse().join(' L')} Z" fill="url(#${id}-road)"/>`;

  // shoulder / verge just outside the tarmac
  for (let i = 0; i < STEPS; i++) {
    const a = i / STEPS; const b = (i + 1) / STEPS;
    out += bandQuad(P, a, b, -1.16, -1, t.fog || '#233', 0.35);
    out += bandQuad(P, a, b, 1, 1.16, t.fog || '#233', 0.35);
  }
  // alternating kerbs
  for (let i = 0; i < STEPS; i++) {
    const a = i / STEPS; const b = (i + 1) / STEPS;
    const col = i % 2 ? t.rumbleA : t.rumbleB;
    out += bandQuad(P, a, b, -1, -0.9, col);
    out += bandQuad(P, a, b, 0.9, 1, col);
  }
  // lane tint + centre dashes
  for (let i = 0; i < STEPS; i++) {
    const a = i / STEPS; const b = (i + 1) / STEPS;
    if (i % 2 === 0) out += bandQuad(P, a, b, -0.9, 0.9, t.roadAlt, 0.28);
    if (i % 3 === 0 && i < STEPS - 1) out += bandQuad(P, a, Math.min(1, b + 0.012), -0.035, 0.035, t.line, 0.95);
  }
  // outer lane markers
  for (let i = 0; i < STEPS; i += 1) {
    const a = i / STEPS; const b = (i + 1) / STEPS;
    out += bandQuad(P, a, b, -0.88, -0.85, '#ffffff', 0.28);
    out += bandQuad(P, a, b, 0.85, 0.88, '#ffffff', 0.28);
  }
  return out;
}

/** Guard rail: a run of posts + a rail line following one edge of the road. */
function guardRail(P, side, t, h) {
  let posts = ''; const pts = [];
  for (let i = 0; i <= STEPS; i++) {
    const s = i / STEPS;
    const y = P.y(s); const hw = P.half(s); const c = P.cx(s);
    const x = c + side * hw * 1.28;
    const railH = h * 0.012 + h * 0.075 * Math.pow(s, 1.7);
    pts.push(`${f(x)} ${f(y - railH)}`);
    if (i % 2 === 0 && i > 4) {
      posts += `<rect x="${f(x - railH * 0.07)}" y="${f(y - railH)}" width="${f(Math.max(0.8, railH * 0.14))}" height="${f(railH)}"
        fill="#cfd9e6" opacity=".75"/>`;
    }
  }
  return `${posts}<polyline points="${pts.join(' ')}" fill="none" stroke="${t.key === 'neon' ? t.neon : '#e8eef7'}"
     stroke-width="${f(h * 0.011)}" stroke-linejoin="round" opacity=".85"/>`;
}

/* ------------------------------------------------------------ side props */

/** Anchor a prop beside the road at depth `s`; `k` is its perspective scale. */
function anchor(P, h, s, side, off) {
  const hw = P.half(s);
  return { x: P.cx(s) + side * hw * off, y: P.y(s), k: (P.half(s) / P.half(1)) * (h / 470) };
}

function tree(a, h, dark, light, trunk = '#6b4a2a') {
  const r = h * 0.085 * a.k;
  return `<g><rect x="${f(a.x - r * 0.16)}" y="${f(a.y - r * 1.1)}" width="${f(r * 0.32)}" height="${f(r * 1.15)}" rx="${f(r * 0.1)}" fill="${trunk}"/>
    <ellipse cx="${f(a.x)}" cy="${f(a.y - r * 1.5)}" rx="${f(r * 1.02)}" ry="${f(r * 0.92)}" fill="${dark}"/>
    <ellipse cx="${f(a.x - r * 0.28)}" cy="${f(a.y - r * 1.78)}" rx="${f(r * 0.62)}" ry="${f(r * 0.58)}" fill="${light}"/>
    <ellipse cx="${f(a.x + r * 0.42)}" cy="${f(a.y - r * 1.36)}" rx="${f(r * 0.5)}" ry="${f(r * 0.46)}" fill="${light}" opacity=".75"/></g>`;
}

function pine(a, h) {
  const r = h * 0.1 * a.k;
  const tier = (dy, wd, col) => `<path d="M${f(a.x)} ${f(a.y - r * dy - r * 0.95)} L${f(a.x + r * wd)} ${f(a.y - r * dy)} L${f(a.x - r * wd)} ${f(a.y - r * dy)} Z" fill="${col}"/>`;
  return `<g><rect x="${f(a.x - r * 0.1)}" y="${f(a.y - r * 0.3)}" width="${f(r * 0.2)}" height="${f(r * 0.35)}" fill="#5a4130"/>
    ${tier(0.18, 0.62, '#25603f')}${tier(0.72, 0.5, '#2e7049')}${tier(1.24, 0.36, '#37855a')}
    <path d="M${f(a.x)} ${f(a.y - r * 2.2)} l${f(r * 0.2)} ${f(r * 0.4)} l-${f(r * 0.4)} 0 Z" fill="#eef7ff"/></g>`;
}

function house(a, h, roof = '#e8433c') {
  const s = h * 0.16 * a.k;
  return `<g><rect x="${f(a.x - s * 0.5)}" y="${f(a.y - s * 0.72)}" width="${f(s)}" height="${f(s * 0.72)}" rx="${f(s * 0.04)}" fill="#f4f8fc" stroke="#c3d0de" stroke-width="${f(Math.max(0.6, s * 0.02))}"/>
    <path d="M${f(a.x - s * 0.62)} ${f(a.y - s * 0.72)} L${f(a.x)} ${f(a.y - s * 1.2)} L${f(a.x + s * 0.62)} ${f(a.y - s * 0.72)} Z" fill="${roof}"/>
    <path d="M${f(a.x)} ${f(a.y - s * 1.2)} L${f(a.x + s * 0.62)} ${f(a.y - s * 0.72)} L${f(a.x + s * 0.2)} ${f(a.y - s * 0.72)} Z" fill="#000" opacity=".12"/>
    <rect x="${f(a.x - s * 0.12)}" y="${f(a.y - s * 0.4)}" width="${f(s * 0.24)}" height="${f(s * 0.4)}" fill="#8a6a4a"/>
    <rect x="${f(a.x + s * 0.18)}" y="${f(a.y - s * 0.58)}" width="${f(s * 0.2)}" height="${f(s * 0.18)}" fill="#8fd0f0"/></g>`;
}

function drift(a, h) {
  const r = h * 0.07 * a.k;
  return `<g fill="#f4fbff"><ellipse cx="${f(a.x)}" cy="${f(a.y)}" rx="${f(r * 1.7)}" ry="${f(r * 0.7)}"/>
    <ellipse cx="${f(a.x - r * 0.9)}" cy="${f(a.y + r * 0.16)}" rx="${f(r * 0.95)}" ry="${f(r * 0.44)}" opacity=".9"/></g>`;
}

function neonPole(a, h, t, up) {
  const s = h * 0.3 * a.k;
  const sign = up ? t.accent : t.neon;
  return `<g><rect x="${f(a.x - s * 0.035)}" y="${f(a.y - s)}" width="${f(s * 0.07)}" height="${f(s)}" fill="#101a33"/>
    <rect x="${f(a.x - s * 0.22)}" y="${f(a.y - s * 1.12)}" width="${f(s * 0.44)}" height="${f(s * 0.3)}" rx="${f(s * 0.05)}"
      fill="#0b1330" stroke="${sign}" stroke-width="${f(Math.max(0.8, s * 0.022))}"/>
    <rect x="${f(a.x - s * 0.15)}" y="${f(a.y - s * 1.05)}" width="${f(s * 0.3)}" height="${f(s * 0.055)}" fill="${sign}"/>
    <rect x="${f(a.x - s * 0.15)}" y="${f(a.y - s * 0.95)}" width="${f(s * 0.19)}" height="${f(s * 0.045)}" fill="${up ? t.neon : t.accent}" opacity=".85"/>
    <ellipse cx="${f(a.x)}" cy="${f(a.y)}" rx="${f(s * 0.18)}" ry="${f(s * 0.05)}" fill="${sign}" opacity=".22"/></g>`;
}

function sideProps(w, h, P, t) {
  let out = '';
  if (t.key === 'grass') {
    out += house(anchor(P, h, 0.62, -1, 1.85), h);
    out += house(anchor(P, h, 0.3, 1, 2.6), h, '#3f7fd0');
    [[0.86, 1, 1.55], [0.7, 1, 1.9], [0.5, -1, 2.1], [0.4, 1, 2.4], [0.26, -1, 3.0], [0.2, 1, 3.4]]
      .forEach(([s, side, off]) => { out += tree(anchor(P, h, s, side, off), h, '#2f7d43', '#4aa85c'); });
    for (let i = 0; i < 7; i++) {
      const a = anchor(P, h, 0.16 + i * 0.11, -1, 1.35);
      const ph = h * 0.05 * a.k;
      out += `<rect x="${f(a.x)}" y="${f(a.y - ph)}" width="${f(Math.max(0.8, ph * 0.16))}" height="${f(ph)}" fill="#e6ddc9"/>`;
    }
  } else if (t.key === 'snow') {
    [[0.8, -1, 1.6], [0.62, 1, 1.75], [0.46, -1, 2.1], [0.34, 1, 2.5], [0.24, -1, 3.1], [0.18, 1, 3.6]]
      .forEach(([s, side, off]) => { out += pine(anchor(P, h, s, side, off), h); });
    out += drift(anchor(P, h, 0.9, 1, 1.5), h) + drift(anchor(P, h, 0.55, -1, 1.5), h) + drift(anchor(P, h, 0.35, 1, 1.9), h);
    out += `<g fill="#ffffff" opacity=".75">`;
    for (let i = 0; i < 26; i++) {
      const x = ((i * 97.3) % 100) / 100 * w;
      const y = ((i * 53.7) % 100) / 100 * h;
      out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f((h / 470) * (1 + ((i * 5) % 3) * 0.8))}"/>`;
    }
    out += `</g>`;
  } else {
    [[0.8, -1, 1.45], [0.8, 1, 1.45], [0.5, -1, 1.7], [0.5, 1, 1.7], [0.3, -1, 2.1], [0.3, 1, 2.1]]
      .forEach(([s, side, off], i) => { out += neonPole(anchor(P, h, s, side, off), h, t, i % 2 === 0); });
  }
  return out;
}

/* ---------------------------------------------------------- track dressing */

/** Start gantry arch + checkered line across the road. */
function gantry(w, h, P, t, id) {
  const s = 0.5;
  const y = P.y(s); const hw = P.half(s); const c = P.cx(s);
  const postW = hw * 0.13; const postH = h * 0.2;
  const barY = y - postH;
  let checks = '';
  const s0 = 0.86; const s1 = 0.93;
  const yA = P.y(s0); const yB = P.y(s1);
  const hwA = P.half(s0); const hwB = P.half(s1);
  const cA = P.cx(s0); const cB = P.cx(s1);
  for (let i = 0; i < 14; i++) {
    const u0 = -1 + (i * 2) / 14; const u1 = -1 + ((i + 1) * 2) / 14;
    const col = i % 2 ? '#f4f8fc' : '#12182c';
    checks += `<path d="M${f(cA + hwA * u0)} ${f(yA)} L${f(cA + hwA * u1)} ${f(yA)} L${f(cB + hwB * u1)} ${f(yB)} L${f(cB + hwB * u0)} ${f(yB)} Z" fill="${col}"/>`;
  }
  return `${checks}
    <rect x="${f(c - hw * 1.12)}" y="${f(barY)}" width="${f(postW)}" height="${f(postH)}" fill="#1b2444" stroke="${t.neon}" stroke-width="1"/>
    <rect x="${f(c + hw * 1.12 - postW)}" y="${f(barY)}" width="${f(postW)}" height="${f(postH)}" fill="#1b2444" stroke="${t.neon}" stroke-width="1"/>
    <rect x="${f(c - hw * 1.12)}" y="${f(barY)}" width="${f(hw * 2.24)}" height="${f(h * 0.062)}" rx="${f(h * 0.012)}"
      fill="url(#${id}-gantry)" stroke="${t.neon}" stroke-width="1.2"/>
    <text x="${f(c)}" y="${f(barY + h * 0.044)}" text-anchor="middle" font-family="Verdana,Geneva,sans-serif"
      font-size="${f(h * 0.04)}" font-weight="bold" fill="#eaf4ff" letter-spacing="${f(h * 0.006)}">START</text>
    <circle cx="${f(c - hw * 0.9)}" cy="${f(barY + h * 0.031)}" r="${f(h * 0.021)}" fill="#f04a4a" stroke="#fff" stroke-width="1"/>
    <circle cx="${f(c + hw * 0.9)}" cy="${f(barY + h * 0.031)}" r="${f(h * 0.021)}" fill="#f04a4a" stroke="#fff" stroke-width="1"/>`;
}

/** A row of floating Poke Ball item boxes over the road, like the reference. */
function itemRow(h, P, sDepth) {
  const y = P.y(sDepth); const hw = P.half(sDepth); const c = P.cx(sDepth);
  const r = h * 0.035 * (P.half(sDepth) / P.half(1)) * 2.4;
  let out = '';
  [-0.55, 0, 0.55].forEach((u) => {
    const x = c + hw * u; const cy = y - r * 2.1;
    out += `<g><circle cx="${f(x)}" cy="${f(cy)}" r="${f(r)}" fill="#f6f9ff" stroke="#1a2036" stroke-width="${f(Math.max(0.8, r * 0.12))}"/>
      <path d="M${f(x - r)} ${f(cy)} a${f(r)} ${f(r)} 0 0 1 ${f(r * 2)} 0 Z" fill="#e8433c"/>
      <circle cx="${f(x)}" cy="${f(cy)}" r="${f(r * 0.3)}" fill="#fff" stroke="#1a2036" stroke-width="${f(Math.max(0.7, r * 0.1))}"/>
      <ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 0.9)}" ry="${f(r * 0.28)}" fill="#000" opacity=".18"/></g>`;
  });
  return out;
}

/* -------------------------------------------------------------- assembler */

/** Average signed curvature of the opening stretch, so each track bends its own way. */
function trackCurve(track) {
  const segs = track.segments || [];
  let sum = 0; let len = 0;
  for (let i = 0; i < Math.min(segs.length, 24); i++) {
    sum += (segs[i].curve || 0) * (segs[i].len || 1);
    len += segs[i].len || 1;
  }
  const mean = len ? sum / len : 0;
  return Math.max(-1, Math.min(1, mean * 4));
}

/**
 * @param {object} track entry from src/data/tracks.js
 * @param {number} w @param {number} h
 * @param {{minimap?:boolean}} opts
 */
export function trackSceneSvg(track, w, h, opts = {}) {
  const t = track.theme;
  const id = `tsc-${track.id}-${w}x${h}`;
  const horizon = h * 0.42;
  const P = persp(w, h, horizon, trackCurve(track));
  const back = t.key === 'neon' ? neonBack(w, h, horizon, t)
    : t.key === 'snow' ? snowBack(w, h, horizon, t) : grassBack(w, h, horizon, t);
  const mini = track.minimap.map(([x, y]) => `${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`).join(' ');
  const miniSize = Math.min(w * 0.15, h * 0.28);
  return `<svg class="pkr-scene" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"
       role="img" aria-label="${track.name}">
    <defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${t.skyTop}"/><stop offset="1" stop-color="${t.skyBottom}"/>
      </linearGradient>
      <linearGradient id="${id}-road" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${t.roadAlt}"/><stop offset="1" stop-color="${t.road}"/>
      </linearGradient>
      <linearGradient id="${id}-gnd" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${t.groundAlt}"/><stop offset="1" stop-color="${t.ground}"/>
      </linearGradient>
      <linearGradient id="${id}-haze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${t.fog || t.skyBottom}" stop-opacity=".7"/>
        <stop offset="1" stop-color="${t.fog || t.skyBottom}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${id}-gantry" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#25325c"/><stop offset="1" stop-color="#111a34"/>
      </linearGradient>
      <radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${t.key === 'neon' ? '#bfe4ff' : '#fff3b8'}" stop-opacity=".8"/>
        <stop offset="1" stop-color="${t.key === 'neon' ? '#bfe4ff' : '#fff3b8'}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-vig" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#050a1c" stop-opacity=".34"/>
        <stop offset="0.32" stop-color="#050a1c" stop-opacity="0"/>
        <stop offset="0.78" stop-color="#050a1c" stop-opacity="0"/>
        <stop offset="1" stop-color="#050a1c" stop-opacity=".32"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${f(horizon + 2)}" fill="url(#${id}-sky)"/>
    ${sunOrMoon(w, h, horizon, t, id)}
    ${clouds(w, h, horizon, t)}
    ${back}
    ${groundBands(w, P, t, id)}
    ${roadRibbon(w, h, P, t, id)}
    ${sideProps(w, h, P, t)}
    ${guardRail(P, -1, t, h)}${guardRail(P, 1, t, h)}
    ${gantry(w, h, P, t, id)}
    ${itemRow(h, P, 0.7)}
    <rect width="${w}" height="${h}" fill="url(#${id}-vig)"/>
    ${opts.minimap === false ? '' : `<g transform="translate(${f(w - miniSize - h * 0.06)},${f(h * 0.05)})">
      <rect x="-8" y="-8" width="${f(miniSize + 16)}" height="${f(miniSize + 16)}" rx="10"
            fill="rgba(6,12,32,.66)" stroke="rgba(150,225,255,.55)" stroke-width="2"/>
      <g transform="scale(${miniSize / 100})">
        <polygon points="${mini}" fill="none" stroke="#f2f7ff" stroke-width="9" stroke-linejoin="round" opacity=".45"/>
        <polygon points="${mini}" fill="none" stroke="${t.neon}" stroke-width="4.5" stroke-linejoin="round"/>
      </g>
    </g>`}
  </svg>`;
}

export default trackSceneSvg;
