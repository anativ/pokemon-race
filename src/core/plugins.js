/**
 * Optional module list loaded by the shell at boot, in order.
 *
 * OTHER BUILD PIECES: add your entry module path here (relative to /src/) and
 * call register({...}) from it. Paths that fail to import are reported once via
 * console.warn and never crash the shell - but keep this list accurate, the
 * shell only imports what is listed (no 404 probing, so the console stays clean).
 *
 * Example:  export const PLUGIN_MODULES = ['world/race-world.js'];
 *
 * You may also load modules ad hoc without touching this file:
 *   ?plugins=world/race-world.js,hud/hud.js
 */
export const PLUGIN_MODULES = [
  'screens/characterSelect.js',
  'screens/trackSelect.js',
  'screens/results.js',
  'race/world.js',
];

export default PLUGIN_MODULES;
