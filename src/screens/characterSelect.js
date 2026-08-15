/**
 * CHARACTER SELECT (build piece "character-and-track-select").
 *
 * Registers a priority-5 `screen` provider for `character-select`, replacing the
 * shell default. Reads the roster from src/data/roster.js, writes the pick into
 * shared state (`state.select.racerId` / `racerCursor` / `confirmedRacer`)
 * before advancing to `track-select` - see CONTRACTS.md.
 *
 * Owns only: src/screens/characterSelect.js, src/styles/menus.css, src/assets/*.
 */
import { register } from '../core/registry.js';
import { roster, racerOr, STAT_KEYS, STAT_MAX } from '../data/roster.js';
import { avatarSvg, ballSvg } from '../assets/pokeArt.js';
import { kartSvg } from '../assets/kartArt.js';
import { cityBackdropSvg } from '../assets/cityArt.js';

/** Neon-city backdrop, built once and reused by both menus (stable + cheap). */
let CITY = null;
export function cityBg() {
  if (CITY == null) CITY = cityBackdropSvg();
  return CITY;
}

export const COLS = 6;

/* --------------------------------------------------------------- stylesheet */
const CSS_URL = new URL('../styles/menus.css', import.meta.url).href;
export function injectMenuStyles() {
  if (document.querySelector('link[data-pkr-menus-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_URL;
  link.setAttribute('data-pkr-menus-css', '1');
  document.head.appendChild(link);
}

/* -------------------------------------------------------------- fragments */
export function logoMark(scale = 0.56) {
  return `<div class="pkr-logo" style="--logo-scale:${scale}">
    <span class="pkr-logo-word">Pok<span class="pkr-logo-e">&eacute;</span>mon</span>
    <span class="pkr-logo-sub">RACING GAME</span>
  </div>`;
}

/**
 * Neon Pokemon glyph rails down the left/right edges of the stage - the
 * signature framing of the reference screenshot. Pure outline drawings (the
 * stylesheet strips the fills), so they read as wall neon rather than stickers.
 */
const RAIL_NEON = ['#ff56c8', '#6fe6ff', '#ffd63b', '#7cf7c4'];
export function neonRails(ids = ['gengar', 'pikachu', 'mew', 'charizard', 'squirtle', 'jigglypuff']) {
  const pick = ids.map((id) => roster.find((r) => r.id === id)).filter(Boolean);
  const side = (list, cls) => `<div class="csel-rail ${cls}">${list.map((r, i) =>
    `<span class="csel-rail-mon" style="--n:${RAIL_NEON[i % RAIL_NEON.length]}">${avatarSvg(r, 92)}</span>`).join('')}</div>`;
  const half = Math.ceil(pick.length / 2);
  return side(pick.slice(0, half), 'left') + side(pick.slice(half), 'right');
}

export function hintsHtml(items) {
  return items.map(([k, label]) => `<span class="m-hint">PRESS <b>[${k}]</b> ${label}</span>`).join('');
}

/** Four continuous stat bars; fill width is driven by the racer's stats. */
function statBars(stats) {
  return `<div class="csel-stats">${STAT_KEYS.map((k) => {
    const v = Math.max(0, Math.min(STAT_MAX, stats[k] || 0));
    const pct = Math.round((v / STAT_MAX) * 100);
    return `<div class="csel-stat${k === 'weight' ? ' warm' : ''}" data-stat="${k}" data-value="${v}">
        <span class="csel-stat-label">${k.toUpperCase()}</span>
        <span class="csel-stat-bar"><i style="--v:${pct}"></i></span>
      </div>`;
  }).join('')}</div>`;
}

function cardHtml(racer, selected) {
  return `<button class="csel-card${selected ? ' on' : ''}" type="button" data-racer="${racer.id}"
      aria-pressed="${selected}" title="${racer.name}">
    ${selected ? '<span class="csel-p1">P1</span>' : ''}
    <span class="csel-card-art">${avatarSvg(racer, 84)}</span>
    <span class="csel-card-name">${racer.name}</span>
  </button>`;
}

/* ------------------------------------------------------------------ screen */
const characterSelect = {
  id: 'menus-character-select',
  kind: 'screen',
  screens: ['character-select'],
  priority: 5,

  mount(ctx) {
    injectMenuStyles();
    const s = ctx.state.select;
    const i = roster.findIndex((r) => r.id === s.racerId);
    s.racerCursor = i < 0 ? 0 : i;
    this.paint(ctx);
  },

  paint(ctx) {
    const s = ctx.state.select;
    const cur = roster[s.racerCursor] || roster[0];
    const sel = racerOr(cur.id);
    s.racerId = sel.id;

    ctx.layer.innerHTML = `
      <section class="csel" data-racer="${sel.id}">
        <div class="csel-bg">${cityBg()}${neonRails()}</div>
        <header class="m-head">
          ${logoMark(0.52)}
          <h1 class="m-title">CHARACTER SELECT</h1>
          <span style="width:150px"></span>
        </header>
        <div class="csel-body">
          <div class="m-panel csel-gridwrap">
            <div class="csel-grid" role="listbox" aria-label="Racers">
              ${roster.map((r) => cardHtml(r, r.id === sel.id)).join('')}
            </div>
          </div>
          <aside class="csel-side">
            <div class="m-panel csel-preview">
              <span class="csel-preview-type" style="--c:${sel.color}">${(sel.type || '').toUpperCase()} TYPE</span>
              <span class="csel-preview-stage" style="--c:${sel.color}"></span>
              <span class="csel-preview-art">${kartSvg(sel, 470)}</span>
              <span class="csel-preview-tag">${(sel.tagline || '').toUpperCase()}</span>
            </div>
            <div class="m-panel csel-statpanel">
              <h2 class="csel-statname">${sel.name}</h2>
              ${statBars(sel.stats)}
            </div>
          </aside>
        </div>
        <footer class="m-foot">
          ${hintsHtml([['A', 'TO CONFIRM'], ['B', 'TO GO BACK']])}
          <span class="m-foot-logo">${logoMark(0.34)}</span>
        </footer>
      </section>`;

    ctx.layer.querySelectorAll('.csel-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = roster.findIndex((r) => r.id === btn.dataset.racer);
        if (i >= 0 && i !== ctx.state.select.racerCursor) {
          ctx.state.select.racerCursor = i;
          this.paint(ctx);
        }
      });
      btn.addEventListener('dblclick', () => this.confirm(ctx));
    });
  },

  confirm(ctx) {
    const s = ctx.state.select;
    s.racerId = (roster[s.racerCursor] || roster[0]).id;
    s.confirmedRacer = true;
    ctx.goto('track-select', { racer: s.racerId });
  },

  onAction(action, key, ctx) {
    const s = ctx.state.select;
    const n = roster.length;
    let c = s.racerCursor == null ? 0 : s.racerCursor;
    if (action.includes('right')) c = (c + 1) % n;
    else if (action.includes('left')) c = (c + n - 1) % n;
    else if (action.includes('down')) c = (c + COLS) % n;
    else if (action.includes('up')) c = (c + n - COLS) % n;
    else if (action.includes('confirm')) { this.confirm(ctx); return; }
    else if (action.includes('back')) { ctx.goto('title'); return; }
    if (c !== s.racerCursor) { s.racerCursor = c; this.paint(ctx); }
  },

  render() { /* DOM-only screen: nothing to draw on the canvas */ },

  unmount(ctx) { if (ctx && ctx.layer) ctx.layer.innerHTML = ''; },
};

register(characterSelect);
export { ballSvg };
export default characterSelect;
