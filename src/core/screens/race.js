/**
 * Race HUD + countdown overlay (shell default, kind:'hud').
 * Corners mirror the reference shots: item + coins top-left, position
 * top-right, LAP badge bottom-left, minimap + wordmark bottom-right.
 */
import { racerOr } from '../../data/roster.js';
import { trackOr } from '../../data/tracks.js';
import { getItem } from '../sim.js';
import { avatarSvg, ballSvg, tokenSvg } from '../avatars.js';
import { logoHtml, ordinal, pointOnLoop } from '../ui.js';

const ITEM_GLYPH = {
  'poke-ball': (s) => ballSvg(s),
  'thunderbolt': (s) => `<svg viewBox="0 0 40 40" width="${s}" height="${s}"><path d="M22 3 L9 22 h8 l-3 15 L31 16 h-9 z" fill="#ffd63b" stroke="#7a5a00" stroke-width="2" stroke-linejoin="round"/></svg>`,
  'green-shell': (s) => `<svg viewBox="0 0 40 40" width="${s}" height="${s}"><ellipse cx="20" cy="22" rx="16" ry="13" fill="#5fc45a" stroke="#20521f" stroke-width="2.5"/><ellipse cx="20" cy="20" rx="9" ry="7" fill="#e8f6d8" stroke="#20521f" stroke-width="2"/></svg>`,
  'hyper-beam': (s) => `<svg viewBox="0 0 40 40" width="${s}" height="${s}"><circle cx="20" cy="20" r="11" fill="#fff7d0" stroke="#e2a12c" stroke-width="2.5"/><path d="M20 1 L23 12 L34 6 L28 17 L39 20 L28 23 L34 34 L23 28 L20 39 L17 28 L6 34 L12 23 L1 20 L12 17 L6 6 L17 12 Z" fill="#ffd63b" opacity=".55"/></svg>`,
  'shadow-ball': (s) => `<svg viewBox="0 0 40 40" width="${s}" height="${s}"><circle cx="20" cy="20" r="13" fill="#8e6bd6" stroke="#3d2270" stroke-width="2.5"/><circle cx="20" cy="20" r="6" fill="#d9c8f6" opacity=".8"/></svg>`,
  'boost-berry': (s) => `<svg viewBox="0 0 40 40" width="${s}" height="${s}"><circle cx="20" cy="23" r="12" fill="#ff8a3c" stroke="#8c3a10" stroke-width="2.5"/><path d="M20 11 C16 4 26 2 24 11 Z" fill="#5fc45a" stroke="#20521f" stroke-width="2"/></svg>`,
};

