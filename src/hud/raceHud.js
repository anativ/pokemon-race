/**
 * Race HUD (kind:'hud', screens:['race']) - piece: race-hud-and-countdown.
 *
 * Five clusters, laid out like the reference shots:
 *   top-left      twin circular badges (character portrait + item slot) + coin pill
 *   top-right     oversized gold ordinal position with the /12 field size
 *   bottom-left   Lap n/3 pill
 *   bottom-right  route-shaped minimap card with one dot per racer + wordmark
 *   centre-top    item-use flash (the countdown lives in the overlay layer)
 *
 * Everything reads live from ctx.state.race.hud / .racers every frame.
 */
import { racerOr } from '../data/roster.js';
import { trackOr } from '../data/tracks.js';
import { avatarSvg } from '../core/avatars.js';
import { logoHtml, ordinalSuffix } from '../core/ui.js';
import { itemSvg, itemId, itemName } from './items.js';
import { minimapSvg, updateMinimap } from './minimap.js';

/** Corner map width; the reference map fills a big slice of the bottom-right. */
const MAP_W = 320;

const COIN = `<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
  <circle cx="20" cy="20" r="17" fill="#f0a90f" stroke="#8a5405" stroke-width="3"/>
  <circle cx="20" cy="20" r="12.5" fill="#ffd63b"/>
  <circle cx="20" cy="20" r="6" fill="none" stroke="#c9860a" stroke-width="2.6"/>
  <ellipse cx="14.5" cy="13.5" rx="5" ry="3.4" fill="#fff3b4" opacity=".75" transform="rotate(-32 14.5 13.5)"/>
</svg>`;

/** URL item, used only while the lights are still on (sim rejects aliases). */
function urlItem() {
  try { return new URLSearchParams(location.search).get('item'); } catch { return null; }
}

/**
 * True only for an item *the player used*. The race sim tags every item event
 * with `by` (the racer id); the shell sim's player path omits `by` entirely, so
 * a missing `by` also counts as the player. Without this filter the HUD banner
 * announces whatever a rival just fired.
 */
function isPlayerItem(e, race) {
  if (!e || e.type !== 'item' || e.id === undefined) return false;
  return e.by === undefined || e.by === null || e.by === race.playerId;
}

