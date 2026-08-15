/**
 * Pokemon Racing Game - shell entry point.
 *
 * Owns: boot, screen flow (title -> character-select -> track-select -> race
 * -> results), the fixed-step clock, and the scriptable debug surface
 * window.__pkr documented in CONTRACTS.md.
 *
 * Every visual layer is replaceable through src/core/registry.js, so other
 * build pieces never need to touch this file.
 */
import { state, SCREENS, subscribe, emitChange, snapshot } from './core/state.js';
import { makeRng } from './core/rng.js';
import { createLoop } from './core/loop.js';
import input from './core/input.js';
import { register, provider, providers, onRegistryChange, listRegistered } from './core/registry.js';
import { initRace, updateRace, useItem, buildResults, ITEMS, getItem } from './core/sim.js';
import { renderWorld } from './core/world.js';
import { roster, racerOr, DEFAULT_RACER_ID } from './data/roster.js';
import { tracks, trackOr, DEFAULT_TRACK_ID } from './data/tracks.js';
import { PLUGIN_MODULES } from './core/plugins.js';
import * as art from './core/avatars.js';

import titleScreen from './core/screens/title.js';
import characterSelect from './core/screens/character-select.js';
import trackSelect from './core/screens/track-select.js';
import raceHud from './core/screens/race.js';
import resultsScreen from './core/screens/results.js';

const VERSION = '1.0.0';

// ---------------------------------------------------------------- DOM handles
const root = document.getElementById('pkr-root');
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('pkr-canvas'));
const layers = {
  screen: document.getElementById('pkr-layer-screen'),
  hud: document.getElementById('pkr-layer-hud'),
  overlay: document.getElementById('pkr-layer-overlay'),
};
const c2d = canvas.getContext('2d', { alpha: false });

let rng = makeRng(state.seed);
let dpr = 1;
let viewW = 1600;
let viewH = 900;
let mounted = { screen: null, hud: null, world: null, overlays: [] };
let entryOpts = {};
let cosmeticTime = 0;

// ---------------------------------------------------------------- built-ins
register({ ...titleScreen, priority: 0 });
register({ ...characterSelect, priority: 0 });
register({ ...trackSelect, priority: 0 });
register({ ...resultsScreen, priority: 0 });
register({ ...raceHud, priority: 0 });
register({
  id: 'shell-world', kind: 'world', screens: ['race'], priority: 0,
  render(ctx) {
    renderWorld(ctx.c, {
      track: trackOr(ctx.state.race ? ctx.state.race.trackId : ctx.state.select.trackId),
      race: ctx.state.race, w: ctx.w, h: ctx.h, time: ctx.time,
    });
  },
});
register({
  id: 'shell-sim', kind: 'sim', screens: ['race'], priority: 0,
  init: (opts) => initRace(opts),
  update: (race, dt, controls) => updateRace(race, dt, controls),
  useItem: (race) => useItem(race),
  results: (race) => buildResults(race),
});

// ---------------------------------------------------------------- resize
function resize() {
  const rect = root.getBoundingClientRect();
  viewW = Math.max(320, Math.round(rect.width));
  viewH = Math.max(240, Math.round(rect.height));
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  canvas.style.width = `${viewW}px`;
  canvas.style.height = `${viewH}px`;
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  root.style.setProperty('--vw', `${viewW}px`);
  root.style.setProperty('--vh', `${viewH}px`);
  root.style.setProperty('--ui', `${Math.min(viewW / 1600, viewH / 900)}`);
  drawFrame(1);
}

// ---------------------------------------------------------------- context
function makeCtx(layer) {
  return {
    state,
    layer,
    canvas,
    c: c2d,
    w: viewW,
    h: viewH,
    dpr,
    time: cosmeticTime,
    rng,
    input,
    roster,
    tracks,
    items: ITEMS,
    goto,
    register,
    version: VERSION,
  };
}

function simProvider() { return provider('sim', 'race'); }

// ---------------------------------------------------------------- screen flow
function unmountAll() {
  for (const p of [mounted.screen, mounted.hud, mounted.world, ...mounted.overlays]) {
    if (p && typeof p.unmount === 'function') {
      try { p.unmount(makeCtx(layers.screen)); } catch (err) { console.warn('[pkr] unmount failed', err); }
    }
  }
  mounted = { screen: null, hud: null, world: null, overlays: [] };
  layers.screen.innerHTML = '';
  layers.hud.innerHTML = '';
  layers.overlay.innerHTML = '';
}

function mountScreen(screen) {
  unmountAll();
  root.dataset.screen = screen;
  const scr = provider('screen', screen);
  const hud = screen === 'race' ? provider('hud', screen) : null;
  const world = screen === 'race' ? provider('world', screen) : null;
  const overlays = providers('overlay', screen);
  mounted = { screen: scr, hud, world, overlays };
  if (scr && scr.mount) scr.mount(makeCtx(layers.screen));
  if (hud && hud.mount) hud.mount(makeCtx(layers.hud));
  if (world && world.mount) world.mount(makeCtx(layers.hud));
  for (const o of overlays) if (o.mount) o.mount(makeCtx(layers.overlay));
}

