/**
 * Fixed-step loop. Sim advances in FIXED_MS chunks so a given (seed, total ms)
 * always produces the same state, whether it came from realtime frames or from
 * window.__pkr.step().
 *
 * Debug driving (goto/seed/step) pauses the realtime clock - call resume() to
 * hand the game back to the player.
 */
import input from './input.js';

export const FIXED_MS = 1000 / 120;
export const MAX_CATCHUP_MS = 250;

export function createLoop({ update, render }) {
  let raf = 0;
  let last = 0;
  let acc = 0;

  const loop = {
    paused: false,
    running: false,
    /** total simulated ms since the loop was created */
    simMs: 0,

    start() {
      if (loop.running) return;
      loop.running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      loop.running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    pause() { loop.paused = true; },
    resume() { loop.paused = false; last = 0; acc = 0; },

    /** Advance the sim by `ms` in fixed steps, then render once. */
    step(ms = FIXED_MS) {
      const steps = Math.max(0, Math.round(ms / FIXED_MS));
      for (let i = 0; i < steps; i++) tick();
      render(1);
      return steps * FIXED_MS;
    },
  };

  function tick() {
    input.advance(FIXED_MS);
    update(FIXED_MS / 1000, FIXED_MS);
    loop.simMs += FIXED_MS;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    let dt = now - last;
    last = now;
    if (loop.paused) { render(1); return; }
    if (dt > MAX_CATCHUP_MS) dt = MAX_CATCHUP_MS;
    acc += dt;
    let guard = 0;
    while (acc >= FIXED_MS && guard++ < 60) { tick(); acc -= FIXED_MS; }
    render(acc / FIXED_MS);
  }

  return loop;
}
