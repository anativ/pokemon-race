/** TRACK SELECTION - numbered list + big preview (see ref #4, panel 1). */
import { trackMenuOrder, trackOr } from '../../data/tracks.js';
import { logoHtml, hintHtml, pointOnLoop } from '../ui.js';
import { renderWorld } from '../world.js';
import { ballSvg } from '../avatars.js';

export default {
  id: 'shell-track-select',
  kind: 'screen',
  screens: ['track-select'],
  priority: 0,

  mount(ctx) {
    const i = trackMenuOrder.findIndex((t) => t.id === ctx.state.select.trackId);
    ctx.state.select.trackCursor = i < 0 ? 0 : i;
    this.paint(ctx);
  },

  paint(ctx) {
    const sel = trackMenuOrder[ctx.state.select.trackCursor] || trackMenuOrder[0];
    ctx.state.select.trackId = sel.id;
    ctx.layer.innerHTML = `
      <div class="scr scr-track">
        <header class="scr-head">
          ${logoHtml(0.62)}
          <h1 class="scr-title neon-plate">TRACK SELECTION</h1>
        </header>
        <div class="track-body">
          <div class="panel track-list">
            ${trackMenuOrder.map((t, i) => `
              <button class="track-row${t.id === sel.id ? ' on' : ''}" data-track="${t.id}" type="button">
                <span class="track-num">${i + 1}.</span>
                <span class="track-thumb">${sceneSvg(t, 210, 74)}</span>
                <span class="track-row-name">${t.name}</span>
              </button>`).join('')}
            <div class="cup-note">
              <div class="cup-title">${ballSvg(22)} SUPER CIRCUIT CUP</div>
              <div class="cup-row">12 RACERS &middot; 3 LAPS EACH &middot; ITEM BOXES ON</div>
              <div class="cup-row">P1 &mdash; <b>${(ctx.state.select.racerId || '').toUpperCase()}</b></div>
            </div>
          </div>
          <div class="panel track-preview">
            <div class="track-preview-art">${sceneSvg(sel, 880, 430)}</div>
            <div class="track-preview-name">${sel.name}</div>
            <div class="track-meta">
              <span>${sel.laps} LAPS</span>
              <span class="dot"></span>
              <span>DIFFICULTY ${'★'.repeat(sel.difficulty)}${'☆'.repeat(3 - sel.difficulty)}</span>
              <span class="dot"></span>
              <span>${sel.subtitle}</span>
            </div>
          </div>
        </div>
        <footer class="scr-foot">${hintHtml([['A', 'TO CONFIRM TRACK'], ['B', 'TO GO BACK']])}</footer>
      </div>`;
    ctx.layer.querySelectorAll('.track-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        ctx.state.select.trackCursor = trackMenuOrder.findIndex((t) => t.id === btn.dataset.track);
        this.paint(ctx);
      });
      btn.addEventListener('dblclick', () => ctx.goto('race'));
    });
  },

  onAction(action, key, ctx) {
    const s = ctx.state.select;
    const n = trackMenuOrder.length;
    let c = s.trackCursor;
    if (action.includes('down') || action.includes('right')) c = (c + 1) % n;
    else if (action.includes('up') || action.includes('left')) c = (c + n - 1) % n;
    else if (action.includes('confirm')) { s.confirmedTrack = true; ctx.goto('race'); return; }
    else if (action.includes('back')) { ctx.goto('character-select'); return; }
    if (c !== s.trackCursor) { s.trackCursor = c; this.paint(ctx); }
  },

  render(ctx) {
    renderWorld(ctx.c, { track: trackOr('ryme-city'), race: null, w: ctx.w, h: ctx.h, time: ctx.time });
    ctx.c.fillStyle = 'rgba(5,10,30,0.74)';
    ctx.c.fillRect(0, 0, ctx.w, ctx.h);
  },
};

/* Road ribbon: two mirrored bezier edges from the vanishing point to the base. */
const roadLeft = (w, h, y0) =>
  `M${w * 0.485} ${y0} C${w * 0.46} ${h * 0.6}, ${w * 0.34} ${h * 0.78}, ${w * 0.2} ${h}`;
const roadRight = (w, h, y0) =>
  `M${w * 0.525} ${y0} C${w * 0.55} ${h * 0.6}, ${w * 0.72} ${h * 0.78}, ${w * 0.74} ${h}`;
const roadRightBack = (w, h, y0) =>
  `C${w * 0.72} ${h * 0.78}, ${w * 0.55} ${h * 0.6}, ${w * 0.525} ${y0}`;
