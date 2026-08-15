/**
 * Entry module for the piece "race-hud-and-countdown".
 *
 * Owns only: src/hud/*, src/styles/hud.css. It plugs into the shell through
 * src/core/registry.js (kinds 'hud' + 'overlay' on the race screen) and never
 * touches the shell, the world renderer or the menus.
 */
import { register } from '../core/registry.js';
import raceHud from './raceHud.js';
import countdown from './countdown.js';

const CSS_URL = new URL('../styles/hud.css', import.meta.url).href;

function ensureCss() {
  if (document.querySelector('link[data-pkr-hud-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_URL;
  link.setAttribute('data-pkr-hud-css', '1');
  document.head.appendChild(link);
}

ensureCss();
register(raceHud);
register(countdown);

export { raceHud, countdown };
