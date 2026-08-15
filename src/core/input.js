/**
 * Input: real keyboard + scriptable presses that are consumed in SIM time so
 * window.__pkr.press() behaves identically under step() and realtime.
 */

/** logical action -> keys */
export const KEYMAP = Object.freeze({
  accel: ['ArrowUp', 'w', 'z', 'a'],
  brake: ['ArrowDown', 's', 'x'],
  left: ['ArrowLeft', 'a'],
  right: ['ArrowRight', 'd'],
  drift: ['Shift', 'Control'],
  item: [' ', 'Space', 'b', 'Enter'],
  confirm: ['Enter', 'a', ' ', 'Space'],
  back: ['Escape', 'b', 'Backspace'],
  up: ['ArrowUp', 'w'],
  down: ['ArrowDown', 's'],
});

const held = new Set();
/** scripted holds: key -> remaining sim ms */
const scripted = new Map();
/** key -> resolvers waiting for the scripted hold to finish */
const waiters = new Map();
const pressHooks = new Set();

export const input = {
  /** true once any human/scripted input arrived (used for auto-drive demos) */
  touched: false,

  isDown(key) {
    return held.has(key) || scripted.has(key);
  },

  /** Any key bound to a logical action is down. */
  action(name) {
    const keys = KEYMAP[name] || [];
    return keys.some((k) => input.isDown(k));
  },

  /** Fire a key for `ms` of simulated time. Returns a promise. */
  press(key, ms = 120) {
    const k = normalise(key);
    input.touched = true;
    scripted.set(k, Math.max(scripted.get(k) || 0, ms));
    firePress(k);
    return new Promise((resolve) => {
      const list = waiters.get(k) || [];
      list.push(resolve);
      waiters.set(k, list);
    });
  },

  /** Called by the loop once per fixed step with the step size in ms. */
  advance(ms) {
    for (const [k, left] of [...scripted]) {
      const rest = left - ms;
      if (rest <= 0) {
        scripted.delete(k);
        const list = waiters.get(k);
        if (list) { waiters.delete(k); list.forEach((r) => r()); }
      } else {
        scripted.set(k, rest);
      }
    }
  },

  /** Discrete key-down notifications (menus). */
  onPress(fn) { pressHooks.add(fn); return () => pressHooks.delete(fn); },

  clear() {
    held.clear();
    scripted.clear();
    for (const [, list] of waiters) list.forEach((r) => r());
    waiters.clear();
  },

  attach(target = window) {
    target.addEventListener('keydown', (e) => {
      const k = normalise(e.key);
      if (!held.has(k)) firePress(k);
      held.add(k);
      input.touched = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    });
    target.addEventListener('keyup', (e) => held.delete(normalise(e.key)));
    target.addEventListener('blur', () => held.clear());
  },
};

function normalise(key) {
  if (key === 'Space' || key === 'space') return ' ';
  return key;
}

function firePress(key) {
  const actions = Object.keys(KEYMAP).filter((a) => KEYMAP[a].includes(key));
  for (const fn of [...pressHooks]) {
    try { fn(key, actions); } catch (err) { console.warn('[pkr] press hook failed', err); }
  }
}

export default input;