/**
 * Move to a screen. `opts` accepts the same knobs as the URL params:
 * {track, racer, lap, pos, coins, item, seed, laps}
 */
export function goto(screen, opts = {}) {
  if (!SCREENS.includes(screen)) throw new Error(`[pkr] unknown screen "${screen}" (${SCREENS.join(', ')})`);
  entryOpts = { ...opts };
  if (opts.seed != null) { state.seed = Number(opts.seed) >>> 0; rng = makeRng(state.seed); }
  if (opts.track) state.select.trackId = trackOr(opts.track).id;
  if (opts.racer) state.select.racerId = racerOr(opts.racer).id;

  state.screen = screen;
  state.t = 0;
  state.frame = 0;

  if (screen === 'race') {
    state.race = buildRace(opts);
    state.results = null;
  } else if (screen === 'results') {
    state.results = buildStandings(opts);
  }

  mountScreen(screen);
  emitChange('screen');
  drawFrame(1);
  return state.screen;
}

function raceOptsFrom(opts) {
  return {
    trackId: opts.track || state.select.trackId || DEFAULT_TRACK_ID,
    playerId: opts.racer || state.select.racerId || DEFAULT_RACER_ID,
    seed: state.seed,
    laps: opts.laps != null ? Number(opts.laps) : undefined,
    lap: opts.lap != null ? Number(opts.lap) : undefined,
    pos: opts.pos != null ? Number(opts.pos) : undefined,
    coins: opts.coins != null ? Number(opts.coins) : undefined,
    item: opts.item || undefined,
    rolling: opts.rolling || false,
  };
}

function buildRace(opts) {
  const sim = simProvider();
  const raceOpts = raceOptsFrom(opts);
  return sim && sim.init ? sim.init(raceOpts) : initRace(raceOpts);
}

/** Results for the results screen: from the finished race, or simulated. */
function buildStandings(opts) {
  const sim = simProvider();
  let race = state.race;
  if (!race || race.trackId !== (opts.track || state.select.trackId)) {
    race = buildRace({ ...opts, lap: undefined, pos: undefined });
    // fast-forward a deterministic chunk so the standings look raced
    const dt = 1 / 120;
    for (let i = 0; i < 120 * 12; i++) {
      (sim && sim.update ? sim.update : updateRace)(race, dt, { manual: false });
    }
    state.race = race;
  }
  const res = (sim && sim.results ? sim.results : buildResults)(race);
  if (opts.coins != null) res.coins = Number(opts.coins);
  if (opts.pos != null) {
    // force the player onto the requested step of the podium
    const want = Math.max(1, Math.min(res.order.length, Number(opts.pos)));
    const from = res.order.findIndex((o) => o.isPlayer);
    if (from >= 0 && from !== want - 1) {
      const [me] = res.order.splice(from, 1);
      res.order.splice(want - 1, 0, me);
      const times = res.order.map((o, i) => (i === 0 ? o.time : null));
      let t = res.order[0].time;
      res.order.forEach((o, i) => { if (i > 0) { t += 1.85; o.time = t; } else o.time = times[0]; });
    }
    res.rank = want;
  }
  return res;
}

// ---------------------------------------------------------------- update/render
function controlsForRace() {
  return {
    manual: input.touched,
    accel: input.action('accel'),
    brake: input.action('brake'),
    left: input.action('left'),
    right: input.action('right'),
    drift: input.action('drift'),
  };
}

function update(dt) {
  state.t += dt * 1000;
  state.frame++;
  if (state.screen === 'race' && state.race) {
    const sim = simProvider();
    (sim && sim.update ? sim.update : updateRace)(state.race, dt, controlsForRace());
    if (state.race.phase === 'finished' && state.race.endTimer > 2.2) {
      goto('results', { ...entryOpts, pos: undefined });
      return;
    }
  }
  for (const p of [mounted.screen, mounted.hud, mounted.world, ...mounted.overlays]) {
    if (p && p.update) p.update(dt, makeCtx(layers.screen));
  }
}

function drawFrame() {
  cosmeticTime = performance.now();
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  c2d.clearRect(0, 0, viewW, viewH);
  const ctxWorld = makeCtx(layers.hud);
  if (mounted.world && mounted.world.render) mounted.world.render(ctxWorld);
  if (mounted.screen && mounted.screen.render) mounted.screen.render(makeCtx(layers.screen));
  if (mounted.hud && mounted.hud.render) mounted.hud.render(makeCtx(layers.hud));
  for (const o of mounted.overlays) if (o.render) o.render(makeCtx(layers.overlay));
}

const loop = createLoop({ update, render: drawFrame });