export default {
  id: 'shell-race-hud',
  kind: 'hud',
  screens: ['race'],
  priority: 0,
  refs: null,

  mount(ctx) {
    const race = ctx.state.race;
    const track = trackOr(race ? race.trackId : ctx.state.select.trackId);
    const player = racerOr(race ? race.playerId : ctx.state.select.racerId);
    ctx.layer.innerHTML = `
      <div class="scr scr-race">
        <div class="hud-tl">
          <div class="hud-pods">
            <div class="hud-pod portrait" style="--c:${player.color}">${avatarSvg(player, 62)}</div>
            <div class="hud-pod item" data-item>${ballSvg(58)}</div>
          </div>
          <div class="hud-coins"><span class="coin">C</span><b data-coins>0</b></div>
        </div>
        <div class="hud-tr">
          <span class="pos-num" data-pos>1</span><span class="pos-ord" data-ord>st</span>
          <span class="pos-total">/${race ? race.racers.length : 12}</span>
        </div>
        <div class="hud-bl">
          <span class="lap-label">Lap</span>
          <span class="lap-val"><b data-lap>1</b><i>/${race ? race.laps : track.laps}</i></span>
        </div>
        <div class="hud-br">
          <div class="minimap" data-minimap>${this.minimapSvg(track, race)}</div>
          ${logoHtml(0.58)}
        </div>
        <div class="hud-speed"><b data-kph>0</b><span>KM/H</span></div>
        <div class="countdown" data-countdown hidden>
          <div class="lights">
            ${Array.from({ length: 5 }, (_, i) => `<span class="light" data-light="${i}"><i></i><i></i></span>`).join('')}
          </div>
          <div class="count-text" data-counttext>3&hellip; 2&hellip; 1&hellip; GO!</div>
        </div>
        <div class="item-flash" data-flash hidden><span data-flashicon></span><b data-flashname></b></div>
      </div>`;
    const q = (sel) => ctx.layer.querySelector(sel);
    this.refs = {
      pos: q('[data-pos]'), ord: q('[data-ord]'), lap: q('[data-lap]'),
      coins: q('[data-coins]'), item: q('[data-item]'), kph: q('[data-kph]'),
      minimap: q('[data-minimap]'), countdown: q('[data-countdown]'),
      counttext: q('[data-counttext]'), lights: [...ctx.layer.querySelectorAll('.light')],
      flash: q('[data-flash]'), flashIcon: q('[data-flashicon]'), flashName: q('[data-flashname]'),
      track, player,
    };
    this.lastItem = '__init__';
    this.render(ctx);
  },

  minimapSvg(track, race) {
    const pts = track.minimap.map(([x, y]) => `${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`).join(' ');
    const tokens = race ? race.racers.map((r) => {
      const f = ((r.dist % track.length) + track.length) % track.length / track.length;
      const [x, y] = pointOnLoop(track.minimap, f);
      const rr = racerOr(r.id);
      return `<g transform="translate(${(x * 100 - 4).toFixed(1)},${(y * 100 - 4).toFixed(1)}) scale(0.2)">
        ${r.isPlayer ? `<circle cx="20" cy="20" r="24" fill="#ffd63b" opacity=".55"/>` : ''}
        ${tokenSvg(rr, 40)}</g>`;
    }).join('') : '';
    return `<svg viewBox="-6 -6 112 112" width="210" height="210">
      <polygon points="${pts}" fill="none" stroke="#f4f8ff" stroke-width="9" stroke-linejoin="round"/>
      <polygon points="${pts}" fill="none" stroke="#8d99ad" stroke-width="6" stroke-linejoin="round"/>
      <polygon points="${pts}" fill="none" stroke="#e9eef8" stroke-width="2" stroke-dasharray="3 3"/>
      ${tokens}
    </svg>`;
  },

  render(ctx) {
    const race = ctx.state.race;
    const r = this.refs;
    if (!race || !r) return;
    const hud = race.hud;
    r.pos.textContent = String(hud.pos);
    r.ord.textContent = ordinal(hud.pos).replace(String(hud.pos), '');
    r.lap.textContent = String(hud.lap);
    r.coins.textContent = String(hud.coins);
    r.kph.textContent = String(hud.speedKph);
    if (hud.item !== this.lastItem) {
      this.lastItem = hud.item;
      const glyph = ITEM_GLYPH[hud.item] || (() => ballSvg(58));
      r.item.innerHTML = hud.item ? glyph(58) : `<span class="item-empty"></span>`;
      r.item.classList.toggle('filled', !!hud.item);
    }
    r.minimap.innerHTML = this.minimapSvg(r.track, race);

    // countdown
    const showCount = race.phase === 'countdown';
    r.countdown.hidden = !showCount;
    if (showCount) {
      const left = race.countdown;
      // Lights fill green from the right, like the reference start gantry.
      const lit = Math.max(0, Math.min(5, Math.ceil((2.4 - left) / 2.4 * 5)));
      r.lights.forEach((node, i) => node.classList.toggle('go', i >= r.lights.length - lit));
      // Always show the full "3... 2... 1... GO!" strip; highlight the live step.
      const step = left <= 0.3 ? 4 : Math.min(3, Math.max(1, Math.ceil(left)));  // 3,2,1 -> GO
      const parts = [
        ['3', 'c3', 3], ['2', 'c2', 2], ['1', 'c1', 1], ['GO!', 'go', 4],
      ].map(([label, cls, at]) =>
        `<span class="${at === step ? cls : 'dim'}">${label}</span>`);
      r.counttext.innerHTML = parts.join('&hellip; ');
    }

    // item use flash
    const ev = race.events[race.events.length - 1];
    if (ev && ev.type === 'item' && race.elapsed - ev.t < 1.6) {
      const item = getItem(ev.id);
      r.flash.hidden = false;
      r.flashIcon.innerHTML = (ITEM_GLYPH[ev.id] || (() => ballSvg(52)))(52);
      r.flashName.textContent = item ? item.name : '';
    } else {
      r.flash.hidden = true;
    }
  },
};
