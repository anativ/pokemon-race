/**
 * cityArt.js - procedural neon-night-city backdrop for the pre-race menus
 * (build piece "character-and-track-select").
 *
 * One exported function, `cityBackdropSvg()`, returns a self-contained inline
 * SVG string sized to the 1600x900 stage. It is fully deterministic (a tiny
 * seeded LCG, never Math.random) so screenshots are byte-stable.
 */

/* deterministic 0..1 stream */
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const NEON = ['#6fe6ff', '#ff56c8', '#ffd63b', '#7cf7c4', '#9a8bff'];

/** A single tower: body + lit window grid + optional roof aerial. */
function tower(rnd, x, w, h, base) {
  const top = base - h;
  const body = `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="3"
      fill="url(#pkrTowerFill)" stroke="rgba(120,200,255,.20)" stroke-width="1"/>`;
  let win = '';
  const cols = Math.max(2, Math.floor(w / 15));
  const rows = Math.max(3, Math.floor(h / 22));
  const cw = (w - 8) / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = rnd();
      if (k > 0.62) continue;
      const col = NEON[Math.floor(rnd() * NEON.length)];
      const wx = x + 4 + c * cw;
      const wy = top + 10 + r * 20;
      if (wy > base - 12) continue;
      win += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${(cw - 4).toFixed(1)}" height="7"
          rx="1.5" fill="${col}" opacity="${(0.20 + k * 0.55).toFixed(2)}"/>`;
    }
  }
  const aerial = rnd() > 0.55
    ? `<rect x="${(x + w / 2 - 1).toFixed(1)}" y="${(top - 26).toFixed(1)}" width="2" height="26" fill="rgba(120,200,255,.35)"/>
       <circle cx="${(x + w / 2).toFixed(1)}" cy="${(top - 28).toFixed(1)}" r="2.6" fill="#ff56c8" opacity=".9"/>`
    : '';
  return body + win + aerial;
}

/** Vertical neon sign strip bolted to a tower face. */
function signStrip(rnd, x, y, h) {
  const col = NEON[Math.floor(rnd() * NEON.length)];
  let cells = '';
  const n = Math.max(3, Math.round(h / 26));
  for (let i = 0; i < n; i++) {
    cells += `<rect x="${x + 3}" y="${(y + 6 + i * 25).toFixed(1)}" width="16" height="14" rx="2"
        fill="${col}" opacity="${(0.35 + rnd() * 0.5).toFixed(2)}"/>`;
  }
  return `<g filter="url(#pkrNeonGlow)">
      <rect x="${x}" y="${y}" width="22" height="${h}" rx="4" fill="rgba(6,12,34,.9)"
        stroke="${col}" stroke-width="1.6" opacity=".85"/>${cells}</g>`;
}

/** Horizontal billboard with a couple of glowing bars (reads as signage). */
function billboard(rnd, x, y, w, h) {
  const col = NEON[Math.floor(rnd() * NEON.length)];
  const bars = [0.72, 0.46, 0.6].map((f, i) =>
    `<rect x="${x + 10}" y="${(y + 10 + i * (h / 3.4)).toFixed(1)}" width="${(w * f - 20).toFixed(1)}"
        height="${Math.max(5, h / 6).toFixed(1)}" rx="2.5" fill="${col}" opacity="${(0.75 - i * 0.16).toFixed(2)}"/>`).join('');
  return `<g filter="url(#pkrNeonGlow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="rgba(8,16,42,.86)"
        stroke="${col}" stroke-width="1.8" opacity=".9"/>${bars}</g>`;
}

/**
 * @param {{seed?:number, opacity?:number}} [opts]
 * @returns {string} inline SVG for a 1600x900 stage
 */
export function cityBackdropSvg(opts = {}) {
  const rnd = lcg(opts.seed == null ? 20240815 : opts.seed);
  const HORIZON = 690;

  let far = '';
  for (let x = -20; x < 1620;) {
    const w = 46 + Math.floor(rnd() * 70);
    far += tower(rnd, x, w, 150 + Math.floor(rnd() * 250), HORIZON - 40);
    x += w + 8 + Math.floor(rnd() * 16);
  }
  let near = '';
  for (let x = -30; x < 1630;) {
    const w = 80 + Math.floor(rnd() * 110);
    const h = 210 + Math.floor(rnd() * 280);
    near += tower(rnd, x, w, h, HORIZON + 120);
    if (rnd() > 0.45) near += signStrip(rnd, x + w - 30, HORIZON + 100 - h + 24, Math.min(190, h * 0.5));
    if (rnd() > 0.62) near += billboard(rnd, x + 12, HORIZON + 100 - h + 40, Math.min(w - 26, 130), 56);
    x += w + 14 + Math.floor(rnd() * 26);
  }

  let street = '';
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 1600;
    street += `<circle cx="${x.toFixed(1)}" cy="${(HORIZON + 110 + rnd() * 150).toFixed(1)}"
        r="${(2 + rnd() * 3).toFixed(1)}" fill="${NEON[Math.floor(rnd() * NEON.length)]}" opacity="${(0.25 + rnd() * 0.4).toFixed(2)}"/>`;
  }

  return `<svg class="pkr-city" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="pkrSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b1a4c"/><stop offset=".52" stop-color="#111a44"/>
        <stop offset="1" stop-color="#1a1440"/>
      </linearGradient>
      <linearGradient id="pkrTowerFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#122152"/><stop offset="1" stop-color="#080d2a"/>
      </linearGradient>
      <radialGradient id="pkrHaze" cx=".5" cy=".78" r=".6">
        <stop offset="0" stop-color="rgba(90,190,255,.40)"/>
        <stop offset="1" stop-color="rgba(90,190,255,0)"/>
      </radialGradient>
      <radialGradient id="pkrVig" cx=".5" cy=".45" r=".78">
        <stop offset=".45" stop-color="rgba(4,8,26,0)"/>
        <stop offset="1" stop-color="rgba(3,6,20,.85)"/>
      </radialGradient>
      <filter id="pkrNeonGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3.4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="1600" height="900" fill="url(#pkrSky)"/>
    <circle cx="1288" cy="150" r="52" fill="#dfe9ff" opacity=".16"/>
    <g opacity=".55">${far}</g>
    <rect y="${HORIZON - 60}" width="1600" height="260" fill="url(#pkrHaze)"/>
    <g opacity=".95">${near}</g>
    <rect y="${HORIZON + 108}" width="1600" height="300" fill="rgba(5,9,28,.72)"/>
    <g>${street}</g>
    <rect width="1600" height="900" fill="url(#pkrVig)"/>
  </svg>`;
}

export default { cityBackdropSvg };