// ---------------------------------------------------------------- input
input.attach(window);
input.onPress((key, actions) => {
  if (!actions.length) return;
  if (state.screen === 'race') {
    if (actions.includes('item') && state.race) {
      const sim = simProvider();
      (sim && sim.useItem ? sim.useItem : useItem)(state.race);
    }
    if (key === 'Escape') goto('title');
    return;
  }
  const scr = mounted.screen;
  if (scr && scr.onAction) scr.onAction(actions, key, makeCtx(layers.screen));
});

let booted = false;
onRegistryChange(() => {
  // a late-loading piece just claimed a layer - remount the current screen
  if (booted && state.screen) { mountScreen(state.screen); drawFrame(); }
});

// ---------------------------------------------------------------- URL params
function readParams() {
  const p = new URLSearchParams(location.search);
  const num = (k) => (p.has(k) ? Number(p.get(k)) : undefined);
  return {
    screen: p.get('screen') || 'title',
    track: p.get('track') || undefined,
    racer: p.get('racer') || undefined,
    lap: num('lap'),
    pos: num('pos'),
    coins: num('coins'),
    item: p.get('item') || undefined,
    t: num('t'),
    seed: num('seed'),
    laps: num('laps'),
    plugins: p.get('plugins') || '',
    paused: p.get('paused') === '1',
    rolling: p.get('rolling') === '1',
  };
}

async function loadPlugins(extra) {
  const list = [...PLUGIN_MODULES, ...extra.split(',').map((s) => s.trim()).filter(Boolean)];
  for (const path of list) {
    const url = new URL(path.startsWith('.') || path.startsWith('/') ? path : `./${path}`,
      new URL('./', import.meta.url));
    try {
      await import(/* @vite-ignore */ url.href);
    } catch (err) {
      console.warn(`[pkr] plugin "${path}" failed to load:`, err && err.message);
    }
  }
}

// ---------------------------------------------------------------- debug surface
let resolveReady;
const readyPromise = new Promise((res) => { resolveReady = res; });

const api = {
  version: VERSION,
  isReady: false,
  ready: readyPromise,
  screens: SCREENS,
  roster,
  tracks,
  items: ITEMS,
  register,
  registered: listRegistered,
  subscribe,
  input,

  /** Jump to a screen (pauses the realtime clock for reproducible captures). */
  goto(screen, opts = {}) {
    loop.pause();
    return goto(screen, opts);
  },

  /** Full deterministic JSON snapshot. */
  state() { return snapshot(); },

  /** Reseed and rebuild the current screen deterministically. */
  seed(n) {
    loop.pause();
    state.seed = Number(n) >>> 0;
    rng = makeRng(state.seed);
    input.clear();
    input.touched = false;
    return goto(state.screen, { ...entryOpts, seed: state.seed });
  },

  /** Advance the sim by ms in fixed steps, then render. Pauses realtime. */
  step(ms = 16) {
    loop.pause();
    const advanced = loop.step(ms);
    drawFrame();
    return advanced;
  },

  /** Hold a key for ms of SIMULATED time (works while paused via step()). */
  press(key, ms = 120) {
    const done = input.press(key, ms);
    if (loop.paused) { loop.step(ms); }
    return done;
  },

  /**
   * Canonical per-species creature art (see src/core/avatars.js).
   * Every racer id has a bespoke silhouette - distinct head/body shapes plus
   * signature features (Charizard's wings + tail flame, Snorlax's bulk,
   * Gengar's grin, Pikachu's bolt tail). Any piece that needs a Pokemon
   * likeness - select grid, karts, minimap tokens, podium - should draw from
   * here rather than recolouring a shared blob template.
   */
  art,

  pause() { loop.pause(); },
  resume() { loop.resume(); },
  useItem() { return state.race ? useItem(state.race) : null; },
  item: getItem,
  /** Convenience for critics: current screen name. */
  screen() { return state.screen; },
};

window.__pkr = api;

// ---------------------------------------------------------------- boot
async function boot() {
  const params = readParams();
  if (params.seed != null && !Number.isNaN(params.seed)) { state.seed = params.seed >>> 0; rng = makeRng(state.seed); }
  if (params.track) state.select.trackId = trackOr(params.track).id;
  if (params.racer) state.select.racerId = racerOr(params.racer).id;

  window.addEventListener('resize', resize);
  resize();

  await loadPlugins(params.plugins);

  const screen = SCREENS.includes(params.screen) ? params.screen : 'title';
  goto(screen, params);
  booted = true;

  loop.start();
  if (params.t) loop.step(Math.max(0, Math.min(params.t, 600000)));
  if (params.paused) loop.pause();
  drawFrame();

  api.isReady = true;
  document.documentElement.dataset.pkrReady = '1';
  resolveReady(api);
}

boot().catch((err) => {
  console.error('[pkr] boot failed', err);
  document.documentElement.dataset.pkrError = String(err && err.message || err);
});
