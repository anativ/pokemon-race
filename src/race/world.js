/**
 * race-world / entry point
 *
 * Registers a `world` provider (priority 1) that replaces the shell's fallback
 * road with a full chase-cam scene: themed skybox, banked circuit with kerbs
 * and guard rails, roadside scenery, arch gates, item pickups, rival karts and
 * the player's kart.
 *
 * Read-only with respect to the simulation, so determinism is untouched.
 */
import { register } from '../core/registry.js';
import { trackOr, getTrack } from '../data/tracks.js';
import { roster } from '../data/roster.js';
import { buildRoad } from './geometry.js';
import { createCamera, updateCamera } from './camera.js';
import { projectRoad, placeAt, CAM_BACK } from './projection.js';
import { renderSky } from './sky.js';
import { renderRoad, renderRails } from './road.js';
import {
  collectScenery, drawScenery, drawArches, drawItemBoxes, drawGroundDetail,
} from './scenery.js';
import { drawKart, drawDrift, drawExhaust } from './kart.js';
import { sceneFor } from './tracks/index.js';
import {
  paintSurfaceTexture, paintSeams, horizonHaze, depthGrade, groundShadow, reflection, lightOf,
} from './shading.js';
import { rgba, clamp } from './paint.js';
import { noise1 } from './geometry.js';

const cam = createCamera();
let lastTrackId = null;

/**
 * Track ids seen in the wild that the shell cannot resolve ("mount-coronet"
 * instead of "mt-coronet"). Only consulted when the shell fell back to the
 * default track for an id it did not recognise, so menu navigation is
 * untouched.
 */
const TRACK_ALIAS = {
  'mount-coronet': 'mt-coronet',
  'coronet': 'mt-coronet',
  'mt coronet': 'mt-coronet',
  'ryme': 'ryme-city',
  'pallet': 'pallet-town',
};

function resolveTrack(st) {
  const id = st.race ? st.race.trackId : (st.select && st.select.trackId);
  if (getTrack(id)) {
    try {
      const want = (new URLSearchParams(location.search).get('track') || '').toLowerCase();
      if (want && !getTrack(want) && TRACK_ALIAS[want] && id === 'pallet-town') {
        return getTrack(TRACK_ALIAS[want]);
      }
    } catch { /* no location (tests) - keep the resolved track */ }
    return getTrack(id);
  }
  return getTrack(TRACK_ALIAS[String(id || '').toLowerCase()]) || trackOr(id);
}

function racerDef(id) {
  return roster.find((r) => r.id === id) || roster[0];
}

/** Interpolated plan-view heading, used to pan the sky. */
function headingAt(road, dist) {
  const f = dist / road.segLen;
  const i = Math.floor(f);
  const t = f - i;
  const a = road.segs[((i % road.count) + road.count) % road.count];
  const b = road.segs[(((i + 1) % road.count) + road.count) % road.count];
  let d = b.heading - a.heading;
  if (Math.abs(d) > Math.PI) d = 0;
  return a.heading + d * t;
}

function snowfall(c, w, h, time, count) {
  c.save();
  for (let i = 0; i < count; i++) {
    const sp = 0.02 + noise1(i, 401) * 0.05;
    const x = (noise1(i, 17) * w + Math.sin(time * 0.0006 + i) * 26) % w;
    const y = (noise1(i, 53) * h + time * sp) % h;
    const r = 0.8 + noise1(i, 91) * 2.1;
    c.globalAlpha = 0.25 + noise1(i, 111) * 0.55;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function speedLines(c, w, h, amount, time) {
  if (amount <= 0.02) return;
  c.save();
  c.globalAlpha = Math.min(0.4, amount * 0.5);
  c.strokeStyle = '#ffffff';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + time * 0.0004;
    const cx = w / 2; const cy = h * 0.56;
    const r0 = Math.min(w, h) * (0.42 + noise1(i, 7) * 0.2);
    const r1 = r0 + Math.min(w, h) * (0.12 + amount * 0.3);
    c.lineWidth = 1.4 + noise1(i, 13) * 2.4;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * r0 * 1.6, cy + Math.sin(a) * r0);
    c.lineTo(cx + Math.cos(a) * r1 * 1.6, cy + Math.sin(a) * r1);
    c.stroke();
  }
  c.restore();
}

