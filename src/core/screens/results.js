/** RESULTS - podium, standings banner, coin + rank bar (see ref #4, panel 4). */
import { racerOr } from '../../data/roster.js';
import { trackOr } from '../../data/tracks.js';
import { kartSvg, ballSvg, tokenSvg } from '../avatars.js';
import { logoHtml, statBarsHtml, ordinal, fmtTime, hintHtml } from '../ui.js';

export default {
  id: 'shell-results',
  kind: 'screen',
  screens: ['results'],
  priority: 0,

  mount(ctx) {
    const res = ctx.state.results;
    if (!res) return;
    const track = trackOr(res.trackId);
    const top3 = res.order.slice(0, 3).map((o) => ({ ...o, def: racerOr(o.id) }));
    const player = racerOr(res.playerId);
    const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
    ctx.layer.innerHTML = `
      <div class="scr scr-results">
        <header class="results-head">${logoHtml(0.62)}
          <div class="results-track">${track.name} &middot; ${res.laps} LAPS</div>
        </header>
        <div class="panel results-banner">
          ${top3.map((o, i) => `<div class="banner-row r${i + 1}">
            <span class="banner-place">${ordinal(i + 1)}:</span>
            <span class="banner-name">${o.def.name}</span>
            <span class="banner-time">${fmtTime(o.time)}</span>
          </div>`).join('')}
        </div>
        <div class="podium">
          ${podiumOrder.map((o) => {
    const place = res.order.findIndex((x) => x.id === o.id) + 1;
    return `<div class="podium-col p${place}">
              <div class="podium-kart">${kartSvg(o.def, place === 1 ? 300 : 240)}</div>
              <div class="podium-block b${place}">
                <span class="podium-place">${ordinal(place)}</span>
                <span class="podium-name">${o.def.name}</span>
              </div>
            </div>`;
  }).join('')}
        </div>
        <div class="panel results-stats">
          <div class="results-stats-head">${tokenSvg(player, 30)}<b>${player.name}</b></div>
          ${statBarsHtml(player.stats, { compact: true })}
        </div>
        <div class="panel results-bar">
          <span class="coin-chip">${ballSvg(26)}</span>
          <span>TOTAL COINS: <b>${res.coins}</b></span>
          <span class="sep"></span>
          <span>FINAL RANK: <b>${ordinal(res.rank)}</b></span>
        </div>
        <div class="results-foot">${hintHtml([['A', 'FOR NEXT RACE'], ['B', 'FOR MENU']])}</div>
      </div>`;
  },

  onAction(action, key, ctx) {
    if (action.includes('confirm')) ctx.goto('track-select');
    else if (action.includes('back')) ctx.goto('title');
  },

  render(ctx) {
    const { c, w, h, time } = ctx;
    const g = c.createRadialGradient(w / 2, h * 0.34, h * 0.05, w / 2, h * 0.4, h * 1.1);
    g.addColorStop(0, '#3f7fd8');
    g.addColorStop(0.45, '#1c3f86');
    g.addColorStop(1, '#0a1740');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // light rays
    c.save();
    c.translate(w / 2, h * 0.36);
    c.globalAlpha = 0.12;
    for (let i = 0; i < 16; i++) {
      c.rotate((Math.PI * 2) / 16);
      c.fillStyle = i % 2 ? '#eaf4ff' : '#8fc4ff';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(h * 1.4, -h * 0.06); c.lineTo(h * 1.4, h * 0.06); c.closePath(); c.fill();
    }
    c.restore();
    // confetti (deterministic by index + time)
    for (let i = 0; i < 90; i++) {
      const seedX = (i * 173) % 1000 / 1000;
      const speed = 30 + ((i * 61) % 50);
      const y = ((time * 0.03 * (speed / 40) + i * 37) % (h + 80)) - 40;
      const x = seedX * w + Math.sin((time * 0.001) + i) * 26;
      const cols = ['#ffd63b', '#e8433c', '#3fa9f5', '#5fc45a', '#f2b6cc', '#ffffff'];
      c.fillStyle = cols[i % cols.length];
      c.globalAlpha = 0.9;
      c.save();
      c.translate(x, y);
      c.rotate(i + time * 0.002);
      c.fillRect(-5, -3, 10, 6);
      c.restore();
    }
    c.globalAlpha = 1;
  },
};
