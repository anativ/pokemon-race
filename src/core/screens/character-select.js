/** CHARACTER SELECT - roster grid + P1 cursor + stat panel (see ref #3). */
import { roster, racerOr } from '../../data/roster.js';
import { logoHtml, statBarsHtml, racerCardHtml, hintHtml } from '../ui.js';
import { kartSvg } from '../avatars.js';
import { renderWorld } from '../world.js';
import { trackOr } from '../../data/tracks.js';

const COLS = 6;

export default {
  id: 'shell-character-select',
  kind: 'screen',
  screens: ['character-select'],
  priority: 0,

  mount(ctx) {
    const idx = roster.findIndex((r) => r.id === ctx.state.select.racerId);
    ctx.state.select.racerCursor = idx < 0 ? 0 : idx;
    this.paint(ctx);
  },

  paint(ctx) {
    const sel = racerOr(roster[ctx.state.select.racerCursor]?.id);
    ctx.state.select.racerId = sel.id;
    ctx.layer.innerHTML = `
      <div class="scr scr-select">
        <header class="scr-head">
          ${logoHtml(0.62)}
          <h1 class="scr-title neon-plate">CHARACTER SELECT</h1>
        </header>
        <div class="select-body">
          <div class="panel grid-panel">
            <div class="racer-grid">
              ${roster.map((r) => racerCardHtml(r, {
    selected: r.id === sel.id, tag: r.id === sel.id ? 'P1' : '',
  })).join('')}
            </div>
          </div>
          <aside class="side-col">
            <div class="panel preview-panel">
              <div class="preview-art">${kartSvg(sel, 330)}</div>
              <div class="preview-type" style="--c:${sel.color}">${sel.type.toUpperCase()} TYPE</div>
            </div>
            <div class="panel stat-panel">
              <h2 class="stat-name">${sel.name}</h2>
              ${statBarsHtml(sel.stats)}
              <p class="stat-tag">${sel.tagline}</p>
            </div>
          </aside>
        </div>
        <footer class="scr-foot">
          ${hintHtml([['A', 'TO CONFIRM'], ['B', 'TO GO BACK']])}
        </footer>
      </div>`;
    ctx.layer.querySelectorAll('.pkr-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        ctx.state.select.racerCursor = roster.findIndex((r) => r.id === btn.dataset.racer);
        this.paint(ctx);
      });
      btn.addEventListener('dblclick', () => ctx.goto('track-select'));
    });
  },

  onAction(action, key, ctx) {
    const s = ctx.state.select;
    const n = roster.length;
    let c = s.racerCursor;
    if (action.includes('right')) c = (c + 1) % n;
    else if (action.includes('left')) c = (c + n - 1) % n;
    else if (action.includes('down')) c = (c + COLS) % n;
    else if (action.includes('up')) c = (c + n - COLS) % n;
    else if (action.includes('confirm')) { s.confirmedRacer = true; ctx.goto('track-select'); return; }
    else if (action.includes('back')) { ctx.goto('title'); return; }
    if (c !== s.racerCursor) { s.racerCursor = c; this.paint(ctx); }
  },

  render(ctx) {
    renderWorld(ctx.c, { track: trackOr('ryme-city'), race: null, w: ctx.w, h: ctx.h, time: ctx.time });
    ctx.c.fillStyle = 'rgba(5,10,30,0.72)';
    ctx.c.fillRect(0, 0, ctx.w, ctx.h);
  },
};