function vignette(c, w, h, scene) {
  const g = c.createRadialGradient(w / 2, h * 0.52, Math.min(w, h) * 0.32,
    w / 2, h * 0.52, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, scene.key === 'neon' ? 'rgba(2,4,18,0.55)' : 'rgba(10,20,40,0.30)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

export function renderRaceWorld(c, ctx) {
  const st = ctx.state;
  const race = st.race;
  const track = resolveTrack(st);
  const scene = sceneFor(track);
  const road = buildRoad(track);
  const w = ctx.w;
  const h = ctx.h;
  const time = ctx.time || 0;

  if (track.id !== lastTrackId) {
    lastTrackId = track.id;
    cam._init = false;
  }
  if (race && !cam._init) updateCamera(cam, race, 0.0166);
  if (!race) { cam.dist = 0; cam.lane = 0; cam.height = 78; cam.pitch = 0.01; cam.speedT = 0; }

  const view3 = projectRoad(road, cam, { w, h });
  view3.loopSegs = road.count;

  // Backdrop parallax. Two terms: the plan-view heading (where the circuit has
  // pointed us over the lap) and the live mid-field bend of the projected road,
  // so when the tarmac swings right the ridges and clouds slide left with it
  // instead of staying nailed behind a visibly turning road.
  const pan = headingAt(road, cam.dist) * 520 - (view3.bend || 0) * 1.35;
  // rolling ground: cresting a brow lifts the far ridges, dropping into a dip
  // sinks them, which is what sells the elevation change from the chase cam
  const lift = clamp((view3.rise || 0) * 0.42, -70, 70);

  // Corner roll: the whole view banks a few degrees into a turn, the way the
  // Mario Kart chase cam does. Over-scaled slightly so the rotated frame never
  // exposes the empty canvas corners.
  const roll = clamp(cam.roll || 0, -0.034, 0.034);
  c.save();
  if (roll !== 0) {
    c.translate(w / 2, h / 2);
    c.rotate(roll);
    c.scale(1.06, 1.06);
    c.translate(-w / 2, -h / 2);
  }

  const light = lightOf(scene);

  renderSky(c, scene, { w, h, horizon: view3.horizon, pan, lift });
  renderRoad(c, view3, scene, { w, h, finishSeg: 0, time });
  // grounding + surfacing pass: real grain on the asphalt and verges, tar
  // seams across the lanes, then the atmospheric band that sits on the horizon
  paintSurfaceTexture(c, view3, scene);
  paintSeams(c, view3, scene);
  depthGrade(c, view3, scene);
  horizonHaze(c, view3, scene);
  // ground scatter goes down before the rails so blades poke up behind the
  // barrier rather than in front of it
  drawGroundDetail(c, view3, scene);
  renderRails(c, view3, scene);
  drawScenery(c, collectScenery(view3, scene), scene, light);
  drawArches(c, view3, scene, track, road);
  drawItemBoxes(c, view3, scene, track, road, time);

  // ---- hero placement --------------------------------------------------
  // Worked out *before* the rivals so they can be shouldered clear of it: the
  // hero is the one kart that must never be intersected by another body.
  const player = race ? (race.racers.find((r) => r.isPlayer) || race.racers[0]) : null;
  let hero = null;
  if (player) {
    const raw = placeAt(view3, CAM_BACK, player.lane, 0)
      || { x: w / 2, y: h * 0.86, w: w * 0.42, fog: 0 };
    // The hero rides the road surface, so a crest or a dip under the camera
    // would swing it off the bottom of the frame. Let it bob, but keep the
    // whole kart on screen the way a real chase rig would.
    const at = { ...raw, y: clamp(raw.y, h * 0.80, h * 0.93) };
    // constant screen scale: the chase camera keeps a fixed distance, so the
    // hero kart must not breathe with the road width. Deliberately modest so
    // the road ahead - the thing the player actually reads - stays open.
    const s = clamp(w * 0.092 + at.w * 0.014, 106, 176);
    hero = { at, s, def: racerDef(player.id), player };
  }

  // ---- rivals ----------------------------------------------------------
  if (race) {
    const loop = road.loopLen;
    const list = [];
    for (const r of race.racers) {
      if (r.isPlayer) continue;
      let dz = r.dist - cam.dist;
      while (dz < -loop / 2) dz += loop;
      while (dz > loop / 2) dz -= loop;
      // Rivals live strictly ahead of the hero kart (which sits CAM_BACK from
      // the camera). Anything nearer would out-scale the player and pile into
      // the bottom of the frame, so it is culled and faded rather than drawn.
      if (dz < 66 || dz > view3.maxZ * 0.5) continue;
      const at = placeAt(view3, dz, r.lane, 0);
      if (!at) continue;
      list.push({ at, r, dz });
    }
    list.sort((a, b) => b.dz - a.dz);
    for (const it of list) {
      const s = Math.min(132, it.at.w * 0.155);
      if (s < 4) continue;
      // Near fade-in. A kart body is a faceted MESH, so any mid alpha turns it
      // into an X-ray wireframe (you read the inside faces and the rider's
      // paws through the shell). Keep the band short and drop anything that
      // would still be see-through: a rival this close to the camera sits
      // under the hero at the bottom edge, so culling it costs nothing.
      const nearIn = clamp((it.dz - 66) / 12, 0, 1);
      if (nearIn < 0.5) continue;
      const a = (1 - Math.min(0.9, it.at.fog)) * nearIn;
      if (a < 0.03) continue;
      // Keep every rival body out of the hero's silhouette. A kart that only
      // grazes it gets shouldered sideways; one that would be mostly swallowed
      // is dropped, because the hero paints over it anyway and the leftover
      // sliver reads as two karts fused together.
      if (hero) {
        const dxh = it.at.x - hero.at.x;
        const need = (s + hero.s) * 1.16;
        const over = need - Math.abs(dxh);
        if (over > 0 && Math.abs(it.at.y - hero.at.y) < hero.s * 1.7) {
          if (over > s * 1.7) continue;
          const dir = dxh === 0 ? (it.r.lane >= 0 ? 1 : -1) : Math.sign(dxh);
          it.at = { ...it.at, x: it.at.x + dir * over };
        }
      }
      c.save();
      c.globalAlpha = a;
      const def = racerDef(it.r.id);
      if (scene.wetFloor && s > 22) {
        reflection(c, it.at.x, it.at.y + s * 0.26, scene.wetFloor * 0.8, 0.6, (cc) => {
          drawKart(cc, it.at.x, it.at.y, s, def, { yaw: 0.16, time, light });
        });
      }
      groundShadow(c, it.at.x, it.at.y + s * 0.30, s * 1.25, { light, alpha: 1.3, squash: 0.28 });
      if (it.r.drift > 0.05) {
        drawDrift(c, it.at.x, it.at.y, s, it.r.drift * 0.7, it.r.boost, time, def.accent);
      }
      drawKart(c, it.at.x, it.at.y, s, def, {
        steer: clamp(it.r.lane * 0.5, -0.7, 0.7),
        drift: it.r.drift || 0,
        yaw: 0.10 + ((it.at.x - w / 2) / w) * 0.55,
        spin: time * 0.014 + it.dz,
        time: time + it.dz * 40,
        bounce: Math.sin(time * 0.008 + it.dz) * s * 0.012,
        light,
        ambient: Math.min(0.45, it.at.fog * 0.5),
      });
      c.restore();
    }
  }

  // ---- player ----------------------------------------------------------
  if (hero) {
    const { at, s, def } = hero;
    // Steering read-out: the smoothed lane error the chase camera already
    // tracks. It swings the nose, banks the body and turns the front wheels,
    // so a left-hand corner never renders the same frame as a straight.
    const steer = clamp((cam.yaw * 1.9 + (player.lane - cam.lane) * 1.4) * 3.1, -1, 1);
    const bounce = Math.sin(time * 0.011) * s * 0.010 + cam.shake * 3;
    const opts = {
      steer,
      drift: player.drift || 0,
      yaw: 0.17,
      pitch: clamp(-cam.speedT * 0.02 + player.boost * 0.05, -0.06, 0.06),
      spin: time * (0.010 + cam.speedT * 0.05),
      time,
      bounce,
      light,
    };
    // hero grounding: a wide contact patch under the tyres plus the long cast
    // shadow thrown by the theme's key light, so the kart sits ON the road
    if (scene.wetFloor) {
      reflection(c, at.x, at.y + s * 0.24, scene.wetFloor, 0.62, (cc) => {
        drawKart(cc, at.x, at.y, s, def, opts);
      });
    }
    groundShadow(c, at.x, at.y + s * 0.16, s * 1.12, { light, alpha: 1.5, squash: 0.22 });
    drawExhaust(c, at.x, at.y + bounce, s, cam.speedT * 0.8 + player.boost * 0.5, time,
      scene.key === 'neon' ? '#c8d8ff' : '#e6ecf4');
    drawDrift(c, at.x, at.y + bounce, s, player.drift, player.boost, time, def.accent);
    drawKart(c, at.x, at.y, s, def, opts);
  }

  c.restore();

  if (scene.sky.snowfall) snowfall(c, w, h, time, scene.sky.snowfall);
  speedLines(c, w, h, Math.max(0, (cam.speedT - 0.72) * 2) + (player ? player.boost : 0), time);
  vignette(c, w, h, scene);
}

register({
  id: 'race-world',
  kind: 'world',
  screens: ['race'],
  priority: 5,
  mount() { cam._init = false; },
  update(dt, ctx) {
    if (ctx.state.race) updateCamera(cam, ctx.state.race, dt);
  },
  render(ctx) { renderRaceWorld(ctx.c, ctx); },
  unmount() { cam._init = false; },
});

export default renderRaceWorld;
