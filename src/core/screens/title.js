/** Title screen: neon city backdrop + wordmark + main menu. */
import { logoHtml } from '../ui.js';
import { renderWorld } from '../world.js';
import { initRace, updateRace } from '../sim.js';
import { trackOr } from '../../data/tracks.js';
import { avatarSvg, ballSvg } from '../avatars.js';
import { roster } from '../../data/roster.js';

const MENU = [
  { id: 'grand-prix', label: 'GRAND PRIX', screen: 'character-select' },
  { id: 'vs-race', label: 'VS RACE', screen: 'character-select' },
  { id: 'time-trial', label: 'TIME TRIAL', screen: 'track-select' },
];

export default {
  id: 'shell-title',
  kind: 'screen',
  screens: ['title'],
  priority: 0,
  cursor: 0,

  mount(ctx) {
    this.cursor = 0;
    // attract-mode traffic: a private demo race, never part of game state
    this.demo = initRace({ trackId: 'ryme-city', playerId: 'gengar', seed: 7, rolling: true });
    // hang the attract camera well behind the pack so the traffic stays small
    const cam = this.demo.racers.find((r) => r.isPlayer);
    if (cam) { cam.dist -= 520; cam.aiSkill = 0.74; }
    this.demo.camera.dist = cam ? cam.dist : 0;
    this.paint(ctx);
  },

  unmount() { this.demo = null; },

  update(dt) {
    if (this.demo) updateRace(this.demo, dt, { manual: false });
  },

  paint(ctx) {
    // One strip of unmistakable silhouettes: bolt tail, grin, wings + flame,
    // bulk, four arms, shell - the roster reads as Pokemon before you press A.
    const heroes = ['pikachu', 'gengar', 'charizard', 'snorlax', 'machamp', 'squirtle']
      .map((id) => roster.find((r) => r.id === id)).filter(Boolean);
    ctx.layer.innerHTML = `
      <div class="scr scr-title">
        <div class="title-glow"></div>
        ${logoHtml(1.7)}
        <div class="title-tag">SUPER CIRCUIT &middot; 12 RACERS &middot; 3 CUPS</div>
        <div class="title-menu">
          ${MENU.map((m, i) => `<button class="title-item${i === this.cursor ? ' on' : ''}" data-goto="${m.screen}" data-i="${i}" type="button">
              <span class="ball">${ballSvg(26)}</span>${m.label}</button>`).join('')}
        </div>
        <div class="title-press">PRESS <b>[A]</b> TO START</div>
        <div class="title-roster">
          ${heroes.map((r) => `<span class="title-hero" style="--c:${r.color}">
              ${avatarSvg(r, 88)}<i>${r.name}</i></span>`).join('')}
        </div>
      </div>`;
    ctx.layer.querySelectorAll('.title-item').forEach((btn) => {
      btn.addEventListener('click', () => ctx.goto(btn.dataset.goto));
      btn.addEventListener('mouseenter', () => {
        this.cursor = Number(btn.dataset.i);
        ctx.layer.querySelectorAll('.title-item').forEach((b, i) => b.classList.toggle('on', i === this.cursor));
      });
    });
  },

  onAction(action, key, ctx) {
    if (action.includes('down')) { this.cursor = (this.cursor + 1) % MENU.length; this.paint(ctx); }
    else if (action.includes('up')) { this.cursor = (this.cursor + MENU.length - 1) % MENU.length; this.paint(ctx); }
    else if (action.includes('confirm')) ctx.goto(MENU[this.cursor].screen);
  },

  render(ctx) {
    renderWorld(ctx.c, {
      track: trackOr('ryme-city'), race: this.demo, w: ctx.w, h: ctx.h, time: ctx.time, hidePlayer: true, minSpriteDist: 300,
    });
    const g = ctx.c.createLinearGradient(0, 0, 0, ctx.h);
    g.addColorStop(0, 'rgba(6,10,32,0.42)');
    g.addColorStop(0.55, 'rgba(8,14,44,0.32)');
    g.addColorStop(1, 'rgba(4,8,26,0.72)');
    ctx.c.fillStyle = g;
    ctx.c.fillRect(0, 0, ctx.w, ctx.h);
  },
};
