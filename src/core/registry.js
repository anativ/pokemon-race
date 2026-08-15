/**
 * Plugin registry - the seam every other build piece uses to take over a
 * screen, a world renderer, the HUD or the race sim WITHOUT editing the shell.
 *
 * A module registers itself at import time:
 *
 *   import { register } from '../core/registry.js';
 *   register({ id: 'race-world', kind: 'world', screens: ['race'],
 *              mount(ctx){}, render(ctx){}, update(dt, ctx){}, unmount(){} });
 *
 * Highest `priority` wins per (kind, screen). Built-in shell providers are
 * registered with priority 0, so anything >= 1 replaces them.
 *
 * Kinds:
 *   'screen'  full-screen provider (owns the DOM layer for that screen)
 *   'world'   canvas world renderer for the race screen
 *   'hud'     DOM overlay for the race screen
 *   'sim'     race physics/AI  (MUST be deterministic: use ctx.rng only)
 *   'overlay' extra always-on overlay (countdown, item popups, ...)
 */

/** @type {Map<string, any[]>} */
const byKind = new Map();
const ids = new Set();
const changeHooks = new Set();

export function register(provider) {
  if (!provider || !provider.kind) throw new Error('[pkr] register() needs {kind}');
  const p = {
    id: provider.id || `${provider.kind}-${ids.size}`,
    priority: provider.priority ?? 1,
    screens: provider.screens || null,
    ...provider,
  };
  if (ids.has(p.id)) {
    // re-registration (hot edit) replaces the previous entry
    const list = byKind.get(p.kind) || [];
    const i = list.findIndex((x) => x.id === p.id);
    if (i >= 0) list.splice(i, 1);
  }
  ids.add(p.id);
  const list = byKind.get(p.kind) || [];
  list.push(p);
  list.sort((a, b) => b.priority - a.priority);
  byKind.set(p.kind, list);
  for (const fn of [...changeHooks]) {
    try { fn(p); } catch (err) { console.warn('[pkr] registry hook failed', err); }
  }
  return p;
}

export function onRegistryChange(fn) {
  changeHooks.add(fn);
  return () => changeHooks.delete(fn);
}

/** Best provider of a kind for a screen (or null). */
export function provider(kind, screen) {
  const list = byKind.get(kind) || [];
  return list.find((p) => !p.screens || p.screens.includes(screen)) || null;
}

/** All providers of a kind for a screen, best first. */
export function providers(kind, screen) {
  const list = byKind.get(kind) || [];
  return list.filter((p) => !p.screens || p.screens.includes(screen));
}

export function listRegistered() {
  const out = {};
  for (const [kind, list] of byKind) out[kind] = list.map((p) => ({ id: p.id, priority: p.priority, screens: p.screens }));
  return out;
}
