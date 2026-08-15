/**
 * racers-items-and-race-rules / effects layer
 *
 * A cosmetic canvas that sits over the race world and paints what the item
 * game is doing: floating Poke Balls in the near field (the depth band the
 * world renderer deliberately skips), boost flames, in-flight projectiles,
 * the Hyper Beam lance, impact bursts, spin-out stars, coin pops and the
 * Thunderbolt flash.
 *
 * It only READS the race, never writes it, so determinism is untouched. It
 * mirrors the world's camera + projection maths (same modules, same constants)
 * so an effect lands exactly on the kart that caused it.
 */
import { register } from '../../core/registry.js';
import { trackOr, getTrack } from '../../data/tracks.js';
import { buildRoad } from '../geometry.js';
import { createCamera, updateCamera } from '../camera.js';
import { projectRoad, placeAt, CAM_BACK } from '../projection.js';
import { getItem } from '../items.js';
import * as paint from './draw.js';

const STAGE_W = 1600;
const STAGE_H = 900;

const cam = createCamera();
let canvas = null;
let c = null;
let road = null;
let roadId = null;
/** live cosmetic effects: { ev, age, life } */
let live = [];
const seen = new WeakSet();
let clock = 0;

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

/** Deterministic 0..1 noise for cosmetic scatter. */
function rnd(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function trackOf(st) {
  const id = st.race ? st.race.trackId : (st.select && st.select.trackId);
  return getTrack(id) || trackOr(id);
}

const LIFE = {
  pickup: 0.7, burst: 0.5, hit: 0.9, use: 0.5, boost: 0.6, field: 0.9,
  finish: 1.2, go: 0.8,
};

/** Pull new sim events into the cosmetic list. */
function ingest(race) {
  for (const ev of race.fx) {
    if (seen.has(ev)) continue;
    seen.add(ev);
    const life = LIFE[ev.type];
    if (!life) continue;
    live.push({ ev, age: 0, life });
  }
  if (live.length > 40) live = live.slice(live.length - 40);
}

/** Screen placement for a racer, matching what the world renderer does. */
function placeRacer(view3, race, r, w, h) {
  if (r.isPlayer) {
    const raw = placeAt(view3, CAM_BACK, r.lane, 0);
    if (!raw) return null;
    const y = clamp(raw.y, h * 0.80, h * 0.93);
    const s = clamp(w * 0.092 + raw.w * 0.014, 106, 176);
    return { x: raw.x, y, s, fog: raw.fog, dz: CAM_BACK };
  }
  const loop = road ? road.loopLen : race.lapLen;
  let dz = r.dist - cam.dist;
  while (dz < -loop / 2) dz += loop;
  while (dz > loop / 2) dz -= loop;
  if (dz < 66 || dz > view3.maxZ * 0.5) return null;
  const at = placeAt(view3, dz, r.lane, 0);
  if (!at) return null;
  const s = Math.min(132, at.w * 0.155);
  if (s < 5) return null;
  return { x: at.x, y: at.y, s, fog: at.fog, dz };
}

/** Screen placement for a point on the road ahead of the camera. */
function placeWorld(view3, dz, lane) {
  if (dz < 6) return null;
  return placeAt(view3, dz, lane, 0);
}

/** Forward gap from the camera to a lap-relative distance, wrapped. */
function gapTo(lapLen, camDist, dist) {
  let d = dist - camDist;
  while (d < -lapLen / 2) d += lapLen;
  while (d > lapLen / 2) d -= lapLen;
  return d;
}

// ---------------------------------------------------------------- painting

function drawPickups(view3, race, w, h, t) {
  // The world renderer floats its Poke Balls from 138 units out; everything
  // nearer than that is ours, which is what puts a big glossy ball right in
  // front of the kart the way the reference shot does.
  const list = [];
  for (const p of race.pickups) {
    if (p.cool > 0) continue;
    for (let k = 0; k <= 1; k++) {
      const d = gapTo(race.lapLen, cam.dist, p.dist + k * race.lapLen);
      if (d < 34 || d >= 140) continue;
      const at = placeWorld(view3, d, p.lane);
      if (!at) continue;
      list.push({ at, d, lane: p.lane });
    }
  }
  list.sort((a, b) => b.d - a.d);
  for (const it of list) {
    const r = Math.min(72, it.at.w * 0.082);
    if (r < 2) continue;
    const bob = Math.sin(t * 2.4 + it.lane * 3 + it.d * 0.01) * r * 0.3;
    const y = it.at.y - r * 1.9 + bob;
    paint.withAlpha(c, 1 - Math.min(0.9, it.at.fog), (cc) => {
      cc.save();
      cc.globalAlpha *= 0.35;
      cc.fillStyle = '#101820';
      cc.beginPath();
      cc.ellipse(it.at.x, it.at.y, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
      cc.fill();
      cc.restore();
      paint.pokeball(cc, it.at.x, y, r, t * 2 + it.lane);
    });
  }
}

function drawKartFx(view3, race, w, h, t) {
  const list = [];
  for (const r of race.racers) {
    const at = placeRacer(view3, race, r, w, h);
    if (!at) continue;
    list.push({ r, at });
  }
  list.sort((a, b) => b.at.dz - a.at.dz);
  for (const { r, at } of list) {
    const a = 1 - Math.min(0.9, at.fog);
    if (a < 0.05) continue;
    if (r.boost > 0.08) {
      // twin exhaust flames off the back corners, not one blob under the kart
      paint.withAlpha(c, a * Math.min(1, r.boost * 1.2), (cc) => {
        const off = at.s * 0.34;
        const y = at.y + at.s * 0.16;
        paint.boostTrail(cc, at.x - off, y, at.s * 0.44, t + r.phase * 3, r.accent || '#ff8a3c');
        paint.boostTrail(cc, at.x + off, y, at.s * 0.44, t + r.phase * 3 + 0.4, r.accent || '#ff8a3c');
      });
    }
    if (r.spun > 0.05) {
      paint.withAlpha(c, a, (cc) => {
        paint.spinStars(cc, at.x, at.y - at.s * 0.22, at.s * 0.95, t + r.phase * 2);
      });
    }
    if (r.hitFlash > 0.05) {
      paint.withAlpha(c, a * r.hitFlash * 0.8, (cc) => {
        const g = cc.createRadialGradient(at.x, at.y, 0, at.x, at.y, at.s * 1.2);
        g.addColorStop(0, 'rgba(255,255,255,.9)');
        g.addColorStop(1, 'rgba(255,120,60,0)');
        cc.fillStyle = g;
        cc.beginPath(); cc.arc(at.x, at.y, at.s * 1.2, 0, Math.PI * 2); cc.fill();
      });
    }
    if (r.pickupGlow > 0.05) {
      paint.withAlpha(c, a * r.pickupGlow, (cc) => {
        paint.pickupPop(cc, at.x, at.y - at.s * 0.5, at.s * 0.4, 1 - r.pickupGlow, 1);
      });
    }
  }
}

function drawOrdnance(view3, race, w, h, t) {
  for (const p of race.projectiles) {
    const d = gapTo(race.lapLen, cam.dist, p.dist);
    if (d < 10 || d > view3.maxZ * 0.5) continue;
    const at = placeWorld(view3, d, p.lane);
    if (!at) continue;
    const r = Math.max(3, Math.min(46, at.w * 0.055));
    paint.withAlpha(c, 1 - Math.min(0.85, at.fog), (cc) => {
      paint.projectile(cc, at.x, at.y - r * 1.3, r, p.color || '#e8433c', p.life * 6);
    });
  }

  for (const b of race.beams) {
    const owner = race.racers.find((r) => r.id === b.owner);
    if (!owner) continue;
    const from = placeRacer(view3, race, owner, w, h);
    if (!from) continue;
    // The lance follows the tarmac: sampled along the road from just past the
    // kart's nose, so on a bend it curves with the circuit instead of shooting
    // off into the scenery.
    const base = owner.isPlayer ? CAM_BACK : gapTo(race.lapLen, cam.dist, owner.dist);
    const pts = [];
    const span = Math.min(b.reach, 520);
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      const at = placeWorld(view3, base + 74 + f * span, b.lane);
      if (!at) break;
      pts.push({
        x: at.x,
        y: at.y - at.w * 0.13,
        w: Math.max(2, at.w * 0.085 * (1 - f * 0.4)),
      });
    }
    if (pts.length < 2) continue;
    paint.beamPath(c, pts, clamp(b.life / b.ttl, 0, 1), b.color || '#ffe98a');
  }
}

function drawEvents(view3, race, w, h) {
  for (const item of live) {
    const { ev } = item;
    const t01 = clamp(item.age / item.life, 0, 1);
    if (ev.type === 'burst' || ev.type === 'hit') {
      const target = ev.type === 'hit' ? race.racers.find((r) => r.id === ev.id) : null;
      let at = null;
      let size = 40;
      if (target) {
        const p = placeRacer(view3, race, target, w, h);
        if (p) { at = p; size = p.s * 0.7; }
      } else {
        const d = gapTo(race.lapLen, cam.dist, ev.dist || 0);
        const p = d > 8 ? placeWorld(view3, d, ev.lane || 0) : null;
        if (p) { at = { x: p.x, y: p.y - p.w * 0.08 }; size = Math.min(70, p.w * 0.08); }
      }
      if (!at) continue;
      const def = getItem(ev.item);
      paint.burst(c, at.x, at.y, size, def ? def.color : '#ffd63b', t01);
    }
  }
}

function drawFieldFlash(race, w, h) {
  const ev = live.find((l) => l.ev.type === 'field');
  if (!ev) return;
  paint.thunder(c, w, h, clamp(ev.age / ev.life, 0, 1), rnd);
}

// ---------------------------------------------------------------- provider

/**
 * Other overlay providers share this DOM layer and some of them rebuild it with
 * innerHTML, which would silently drop our canvas - so every frame checks that
 * it is still attached and re-adopts it if not.
 */
function ensureCanvas(layer) {
  if (canvas && canvas.parentNode === layer && canvas.isConnected) return;
  if (canvas && canvas.isConnected === false && canvas.getContext) {
    layer.appendChild(canvas);              // re-adopt, keep the backing store
    c = canvas.getContext('2d');
    return;
  }
  canvas = document.createElement('canvas');
  canvas.className = 'pkr-fx';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  layer.appendChild(canvas);
  c = canvas.getContext('2d');
}

function sizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const wantW = Math.round(STAGE_W * dpr);
  const wantH = Math.round(STAGE_H * dpr);
  if (canvas.width !== wantW || canvas.height !== wantH) {
    canvas.width = wantW;
    canvas.height = wantH;
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
}

register({
  id: 'race-effects',
  kind: 'overlay',
  screens: ['race'],
  priority: 5,

  mount(ctx) {
    ensureCanvas(ctx.layer);
    sizeCanvas();
    live = [];
    clock = 0;
    cam._init = false;
    roadId = null;
    if (ctx.state.race) updateCamera(cam, ctx.state.race, 1 / 120);
  },

  update(dt, ctx) {
    const race = ctx.state.race;
    clock += dt;
    if (!race) return;
    updateCamera(cam, race, dt);
    ingest(race);
    for (const l of live) l.age += dt;
    live = live.filter((l) => l.age < l.life);
  },

  render(ctx) {
    const race = ctx.state.race;
    ensureCanvas(ctx.layer);
    if (!canvas || !c) return;
    sizeCanvas();
    c.clearRect(0, 0, STAGE_W, STAGE_H);
    if (!race) return;

    const track = trackOf(ctx.state);
    if (track.id !== roadId) { road = buildRoad(track); roadId = track.id; }
    const w = STAGE_W;
    const h = STAGE_H;
    const view3 = projectRoad(road, cam, { w, h });
    const t = clock;

    // Mirror the world's corner roll so effects stay welded to the scene.
    const roll = clamp(cam.roll || 0, -0.034, 0.034);
    c.save();
    if (roll !== 0) {
      c.translate(w / 2, h / 2);
      c.rotate(roll);
      c.scale(1.06, 1.06);
      c.translate(-w / 2, -h / 2);
    }
    drawPickups(view3, race, w, h, t);
    drawKartFx(view3, race, w, h, t);
    drawOrdnance(view3, race, w, h, t);
    drawEvents(view3, race, w, h);
    c.restore();

    drawFieldFlash(race, w, h);
  },

  unmount() {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
    c = null;
    live = [];
  },
});

export { cam };
