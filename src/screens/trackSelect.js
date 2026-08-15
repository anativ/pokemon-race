/**
 * TRACK SELECTION (build piece "character-and-track-select").
 *
 * Priority-5 `screen` provider for `track-select`. Numbered 1/2/3 list with
 * thumbnails on the left, big preview on the right. Commits the pick into
 * shared state (`state.select.trackId` / `trackCursor` / `confirmedTrack`)
 * before starting the race - see CONTRACTS.md.
 */
import { register } from '../core/registry.js';
import { trackMenuOrder, trackOr } from '../data/tracks.js';
import { racerOr } from '../data/roster.js';
import { ballSvg } from '../assets/pokeArt.js';
import { trackSceneSvg } from '../assets/trackArt.js';
import { injectMenuStyles, logoMark, hintsHtml, cityBg, neonRails } from './characterSelect.js';

const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));

function rowHtml(track, i, selected) {
  return `<button class="tsel-row${selected ? ' on' : ''}" type="button" data-track="${track.id}"
      aria-pressed="${selected}" title="${track.name}">
    <span class="tsel-num">${i + 1}</span>
    <span class="tsel-rowmeta">${track.laps} LAPS</span>
    <span class="tsel-thumb">${trackSceneSvg(track, 440, 150, { minimap: false })}</span>
    <span class="tsel-rowname">${track.name}</span>
  </button>`;
}

const trackSelect = {
  id: 'menus-track-select',
  kind: 'screen',
  screens: ['track-select'],
  priority: 5,

  mount(ctx) {
    injectMenuStyles();
    const s = ctx.state.select;
    const i = trackMenuOrder.findIndex((t) => t.id === s.trackId);
    s.trackCursor = i < 0 ? 0 : i;
    this.paint(ctx);
  },

  paint(ctx) {
    const s = ctx.state.select;
    const sel = trackOr((trackMenuOrder[s.trackCursor] || trackMenuOrder[0]).id);
    s.trackId = sel.id;
    const p1 = racerOr(s.racerId);

    ctx.layer.innerHTML = `
      <section class="tsel" data-track="${sel.id}">
        <div class="tsel-bg">${cityBg()}${neonRails(['rayquaza', 'snorlax', 'eevee', 'lucario', 'togepi', 'ditto'])}</div>
        <header class="m-head">
          ${logoMark(0.52)}
          <h1 class="m-title">TRACK SELECTION</h1>
          <span style="width:150px"></span>
        </header>
        <div class="tsel-body">
          <div class="m-panel tsel-list">
            ${trackMenuOrder.map((t, i) => rowHtml(t, i, t.id === sel.id)).join('')}
            <div class="tsel-cup">
              ${ballSvg(26)}<span>SUPER CIRCUIT CUP &middot; 12 RACERS &middot; P1 <b>${p1.name}</b></span>
            </div>
          </div>
          <div class="m-panel tsel-preview">
            <div class="tsel-scene">${trackSceneSvg(sel, 1000, 470)}</div>
            <div class="tsel-name">${sel.name}</div>
            <div class="tsel-meta">
              <span><b>${sel.laps}</b> LAPS</span><span class="dot"></span>
              <span>DIFFICULTY <b>${stars(sel.difficulty)}</b></span><span class="dot"></span>
              <span>${sel.subtitle.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <footer class="m-foot">
          ${hintsHtml([['A', 'TO CONFIRM TRACK'], ['B', 'TO GO BACK']])}
          <span class="m-foot-logo">${logoMark(0.34)}</span>
        </footer>
      </section>`;

    ctx.layer.querySelectorAll('.tsel-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = trackMenuOrder.findIndex((t) => t.id === btn.dataset.track);
        if (i >= 0 && i !== ctx.state.select.trackCursor) {
          ctx.state.select.trackCursor = i;
          this.paint(ctx);
        }
      });
      btn.addEventListener('dblclick', () => this.confirm(ctx));
    });
  },

  confirm(ctx) {
    const s = ctx.state.select;
    s.trackId = (trackMenuOrder[s.trackCursor] || trackMenuOrder[0]).id;
    s.confirmedTrack = true;
    ctx.goto('race', { track: s.trackId, racer: s.racerId });
  },

  onAction(action, key, ctx) {
    const s = ctx.state.select;
    const n = trackMenuOrder.length;
    let c = s.trackCursor == null ? 0 : s.trackCursor;
    if (action.includes('down') || action.includes('right')) c = (c + 1) % n;
    else if (action.includes('up') || action.includes('left')) c = (c + n - 1) % n;
    else if (action.includes('confirm')) { this.confirm(ctx); return; }
    else if (action.includes('back')) { ctx.goto('character-select'); return; }
    if (c !== s.trackCursor) { s.trackCursor = c; this.paint(ctx); }
  },

  render() { /* DOM-only screen */ },

  unmount(ctx) { if (ctx && ctx.layer) ctx.layer.innerHTML = ''; },
};

register(trackSelect);
export default trackSelect;
