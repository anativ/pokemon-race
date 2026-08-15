/**
 * results-podium :: the celebration screen (build piece "results-podium").
 *
 * Registers a priority-5 `screen` provider for `results`, replacing the shell
 * default. Reads the finished-race standings straight out of shared state
 * (`ctx.state.results`, built by the sim - see CONTRACTS.md §3) so the podium
 * always shows the racers that actually finished 1st/2nd/3rd.
 *
 * Owns only: src/screens/results.js, src/styles/results.css, src/assets/results/*.
 */
import { register } from '../core/registry.js';
import { input } from '../core/input.js';
import { racerOr, STAT_KEYS, STAT_MAX } from '../data/roster.js';
import { trackOr } from '../data/tracks.js';
import * as ui from '../core/ui.js';
import { renderArena } from '../assets/results/arena.js';
import {
  pokeballSvg, trophySvg, sparkleSvg, plinthSvg, PLINTH_SPEC,
} from '../assets/results/podium-art.js';
import {
  podiumFigureSvg, figureHeight, FIG_H, BELOW_FEET,
} from '../assets/results/podium-figures.js';

/* ------------------------------------------------------------- stylesheet */
const CSS_URL = new URL('../styles/results.css', import.meta.url).href;
function injectStyles() {
  if (document.querySelector('link[data-pkr-results-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_URL;
  link.setAttribute('data-pkr-results-css', '1');
  document.head.appendChild(link);
}

/* ------------------------------------------------------------- tiny utils */
const ordinal = (n) => (typeof ui.ordinal === 'function' ? ui.ordinal(n) : (() => {
  const s = ['th', 'st', 'nd', 'rd']; const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
})());

const fmtTime = (sec) => (typeof ui.fmtTime === 'function' ? ui.fmtTime(sec) : (() => {
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}.${String(Math.floor((sec % 1) * 1000)).padStart(3, '0')}`;
})());

function logoHtml(scale) {
  if (typeof ui.logoHtml === 'function') return ui.logoHtml(scale);
  return `<div class="pkr-logo" style="--logo-scale:${scale}">
    <span class="pkr-logo-word">Pok<span class="pkr-logo-e">é</span>mon</span>
    <span class="pkr-logo-sub">RACING GAME</span></div>`;
}

function hintsHtml(items) {
  if (typeof ui.hintHtml === 'function') return ui.hintHtml(items);
  return `<div class="pkr-hints">${items.map(([k, l]) =>
    `<span class="pkr-hint">PRESS <b>[${k}]</b> ${l}</span>`).join('')}</div>`;
}

function statsHtml(stats) {
  if (typeof ui.statBarsHtml === 'function') return ui.statBarsHtml(stats, { compact: true });
  return `<div class="pkr-stats compact">${STAT_KEYS.map((k) => `
    <div class="pkr-stat-row"><span class="pkr-stat-label">${k}</span>
      <span class="pkr-stat-track">${Array.from({ length: STAT_MAX }, (_, i) =>
    `<i class="${i < stats[k] ? 'on' : ''} ${k === 'weight' ? 'warm' : ''}"></i>`).join('')}</span>
    </div>`).join('')}</div>`;
}

/**
 * Seat a full-body figure on a plinth.
 *
 * The figure SVG is FIG_H+10 units tall with the soles on y = FEET, so
 * `below` is the dead space under the feet in rendered pixels. Pulling the
 * figure down by `below + <top-ellipse offset>` lands the soles on the drum's
 * top surface (a touch in front of its centre) instead of behind the drum.
 */
function seat(figH, ry) {
  const below = (figH * BELOW_FEET) / FIG_H;   // dead space under the soles, in px
  // Land the soles near the BACK edge of the drum's top ellipse (its centre is
  // at y = ry + 4). Standing at the back leaves the whole front face - and the
  // "1st / 2nd / 3rd" label printed on it - completely unobscured.
  return Math.round(below + ry * 0.1);
}

/* ------------------------------------------------------------------ markup */
function bannerHtml(top3) {
  return `<div class="pkr-rp-banner" data-pkr-banner>
    ${top3.map((o, i) => `<div class="pkr-rp-row r${i + 1}${i === 0 ? ' win' : ''}" data-place="${i + 1}">
      <span class="pl">${ordinal(i + 1)}:</span>
      <span class="nm" data-name>${o.name}</span>
      <span class="tm">${fmtTime(o.time)}</span>
    </div>`).join('')}
  </div>`;
}

function columnHtml(entry, place) {
  const def = racerOr(entry.id);
  const spec = PLINTH_SPEC[place] || PLINTH_SPEC[3];
  // scale-matched: compact species (Ditto, Squirtle...) are drawn bigger so the
  // three tiers read at the same apparent size.
  const size = figureHeight(def, spec.fig);
  const sink = seat(size, spec.ry);
  const top = Math.round(size * 0.16);
  const sparks = place === 1 ? `
    <span class="pkr-rp-spark" style="left:8px;top:${top + 22}px">${sparkleSvg(30)}</span>
    <span class="pkr-rp-spark" style="right:6px;top:${top + 74}px;animation-delay:.35s">${sparkleSvg(24, '#bfe9ff')}</span>
    <span class="pkr-rp-spark" style="right:36px;top:${top - 26}px;animation-delay:.7s">${sparkleSvg(22)}</span>` : '';
  return `<div class="pkr-rp-col p${place}" data-place="${place}" data-racer="${entry.id}"
      style="--col-w:${spec.w}px;--sink:${sink}px;--face-h:${spec.faceH}px;--top-ry:${spec.ry}px">
    ${place === 1 ? '<span class="pkr-rp-godray" aria-hidden="true"></span>' : ''}
    <div class="pkr-rp-figwrap">
      ${place === 1 ? `<span class="pkr-rp-trophy" style="top:${top - 42}px">${trophySvg(66)}</span>` : ''}
      ${sparks}
      ${podiumFigureSvg(def, { height: size })}
    </div>
    <div class="pkr-rp-plinth">
      ${plinthSvg(place, spec)}
      <span class="pkr-rp-contact" style="top:${Math.round(spec.ry * 0.42 + 4)}px;
        width:${Math.round(spec.w * 0.74)}px;height:${Math.round(spec.ry * 1.5)}px"></span>
      <div class="pkr-rp-face">
        <span class="pl">${ordinal(place)}</span>
        <span class="nm" data-podium-name>${def.name}</span>
      </div>
    </div>
  </div>`;
}

function floatingBallsHtml() {
  const sizes = [92, 62, 84, 58, 46, 44];
  return sizes.map((s, i) =>
    `<span class="pkr-rp-float f${i + 1}">${pokeballSvg(s, { glow: 0.4 + i * 0.1, tilt: i * 9 - 18 })}</span>`).join('');
}

/**
 * "YOU" chip: the player's own line of the standings. Always truthful - it is
 * read from the same `res.order` the podium is built from, so a player who did
 * not podium still sees exactly where they landed.
 */
function playerChipHtml(res) {
  // `isPlayer` is not always carried through the JSON snapshot, so fall back to
  // matching the player id - the chip must never disagree with the standings.
  const idx = res.order.findIndex((o) => o.isPlayer || (res.playerId && o.id === res.playerId));
  const entry = idx >= 0 ? res.order[idx] : null;
  const id = entry ? entry.id : res.playerId;
  if (!id) return '';
  const def = racerOr(id);
  const place = idx >= 0 ? idx + 1 : res.rank;
  const podiumed = place <= 3;
  return `<div class="pkr-rp-you${podiumed ? ' onpodium' : ''}" data-you="${def.id}">
    <span class="tag">YOU</span>
    <span class="nm">${def.name}</span>
    <span class="pl" data-you-rank>${ordinal(place)}</span>
    ${entry ? `<span class="tm">${fmtTime(entry.time)}</span>` : ''}
  </div>`;
}

function screenHtml(res) {
  const track = trackOr(res.trackId);
  const top3 = res.order.slice(0, 3);
  const winner = racerOr(top3[0].id);
  const podiumOrder = [[top3[1], 2], [top3[0], 1], [top3[2], 3]].filter(([e]) => e);
  return `<div class="scr pkr-rp" data-pkr-results data-rank="${res.rank}" data-coins="${res.coins}"
      data-podium="${top3.map((o) => o.id).join(',')}">
    ${floatingBallsHtml()}
    <div class="pkr-rp-head">
      ${logoHtml(0.52)}
      <div class="pkr-rp-track">${track.name} &middot; ${res.laps} LAPS &middot; RESULTS</div>
    </div>
    ${bannerHtml(top3)}
    <div class="pkr-rp-podium">${podiumOrder.map(([e, p]) => columnHtml(e, p)).join('')}</div>
    <div class="panel pkr-rp-stats">
      <div class="pkr-rp-stats-head">${trophySvg(24)} WINNER <span class="who">${winner.name}</span></div>
      ${statsHtml(winner.stats)}
      ${playerChipHtml(res)}
    </div>
    <div class="panel pkr-rp-footbar">
      <span class="coin">${pokeballSvg(30, { glow: 1 })}</span>
      <span>TOTAL COINS: <b data-coins>${res.coins}</b></span>
      <span class="sep"></span>
      <span>FINAL RANK: <b data-rank>${ordinal(res.rank)}</b></span>
    </div>
    <div class="pkr-rp-badge">${logoHtml(0.46)}</div>
    <div class="pkr-rp-hints">${hintsHtml([['A', 'FOR NEXT RACE'], ['B', 'FOR MENU']])}</div>
  </div>`;
}

/* ---------------------------------------------------------------- provider */
export const resultsPodium = {
  id: 'results-podium',
  kind: 'screen',
  screens: ['results'],
  priority: 5,

  mount(ctx) {
    injectStyles();
    const res = ctx.state.results;
    if (!res || !res.order || !res.order.length) {
      ctx.layer.innerHTML = '<div class="scr pkr-rp"><div class="pkr-rp-banner">'
        + '<div class="pkr-rp-row">NO RESULTS YET</div></div></div>';
      return;
    }
    ctx.layer.innerHTML = screenHtml(res);
    this._root = ctx.layer.querySelector('[data-pkr-results]');
    this._t = 0;

    /* Shift+A / Shift+B (and window.__pkr.press('A')) produce an UPPERCASE key,
       which the shell keymap - all-lowercase - drops before onAction ever runs.
       Catch only single uppercase letters here, so the normal lowercase path
       still goes through the shell exactly once and nothing double-fires. */
    if (this._off) { this._off(); this._off = null; }
    this._off = input.onPress((key) => {
      if (typeof key !== 'string' || key.length !== 1) return;
      if (key === key.toLowerCase()) return;              // shell already handled it
      const low = key.toLowerCase();
      if (low === 'a') ctx.goto('track-select');
      else if (low === 'b') ctx.goto('title');
    });
    // floor reflections pick up the colours of whoever actually podiumed
    const o = res.order;
    this._tints = [o[1], o[0], o[2]].map((e) => (e ? racerOr(e.id).color : null));
  },

  update(dt) {
    // cosmetic only - never writes to ctx.state (keeps state() deterministic)
    this._t = (this._t || 0) + dt;
  },

  render(ctx) {
    renderArena(ctx.c, { w: ctx.w, h: ctx.h, time: ctx.time, tints: this._tints });
  },

  onAction(action, key, ctx) {
    const acts = Array.isArray(action) ? action : [action];
    if (acts.includes('confirm')) ctx.goto('track-select');
    else if (acts.includes('back')) ctx.goto('title');
  },

  unmount() {
    if (this._off) { this._off(); this._off = null; }
    this._root = null;
  },
};

register(resultsPodium);

/** Small read-only helper for critics/tests: what the podium currently shows. */
if (typeof window !== 'undefined') {
  const read = () => {
    const root = document.querySelector('[data-pkr-results]');
    if (!root) return null;
    return {
      podium: [...root.querySelectorAll('.pkr-rp-col')]
        .sort((a, b) => Number(a.dataset.place) - Number(b.dataset.place))
        .map((n) => ({ place: Number(n.dataset.place), id: n.dataset.racer,
          name: n.querySelector('[data-podium-name]').textContent.trim() })),
      banner: [...root.querySelectorAll('.pkr-rp-row [data-name]')].map((n) => n.textContent.trim()),
      coins: Number(root.querySelector('[data-coins]').textContent),
      rank: root.querySelector('[data-rank]').textContent.trim(),
      you: (() => {
        const n = root.querySelector('[data-you]');
        return n ? { id: n.dataset.you, rank: n.querySelector('[data-you-rank]').textContent.trim() } : null;
      })(),
    };
  };
  if (window.__pkr) window.__pkr.podium = read;
  else window.__pkrPodium = read;
}

export default resultsPodium;