export default {
  id: 'pkr-race-hud',
  kind: 'hud',
  screens: ['race'],
  priority: 5,
  refs: null,

  mount(ctx) {
    const race = ctx.state.race;
    const track = trackOr(race ? race.trackId : ctx.state.select.trackId);
    const player = racerOr(race ? race.playerId : ctx.state.select.racerId);
    const field = race ? race.racers.length : 12;
    const laps = race ? race.laps : track.laps;

    ctx.layer.innerHTML = `
      <div class="pkr-hud" data-pkr-hud data-theme="${track.theme && track.theme.key ? track.theme.key : 'day'}">
        <div class="hud-tl">
          <div class="hud-badges">
            <span class="hud-badge hud-portrait" style="--c:${player.color};--a:${player.accent}">
              <span class="badge-face">${avatarSvg(player, 80)}</span>
            </span>
            <span class="hud-badge hud-slot" data-item><span class="slot-empty"></span></span>
          </div>
          <div class="hud-coins">${COIN}<b data-coins>0</b></div>
        </div>

        <div class="hud-tr">
          <div class="hud-place"><b class="place-num" data-pos>1</b><i class="place-ord" data-ord>st</i></div>
          <div class="hud-field"><span>/</span><b data-field>${field}</b></div>
          <div class="hud-pos-glow" aria-hidden="true"></div>
        </div>

        <div class="hud-bl">
          <div class="hud-lap">
            <span class="lap-word">Lap</span>
            <span class="lap-count"><b data-lap>1</b><i>/${laps}</i></span>
          </div>
        </div>

        <div class="hud-br">
          <div class="hud-map"><div class="map-inner" data-minimap>${minimapSvg(track, race, MAP_W)}</div></div>
          <div class="hud-mark">${logoHtml(0.5)}</div>
        </div>

        <div class="hud-flash" data-flash hidden>
          <span class="flash-icon" data-flashicon></span>
          <b class="flash-name" data-flashname></b>
        </div>
      </div>`;

    const q = (s) => ctx.layer.querySelector(s);
    this.refs = {
      root: q('[data-pkr-hud]'),
      pos: q('[data-pos]'), ord: q('[data-ord]'), field: q('[data-field]'),
      lap: q('[data-lap]'), coins: q('[data-coins]'), item: q('[data-item]'),
      map: q('[data-minimap]'), flash: q('[data-flash]'),
      flashIcon: q('[data-flashicon]'), flashName: q('[data-flashname]'),
      track, player, urlItem: itemId(urlItem()),
    };
    this.last = { pos: -1, lap: -1, coins: -1, item: 'x', field: -1 };
    this.urlSpent = false;
    this.render(ctx);
  },

  render(ctx) {
    const r = this.refs;
    const race = ctx.state.race;
    if (!r || !race) return;
    const hud = race.hud || {};
    const L = this.last;

    const pos = Math.max(1, Math.round(hud.pos || 1));
    if (pos !== L.pos) {
      L.pos = pos;
      r.pos.textContent = String(pos);
      r.ord.textContent = ordinalSuffix(pos);
      r.root.dataset.hudPos = String(pos);
      r.root.classList.toggle('leading', pos === 1);
    }
    if (race.racers.length !== L.field) {
      L.field = race.racers.length;
      r.field.textContent = String(race.racers.length);
    }
    const lap = Math.max(1, Math.min(race.laps, hud.lap || 1));
    if (lap !== L.lap) { L.lap = lap; r.lap.textContent = String(lap); r.root.dataset.hudLap = String(lap); }
    const coins = Math.max(0, Math.round(hud.coins || 0));
    if (coins !== L.coins) { L.coins = coins; r.coins.textContent = String(coins); r.root.dataset.hudCoins = String(coins); }

    // Item slot: live state. The URL `item=` param is honoured until the sim
    // hands the player a real item (or one is used), so `?item=thunder` shows.
    const live = itemId(hud.item);
    // `?item=` pins the slot for the shot it was asked for; the first time the
    // player actually *uses* an item the slot goes back to live sim state.
    if (race.events && race.events.some((e) => isPlayerItem(e, race))) this.urlSpent = true;
    const showItem = this.urlSpent ? live : (r.urlItem || live);
    if (showItem !== L.item) {
      L.item = showItem;
      r.item.innerHTML = showItem ? itemSvg(showItem, 94) : '<span class="slot-empty"></span>';
      r.item.classList.toggle('filled', !!showItem);
      r.root.dataset.hudItem = showItem || '';
    }

    // Chips carry full creature silhouettes, so they are built once and only
    // re-positioned per frame; a field change falls back to a rebuild.
    if (!updateMinimap(r.map, r.track, race)) r.map.innerHTML = minimapSvg(r.track, race, MAP_W);

    // Only the PLAYER's own item use raises the centre flash. `race/items.js`
    // pushes an `item` event for every racer (`by` = who used it), so taking the
    // last event outright made the banner announce rivals' items over the
    // player's own slot. Walk back to the newest event the player owns.
    let ev = null;
    if (race.events) {
      for (let i = race.events.length - 1; i >= 0; i--) {
        if (isPlayerItem(race.events[i], race)) { ev = race.events[i]; break; }
      }
    }
    const flashing = !!(ev && race.elapsed - ev.t < 1.5);
    if (flashing) {
      if (r.flash.hidden || r.flash.dataset.of !== ev.id) {
        r.flash.dataset.of = ev.id;
        r.flashIcon.innerHTML = itemSvg(ev.id, 58);
        r.flashName.textContent = itemName(ev.id);
      }
      r.flash.hidden = false;
    } else if (!r.flash.hidden) {
      r.flash.hidden = true;
      r.flash.dataset.of = '';
    }
  },

  unmount(ctx) {
    this.refs = null;
    if (ctx && ctx.layer) ctx.layer.innerHTML = '';
  },
};
