/** Shared DOM/markup atoms for the shell screens. */
import { STAT_KEYS, STAT_MAX } from '../data/roster.js';
import { avatarSvg } from './avatars.js';

export function el(tag, props = {}, html = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') node.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v != null) node.setAttribute(k, v);
  }
  if (html) node.innerHTML = html;
  return node;
}

/** The Pokemon RACING GAME wordmark (pure CSS/text, no assets). */
export function logoHtml(scale = 1) {
  return `<div class="pkr-logo" style="--logo-scale:${scale}">
    <span class="pkr-logo-word">Pok<span class="pkr-logo-e">é</span>mon</span>
    <span class="pkr-logo-sub">RACING GAME</span>
  </div>`;
}

export function statBarsHtml(stats, opts = {}) {
  return `<div class="pkr-stats ${opts.compact ? 'compact' : ''}">
    ${STAT_KEYS.map((k) => `
      <div class="pkr-stat-row">
        <span class="pkr-stat-label">${k}</span>
        <span class="pkr-stat-track">
          ${Array.from({ length: STAT_MAX }, (_, i) => `<i class="${i < stats[k] ? 'on' : ''} ${k === 'weight' ? 'warm' : ''}"></i>`).join('')}
        </span>
      </div>`).join('')}
  </div>`;
}

export function racerCardHtml(racer, { selected = false, tag = '' } = {}) {
  return `<button class="pkr-card${selected ? ' selected' : ''}" data-racer="${racer.id}" type="button">
    ${tag ? `<span class="pkr-card-tag">${tag}</span>` : ''}
    <span class="pkr-card-art" style="--c:${racer.color};--a:${racer.accent}">${avatarSvg(racer, 84)}</span>
    <span class="pkr-card-name">${racer.name}</span>
  </button>`;
}

export function hintHtml(items) {
  return `<div class="pkr-hints">${items.map(([key, label]) =>
    `<span class="pkr-hint">PRESS <b>[${key}]</b> ${label}</span>`).join('')}</div>`;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

/** 1 -> "1st", 2 -> "2nd" ... */
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function ordinalSuffix(n) { return ordinal(n).replace(String(n), ''); }

/** mm:ss.mmm */
export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/** Point at fraction f (0..1) along a closed polyline of [x,y] pairs. */
export function pointOnLoop(points, f) {
  const pts = [...points, points[0]];
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dy = pts[i + 1][1] - pts[i][1];
    const len = Math.hypot(dx, dy);
    segs.push(len); total += len;
  }
  let want = ((f % 1) + 1) % 1 * total;
  for (let i = 0; i < segs.length; i++) {
    if (want <= segs[i]) {
      const t = segs[i] === 0 ? 0 : want / segs[i];
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    }
    want -= segs[i];
  }
  return pts[0];
}