const roadMid = (w, h, y0) =>
  `M${w * 0.505} ${y0} C${w * 0.505} ${h * 0.6}, ${w * 0.53} ${h * 0.78}, ${w * 0.47} ${h}`;

/** Flat SVG diorama of a track, used for thumbnails and the big preview. */
function sceneSvg(track, w, h) {
  const t = track.theme;
  const id = `sc-${track.id}-${w}`;
  const horizon = h * 0.42;
  const mini = track.minimap.map(([x, y]) => `${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`).join(' ');
  const startPt = pointOnLoop(track.minimap, 0);
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" class="scene">
    <defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${t.skyTop}"/><stop offset="1" stop-color="${t.skyBottom}"/>
      </linearGradient>
      <linearGradient id="${id}-road" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${t.roadAlt}"/><stop offset="1" stop-color="${t.road}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${horizon + 2}" fill="url(#${id}-sky)"/>
    <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="${t.ground}"/>
    ${t.key === 'neon'
      ? Array.from({ length: 12 }, (_, i) => {
        const bw = w / 14; const bh = horizon * (0.35 + ((i * 37) % 60) / 100);
        return `<rect x="${i * bw * 1.15}" y="${horizon - bh}" width="${bw}" height="${bh}" fill="${t.hillFar}"/>
                <rect x="${i * bw * 1.15 + bw * 0.2}" y="${horizon - bh * 0.8}" width="${bw * 0.6}" height="${bh * 0.12}" fill="${t.neon}" opacity=".8"/>`;
      }).join('')
      : `<path d="M0 ${horizon} L${w * 0.18} ${horizon - h * 0.24} L${w * 0.34} ${horizon} L${w * 0.52} ${horizon - h * 0.3} L${w * 0.7} ${horizon} L${w * 0.86} ${horizon - h * 0.2} L${w} ${horizon} Z" fill="${t.hillFar}"/>
         <path d="M0 ${horizon + 2} L${w * 0.26} ${horizon - h * 0.12} L${w * 0.5} ${horizon + 2} L${w * 0.74} ${horizon - h * 0.16} L${w} ${horizon + 2} Z" fill="${t.hillNear}"/>`}
    <path d="${roadLeft(w, h, horizon)} L${w * 0.74} ${h} ${roadRightBack(w, h, horizon)} Z" fill="url(#${id}-road)"/>
    <path d="${roadLeft(w, h, horizon)}" stroke="${t.rumbleA}" stroke-width="${Math.max(2, h * 0.018)}" fill="none" opacity=".9"/>
    <path d="${roadRight(w, h, horizon)}" stroke="${t.rumbleA}" stroke-width="${Math.max(2, h * 0.018)}" fill="none" opacity=".9"/>
    <path d="${roadMid(w, h, horizon)}" stroke="${t.line}" stroke-width="${Math.max(2, h * 0.014)}"
          stroke-dasharray="${h * 0.06} ${h * 0.05}" fill="none" opacity=".95"/>
    ${t.key === 'snow' ? `<circle cx="${w * 0.14}" cy="${h * 0.72}" r="${h * 0.09}" fill="#f4fbff" opacity=".9"/>
      <circle cx="${w * 0.88}" cy="${h * 0.66}" r="${h * 0.07}" fill="#f4fbff" opacity=".9"/>` : ''}
    ${t.key === 'grass' ? `<rect x="${w * 0.06}" y="${h * 0.5}" width="${w * 0.1}" height="${h * 0.16}" rx="${h * 0.02}" fill="#f4f7fb"/>
      <path d="M${w * 0.05} ${h * 0.5} L${w * 0.11} ${h * 0.42} L${w * 0.17} ${h * 0.5} Z" fill="#e8433c"/>` : ''}
    <g transform="translate(${w * 0.76},${h * 0.08}) scale(${(w * 0.2) / 100})" opacity=".95">
      <polygon points="${mini}" fill="none" stroke="#f6f9ff" stroke-width="7" stroke-linejoin="round" opacity=".55"/>
      <polygon points="${mini}" fill="none" stroke="${t.neon}" stroke-width="3.4" stroke-linejoin="round"/>
      <circle cx="${(startPt[0] * 100).toFixed(1)}" cy="${(startPt[1] * 100).toFixed(1)}" r="5" fill="${t.accent}" stroke="#0b1330" stroke-width="2"/>
    </g>
  </svg>`;
}

export { ballSvg };
