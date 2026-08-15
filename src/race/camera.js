/**
 * race-world / chase camera
 *
 * Mario-Kart style: parked behind and above the player's kart, trailing its
 * lane with a spring, leaning into corners and pitching down as speed rises so
 * more road opens up toward the horizon.
 *
 * The camera has no authority over the simulation - it only reads the player's
 * racer entry plus `race.camera` (written by the sim), so it can never break
 * determinism. Its own smoothing state lives here.
 */
import { CAM_HEIGHT, CAM_BACK } from './projection.js';
import { ROAD_W } from './geometry.js';

export { CAM_HEIGHT, CAM_BACK };

export function createCamera() {
  return {
    dist: 0,
    lane: 0,
    curve: 0,
    yaw: 0,        // cosmetic steering lean
    roll: 0,       // banking roll of the whole view
    pitch: 0,      // vanishing-point offset, fraction of half view height
    height: CAM_HEIGHT,
    speed: 0,
    speedT: 0,
    shake: 0,
    drift: 0,
    boost: 0,
    _init: false,
  };
}

function approach(a, b, rate, dt) {
  return a + (b - a) * Math.min(1, rate * dt);
}

/**
 * @param {any} cam
 * @param {any} race sim race object (may be null)
 * @param {number} dt seconds
 */
export function updateCamera(cam, race, dt) {
  if (!race || !race.racers || !race.racers.length) return cam;
  const player = race.racers.find((r) => r.isPlayer) || race.racers[0];
  const src = race.camera || {};
  const topSpeed = (player.phys && player.phys.topSpeed) || 220;
  const speedT = Math.max(0, Math.min(1.25, player.speed / topSpeed));
  const step = Math.max(0.0001, Math.min(0.05, dt));

  if (!cam._init) {
    cam._init = true;
    cam.lane = player.lane || 0;
    cam.curve = src.curve || 0;
    cam.speed = player.speed || 0;
    cam.height = CAM_HEIGHT;
  }

  // longitudinal: hard follow (the sim owns progress); lateral: springy
  cam.dist = player.dist - CAM_BACK;
  cam.lane = approach(cam.lane, player.lane, 6.5, step);
  cam.curve = approach(cam.curve, src.curve || 0, 3.0, step);
  cam.speed = approach(cam.speed, player.speed, 4, step);
  cam.drift = approach(cam.drift, player.drift || 0, 6, step);
  cam.boost = approach(cam.boost, player.boost || 0, 5, step);

  // steering lean: how fast the kart's lane is changing, plus corner load
  const laneErr = player.lane - cam.lane;
  cam.yaw = approach(cam.yaw, laneErr * 2.4 - cam.curve * 0.055, 6, step);
  cam.roll = approach(cam.roll, -cam.curve * 0.011 - laneErr * 0.05, 5, step);

  cam.pitch = approach(cam.pitch, 0.010 + speedT * 0.048 + cam.boost * 0.02, 3, step);
  cam.height = approach(cam.height, CAM_HEIGHT - speedT * 8 + cam.drift * 4, 3, step);
  cam.shake = Math.max(0, src.shake || 0);
  cam.speedT = speedT;
  cam.player = player;
  return cam;
}

/** Lateral world offset of the camera for a lane value (-1..1). */
export function camWorldX(cam) {
  return cam.lane * ROAD_W * 0.84;
}

export default createCamera;
