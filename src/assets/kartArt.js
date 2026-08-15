/**
 * The big "racer in their kart" hero render used by the character-select preview.
 *
 * Pure SVG, no external assets. Front three-quarter view, viewBox 0 0 240 180:
 *
 *   contact shadow -> rear wing -> rear wheels -> the creature (torso + head)
 *   -> chassis (panels, stripes, splitter, lights) -> steering wheel
 *   -> the racer's arms reaching the wheel -> front wheels -> number plate.
 *
 * Wheels are fully built (tire wall, tread blocks, spoked rim, hub, specular),
 * the body is shaded with a gradient + panel highlights, and the racer keeps a
 * torso and two arms gripping the wheel so the preview reads as a driver in a
 * kart rather than a head floating over a pill.
 */
import { creatureBody, shade } from './pokeArt.js';

const OUT = '#160f2a';
const TIRE = '#191428';
const TIRE_HI = '#3a3350';

/* ------------------------------------------------------------------ wheels */
/** A properly built wheel: tire wall + tread blocks + spoked rim + hub. */
function wheel(cx, cy, r, rim, spokes = 6) {
  const rimD = shade(rim, -0.4);
  const rimL = shade(rim, 0.34);
  let tread = '';
  for (let i = 0; i < 14; i++) {
    const a = (i * 360) / 14;
    tread += `<rect x="${(cx - r * 0.05).toFixed(2)}" y="${(cy - r * 1.01).toFixed(2)}"
      width="${(r * 0.1).toFixed(2)}" height="${(r * 0.19).toFixed(2)}" fill="${TIRE_HI}"
      opacity=".75" transform="rotate(${a.toFixed(1)} ${cx} ${cy})"/>`;
  }
  let sp = '';
  for (let i = 0; i < spokes; i++) {
    const a = (i * 360) / spokes;
    sp += `<rect x="${(cx - r * 0.062).toFixed(2)}" y="${(cy - r * 0.5).toFixed(2)}"
      width="${(r * 0.124).toFixed(2)}" height="${(r * 1.0).toFixed(2)}" rx="${(r * 0.06).toFixed(2)}"
      fill="${rimL}" stroke="${rimD}" stroke-width="${(r * 0.035).toFixed(2)}"
      transform="rotate(${a.toFixed(1)} ${cx} ${cy})"/>`;
  }
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${TIRE}" stroke="${OUT}" stroke-width="2.6"/>
    ${tread}
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.82).toFixed(2)}" fill="none" stroke="${TIRE_HI}"
            stroke-width="${(r * 0.06).toFixed(2)}" opacity=".8"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.62).toFixed(2)}" fill="${rimD}"
            stroke="${OUT}" stroke-width="2"/>
    ${sp}
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.24).toFixed(2)}" fill="${rim}"
            stroke="${OUT}" stroke-width="1.8"/>
    <circle cx="${(cx - r * 0.08).toFixed(2)}" cy="${(cy - r * 0.08).toFixed(2)}"
            r="${(r * 0.09).toFixed(2)}" fill="#ffffff" opacity=".8"/>
    <path d="M${(cx - r * 0.72).toFixed(2)} ${(cy - r * 0.42).toFixed(2)}
             a${r} ${r} 0 0 1 ${(r * 0.52).toFixed(2)} -${(r * 0.52).toFixed(2)}"
          fill="none" stroke="#8d97b8" stroke-width="${(r * 0.09).toFixed(2)}" opacity=".55"
          stroke-linecap="round"/>
  </g>`;
}

/* ------------------------------------------------------------- driver arms */
/**
 * One arm: a tapered limb from the shoulder to a mitten paw on the wheel rim.
 * Drawn as an outlined stroke so it matches the creature line weight.
 */
function arm(x1, y1, cx1, cy1, x2, y2, c, paw) {
  const d = `M${x1} ${y1} C${cx1} ${cy1} ${(x2 + cx1) / 2} ${y2 - 8} ${x2} ${y2}`;
  return `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="13.5" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${shade(c, 0.3)}" stroke-width="3" stroke-linecap="round"
          opacity=".5" transform="translate(-1.4 -1.6)"/>
    <ellipse cx="${x2}" cy="${y2}" rx="9.5" ry="8" fill="${paw}" stroke="${OUT}" stroke-width="2.6"/>
    <ellipse cx="${x2 - 1.6}" cy="${y2 - 2.4}" rx="4" ry="2.6" fill="#ffffff" opacity=".35"/>`;
}

/** Steering wheel seen in perspective, with hub and two spokes. */
function steering(cx, cy, rx, ry, rim) {
  const grip = shade(rim, -0.5);
  return `<g>
    <rect x="${cx - 5}" y="${cy - 2}" width="10" height="26" rx="4" fill="${shade(rim, -0.35)}"
          stroke="${OUT}" stroke-width="2"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${OUT}" stroke-width="10.5"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${grip}" stroke-width="7"/>
    <ellipse cx="${cx}" cy="${cy - 1.5}" rx="${rx - 1}" ry="${ry - 1}" fill="none"
             stroke="#ffffff" stroke-width="2" opacity=".22"/>
    <path d="M${cx - rx + 4} ${cy} H${cx + rx - 4}" stroke="${grip}" stroke-width="5"
          stroke-linecap="round"/>
    <ellipse cx="${cx}" cy="${cy}" rx="8" ry="6" fill="${rim}" stroke="${OUT}" stroke-width="2.2"/>
  </g>`;
}

/* ----------------------------------------------------------------- chassis */
/** Body panels, stripes, vents, splitter and lights of the kart shell. */
function chassis(id, body, rim, dark, light) {
  return `
    <path d="M42 134 C42 115 57 105 78 104 L162 104 C183 105 198 115 198 134
             C200 149 189 158 170 159 L70 159 C51 158 40 149 42 134 Z"
          fill="url(#${id}-b)" stroke="${OUT}" stroke-width="3"/>
    <!-- dark cockpit shoulders either side of the driver: reads as a seat tub -->
    <path d="M46 133 C46 113 62 103 96 101 L96 116 C74 118 60 123 58 134 Z"
          fill="${dark}" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M194 133 C194 113 178 103 144 101 L144 116 C166 118 180 123 182 134 Z"
          fill="${dark}" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M56 112 q18 -8 38 -9 l0 4 q-20 2 -35 9 Z" fill="${light}" opacity=".4"/>
    <path d="M184 112 q-18 -8 -38 -9 l0 4 q20 2 35 9 Z" fill="${light}" opacity=".4"/>
    <!-- centre racing stripe running down the nose -->
    <path d="M102 116 h36 l6 43 h-48 Z" fill="${rim}" opacity=".9"/>
    <path d="M110 116 h7 l-4 43 h-7 Z" fill="${light}" opacity=".55"/>
    <!-- side vents -->
    <path d="M46 126 q-16 0 -18 11 q-1 12 15 13" fill="${dark}" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M194 126 q16 0 18 11 q1 12 -15 13" fill="${dark}" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M56 134 h20 M58 142 h18 M184 134 h-20 M182 142 h-18"
          stroke="${OUT}" stroke-width="3" opacity=".32" stroke-linecap="round"/>
    <!-- front splitter in the accent colour + grille slots -->
    <path d="M62 153 q58 11 116 0 l-5 14 q-53 9 -106 0 Z"
          fill="${rim}" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M68 157 q52 9 104 0 q-52 5 -104 0 Z" fill="${light}" opacity=".45"/>
    <rect x="98" y="152" width="44" height="10" rx="4" fill="#171227" opacity=".85"/>
    <path d="M106 153 v8 M114 153 v8 M122 153 v8 M130 153 v8"
          stroke="${light}" stroke-width="2" opacity=".5"/>
    <ellipse cx="76" cy="144" rx="14" ry="9" fill="#fff3c0" stroke="${OUT}" stroke-width="2.4"/>
    <ellipse cx="164" cy="144" rx="14" ry="9" fill="#fff3c0" stroke="${OUT}" stroke-width="2.4"/>
    <ellipse cx="72" cy="141" rx="5.5" ry="3.2" fill="#ffffff" opacity=".9"/>
    <ellipse cx="160" cy="141" rx="5.5" ry="3.2" fill="#ffffff" opacity=".9"/>`;
}

/** Mudguard crescents drawn over the top of the front tyres. */
function fenders(dark) {
  return `
    <path d="M5 141 A27 27 0 0 1 59 141 L49 141 A17 17 0 0 0 15 141 Z"
          fill="${dark}" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M181 141 A27 27 0 0 1 235 141 L225 141 A17 17 0 0 0 191 141 Z"
          fill="${dark}" stroke="${OUT}" stroke-width="2.6"/>`;
}

/**
 * @param {object} racer roster entry ({id, name, color, accent, kart})
 * @param {number} size rendered width in px (height = size * 0.75)
 */
export function kartSvg(racer, size = 380) {
  const body = racer.kart || racer.color || '#ffcf2a';
  const rim = racer.accent || shade(body, -0.3);
  // push the tub a lot darker than the creature so the two silhouettes separate
  // even when a racer's kart shares its body colour (pikachu, gengar, ...).
  const dark = shade(body, -0.48);
  const light = shade(body, 0.36);
  const skin = racer.color || body;
  const paw = shade(skin, -0.16);
  const id = `kart-${racer.id}`;
  return `<svg class="pkr-kart" viewBox="0 0 240 198" width="${size}" height="${Math.round(size * 0.825)}"
       role="img" aria-label="${racer.name} in their kart">
    <defs>
      <linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${light}"/>
        <stop offset=".52" stop-color="${body}"/>
        <stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <linearGradient id="${id}-w" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <radialGradient id="${id}-glow" cx="50%" cy="44%" r="58%">
        <stop offset="0" stop-color="${racer.color}" stop-opacity=".34"/>
        <stop offset="1" stop-color="${racer.color}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id}-sh" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#04081c" stop-opacity=".55"/>
        <stop offset="1" stop-color="#04081c" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="240" height="198" fill="url(#${id}-glow)"/>
    <ellipse cx="120" cy="184" rx="100" ry="14" fill="url(#${id}-sh)"/>
    <ellipse cx="120" cy="183" rx="78" ry="7" fill="rgba(4,8,26,.42)"/>

    <g transform="translate(0 18)">
      <!-- rear wing on twin struts, with end plates -->
      <path d="M84 99 h12 v16 h-12 Z" fill="${dark}" stroke="${OUT}" stroke-width="2.4"/>
      <path d="M144 99 h12 v16 h-12 Z" fill="${dark}" stroke="${OUT}" stroke-width="2.4"/>
      <path d="M28 86 q92 -11 184 0 l0 14 q-92 11 -184 0 Z"
            fill="url(#${id}-w)" stroke="${OUT}" stroke-width="2.8"/>
      <path d="M34 89 q86 -8 172 0 q-86 6 -172 0 Z" fill="${light}" opacity=".55"/>
      <path d="M22 78 h12 v30 h-12 Z" fill="${dark}" stroke="${OUT}" stroke-width="2.4"/>
      <path d="M206 78 h12 v30 h-12 Z" fill="${dark}" stroke="${OUT}" stroke-width="2.4"/>
      <!-- exhaust stacks -->
      <path d="M32 104 q-13 -2 -14 9 q-1 10 12 10" fill="#96a2c0" stroke="${OUT}" stroke-width="2.4"/>
      <path d="M208 104 q13 -2 14 9 q1 10 -12 10" fill="#96a2c0" stroke="${OUT}" stroke-width="2.4"/>

      ${wheel(48, 120, 19, rim, 5)}
      ${wheel(192, 120, 19, rim, 5)}

      <!-- seat back behind the driver -->
      <path d="M72 112 q48 -24 96 0 l0 -18 q-48 -21 -96 0 Z"
            fill="${dark}" stroke="${OUT}" stroke-width="2.6"/>

      <!-- the racer, seated: legs are hidden behind the chassis -->
      <g transform="translate(39 -14) scale(1.62)">${creatureBody(racer)}</g>

      ${chassis(id, body, rim, dark, light)}
      ${steering(120, 116, 32, 11, rim)}

      <!-- arms reaching out to grip the wheel -->
      ${arm(80, 98, 68, 108, 89, 113, skin, paw)}
      ${arm(160, 98, 172, 108, 151, 113, skin, paw)}

      ${wheel(32, 142, 26, rim, 6)}
      ${wheel(208, 142, 26, rim, 6)}
      ${fenders(dark)}

      <!-- number plate -->
      <ellipse cx="120" cy="138" rx="21" ry="14" fill="#f7f9fd" stroke="${OUT}" stroke-width="2.8"/>
      <ellipse cx="120" cy="134" rx="16" ry="7" fill="#ffffff" opacity=".7"/>
      <text x="120" y="144" text-anchor="middle" font-size="17" font-weight="800"
            font-family="Verdana, sans-serif" fill="${OUT}">P1</text>
    </g>
  </svg>`;
}

export default kartSvg;
