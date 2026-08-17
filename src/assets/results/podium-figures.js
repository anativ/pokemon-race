/**
 * results-podium :: per-species FULL-BODY podium poses (procedural inline SVG).
 *
 * Owned by the "results-podium" piece. Nothing here touches game state.
 *
 * Rig contract - every species draws inside `viewBox 0 0 120 140`:
 *   x = 60           body centre line
 *   y = FEET (126)   the soles / seat contact line
 *
 * ANATOMY RULE (the thing this file exists for): no two species may share a
 * body plan. Each pose declares its own head shape (muzzle/snout drawn INTO
 * the skull path, never bolted on as a second ellipse), its own torso
 * silhouette, its own leg type (digitigrade / pillar / stub / quadruped /
 * frog crouch / gown / none), its own HAND type (dragon claw / fist / webbed /
 * toe-bean pad / slim fingers / mitt) and its own head:body ratio. A shared
 * tube-arm-ending-in-a-white-mitt is banned outright - it is the single
 * loudest tell that a set of figures is one mannequin in different colours. Charizard is a small-headed,
 * long-snouted, wide-winged biped; Dragonite is a fat barrel with a tiny
 * head; Lucario is a lean, narrow-waisted jackal. They must be tellable
 * apart as pure black silhouettes - that is the bar.
 *
 * ON-MODEL RULES (round 5 - the fix for "misaligned flat primitives"):
 *  1. FACES ARE FRONT ON. A muzzle is drawn with `snout()` CENTRED on x=60 and
 *     sunk into the skull, never as an ellipse bolted onto one side of the head
 *     (that reads as a creature turning away mid-photo, and it made every
 *     dragon look like a mouse with a snout growing out of its cheek).
 *  2. FACE FEATURES COME IN PAIRS. Eyes, catchlights, nostrils, cheeks, horns
 *     and ears are emitted by symmetric helpers (`eyes`, `nostrils`, `blush`,
 *     `hornPair`) so a left/right mismatch is not expressible.
 *  3. LIMBS ARE FUSED, NOT BOLTED. `limb()` buries its shoulder end deep inside
 *     the torso as a FILL WITH NO STROKE and strokes only its outer contour
 *     from the body edge outward, so no keyline ever slashes across the chest
 *     and no arm can read as a detached rounded rectangle. The hand is drawn
 *     over the wrist so the two are one continuous mass, and claws are short
 *     and broad - never toothpicks.
 *  4. VOLUME COMES FROM THE PASSES, not from outlines: every pose is replayed
 *     as hull -> ink -> shade -> lite -> bounce -> rim, so the body is lit from
 *     the upper left with a warm bounce off the plinth and an eroded rim.
 */

const OUT = '#1b1230';
export const FEET = 126;
export const FIG_W = 120;
export const FIG_H = 140;
/** The rendered viewBox: bled out on every side so wings, tails and head
 *  spikes never clip. `FIG_H` units still map to the drawn height. */
export const FIG_BOX = Object.freeze({ x: -18, y: -8, w: FIG_W + 38, h: FIG_H + 16 });
/** Dead space under the soles, in rig units (used to seat a figure on a plinth). */
export const BELOW_FEET = FIG_BOX.y + FIG_BOX.h - FEET;

/* ============================================================ render modes
 *   'hull'  - one unified dark silhouette (shapes fattened by HULL_GROW) so
 *             limbs/tails/wings read as ONE connected body.
 *   'ink'   - the normal flat-colour pass.
 *   'shade' - the same geometry filled with a userSpaceOnUse radial gradient
 *             that darkens away from the key light.
 *   'lite'  - ditto with a warm highlight near the key light.
 */
const HULL = '#150c26';
/* Kept deliberately SMALL. A fat hull welds the gap between two legs (and
 * between an arm and the ribs) into one black blob, which is exactly how a
 * bespoke silhouette turns back into a mannequin. This value only has to be
 * wide enough to guarantee a continuous keyline under the ink pass. */
const HULL_GROW = 1.3;
let MODE = 'ink';
let PAINT = '';

const isOverlay = () => MODE === 'shade' || MODE === 'lite';

/* ------------------------------------------------------------- primitives */
function shape(tag, attrs, { fill, stroke = OUT, width = 2.6, opacity = 1 }) {
  let f = fill; let s = stroke; let w = width; let o = opacity;
  if (MODE === 'hull') { f = fill === 'none' ? 'none' : HULL; s = HULL; w = width + HULL_GROW; o = 1; }
  else if (isOverlay()) {
    if (fill === 'none') return '';
    f = PAINT; s = 'none'; o = 1;
  }
  return `<${tag} ${attrs} fill="${f}"${s === 'none' ? '' : ` stroke="${s}" stroke-width="${w}"`}`
    + `${o === 1 ? '' : ` opacity="${o}"`} stroke-linejoin="round" stroke-linecap="round"/>`;
}

const p = (d, f, s = OUT, w = 2.6) => shape('path', `d="${d}"`, { fill: f, stroke: s, width: w });
const pf = (d, f) => shape('path', `d="${d}"`, { fill: f, stroke: MODE === 'ink' ? 'none' : OUT, width: 0.1 });
const e = (cx, cy, rx, ry, f, s = OUT, w = 2.6) =>
  shape('ellipse', `cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"`, { fill: f, stroke: s, width: w });
const ef = (cx, cy, rx, ry, f, o = 1) =>
  shape('ellipse', `cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"`,
    { fill: f, stroke: MODE === 'ink' ? 'none' : OUT, width: 0.1, opacity: MODE === 'ink' ? o : 1 });
const ln = (d, s, w = 2.6) => shape('path', `d="${d}"`, { fill: 'none', stroke: s, width: w });
const rr = (x, y, w, h, r, f, s = OUT, sw = 2.6) =>
  shape('rect', `x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"`, { fill: f, stroke: s, width: sw });

/* =============================================================== body kit
 * Deliberately several DIFFERENT leg systems, so species do not converge on
 * one silhouette. Each returns markup drawn to y = FEET.
 */

/**
 * A limb whose shoulder end is buried DEEP inside the torso (so the silhouette
 * reads as one fused body, never a detached rounded rectangle floating beside
 * the ribs) and whose wrist swells back out into the hand. The outline is one
 * continuous curve: deltoid bulge -> tapered forearm -> wrist -> hand root.
 */
function limb(x1, y1, x2, y2, w, c, capR = 0, hand = null, bury = 1.9) {
  const r = (n) => Math.round(n * 100) / 100;
  const dx = x2 - x1; const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L; const uy = dy / L;
  const nx = -uy; const ny = ux;
  // Root the shoulder a full limb-width back into the body mass.
  const sx = x1 - ux * w * bury; const sy = y1 - uy * w * bury;
  const h0 = w * 0.9;    // inside the torso: wide, so the union is seamless
  const h1 = w * 0.74;   // deltoid
  const h2 = w * 0.5;    // elbow
  const h3 = capR ? w * 0.4 : w * 0.42; // wrist
  const mx = x1 + ux * L * 0.5; const my = y1 + uy * L * 0.5;
  const ex = x2 - ux * w * 0.35; const ey = y2 - uy * w * 0.35;
  const pt = (px, py, h, s) => `${r(px + nx * h * s)} ${r(py + ny * h * s)}`;
  const tip = `Q${pt(x2, y2, h3 * 0.92, 1)} ${r(x2 + ux * h3 * 0.4)} ${r(y2 + uy * h3 * 0.4)}`
    + ` Q${pt(x2, y2, h3 * 0.92, -1)} ${pt(ex, ey, h3, -1)}`;
  // Closed FILL only - its proximal end is buried in the torso, and because it
  // carries no stroke there is no keyline slashing across the chest.
  const fill = `M${pt(sx, sy, h0, 1)}`
    + ` C${pt(x1, y1, h1 * 1.02, 1)} ${pt(mx, my, h2 * 0.98, 1)} ${pt(ex, ey, h3, 1)}`
    + ` ${tip}`
    + ` C${pt(mx, my, h2 * 0.98, -1)} ${pt(x1, y1, h1 * 1.02, -1)} ${pt(sx, sy, h0, -1)} Z`;
  // OPEN stroke: only the outer contour, starting AT the body edge.
  const edge = `M${pt(x1, y1, h1, 1)}`
    + ` C${pt(x1 + ux * L * 0.3, y1 + uy * L * 0.3, h2 * 1.02, 1)} ${pt(mx, my, h2, 1)} ${pt(ex, ey, h3, 1)}`
    + ` ${tip}`
    + ` C${pt(mx, my, h2, -1)} ${pt(x1 + ux * L * 0.3, y1 + uy * L * 0.3, h2 * 1.02, -1)} ${pt(x1, y1, h1, -1)}`;
  const side = x2 < x1 ? -1 : 1;
  // Arm first, hand ON TOP of the wrist: the hand's own keyline reads, and its
  // root is hidden under the forearm, so the two are one continuous mass.
  return p(fill, c, 'none') + ln(edge, OUT, 2.4)
    + (capR ? (hand || paw)(x2 + ux * capR * 0.35, y2 + uy * capR * 0.35, capR, c, side) : '');
}

/* ------------------------------------------------------------- HAND TYPES
 * The single loudest "generic mannequin" tell is every species ending its arm
 * in the same white mitt. These are five genuinely different hands; each pose
 * picks the one its species actually has.
 */

/** DRAGON CLAW: a fat rounded fist of a paw with three SHORT broad talons
 *  growing out of its lower edge. Deliberately chunky - thin needle claws are
 *  the tell that a hand was bolted onto a tube. */
function claw3(x, y, r, c, s = 1) {
  const q = (n) => Math.round(n * 100) / 100;
  const R = r * 1.16;
  // three stubby cone talons, hanging down/outward from the paw's rim
  const t = (a) => {
    const bx = x + a * R * 0.56; const by = y + R * 0.5;
    const tip = R * 0.34;
    return `M${q(bx - R * 0.34)} ${q(by - R * 0.2)}`
      + ` Q${q(bx + a * R * 0.2)} ${q(by + tip * 0.6)} ${q(bx + a * R * 0.24)} ${q(by + tip)}`
      + ` Q${q(bx + a * R * 0.04)} ${q(by + tip * 0.5)} ${q(bx + R * 0.34)} ${q(by - R * 0.2)} Z`;
  };
  return p(t(-1), '#f7f2e4', OUT, 1.6) + p(t(0.02), '#f7f2e4', OUT, 1.6) + p(t(1), '#f7f2e4', OUT, 1.6)
    // palm mass: a soft rounded wedge, wider than it is tall
    + p(`M${q(x - R)} ${q(y - R * 0.25)}`
      + ` C${q(x - R * 0.98)} ${q(y - R * 1.1)} ${q(x + R * 0.98)} ${q(y - R * 1.1)} ${q(x + R)} ${q(y - R * 0.25)}`
      + ` C${q(x + R * 1.02)} ${q(y + R * 0.78)} ${q(x - R * 1.02)} ${q(y + R * 0.78)} ${q(x - R)} ${q(y - R * 0.25)} Z`,
    c, OUT, 2.1)
    + ln(`M${q(x - R * 0.34)} ${q(y + R * 0.42)} q${q(R * 0.05)} ${q(-R * 0.6)} ${q(R * 0.02)} ${q(-R * 0.86)}`
      + ` M${q(x + R * 0.36)} ${q(y + R * 0.42)} q${q(-R * 0.04)} ${q(-R * 0.6)} ${q(-R * 0.02)} ${q(-R * 0.86)}`,
    OUT, 1.2)
    + `<!--${s}-->`;
}

/** WYVERN HAND: a small narrow palm carrying three LONG hooked ivory talons.
 *  Deliberately the opposite of `claw3` (fat paw, stubby talons) so a wyvern
 *  and a fat dragon can never share a hand. */
function wyvernHand(x, y, r, c, s = 1) {
  const q = (n) => Math.round(n * 100) / 100;
  const R = Math.max(r, 4.6);
  const talon = (a, reach, drop) => p(
    `M${q(x + a * R * 0.62)} ${q(y - R * 0.35)}`
    + ` C${q(x + a * R * (0.62 + reach * 0.45))} ${q(y + drop * 0.45)}`
    + ` ${q(x + a * R * (0.5 + reach))} ${q(y + drop * 0.88)}`
    + ` ${q(x + a * R * (0.36 + reach))} ${q(y + drop)}`
    + ` C${q(x + a * R * (0.16 + reach * 0.4))} ${q(y + drop * 0.66)}`
    + ` ${q(x + a * R * 0.02)} ${q(y + R * 0.35)} ${q(x + a * R * 0.06)} ${q(y - R * 0.35)} Z`,
    '#fff3d8', OUT, 1.6);
  return talon(-1, 0.72, R * 1.85) + talon(0.06, 0.5, R * 2.25) + talon(1, 0.72, R * 1.85)
    // narrow wedge palm, taller than it is wide
    + p(`M${q(x - R * 0.86)} ${q(y - R * 0.7)}`
      + ` C${q(x - R * 0.94)} ${q(y + R * 0.52)} ${q(x + R * 0.94)} ${q(y + R * 0.52)} ${q(x + R * 0.86)} ${q(y - R * 0.7)}`
      + ` C${q(x + R * 0.48)} ${q(y - R * 1.28)} ${q(x - R * 0.48)} ${q(y - R * 1.28)} ${q(x - R * 0.86)} ${q(y - R * 0.7)} Z`,
    c, OUT, 2.1)
    + `<!--${s}-->`;
}

/** STOUT DRAGON MITT: a heavy rounded hand, taller than it is wide, whose
 *  three SHORT BLUNT ivory claws barely clear the knuckle line. Deliberately
 *  the opposite of `wyvernHand` (narrow palm, long spidery hooks) and thicker
 *  through the wrist than `claw3`, so a big dragon's arm ends in a fist of
 *  meat rather than a spider. */
function stoutClaw(x, y, r, c, s = 1) {
  const q = (n) => Math.round(n * 100) / 100;
  const R = Math.max(r, 6);
  // blunt nails, drawn UNDER the palm so only their round tips show
  const nail = (a) => {
    const bx = x + a * R * 0.52; const by = y + R * 0.46;
    return p(`M${q(bx - R * 0.28)} ${q(by - R * 0.2)}`
      + ` C${q(bx - R * 0.3)} ${q(by + R * 0.5)} ${q(bx + R * 0.3)} ${q(by + R * 0.5)} ${q(bx + R * 0.28)} ${q(by - R * 0.2)} Z`,
    '#f7f2e4', OUT, 1.6);
  };
  return nail(-0.94) + nail(0) + nail(0.94)
    // knuckle mass: a deep rounded block, wrist end flat so it welds to the arm
    + p(`M${q(x - R * 0.98)} ${q(y - R * 0.72)}`
      + ` C${q(x - R * 1.12)} ${q(y + R * 0.4)} ${q(x - R * 0.72)} ${q(y + R * 0.72)} ${q(x)} ${q(y + R * 0.72)}`
      + ` C${q(x + R * 0.72)} ${q(y + R * 0.72)} ${q(x + R * 1.12)} ${q(y + R * 0.4)} ${q(x + R * 0.98)} ${q(y - R * 0.72)}`
      + ` C${q(x + R * 0.6)} ${q(y - R * 1.24)} ${q(x - R * 0.6)} ${q(y - R * 1.24)} ${q(x - R * 0.98)} ${q(y - R * 0.72)} Z`,
    c, OUT, 2.4)
    + ln(`M${q(x - R * 0.4)} ${q(y + R * 0.5)} v${q(-R * 0.72)}`
      + ` M${q(x + R * 0.4)} ${q(y + R * 0.5)} v${q(-R * 0.72)}`, OUT, 1.4)
    + `<!--${s}-->`;
}

/** FIGHTER FIST: a boxy knuckled fist with two finger grooves. */
function fist(x, y, r, c) {
  const q = (n) => Math.round(n * 100) / 100;
  const sw = Math.max(1.5, Math.min(2.4, r * 0.28));
  // A boxy knuckled fist: rounded block + ONE knuckle ridge and a thumb curl.
  // (The old two-groove grid read as a window pane at podium scale.)
  return rr(q(x - r * 1.02), q(y - r * 0.92), q(r * 2.04), q(r * 1.9), q(r * 0.6), c, OUT, sw)
    + ln(`M${q(x - r * 0.62)} ${q(y - r * 0.34)} q${q(r * 0.62)} ${q(-r * 0.34)} ${q(r * 1.24)} 0`,
      OUT, sw * 0.7)
    + ln(`M${q(x + r * 0.28)} ${q(y + r * 0.86)} q${q(r * 0.5)} ${q(-r * 0.42)} ${q(r * 0.28)} ${q(-r * 0.96)}`,
      OUT, sw * 0.7);
}

/** WEBBED HAND: three long splayed fingers joined by a membrane. */
function webHand(x, y, r, c, s = 1) {
  const q = (n) => Math.round(n * 100) / 100;
  const L = r * 2.1;
  return p(`M${q(x)} ${q(y - r * 0.8)}`
    + ` C${q(x - r * 1.9)} ${q(y - r * 0.2)} ${q(x - r * 2.1)} ${q(y + L * 0.7)} ${q(x - r * 1.5)} ${q(y + L)}`
    + ` q${q(r * 0.55)} ${q(-r * 0.7)} ${q(r * 0.8)} ${q(-r * 0.5)}`
    + ` q${q(-r * 0.2)} ${q(r * 0.9)} ${q(r * 0.7)} ${q(r * 1.1)}`
    + ` q${q(r * 0.9)} ${q(-r * 0.25)} ${q(r * 0.7)} ${q(-r * 1.15)}`
    + ` q${q(r * 0.3)} ${q(-r * 0.2)} ${q(r * 0.8)} ${q(r * 0.5)}`
    + ` C${q(x + r * 2.1)} ${q(y + L * 0.7)} ${q(x + r * 1.9)} ${q(y - r * 0.2)} ${q(x)} ${q(y - r * 0.8)} Z`,
  c, OUT, 2.2)
    + ln(`M${q(x - r * 0.8)} ${q(y + r * 0.2)} v${q(r * 1.2)} M${q(x + r * 0.8)} ${q(y + r * 0.2)} v${q(r * 1.2)}`,
      OUT, 1.5)
    + `<!--${s}-->`;
}

/** SMALL ROUND PAW with three toe beans (mouse / cat / fairy builds). */
function padPaw(x, y, r, c) {
  const q = (n) => Math.round(n * 100) / 100;
  return e(q(x), q(y), q(r * 1.05), q(r * 1.15), c)
    + ef(q(x), q(y + r * 0.32), q(r * 0.44), q(r * 0.36), '#e88fa8', 0.8)
    + ef(q(x - r * 0.5), q(y - r * 0.34), q(r * 0.2), q(r * 0.2), '#e88fa8', 0.8)
    + ef(q(x), q(y - r * 0.52), q(r * 0.2), q(r * 0.2), '#e88fa8', 0.8)
    + ef(q(x + r * 0.5), q(y - r * 0.34), q(r * 0.2), q(r * 0.2), '#e88fa8', 0.8);
}

/** THREE SLENDER FINGERS on a narrow palm (psychic / elegant builds). */
function slimHand(x, y, r, c, s = 1) {
  const q = (n) => Math.round(n * 100) / 100;
  const f = (a) => `M${q(x + a * r * 0.62)} ${q(y - r * 0.3)}`
    + ` q${q(a * r * 0.34)} ${q(r * 0.9)} ${q(a * r * 0.05)} ${q(r * 1.7)}`
    + ` q${q(-a * r * 0.5)} ${q(-r * 0.6)} ${q(-a * r * 0.55)} ${q(-r * 1.5)} Z`;
  return p(`M${q(x - r * 0.85)} ${q(y - r * 0.8)} q${q(r * 0.85)} ${q(-r * 0.45)} ${q(r * 1.7)} 0`
    + ` q${q(r * 0.1)} ${q(r * 0.85)} ${q(-r * 0.85)} ${q(r * 1)}`
    + ` q${q(-r * 0.95)} ${q(-r * 0.15)} ${q(-r * 0.85)} ${q(-r)} Z`, c, OUT, 2.1)
    + p(f(-1), c, OUT, 1.9) + p(f(0.02), c, OUT, 1.9) + p(f(1), c, OUT, 1.9)
    + `<!--${s}-->`;
}

/**
 * A limb's end cap. Deliberately NOT a circle - a ball hand on a tube arm is
 * the single loudest "generic mannequin" tell. This is a mitten with two
 * finger creases, so hands read as paws/fists.
 */
function paw(x, y, r, c) {
  const q = (n) => Math.round(n * 100) / 100;
  // Keyline weight scales with the hand, so small hands do not turn into an
  // ink blob at podium resolution.
  const sw = Math.max(1.5, Math.min(2.4, r * 0.3));
  const R = Math.max(r, 5.4);
  return p(`M${q(x - R)} ${q(y - R * 0.1)}`
    + ` C${q(x - R)} ${q(y - R * 1.2)} ${q(x + R)} ${q(y - R * 1.2)} ${q(x + R)} ${q(y - R * 0.1)}`
    + ` C${q(x + R * 1.04)} ${q(y + R)} ${q(x - R * 1.04)} ${q(y + R)} ${q(x - R)} ${q(y - R * 0.1)} Z`,
  c, OUT, sw)
    + ln(`M${q(x - R * 0.34)} ${q(y + R * 0.72)} v${q(-R * 0.56)}`
      + ` M${q(x + R * 0.34)} ${q(y + R * 0.72)} v${q(-R * 0.56)}`, OUT, sw * 0.62);
}

/** DIGITIGRADE legs: thick thigh, back-bent hock, long clawed foot.
 *  Used by the raptor/jackal builds (Charizard, Lucario, Blaziken, Garchomp). */
function digiLegs(c, { hip = 92, spread = 17, thigh = 17, shin = 9, foot = null, claw = null,
  footW = 1, clawLen = 1 } = {}) {
  const fc = foot || c;
  const cc = claw || OUT;
  const one = (s) => {
    const x = 60 + spread * s;             // hip x
    const kx = x + 9 * s;                  // knee pushed outward
    const ky = hip + (FEET - hip) * 0.44;
    const ax = x - 3 * s;                  // ankle tucked in
    const ay = FEET - 13;
    return p(`M${x - thigh * 0.55 * s} ${hip - 8} q${thigh * 1.25 * s} -2 ${thigh * 1.05 * s} 12`
      + ` q${2 * s} 14 ${kx - x} ${ky - hip}`
      + ` q${-3 * s} 12 ${ax - kx} ${ay - ky}`
      + ` l${-shin * s} 0 q${shin * 0.44 * s} -14 ${kx - x - shin * 0.89 * s} ${ky - hip - 4}`
      + ` q${-4 * s} -12 ${-thigh * 0.5 * s} ${-(ky - hip) - 6} Z`, c, OUT, 2.5)
      // long flat foot with three toe claws
      + p(`M${ax - 8 * footW * s} ${ay - 3} q${15 * footW * s} -2 ${16 * footW * s} 5 l${4 * s} ${7} `
        + `q${-2 * s} 4 ${-10 * footW * s} 4 l${-13 * footW * s} 0 q${-5 * s} 0 ${-5 * s} -7 Z`, fc, OUT, 2.4)
      + ln(`M${ax + 12 * s} ${FEET - 2} l${3 * clawLen * s} ${3 * clawLen}`
        + ` M${ax + 5 * s} ${FEET} l${2 * clawLen * s} ${3.6 * clawLen}`
        + ` M${ax - 2 * s} ${FEET} l${-1 * clawLen * s} ${3.6 * clawLen}`, cc, 2.2 + (1 - clawLen) * 1.2);
  };
  return one(-1) + one(1);
}

/** PILLAR legs: short, very thick, straight columns with round feet.
 *  Used by the heavy builds (Dragonite, Tyranitar, Machamp). */
function pillarLegs(c, { top = 96, spread = 20, w = 22, foot = null } = {}) {
  const fc = foot || c;
  const one = (x) => p(`M${x - w / 2} ${top} q${w / 2} -7 ${w} 0 l2 ${FEET - top - 9}`
    + ` q${-w / 2 - 2} 7 ${-w - 4} 0 Z`, c, OUT, 2.6)
    + p(`M${x - w * 0.62} ${FEET - 9} q${w * 0.62} -5 ${w * 1.24} 0 q3 10 -4 12`
      + ` q${-w * 0.55} 4 ${-w * 1.1} 0 q-7 -2 -4 -12 Z`, fc, OUT, 2.4);
  return one(60 - spread) + one(60 + spread);
}

/** STUB legs: tiny round-topped legs under a low body (Pikachu, Squirtle...). */
function stubLegs(c, { top = 104, spread = 16, w = 15, foot = null } = {}) {
  const fc = foot || c;
  const one = (x) => rr(x - w / 2, top - w * 0.4, w, FEET - top + w * 0.4 - 4, w * 0.48, c)
    + e(x + (x < 60 ? -2.5 : 2.5), FEET - 4, w * 0.72, w * 0.36, fc);
  return one(60 - spread) + one(60 + spread);
}

/** CHUNKY PLANTIGRADE legs: a thick tapered column with a real knee bulge and
 *  a BROAD flat foot carrying three short pale claws. Deliberately much
 *  meatier than `stubLegs` (which is a pebble on a nub) - used by the squat
 *  saurian builds (Charmander, Squirtle) whose old stick legs read as a
 *  generic plush toy. */
function chunkyLegs(c, { top = 100, spread = 16, w = 20, foot = null, claw = '#fff0c2',
  clawN = 3 } = {}) {
  const fc = foot || c;
  const q = (v) => Math.round(v * 100) / 100;
  const one = (s) => {
    const x = 60 + spread * s;
    const ay = FEET - 11;                 // ankle line
    const knee = (top + ay) / 2;
    return p(`M${q(x - w * 0.48)} ${q(top + 1)}`
      // hip cap
      + ` Q${q(x - w * 0.5)} ${q(top - 8)} ${q(x)} ${q(top - 8)}`
      + ` Q${q(x + w * 0.5)} ${q(top - 8)} ${q(x + w * 0.48)} ${q(top + 1)}`
      // outer contour: thigh swells at the knee then draws in to the ankle
      + ` C${q(x + w * 0.62)} ${q(knee - 3)} ${q(x + w * 0.58)} ${q(knee + 5)} ${q(x + w * 0.44)} ${q(ay + 3)}`
      + ` L${q(x - w * 0.44)} ${q(ay + 3)}`
      + ` C${q(x - w * 0.58)} ${q(knee + 5)} ${q(x - w * 0.62)} ${q(knee - 3)} ${q(x - w * 0.48)} ${q(top + 1)} Z`,
    c, OUT, 2.6)
      // knee crease, so the column is not one flat tube
      + ln(`M${q(x - w * 0.3)} ${q(knee + 2)} q${q(w * 0.3)} ${q(w * 0.16)} ${q(w * 0.6)} 0`, OUT, 1.5)
      // BROAD plantigrade foot: a heel mass whose front edge breaks into three
      // TOE LOBES (a flat slab with notches cut in it reads as a shoe sole).
      + p(`M${q(x - w * 0.74)} ${q(ay)} Q${q(x)} ${q(ay - 6)} ${q(x + w * 0.74)} ${q(ay)}`
        + ` Q${q(x + w * 0.9)} ${q(FEET - 5)} ${q(x + w * 0.62)} ${q(FEET - 3)}`
        + ` L${q(x - w * 0.62)} ${q(FEET - 3)}`
        + ` Q${q(x - w * 0.9)} ${q(FEET - 5)} ${q(x - w * 0.74)} ${q(ay)} Z`, fc, OUT, 2.4)
      + Array.from({ length: clawN }, (_, i) => {
        const cx = x + (i - (clawN - 1) / 2) * w * 0.46;
        const tw = w * 0.24;
        // toe lobe: a rounded bump hanging off the front of the foot ...
        return p(`M${q(cx - tw)} ${q(FEET - 8)}`
          + ` C${q(cx - tw * 1.12)} ${q(FEET - 1)} ${q(cx + tw * 1.12)} ${q(FEET - 1)} ${q(cx + tw)} ${q(FEET - 8)} Z`,
        fc, OUT, 2.2)
          // ... tipped with a short blunt claw sitting ON the sole line
          + p(`M${q(cx - tw * 0.62)} ${q(FEET - 4.4)}`
            + ` Q${q(cx)} ${q(FEET - 0.2)} ${q(cx + tw * 0.62)} ${q(FEET - 4.4)}`
            + ` Q${q(cx)} ${q(FEET - 2.6)} ${q(cx - tw * 0.62)} ${q(FEET - 4.4)} Z`, claw, OUT, 1.3);
      }).join('');
  };
  return one(-1) + one(1);
}

/** A heavy BROW SHELF: a symmetric pair of raised ridges that overhang the
 *  eyes, plus the frown seam between them. This is what stops a round skull
 *  from reading as a ball with stickers on it. */
function browRidge(cx, y, dx, w, h, c) {
  const q = (v) => Math.round(v * 100) / 100;
  const one = (a) => {
    const bx = cx + a * dx;
    return p(`M${q(bx - a * w)} ${q(y + h * 0.5)}`
      + ` C${q(bx - a * w * 0.5)} ${q(y - h)} ${q(bx + a * w * 0.7)} ${q(y - h * 0.85)} ${q(bx + a * w)} ${q(y + h * 0.1)}`
      + ` C${q(bx + a * w * 0.4)} ${q(y + h * 0.62)} ${q(bx - a * w * 0.45)} ${q(y + h * 0.86)} ${q(bx - a * w)} ${q(y + h * 0.5)} Z`,
    c, OUT, 2.1);
  };
  return one(-1) + one(1);
}

/** QUADRUPED legs: four columns, front pair inset and shorter. */
function quadLegs(c, { top = 100, xs = [26, 44, 76, 94], w = 14, foot = null } = {}) {
  const fc = foot || c;
  return xs.map((x) => rr(x - w / 2, top, w, FEET - top - 3, w * 0.42, c)
    + e(x, FEET - 3, w * 0.72, w * 0.38, fc)).join('');
}

/**
 * QUADRUPED legs WITH MASS. `quadLegs` draws four identical rounded pills,
 * which reads as furniture (the round-9 note on Bulbasaur: "four identical pill
 * legs"). This draws each leg as a tapered column with a hip cap, an outward
 * knee swell + crease, and a broad plantigrade foot whose front edge breaks
 * into blunt CLAWED TOE LOBES - the same anatomy `chunkyLegs` gives bipeds.
 */
function stoutQuadLegs(c, { top = 100, xs = [26, 46, 76, 96], w = 18, foot = null,
  claw = '#fff0c2', clawN = 3, far = null } = {}) {
  const q = (v) => Math.round(v * 100) / 100;
  const one = (x, i) => {
    const hw = w / 2;
    const near = i === 0 || i === 3;         // near pair reads a touch heavier
    const col = near ? c : (far || c);       // far pair sits back in shade
    const fc = foot || col;
    const kw = hw * (near ? 1.2 : 1.06);
    const ay = FEET - 10;                    // ankle line
    const knee = (top + ay) / 2 + 2;
    return p(`M${q(x - hw)} ${q(top)}`
      + ` Q${q(x - hw - 1)} ${q(top - 8)} ${q(x)} ${q(top - 8)}`
      + ` Q${q(x + hw + 1)} ${q(top - 8)} ${q(x + hw)} ${q(top)}`
      + ` C${q(x + kw)} ${q(knee - 4)} ${q(x + kw * 0.94)} ${q(knee + 4)} ${q(x + hw * 0.8)} ${q(ay + 2)}`
      + ` L${q(x - hw * 0.8)} ${q(ay + 2)}`
      + ` C${q(x - kw * 0.94)} ${q(knee + 4)} ${q(x - kw)} ${q(knee - 4)} ${q(x - hw)} ${q(top)} Z`,
    col, OUT, 2.6)
      // knee crease so the column is not a flat tube
      + ln(`M${q(x - hw * 0.56)} ${q(knee + 1)} q${q(hw * 0.56)} ${q(w * 0.15)} ${q(hw * 1.12)} 0`, OUT, 1.4)
      // broad foot: heel mass, front edge notched into toes
      + p(`M${q(x - hw * 1.14)} ${q(ay)} Q${q(x)} ${q(ay - 5)} ${q(x + hw * 1.02)} ${q(ay)}`
        + ` Q${q(x + hw * 1.22)} ${q(FEET - 4.5)} ${q(x + hw * 0.86)} ${q(FEET - 2.6)}`
        + ` L${q(x - hw * 0.98)} ${q(FEET - 2.6)}`
        + ` Q${q(x - hw * 1.34)} ${q(FEET - 4.5)} ${q(x - hw * 1.14)} ${q(ay)} Z`, fc, OUT, 2.4)
      // three blunt claws sitting ON the sole line - the read is "toes", so no
      // extra crease clutter on top of them
      + Array.from({ length: clawN }, (_, k) => {
        const cx = x + (k - (clawN - 1) / 2) * w * 0.4;
        const tw = w * 0.16;
        return p(`M${q(cx - tw)} ${q(FEET - 5.2)}`
          + ` Q${q(cx)} ${q(FEET - 0.6)} ${q(cx + tw)} ${q(FEET - 5.2)}`
          + ` Q${q(cx)} ${q(FEET - 3.6)} ${q(cx - tw)} ${q(FEET - 5.2)} Z`, claw, OUT, 1.2);
      }).join('');
  };
  return xs.map(one).join('');
}

/** Round eyes with a highlight. */
function eyes(lx, rx, y, r = 4.6, iris = '#1b1230') {
  return ef(lx, y, r, r * 1.12, '#ffffff') + ef(rx, y, r, r * 1.12, '#ffffff')
    + ef(lx + 0.4, y + 0.5, r * 0.5, r * 0.6, iris) + ef(rx + 0.4, y + 0.5, r * 0.5, r * 0.6, iris)
    + ef(lx - r * 0.32, y - r * 0.5, r * 0.26, r * 0.28, '#ffffff')
    + ef(rx - r * 0.32, y - r * 0.5, r * 0.26, r * 0.28, '#ffffff');
}

/** Simple dot eyes (dark, no whites) for cartoon faces. */
function dotEyes(lx, rx, y, r = 3.6) {
  return ef(lx, y, r, r * 1.15, OUT) + ef(rx, y, r, r * 1.15, OUT)
    + ef(lx - r * 0.3, y - r * 0.5, r * 0.34, r * 0.34, '#ffffff')
    + ef(rx - r * 0.3, y - r * 0.5, r * 0.34, r * 0.34, '#ffffff');
}

/** Narrow reptile eye: an angled almond with a slit-ish pupil. */
function reptileEyes(lx, rx, y, rw = 5.4, rh = 4.2, sclera = '#ffffff') {
  return ef(lx, y, rw, rh, sclera) + ef(rx, y, rw, rh, sclera)
    + ef(lx + 0.6, y + 0.3, rw * 0.44, rh * 0.86, OUT) + ef(rx + 0.6, y + 0.3, rw * 0.44, rh * 0.86, OUT)
    + ln(`M${lx - rw - 1} ${y - rh - 1.4} q${rw} ${-2.4} ${rw * 2 + 2} 1.4`, OUT, 2.4)
    + ln(`M${rx - rw - 1} ${y - rh - 1.4} q${rw} ${-2.4} ${rw * 2 + 2} 1.4`, OUT, 2.4);
}

const smile = (x, y, w, sw = 2.4) => ln(`M${x - w} ${y} q${w} ${w * 0.85} ${w * 2} 0`, OUT, sw);
const closedEyes = (lx, rx, y, w = 5) =>
  ln(`M${lx - w} ${y} q${w} ${w * 0.9} ${w * 2} 0`, OUT, 2.6)
  + ln(`M${rx - w} ${y} q${w} ${w * 0.9} ${w * 2} 0`, OUT, 2.6);

/** A SELF-LUMINOUS shape (tail flame, aura): drawn on the hull and highlight
 *  passes but skipped by the shading pass, so a fire on the shadow side of the
 *  figure still burns bright instead of going olive-grey. */
const hot = (d, f) => (MODE === 'shade' ? '' : pf(d, f));

/** Glossy highlight on a round body. */
const gloss = (cx, cy, rx, ry) => ef(cx, cy, rx, ry, '#ffffff', 0.16);

/** Two small upper fangs peeking below a closed mouth line (dragon/dino).
 *  Replaces the old vertical "zipper" tick marks, which read as stitching. */
const teeth = (x, y, w, n = 2) => {
  const q = (v) => Math.round(v * 100) / 100;
  const one = (a) => p(`M${q(x + a * w * 0.52)} ${q(y - 1)} l${q(a * 2.6)} 0 l${q(-a * 1.4)} ${q(4.4)} Z`,
    '#fffaf0', OUT, 1.4);
  return one(-1) + one(1) + `<!--${n}-->`;
};

/* ------------------------------------------------------------------ FACES
 * A front-facing muzzle drawn as a soft mass CENTRED on the body midline, with
 * a symmetric nostril pair and a curved mouth. The old build bolted an ellipse
 * onto one side of the skull, which made every dragon look like it was turning
 * its head away mid-photo.
 */
/** @param {number} cx centre-line x @param {number} y muzzle centre y */
function snout(cx, y, w, h, c, under) {
  const q = (v) => Math.round(v * 100) / 100;
  return p(`M${q(cx - w)} ${q(y - h * 0.55)}`
    + ` C${q(cx - w * 0.98)} ${q(y + h * 0.62)} ${q(cx - w * 0.52)} ${q(y + h)} ${q(cx)} ${q(y + h)}`
    + ` C${q(cx + w * 0.52)} ${q(y + h)} ${q(cx + w * 0.98)} ${q(y + h * 0.62)} ${q(cx + w)} ${q(y - h * 0.55)}`
    + ` C${q(cx + w * 0.6)} ${q(y - h * 1.15)} ${q(cx - w * 0.6)} ${q(y - h * 1.15)} ${q(cx - w)} ${q(y - h * 0.55)} Z`,
  c, OUT, 2.4)
    + (under ? pf(`M${q(cx - w * 0.86)} ${q(y + h * 0.2)}`
      + ` C${q(cx - w * 0.8)} ${q(y + h * 0.86)} ${q(cx + w * 0.8)} ${q(y + h * 0.86)} ${q(cx + w * 0.86)} ${q(y + h * 0.2)}`
      + ` C${q(cx + w * 0.5)} ${q(y + h * 0.78)} ${q(cx - w * 0.5)} ${q(y + h * 0.78)} ${q(cx - w * 0.86)} ${q(y + h * 0.2)} Z`,
    under) : '');
}

/** Symmetric nostril pair. */
const nostrils = (cx, y, dx, r = 1.8) =>
  ef(cx - dx, y, r, r * 0.82, OUT) + ef(cx + dx, y, r, r * 0.82, OUT);

/** Wide friendly mouth on the muzzle: a curve with a soft dark inner. */
const grin = (cx, y, w, open = 0) => (open
  ? pf(`M${cx - w} ${y} q${w} ${w * 0.85 + open} ${w * 2} 0 q${-w} ${-open * 0.4} ${-w * 2} 0 Z`, '#5c2338')
    + ln(`M${cx - w} ${y} q${w} ${w * 0.85 + open} ${w * 2} 0`, OUT, 2.4)
  : ln(`M${cx - w} ${y} q${w} ${w * 0.8} ${w * 2} 0`, OUT, 2.4));

/** Symmetric pair of swept horns/ear spikes rooted on the skull. */
function hornPair(cx, y, dx, len, sweep, c, inner) {
  const q = (v) => Math.round(v * 100) / 100;
  const one = (a) => {
    const bx = cx + a * dx;
    return p(`M${q(bx - a * 5)} ${q(y + 3)} Q${q(bx + a * sweep * 0.5)} ${q(y - len * 0.55)}`
      + ` ${q(bx + a * sweep)} ${q(y - len)} Q${q(bx + a * sweep * 0.28)} ${q(y - len * 0.34)}`
      + ` ${q(bx + a * 5)} ${q(y + 2)} Z`, c, OUT, 2.2)
      + (inner ? pf(`M${q(bx + a * sweep * 0.42)} ${q(y - len * 0.5)}`
        + ` Q${q(bx + a * sweep * 0.8)} ${q(y - len * 0.86)} ${q(bx + a * sweep)} ${q(y - len)}`
        + ` Q${q(bx + a * sweep * 0.5)} ${q(y - len * 0.5)} ${q(bx + a * sweep * 0.42)} ${q(y - len * 0.5)} Z`,
      inner) : '');
  };
  return one(-1) + one(1);
}

/**
 * BAT WING (the fix for "flat translucent panes on strut arms" = dragonfly).
 * Built like an actual wing arm: a THICK tapered leading-edge spar
 * (humerus -> elbow -> wrist), a wrist claw, three finger struts fanning back
 * off the wrist, and a membrane stretched between them whose trailing edge is
 * SCALLOPED (concave between finger tips) and anchored to the flank. Held
 * high and swept BACK, so the whole lower flank stays open.
 *
 * @param {number} side  -1 = the figure's left wing, +1 = its right
 * @param {object} c     palette (uses c.wing for bone, c.wingIn for membrane)
 * @param {object} [g]   geometry override: {A,E,W,T:[t1,t2,t3],B}
 */
function batWing(side, c, g = {}) {
  const q = (v) => Math.round(v * 100) / 100;
  const X = (v) => 60 + side * (v - 60);   // mirror about the centre line
  const P = (x, y) => `${q(X(x))} ${q(y)}`;
  const A = g.A || [80, 58];               // shoulder root (kept just OUTSIDE
  //                                          the torso: the shade/lite passes
  //                                          replay hidden geometry, so a wing
  //                                          buried in the chest ghosts through)
  // The elbow is deliberately NOT on the line A->W: a straight leading edge
  // reads as a boom arm carrying a pane (an insect), a bent one reads as a bat.
  const E = g.E || [99, 33];               // elbow
  const W = g.W || [123, -1];              // wrist (the high point)
  const T = g.T || [[137, 16], [131, 42], [112, 65]];  // finger tips
  const B = g.B || [93, 85];               // trailing anchor on the flank
  const scallop = (f, t, k) => {
    const mx = (f[0] + t[0]) / 2 + (W[0] - (f[0] + t[0]) / 2) * k;
    const my = (f[1] + t[1]) / 2 + (W[1] - (f[1] + t[1]) / 2) * k;
    return ` Q${P(mx, my)} ${P(t[0], t[1])}`;
  };
  const spar = (f, t, w0, w1, col, sw = 2.2) => {
    const dx = t[0] - f[0]; const dy = t[1] - f[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L; const ny = dx / L;
    return p(`M${P(f[0] + nx * w0, f[1] + ny * w0)}`
      + ` L${P(t[0] + nx * w1, t[1] + ny * w1)}`
      + ` Q${P(t[0] + (t[0] - f[0]) / L * w1 * 1.4, t[1] + (t[1] - f[1]) / L * w1 * 1.4)}`
      + ` ${P(t[0] - nx * w1, t[1] - ny * w1)}`
      + ` L${P(f[0] - nx * w0, f[1] - ny * w0)} Z`, col, OUT, sw);
  };
  const membrane = `M${P(W[0], W[1])} L${P(T[0][0], T[0][1])}`
    + scallop(T[0], T[1], 0.15) + scallop(T[1], T[2], 0.15) + scallop(T[2], B, 0.12)
    // back up the flank to the shoulder, then out along the BENT leading edge
    // (shoulder -> elbow -> wrist) so the membrane never bulges past the spar
    + ` C${P(96, 78)} ${P(90, 66)} ${P(A[0], A[1])} L${P(E[0], E[1])} Z`;
  return p(membrane, c.wingIn, OUT, 2.6)
    + T.map((t) => spar(W, t, 4.1, 1.7, c.wing, 1.9)).join('')
    + spar(A, E, 8.6, 6, c.wing, 2.4) + spar(E, W, 6, 4.2, c.wing, 2.4)
    // wrist claw
    + p(`M${P(W[0] - 1, W[1] + 4)} Q${P(W[0] + 3, W[1] - 3)} ${P(W[0] + 6, W[1] - 5)}`
      + ` Q${P(W[0] + 4, W[1] + 1)} ${P(W[0] + 4, W[1] + 5)} Z`, '#f7f2e4', OUT, 1.6);
}

/** Rosy cheek blush, symmetric. */
const blush = (cx, y, dx, r, col = '#ff9aa8') =>
  ef(cx - dx, y, r, r * 0.72, col, 0.75) + ef(cx + dx, y, r, r * 0.72, col, 0.75);

export const KIT = {
  p, pf, e, ef, ln, rr, limb, digiLegs, pillarLegs, stubLegs, quadLegs, stoutQuadLegs,
  chunkyLegs, browRidge,
  paw, claw3, wyvernHand, stoutClaw, fist, webHand, padPaw, slimHand,
  eyes, dotEyes, reptileEyes, smile, closedEyes, gloss, teeth,
  snout, nostrils, grin, hornPair, blush, batWing,
};

/* ======================================================= species palettes
 * Roster `color` is a BRAND/kart colour (Dragonite's is a pale gold, which
 * reads wrong on a full-body figure). The podium paints true species colours
 * and falls back to the roster entry for anything not listed. */
const SKIN = Object.freeze({
  charizard: { color: '#fb8b25', accent: '#d1550c', belly: '#fbe6ae', wing: '#f07d1c', wingIn: '#2f93b4' },
  dragonite: { color: '#f4a13c', accent: '#d0761c', belly: '#f9e8c4', wing: '#8fd9ad' },
  lucario: { color: '#3f7fd8', accent: '#171d2e', belly: '#f4d982', spike: '#cfdcee' },
  gengar: { color: '#9160dd', accent: '#4d2a86', belly: '#7a45c8' },
  // deliberately a DARK slate-indigo: the old mid-blue was a near match for
  // Greninja's, so the two land-shark/ninja builds read as one family.
  garchomp: { color: '#3a5580', accent: '#e8433c', belly: '#e8433c' },
  mewtwo: { color: '#e6dff0', accent: '#a488c8', belly: '#cfc0e4' },
  tyranitar: { color: '#6fa84e', accent: '#3c5c8c', belly: '#c9dcae' },
  machamp: { color: '#7fa8d8', accent: '#2b3a5c', belly: '#e9e2d2' },
  blaziken: { color: '#e8543a', accent: '#c22f22', belly: '#f4e2b8' },
  greninja: { color: '#3f7fc8', accent: '#1e3f70', belly: '#dff0ff' },
  rayquaza: { color: '#2f8f5f', accent: '#ffd63b', belly: '#1f6c46' },
  snorlax: { color: '#3f7f8c', accent: '#1d4b56', belly: '#f4ecd0' },
  pikachu: { color: '#ffd63b', accent: '#e8a020', belly: '#ffe98a' },
  charmander: { color: '#f2913a', accent: '#c85a18', belly: '#f7e6c2' },
  squirtle: { color: '#63c2e8', accent: '#2f8fbf', belly: '#f4e2b8' },
  bulbasaur: { color: '#6fc8b0', accent: '#3f8a6c', belly: '#8fd35f' },
});

function pal(racer) {
  const base = {
    color: racer.color || '#7fc4ff',
    accent: racer.accent || '#2b5aa8',
    kart: racer.kart || racer.color || '#7fc4ff',
    belly: '#f6ecd6',
    wing: racer.accent || '#2b5aa8',
    wingIn: '#9fd6ea',
    spike: '#dfe8f6',
  };
  return Object.assign(base, SKIN[racer.id] || null);
}

/* =========================================================== the 24 poses */
/* Each entry: (c) => svg body markup, where c = pal(racer).                 */
const POSE = Object.create(null);

/* -- CHARIZARD -----------------------------------------------------------
 * Round 7 fix - "the orange dragonfly". The previous build hung flat
 * straight-edged translucent panes off thin strut arms, wore two long
 * whisker-antennae, and stood on toothpick limbs tipped with long spidery
 * white points; the whole read was an insect, not a dragon. Now:
 *   - WINGS come from `batWing()`: a thick tapered arm spar with a real elbow
 *     bend along the leading edge, three finger struts fanning off the wrist,
 *     a wrist claw, and a membrane with a SCALLOPED trailing edge, held high
 *     and swept back.
 *   - ONE stout occipital horn angled up and back off the skull (no pair).
 *   - TRUNK limbs: heavy thighs/shins, thick arms, and `stoutClaw()` mitts
 *     with three SHORT BLUNT claws (no ivory needles).
 * Everything below still holds from the earlier "winged Dragonite recolor"
 * fix: a LEAN, TALL WYVERN.
 * Nothing about this build may echo Dragonite's: the torso is an athletic
 * hourglass (deep chest, pinched waist) instead of a barrel, the belly plate
 * is SMOOTH and narrow instead of a segmented cream ladder, the skull is
 * small and carried high on a LONG EXPOSED NECK instead of sunk on the
 * shoulders, the muzzle is a long tapering wedge instead of a blunt plate,
 * the legs are digitigrade with orange raptor feet instead of cream
 * pillar boots, and the tail sweeps clear of the hips so its flame burns as a
 * SEPARATE torch in open air, well below the wingspan.
 */
POSE.charizard = (c) => ''
  // WINGS: real bat wings - a THICK tapered arm spar along the leading edge,
  // three finger struts fanning off the wrist, a scalloped trailing edge, and
  // a wrist claw. Held high and swept BACK so the right flank below y=60 stays
  // open for the tail torch.
  + batWing(-1, c) + batWing(1, c)
  // TAIL: a long tapering whip off the right hip, held clear of the body so
  // the flame reads as its own separate torch and not a smear on the wing.
  + p('M68 94 C94 106 116 104 125 92 C128 90 131 91 131 94'
    + ' C130 102 124 108 116 112 C100 119 80 116 64 106 Z', c.color)
  + hot('M128 95 C114 82 118 58 130 46 C126 61 137 64 138 51 C142 71 138 89 129 99 Z', '#ff7a18')
  + hot('M129 93 C119 81 122 62 131 51 C128 63 137 66 137 55 C140 73 136 87 129 96 Z', '#ffc22a')
  + hot('M130 89 C123 79 126 65 132 57 C130 66 136 68 136 60 C139 74 135 84 131 91 Z', '#fff0a0')
  // TRUNK raptor legs - heavy thighs and thick shins, ORANGE feet with short
  // pale talons (Dragonite wears cream pillar boots; these are not toothpicks)
  + digiLegs(c.color, {
    hip: 92, spread: 17, thigh: 23, shin: 15, footW: 1.12, clawLen: 0.72,
    foot: c.color, claw: '#fff0c2',
  })
  // LONG NECK: a genuinely EXPOSED column of daylight between the jaw and the
  // shoulders - the single clearest way to read "wyvern", not "fat dragon".
  + p('M53 36 C50 46 48 56 48 64 L72 64 C72 56 70 46 67 36 Z', c.color)
  + pf('M56 44 C55 51 55 58 56 64 L64 64 C65 58 65 51 64 44 Z', c.belly)
  // ATHLETIC HOURGLASS torso: deep chest, pinched waist, tight hips
  + p('M46 58 C40 63 38 68 38 75 C38 82 44 87 46 94 C47 99 43 101 43 105'
    + ' C43 109 50 111 60 111 C70 111 77 109 77 105 C77 101 73 99 74 94'
    + ' C76 87 82 82 82 75 C82 68 80 63 74 58 C66 54 54 54 46 58 Z', c.color)
  // SMOOTH narrow belly plate - deliberately no segment ladder
  + pf('M49 63 C45 70 45 80 48 90 C50 97 46 100 47 105 C52 108 68 108 73 105'
    + ' C74 100 70 97 72 90 C75 80 75 70 71 63 C64 60 56 60 49 63 Z', c.belly)
  + ln('M60 65 C58 78 58 92 60 103', '#e6d2a6', 1.8)
  // TRUNK arms: thick through the deltoid and forearm, ending in heavy mitts
  // with short blunt claws (no spidery ivory needles)
  // (a SHORT shoulder burial: the shade/lite passes replay hidden geometry,
  // so a deeply buried root paints a ghost harness across the chest)
  + limb(43, 66, 31, 91, 11.5, c.color, 8.4, stoutClaw, 0.55)
  + limb(77, 66, 89, 91, 11.5, c.color, 8.4, stoutClaw, 0.55)
  // ONE stout horn off the BACK of the skull - thick at the root, tapering to
  // a blunt point, angled up and BACK. Drawn BEHIND the head so its root is
  // buried in the skull mass (Charizard has a single occipital horn; the old
  // symmetric pair read as insect antennae).
  + p('M68 2 Q84 -7 96 -6 Q84 1 76 12 Q71 8 68 2 Z', c.color)
  + pf('M74 1 Q84 -4 93 -5 Q84 0 78 8 Q76 4 74 1 Z', c.accent)
  // HEAD: ONE tapering wedge - broad brow narrowing to a pointed snout. Drawn
  // as a single path so no "muzzle plate" is ever bolted onto a round skull.
  + p('M42 12 C42 -1 50 -7 60 -7 C70 -7 78 -1 78 12 C78 21 75 27 71 32'
    + ' C69 38 66 43 60 43 C54 43 51 38 49 32 C45 27 42 21 42 12 Z', c.color)
  + pf('M53 31 C54 38 56 43 60 43 C64 43 66 38 67 31 C64 35 56 35 53 31 Z', c.belly)
  + ln('M50 29 C54 36 66 36 70 29', OUT, 2.2)
  + teeth(60, 34, 6, 2)
  + ef(58.1, 38.5, 1.1, 1.4, OUT) + ef(61.9, 38.5, 1.1, 1.4, OUT)
  + gloss(52, 4, 8, 4.6)
  + reptileEyes(51, 69, 16, 5.6, 4.2);

/* -- DRAGONITE -----------------------------------------------------------
 * Plan: the opposite build to Charizard - a FAT round barrel that is almost
 * all torso, a TINY head sunk onto the shoulders with a blunt muzzle, one
 * pointed horn, two antennae, small stubby green wings, pillar legs.
 */
POSE.dragonite = (c) => ''
  // small rounded wings tucked low behind the shoulders, well clear of the head
  + p('M42 74 C28 70 14 58 8 42 C24 42 40 52 50 66 Z', c.wing)
  + p('M78 74 C92 70 106 58 112 42 C96 42 80 52 70 66 Z', c.wing)
  + ln('M44 71 L13 45 M44 73 L22 58 M76 71 L107 45 M76 73 L98 58', '#5aa87c', 2.4)
  // thick tapering tail
  + p('M82 106 C104 106 114 92 110 74 C108 64 102 58 98 54 C104 68 104 84 94 90'
    + ' C88 94 82 96 76 96 Z', c.color)
  + pillarLegs(c.color, { top: 100, spread: 22, w: 24, foot: c.belly })
  // BARREL: widest at the belly, shoulders rounded in
  + p('M60 44 C86 44 100 64 100 88 C100 110 82 120 60 120 C38 120 20 110 20 88'
    + ' C20 64 34 44 60 44 Z', c.color)
  + pf('M42 66 C34 80 34 100 40 110 C52 118 68 118 80 110 C86 100 86 80 78 66'
    + ' C66 60 54 60 42 66 Z', c.belly)
  + ln('M40 84 h40 M42 97 h36 M45 108 h30', '#e6d0a4', 2.2)
  // chunky arms with three claws
  + limb(36, 54, 11, 76, 12, c.color, 9.5, claw3) + limb(84, 54, 109, 76, 12, c.color, 9.5, claw3)
  // SYMMETRIC antennae, rooted behind the crown and curling outward
  + ln('M50 20 C40 8 36 2 31 -1 M70 20 C80 8 84 2 89 -1', c.color, 4.8)
  + e(29, -2, 5, 4.6, c.color) + e(91, -2, 5, 4.6, c.color)
  // small round head sunk onto the shoulders, muzzle drawn ON the midline
  + p('M38 32 C38 17 48 9 60 9 C72 9 82 17 82 32 C82 44 74 52 60 52'
    + ' C46 52 38 44 38 32 Z', c.color)
  // one blunt centred horn
  + p('M60 9 C58 2 58 -3 60 -8 C62 -3 62 2 62 9 Z', c.color)
  + p('M54 12 C56 3 58 -2 60 -8 C62 -1 63 4 65 12 Z', c.color)
  // FACE (round 6 rebuild - the flat two-nostril PIG MUZZLE is gone):
  // a short rounded snout bump that is NARROWER than the skull and sits high
  // on it, a soft cream chin, hairline nostril slits instead of dark discs,
  // and a wide friendly mouth whose corners run out past the snout.
  + p('M51 32 C48 42 52 51 60 51 C68 51 72 42 69 32 C65 28 55 28 51 32 Z', c.color)
  + pf('M53 43 C55 48 65 48 67 43 C64 46 56 46 53 43 Z', c.belly)
  + ln('M56.6 36 q1.4 1.8 2.6 0 M60.8 36 q1.4 1.8 2.6 0', OUT, 1.5)
  + ln('M45 40 C50 52 70 52 75 40', OUT, 2.8)
  + ln('M60 51 v3', OUT, 1.6)
  + gloss(50, 20, 11, 6)
  // BIG kind oval eyes set close under a soft brow - Dragonite's whole read
  + ef(50, 26, 5.6, 6.8, '#ffffff') + ef(70, 26, 5.6, 6.8, '#ffffff')
  + ef(50.7, 27.2, 3.1, 4.4, OUT) + ef(70.7, 27.2, 3.1, 4.4, OUT)
  + ef(48.4, 23.2, 1.9, 1.9, '#ffffff') + ef(68.4, 23.2, 1.9, 1.9, '#ffffff')
  + blush(60, 36, 20, 4.6, '#f7b06a');

/* -- LUCARIO -------------------------------------------------------------
 * Plan: lean athletic jackal - narrow waist, broad shoulders, LONG muzzle
 * cut into the skull path, black mask, two ear spikes plus two dangling
 * sensors, a real cone chest spike, digitigrade legs with black thighs.
 */
POSE.lucario = (c) => ''
  + p('M74 96 C92 100 100 116 96 126 C90 112 80 108 70 110 Z', c.accent)  // tail
  + digiLegs(c.color, { hip: 94, spread: 17, thigh: 16, foot: c.belly, claw: c.accent })
  // black shorts / hips
  + pf('M40 90 q20 -8 40 0 q3 14 -3 20 q-17 7 -34 0 q-6 -6 -3 -20 Z', c.accent)
  // HOURGLASS torso: wide shoulders, pinched waist
  + p('M40 58 C34 66 32 74 34 80 C36 86 44 90 44 96 C44 102 50 106 60 106'
    + ' C70 106 76 102 76 96 C76 90 84 86 86 80 C88 74 86 66 80 58'
    + ' C70 52 50 52 40 58 Z', c.color)
  // YELLOW chest fur - a shaggy ruff with three points, not a smooth belly plate
  + p('M40 60 C48 54 72 54 80 60 C82 72 78 84 74 90 L68 80 L60 92 L52 80 L46 90'
    + ' C42 84 38 72 40 60 Z', c.belly)
  + ln('M50 66 v10 M60 64 v12 M70 66 v10', '#d8b552', 2)
  // cone chest spike
  + p('M60 60 L52 80 L68 80 Z', c.spike)
  + pf('M60 64 L56 79 L60 80 Z', '#ffffff')
  // long lean arms, fused at the shoulder, ending in BLACK gloved fists
  + limb(38, 62, 21, 88, 10, c.color, 8.5, (x, y, r) => fist(x, y, r, c.accent))
  + limb(82, 62, 99, 88, 10, c.color, 8.5, (x, y, r) => fist(x, y, r, c.accent))
  + p('M14 86 L1 76 L16 80 Z', c.spike) + p('M106 86 L119 76 L104 80 Z', c.spike)
  // two short aura sensors dangling off the back of the head
  + ln('M42 48 C33 56 30 66 32 74', c.accent, 4.6)
  + ln('M78 48 C87 56 90 66 88 74', c.accent, 4.6)
  // SKULL: front on, tapering to the jaw
  + p('M35 32 C35 16 46 8 60 8 C74 8 85 16 85 32 C85 46 77 57 60 57'
    + ' C43 57 35 46 35 32 Z', c.color)
  // two ear spikes swept up and back, symmetric
  + hornPair(60, 14, 17, 22, 12, c.color, c.accent)
  // narrow black bandit mask across the eyes only - the skull stays blue
  + pf('M35 26 C50 33 70 32 85 27 C85 36 77 41 60 41 C43 41 36 35 35 26 Z', c.accent)
  // CENTRED jackal muzzle with a black nose
  + snout(60, 46, 12, 8, c.color, c.belly)
  + ef(60, 41.5, 3.2, 2.6, OUT)
  + grin(60, 49, 5.5)
  + ef(48, 32, 5, 4.4, '#e8433c') + ef(72, 32, 5, 4.4, '#e8433c')
  + ef(46.8, 30.6, 2.1, 2.1, '#ffd7d2') + ef(70.8, 30.6, 2.1, 2.1, '#ffd7d2');

/* -- GENGAR --------------------------------------------------------------
 * Plan: NO neck and NO separate head - one squat pear mass carrying the face,
 * ringed with back spikes, on tiny splayed clawed feet. Widest at the hips.
 */
POSE.gengar = (c) => ''
  + [[24, 56], [36, 40], [52, 30], [68, 30], [84, 40], [96, 56]].map(([x, y]) =>
    p(`M${x} ${y + 22} L${x + (x < 60 ? -7 : 7)} ${y - 14} L${x + (x < 60 ? 12 : -12)} ${y + 18} Z`,
      c.accent)).join('')
  + stubLegs(c.color, { top: 108, spread: 25, w: 26, foot: c.accent })
  + ln('M26 120 l-6 6 M35 122 l0 7 M44 120 l6 6', c.accent, 3)
  + ln('M76 120 l-6 6 M85 122 l0 7 M94 120 l6 6', c.accent, 3)
  // one mass: head and body are the same pear
  + p('M60 22 C88 22 104 50 103 82 C102 106 84 118 60 118 C36 118 18 106 17 82'
    + ' C16 50 32 22 60 22 Z', c.color)
  + limb(25, 64, 7, 90, 13, c.color, 9.5, claw3) + limb(95, 64, 113, 90, 13, c.color, 9.5, claw3)
  + gloss(42, 46, 17, 11)
  + ef(44, 56, 9.4, 10, '#ffffff') + ef(78, 56, 9.4, 10, '#ffffff')
  + ef(45, 58, 4.6, 5, '#e8433c') + ef(79, 58, 4.6, 5, '#e8433c')
  + ef(41.6, 53, 2.6, 2.6, '#ffd7d2') + ef(75.6, 53, 2.6, 2.6, '#ffd7d2')
  + p('M28 76 q32 34 64 0 q-32 13 -64 0 Z', '#f7f2ff', OUT, 2.4)
  + ln('M38 80 v9 M48 84 v10 M60 86 v10 M72 84 v10 M82 80 v9', OUT, 2);

/* -- SNORLAX -------------------------------------------------------------
 * Plan: a seated mountain - no legs at all, feet folded forward, cream belly
 * covering most of the front, sleepy closed eyes, tiny ears. Widest species.
 */
POSE.snorlax = (c) => ''
  + e(60, 92, 47, 40, c.color)
  + p('M22 106 C6 108 -2 116 2 124 C8 130 24 128 30 118 Z', c.color)
  + p('M98 106 C114 108 122 116 118 124 C112 130 96 128 90 118 Z', c.color)
  + p('M28 90 C24 108 30 122 42 126 C56 130 72 129 84 124 C94 118 96 104 92 90'
    + ' C76 78 44 78 28 90 Z', c.belly)
  + e(18, 120, 17, 10, c.belly) + e(102, 120, 17, 10, c.belly)
  + [[10, 118], [17, 115], [24, 118]].map(([x, y]) => ef(x, y, 3.2, 2.8, c.accent)).join('')
  + [[96, 118], [103, 115], [110, 118]].map(([x, y]) => ef(x, y, 3.2, 2.8, c.accent)).join('')
  + e(60, 52, 36, 30, c.color)
  + p('M30 40 L18 18 L42 30 Z', c.color) + p('M90 40 L102 18 L78 30 Z', c.color)
  + gloss(44, 38, 14, 8)
  + closedEyes(46, 74, 50, 7)
  + p('M44 64 q16 16 32 0 q-16 7 -32 0 Z', '#3a2033', OUT, 2.2)
  + ln('M22 70 q7 5 14 0 M84 70 q7 5 14 0', c.accent, 2.4);

/* -- PIKACHU -------------------------------------------------------------
 * Plan: tiny mouse - head as tall as the body, no neck, huge black-tipped
 * ears, cheek discs, stub arms, stub legs, a hard-angled lightning tail.
 */
POSE.pikachu = (c) => ''
  + p('M78 106 L98 96 L86 86 L110 72 L98 92 L116 88 L86 116 Z', c.color)
  + pf('M78 106 L92 100 L84 92 Z', '#8a5a1e')
  // knee'd legs on three-toed feet: the pill stubs made the legs furniture and
  // left the cheeks + tail carrying the whole species read
  + chunkyLegs(c.color, { top: 104, spread: 16, w: 15, foot: c.color, claw: '#c98b1e' })
  + e(60, 96, 28, 26, c.color)
  + ef(60, 102, 19, 17, c.belly, 0.75)
  + limb(38, 86, 24, 102, 8, c.color, 6.5, padPaw) + limb(82, 86, 96, 102, 8, c.color, 6.5, padPaw)
  + p('M44 40 L28 -2 L56 26 Z', c.color) + p('M76 40 L92 -2 L64 26 Z', c.color)
  + pf('M28 -2 L38 18 L34 -1 Z', '#2b2338') + pf('M92 -2 L82 18 L86 -1 Z', '#2b2338')
  + e(60, 58, 30, 27, c.color)
  + gloss(48, 44, 13, 8)
  + ef(34, 68, 7.8, 7, '#e8433c') + ef(86, 68, 7.8, 7, '#e8433c')
  + dotEyes(49, 71, 53, 4.8)
  // small MOUSE MUZZLE + button nose: the head was a smooth ball whose only
  // cues were the cheek discs and the tail
  + snout(60, 69, 9.5, 5.5, c.color, c.belly)
  + pf('M60 64.5 l-3.6 -3.6 h7.2 Z', OUT) + smile(60, 68, 7);

/* -- MEWTWO --------------------------------------------------------------
 * Plan: tall and gaunt - oversized cranium, a tube running from the skull to
 * the spine, very narrow shoulders and waist, long thin limbs, thick tail.
 */
POSE.mewtwo = (c) => ''
  + ln('M74 102 C104 104 110 78 98 62', c.accent, 9)
  + digiLegs(c.color, { hip: 94, spread: 15, thigh: 14, foot: c.accent })
  + p('M46 54 C40 66 40 82 44 96 C50 106 70 106 76 96 C80 82 80 66 74 54'
    + ' C66 48 54 48 46 54 Z', c.color)
  + pf('M50 62 C47 72 47 84 50 92 C56 98 64 98 70 92 C73 84 73 72 70 62'
    + ' C64 58 56 58 50 62 Z', c.accent)
  + limb(44, 60, 24, 88, 9.5, c.color, 6.8, slimHand, 0.4)
  + limb(76, 60, 96, 88, 9.5, c.color, 6.8, slimHand, 0.4)
  + ln('M68 22 C92 28 94 48 84 58', c.accent, 6)
  // EAR HORNS: a swept pair rooted on the temples (drawn behind the skull)
  + hornPair(60, 16, 23, 13, 5, c.color, c.accent)
  // big cranium: the lower half draws IN to a narrow muzzle root instead of
  // closing as a circle, so the snout below breaks the outline
  + p('M60 2 C80 2 90 18 90 34 C90 45 84 52 74 55'
    + ' C69 56.5 51 56.5 46 55 C36 52 30 45 30 34 C30 18 40 2 60 2 Z', c.color)
  + p('M60 -6 q11 2 9 12 q-9 5 -18 0 q-2 -10 9 -12 Z', c.color)
  // FELINE MUZZLE + heavy chin: the psychic cat has a short blunt snout, and
  // without it this head was a white balloon identifiable only by its tail.
  + snout(60, 56, 12, 9, c.color, c.belly)
  + ln('M60 54.6 v3.2 M60 57.8 q-4.4 3.8 -8 0.4 M60 57.8 q4.4 3.8 8 0.4', OUT, 1.9)
  + browRidge(60, 26, 12.5, 8, 4.4, c.color)
  + gloss(46, 14, 12, 8)
  + ef(46, 32, 5.6, 6.4, '#b58cff') + ef(74, 32, 5.6, 6.4, '#b58cff')
  + ef(46, 32, 2.6, 4.2, OUT) + ef(74, 32, 2.6, 4.2, OUT);

/* -- GARCHOMP : land shark - jet fins off the head AND arms, red belly ---- */
POSE.garchomp = (c) => ''
  + p('M78 100 C104 100 116 84 112 64 C110 54 104 46 98 40 C106 56 106 74 94 84'
    + ' C86 90 80 94 72 94 Z', c.color)
  + pf('M100 74 C110 62 108 48 102 40 C114 52 112 70 104 78 Z', c.accent)
  + digiLegs(c.color, { hip: 96, spread: 19, thigh: 18, foot: '#e9eef7' })
  + p('M42 56 C36 72 34 92 40 106 C50 116 70 116 80 106 C86 92 84 72 78 56'
    + ' C68 50 52 50 42 56 Z', c.color)
  + pf('M48 66 C44 80 44 96 48 104 C56 110 64 110 72 104 C76 96 76 80 72 66'
    + ' C64 61 56 61 48 66 Z', c.belly)
  // arm blades
  + p('M42 62 C22 54 6 68 12 84 C24 76 34 76 44 82 Z', c.color)
  + p('M78 62 C98 54 114 68 108 84 C96 76 86 76 76 82 Z', c.color)
  + ln('M16 78 L38 68 M110 78 L88 68', '#cfe0f5', 2.2)
  // flat shark head with a wide jaw + swept head fins
  + p('M32 34 C32 18 44 10 60 10 C76 10 88 18 88 34 C88 48 76 58 60 58'
    + ' C44 58 32 48 32 34 Z', c.color)
  + p('M34 26 C10 16 2 26 4 38 C20 38 28 34 38 32 Z', c.color)
  + p('M86 26 C110 16 118 26 116 38 C100 38 92 34 82 32 Z', c.color)
  + pf('M46 18 q14 -7 28 0 q-14 -3 -28 0 Z', c.accent)
  + p('M34 40 C46 52 74 52 86 40 C84 52 74 58 60 58 C46 58 36 52 34 40 Z', '#f6f2ea', OUT, 2.2)
  + teeth(60, 44, 20, 6)
  + ef(46, 32, 5.6, 4.2, '#ffd63b') + ef(74, 32, 5.6, 4.2, '#ffd63b')
  + ef(46, 32, 2.5, 3.6, OUT) + ef(74, 32, 2.5, 3.6, OUT);

/* -- MACHAMP -------------------------------------------------------------
 * Round-3 audit - the figure was identifiable ONLY by its accessory (four
 * arms): a smooth ball head with a grin printed on it, four hairline limbs
 * ending in identical pale mitts, and one flat cream oval for a front.
 * Regeared like Charmander/Blaziken:
 *   - The SKULL steps in at the cheeks and a WIDE LIPPED MUZZLE projects below
 *     it - Machamp's signature heavy jaw with a raised upper lip, a hard mouth
 *     seam, corner creases and a chin plate.
 *   - Three BROWN crown ridges (they were body-blue, i.e. invisible), dark eye
 *     masks around small white eyes, and a brow shelf.
 *   - The front is now anatomy: two PEC slabs with a sternum seam over a
 *     three-band abdomen, not one cream oval.
 *   - All four arms are markedly thicker, and the dark trunks carry a belt.
 */
POSE.machamp = (c) => {
  const ridge = '#a8763c';              // the three brown crown ridges
  const trunks = '#2b2338';
  return ''
    + pillarLegs(c.color, { top: 100, spread: 19, w: 22, foot: c.belly })
    // upper arms flexed overhead - THICK
    + limb(38, 58, 11, 34, 13, c.color, 10, fist)
    + limb(82, 58, 109, 34, 13, c.color, 10, fist)
    // massive trapezoid torso
    + p('M34 52 C30 68 30 88 36 104 C48 114 72 114 84 104 C90 88 90 68 86 52'
      + ' C72 42 48 42 34 52 Z', c.color)
    // PEC SLABS: two shaped chest masses with a sternum seam between them
    + [-1, 1].map((s) => pf(`M60 ${58} C${60 + 5 * s} 55 ${60 + 17 * s} 56 ${60 + 20 * s} 62`
      + ` C${60 + 22 * s} 68 ${60 + 18 * s} 75 ${60 + 12 * s} 76`
      + ` C${60 + 5 * s} 77 60 74 60 70 Z`, c.belly)).join('')
    + ln('M60 57 v20', '#b9ae98', 2.2)
    + ln('M42 77 C50 82 70 82 78 77', '#b9ae98', 2)
    // three-band abdomen under the pecs
    + pf('M46 79 C43 88 43 98 47 105 C53 109 67 109 73 105 C77 98 77 88 74 79'
      + ' C66 76 54 76 46 79 Z', c.belly)
    + ln('M60 80 v25 M47 88 C53 92 67 92 73 88 M48 97 C54 101 66 101 72 97', '#b9ae98', 1.8)
    // lower arms - THICK
    + limb(40, 74, 15, 94, 11.5, c.color, 9, fist)
    + limb(80, 74, 105, 94, 11.5, c.color, 9, fist)
    // dark trunks with a belt line
    + rr(37, 104, 46, 15, 5, trunks)
    + ln('M38 109 h44', '#6d6284', 2.4)
    // ------------------------------------------------------------------ HEAD
    // three BROWN crown ridges (they used to be painted in body blue)
    + p('M46 13 L41 -3 L54 8 Z', ridge) + p('M60 9 L60 -7 L69 6 Z', ridge)
    + p('M74 13 L79 -3 L66 8 Z', ridge)
    // SKULL: dome that pulls IN at the cheeks and stops above the chin
    + p('M38 26 C38 10 47 2 60 2 C73 2 82 10 82 26'
      + ' C82 33 79 37 73 38.5 C68 40 52 40 47 38.5'
      + ' C41 37 38 33 38 26 Z', c.color)
    // MUZZLE: a WIDE heavy lipped jaw projecting past that step
    + p('M40 35 C36 45 43 55 60 55 C77 55 84 45 80 35'
      + ' C70 41 50 41 40 35 Z', c.color)
    // raised upper lip + the hard mouth seam + corner creases + chin plate
    + pf('M42 41 C48 46 72 46 78 41 C74 48 46 48 42 41 Z', c.belly)
    + ln('M42.5 42.5 C49 48.5 71 48.5 77.5 42.5', OUT, 2.8)
    + ln('M44 43 q-1.5 4 0.5 6 M76 43 q1.5 4 -0.5 6', OUT, 1.8)
    + pf('M47 51 C52 54.5 68 54.5 73 51 C69 55.5 51 55.5 47 51 Z', c.belly)
    + ef(55.6, 37.4, 1.7, 1.3, OUT) + ef(64.4, 37.4, 1.7, 1.3, OUT)
    // jaw hinges
    + ef(40.5, 36.5, 4.2, 3.4, c.color) + ef(79.5, 36.5, 4.2, 3.4, c.color)
    // dark EYE MASKS with small white eyes inside, under a brow shelf
    + browRidge(60, 20, 10.5, 7.4, 3.5, c.color)
    + ef(49, 27, 7.4, 5.4, c.accent) + ef(71, 27, 7.4, 5.4, c.accent)
    + ef(49.5, 26.6, 4, 3.6, '#ffffff') + ef(70.5, 26.6, 4, 3.6, '#ffffff')
    + ef(50, 27, 1.9, 2.6, OUT) + ef(71, 27, 1.9, 2.6, OUT)
    + gloss(48, 12, 11, 5.6);
};

/* -- TYRANITAR : armour plates, back spikes, thick tail, diamond belly ---- */
POSE.tyranitar = (c) => ''
  + p('M80 106 C108 106 120 90 114 70 C112 60 106 54 102 50 C108 66 106 82 94 90'
    + ' C88 94 82 98 74 98 Z', c.color)
  + [[30, 44], [46, 32], [66, 32], [82, 44]].map(([x, y]) =>
    p(`M${x} ${y + 16} L${x + (x < 60 ? -5 : 5)} ${y - 10} L${x + (x < 60 ? 12 : -12)} ${y + 14} Z`,
      c.accent)).join('')
  + pillarLegs(c.color, { top: 96, spread: 22, w: 24, foot: c.accent })
  + p('M34 48 C28 68 28 90 34 106 C48 118 72 118 86 106 C92 90 92 68 86 48'
    + ' C70 38 50 38 34 48 Z', c.color)
  + [[60, 66], [60, 84], [44, 75], [76, 75]].map(([x, y]) =>
    p(`M${x} ${y - 9} l9 9 l-9 9 l-9 -9 Z`, c.belly)).join('')
  + limb(32, 60, 12, 84, 12, c.color, 9, claw3) + limb(88, 60, 108, 84, 12, c.color, 9, claw3)
  + p('M34 28 C34 14 46 6 60 6 C74 6 86 14 86 28 C86 42 74 52 60 52'
    + ' C46 52 34 42 34 28 Z', c.color)
  + p('M60 -2 l-8 12 h16 Z', c.accent)
  + p('M34 22 L16 10 L36 16 Z', c.accent) + p('M86 22 L104 10 L84 16 Z', c.accent)
  + p('M36 34 C46 46 74 46 84 34 C82 46 72 52 60 52 C48 52 38 46 36 34 Z', '#f6f2ea', OUT, 2.2)
  + teeth(60, 38, 18, 5)
  + ef(46, 26, 5.2, 4, '#e8433c') + ef(74, 26, 5.2, 4, '#e8433c')
  + ef(46, 26, 2.3, 3.2, OUT) + ef(74, 26, 2.3, 3.2, OUT);

/* -- RAYQUAZA : legless serpent, coiled body, ringed fins, blade jaw ------ */
POSE.rayquaza = (c) => {
  const spine = 'M92 122 C40 132 16 108 46 96 C90 82 106 72 74 62 C46 54 46 36 60 26';
  return ''
    + ln(spine, OUT, 28)
    + ln(spine, c.color, 22)
    + ln('M62 124 h11 M32 106 h10 M64 88 h11 M94 70 h10 M60 50 h11 M54 36 h11', c.accent, 4.6)
    + p('M28 92 L18 72 L44 88 Z', c.accent) + p('M86 72 L100 54 L94 80 Z', c.accent)
    + p('M42 34 L20 18 L46 26 Z', c.accent) + p('M78 34 L100 18 L74 26 Z', c.accent)
    + p('M36 18 C36 8 46 2 60 2 C76 2 88 10 88 20 C88 32 74 40 58 40'
      + ' C44 40 36 30 36 18 Z', c.color)
    + p('M60 0 C46 -6 34 -2 32 6 C44 4 54 6 60 10 Z', c.accent)
    + p('M60 0 C74 -6 86 -2 88 6 C76 4 66 6 60 10 Z', c.accent)
    + pf('M38 22 C48 32 74 32 84 22 C82 34 72 40 58 40 C46 40 39 32 38 22 Z', c.accent)
    + ef(48, 16, 5.4, 4.4, c.accent) + ef(74, 16, 5.4, 4.4, c.accent)
    + ef(48, 16, 2.4, 3.4, OUT) + ef(74, 16, 2.4, 3.4, OUT);
};

/* -- GRENINJA ------------------------------------------------------------
 * Plan: a slim CROUCHED FROG NINJA. Frog legs (knees flung out sideways, long
 * shins tucked under, big three-toed webbed feet) - nothing else on the roster
 * squats like this. Wide flat amphibian skull with the eyes far apart at the
 * TOP corners, no ears at all; the head crest sweeps BACK and DOWN like wet
 * hair. Pink tongue scarf knotted at the throat with two long trailing ends,
 * and long webbed hands. Reads frog, not cat.
 */
POSE.greninja = (c) => {
  // crouched frog leg: knee up and OUT past the shoulder, shin folded back in
  const leg = (s) => p(`M${60 + 8 * s} 82 C${60 + 30 * s} 78 ${60 + 42 * s} 92 ${60 + 38 * s} 106`
    + ` C${60 + 36 * s} 116 ${60 + 26 * s} 118 ${60 + 20 * s} 114`
    + ` C${60 + 26 * s} 108 ${60 + 26 * s} 96 ${60 + 16 * s} 94`
    + ` C${60 + 8 * s} 92 ${60 + 4 * s} 88 ${60 + 8 * s} 82 Z`, c.color)
    // long shin dropping to the sole
    + p(`M${60 + 34 * s} 104 C${60 + 40 * s} 112 ${60 + 40 * s} 120 ${60 + 34 * s} ${FEET - 4}`
      + ` l${-12 * s} 0 C${60 + 16 * s} 118 ${60 + 16 * s} 108 ${60 + 20 * s} 102 Z`, c.color)
    // big webbed three-toed foot
    + p(`M${60 + 12 * s} ${FEET - 6} q${22 * s} -3 ${28 * s} 5 q${2 * s} 7 ${-6 * s} 7`
      + ` l${-22 * s} 0 q${-6 * s} -2 ${-6 * s} -6 Z`, c.belly)
    + ln(`M${60 + 22 * s} ${FEET - 2} v5 M${60 + 31 * s} ${FEET - 3} v5`, c.accent, 1.8);
  return ''
    // scarf ends stream out BEHIND the body first, so they never read as limbs
    + p('M50 52 C32 62 20 84 16 110 C26 106 30 96 34 88 C38 76 44 64 54 58 Z', '#f4b8cf')
    + p('M70 52 C88 62 100 84 104 110 C94 106 90 96 86 88 C82 76 76 64 66 58 Z', '#f4b8cf')
    + leg(-1) + leg(1)
    // slim streamlined torso, narrow at the waist
    + p('M46 54 C41 68 40 84 46 96 C52 104 68 104 74 96 C80 84 79 68 74 54'
      + ' C68 48 52 48 46 54 Z', c.color)
    + pf('M51 62 C48 74 48 86 51 93 C56 99 64 99 69 93 C72 86 72 74 69 62'
      + ' C64 58 56 58 51 62 Z', c.belly)
    // long slim arms held out, ending in big splayed webbed hands
    + limb(46, 62, 22, 82, 7, c.color, 6.4, webHand)
    + limb(74, 62, 98, 82, 7, c.color, 6.4, webHand)
    // TONGUE SCARF: a fat pink collar sitting ON the chest, below the jaw, so it
    // is never swallowed by the skull above it
    + p('M34 56 C44 50 76 50 86 56 C84 70 72 76 60 76 C48 76 36 70 34 56 Z', '#f7c9dc')
    + ef(60, 62, 9, 7, '#e58fb0')
    + ln('M40 60 C48 66 72 66 80 60', '#e58fb0', 2)
    // WIDE FLAT FROG SKULL - broad jaw, low dome, eyes at the top corners
    + p('M26 40 C26 22 40 12 60 12 C80 12 94 22 94 40 C94 52 80 60 60 60'
      + ' C40 60 26 52 26 40 Z', c.color)
    // dark crest sweeping back and DOWN either side (wet-hair read, not ears)
    + p('M32 26 C18 22 8 26 2 36 C14 36 24 40 30 46 Z', c.accent)
    + p('M88 26 C102 22 112 26 118 36 C106 36 96 40 90 46 Z', c.accent)
    + pf('M28 30 C38 14 82 14 92 30 C76 20 44 20 28 30 Z', c.accent)
    // huge yellow frog eyes bulging off the top corners of the skull
    + e(40, 32, 11, 9, '#ffe066') + e(80, 32, 11, 9, '#ffe066')
    + ef(41, 33, 3.6, 5.4, OUT) + ef(81, 33, 3.6, 5.4, OUT)
    + ef(37, 28, 2.6, 2.2, '#ffffff') + ef(77, 28, 2.6, 2.2, '#ffffff')
    // wide frog mouth line across the whole muzzle
    + ln('M30 46 C42 54 78 54 90 46', OUT, 2.6)
    + ef(52, 42, 1.7, 1.4, OUT) + ef(68, 42, 1.7, 1.4, OUT);
};

/* -- BLAZIKEN ------------------------------------------------------------
 * Round-3 cleanup - "still a generic mascot": the old build was a smooth red
 * ball head wearing three straight cream horns, two HAIRLINE arms, a pair of
 * DETACHED floating yellow banana blades hanging in mid-air beside the elbows,
 * and a plain cream lower body that read as a diaper. Regeared the way
 * Charmander and Bulbasaur were:
 *   - A real BEAK: the skull path steps in at the cheeks and a pointed two-
 *     mandible beak projects a clear 20 units BELOW that step, so it breaks
 *     the skull silhouette instead of being printed on it. Jaw-hinge bumps,
 *     a beak seam, a darker lower mandible and nostrils on the upper plane.
 *   - A FEATHER LANGUAGE (`plume`) used in three places, so the species read
 *     is spread across the whole figure: the tall THREE-PLUME head crest
 *     (centre plume tallest, side pair swept back), the cream NECK RUFF
 *     fanning out under the jaw, and the red THIGH TUFTS that hang over the
 *     hips - which is what kills the diaper.
 *   - THICK TWO-SEGMENT ARMS: a heavy upper arm to a real elbow, then a
 *     forearm ending in an ATTACHED three-clawed hand. The wrist flames are
 *     now short licks rooted ON the wrists, overlapping the hands.
 *   - Bird TALONS on cream shanks below the tufts (`digiLegs`).
 */
POSE.blaziken = (c) => {
  const beak = '#f7d27a';               // warm horn gold: the beak's own value
  const lower = '#dcb45c';              // darker lower mandible
  /* one feather: a tapered lens from a buried root to a fine tip. */
  const plume = (x, y, tx, ty, w, fill, inner) => {
    const q = (v) => Math.round(v * 100) / 100;
    const dx = tx - x; const dy = ty - y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * w; const ny = (dx / L) * w;
    const mx = (x + tx) / 2; const my = (y + ty) / 2;
    const lens = (k) => `M${q(x - nx * k)} ${q(y - ny * k)}`
      + ` Q${q(mx - nx * 1.2 * k)} ${q(my - ny * 1.2 * k)} ${q(tx)} ${q(ty)}`
      + ` Q${q(mx + nx * 1.2 * k)} ${q(my + ny * 1.2 * k)} ${q(x + nx * k)} ${q(y + ny * k)} Z`;
    return p(lens(1), fill, OUT, 2.3)
      + (inner ? pf(lens(0.42), inner) : '')
      // midrib: the line that makes a lens read as a FEATHER, not an ear
      + ln(`M${q(x)} ${q(y)} L${q(tx)} ${q(ty)}`, inner || '#d8c49a', 1.5);
  };
  return ''
    // BIRD LEGS: cream shanks on long taloned feet
    + digiLegs(c.belly, {
      hip: 82, spread: 22, thigh: 14, shin: 11, foot: c.belly,
      claw: '#4a3524', footW: 1.02, clawLen: 1.05,
    })
    // THIGH TUFTS: long red feathers hanging over the hips and down the outside
    // of each thigh - this is what kills the old cream-diaper read
    + [-1, 1].map((s) => plume(60 + 13 * s, 66, 60 + 32 * s, 96, 7.6, c.color, c.accent)
      + plume(60 + 16 * s, 68, 60 + 25 * s, 110, 8.2, c.color, c.accent)
      + plume(60 + 8 * s, 70, 60 + 11 * s, 104, 6.8, c.color, c.accent)).join('')
    // TORSO: broad chest, pinched waist
    + p('M40 42 C34 55 33 70 38 82 C42 90 48 95 60 95 C72 95 78 90 82 82'
      + ' C87 70 86 55 80 42 C70 36 50 36 40 42 Z', c.color)
    // chest plate top kept LOW (y=58) so the gold beak above it reads against
    // RED, not against a second field of cream
    + pf('M48 64 C44 71 44 80 48 89 C53 92.5 67 92.5 72 89 C76 80 76 71 72 64'
      + ' C66 60 54 60 48 64 Z', c.belly)
    + ln('M60 66 v24', '#dcc79a', 2)
    + ln('M50 76 C55 80 65 80 70 76 M51 85 C56 89 64 89 69 85', '#dcc79a', 1.6)
    // ARMS: heavy upper arm -> real elbow -> forearm -> ATTACHED clawed hand
    + limb(41, 48, 21, 68, 12.5, c.color)
    + limb(22, 67, 14, 92, 11.5, c.color, 9.2, claw3, 0.9)
    + limb(79, 48, 99, 68, 12.5, c.color)
    + limb(98, 67, 106, 92, 11.5, c.color, 9.2, claw3, 0.9)
    // elbow fill, so the two segments read as one jointed arm (UNSTROKED: a
    // keylined circle here reads as a robot ball-joint)
    + ef(21.5, 67.5, 7.2, 6.6, c.color)
    + ef(98.5, 67.5, 7.2, 6.6, c.color)
    // WRIST FLAMES: short licks rooted ON the wrist, just outboard of the hand
    + [-1, 1].map((s) => {
      const x = 60 + 48 * s;
      return hot(`M${x - 3 * s} 88 C${x - 10 * s} 79 ${x - 7 * s} 67 ${x + 3 * s} 58`
        + ` C${x + 1 * s} 68 ${x + 8 * s} 69 ${x + 8 * s} 63`
        + ` C${x + 13 * s} 74 ${x + 9 * s} 85 ${x + 3 * s} 91 Z`, '#ff8e2b')
        + hot(`M${x - 1 * s} 87 C${x - 5 * s} 79 ${x - 3 * s} 69 ${x + 4 * s} 62`
          + ` C${x + 4 * s} 70 ${x + 8 * s} 71 ${x + 7 * s} 67`
          + ` C${x + 11 * s} 76 ${x + 7 * s} 84 ${x + 4 * s} 88 Z`, '#ffd63b');
    }).join('')
    // NECK RUFF: cream feathers fanning out from under the jaw
    + [[-15, -29], [-9, -20], [9, 20], [15, 29]]
      .map(([rx, tx]) => plume(60 + rx, 35, 60 + tx, 53, 5.6, c.belly, '#e0cba2')).join('')
    // HEAD CREST: three TALL slim plumes, centre tallest, side pair swept back
    // (tips stop at y=-7: the render box bleeds only 8 units above the rig)
    // (swept OUT more than up, so the outer pair cannot read as a pair of ears)
    + plume(49, 13, 24, -1, 5.4, c.color, c.accent)
    + plume(71, 13, 96, -1, 5.4, c.color, c.accent)
    + plume(54, 9, 41, -6, 3.6, c.color, c.accent)
    + plume(66, 9, 79, -6, 3.6, c.color, c.accent)
    + plume(60, 12, 60, -7.5, 6, c.color, c.accent)
    // SKULL: dome whose lower silhouette pulls IN at the cheeks and stops well
    // above the chin, so the beak below breaks the outline
    + p('M36 24 C36 9 47 1 60 1 C73 1 84 9 84 24'
      + ' C84 31 80 36 73 37.6 C67 39 53 39 47 37.6'
      + ' C40 36 36 31 36 24 Z', c.color)
    // BEAK: a pointed two-mandible wedge projecting a clear 19 units past that
    // step, in a warm horn gold so it never merges with the cream chest plate
    + p('M44 33.5 C43.5 44 50.5 53.5 60 57.5 C69.5 53.5 76.5 44 76 33.5'
      + ' C68 39 52 39 44 33.5 Z', beak)
    + pf('M46.4 42.6 C48.6 49.4 54 55.4 60 57.5 C66 55.4 71.4 49.4 73.6 42.6'
      + ' C68.6 46.6 51.4 46.6 46.4 42.6 Z', lower)
    + ln('M45.6 41.6 C50.5 47.8 69.5 47.8 74.4 41.6', OUT, 2.4)
    // centre ridge down the upper mandible
    + ln('M60 36.5 v5', '#dcb45c', 1.5)
    + ef(55.6, 38.2, 1.8, 1.4, OUT) + ef(64.4, 38.2, 1.8, 1.4, OUT)
    // jaw-hinge bumps: the beak is socketed into the skull, not glued on
    + ef(44.5, 35, 4.6, 3.4, c.color) + ef(75.5, 35, 4.6, 3.4, c.color)
    // BROW SHELF over the eyes, so they sit under bone
    + browRidge(60, 19, 11, 7.6, 3.6, c.color)
    + gloss(47, 11, 10.5, 5.6)
    + ef(49.5, 25.5, 5.4, 6, '#fff6d8') + ef(70.5, 25.5, 5.4, 6, '#fff6d8')
    + ef(50.1, 26.5, 2.5, 3.6, OUT) + ef(71.1, 26.5, 2.5, 3.6, OUT)
    + ef(47.4, 23, 1.7, 1.7, '#ffffff') + ef(68.4, 23, 1.7, 1.7, '#ffffff');
};

/* -- MEOWTH : slim cream cat, koban coin, whiskers, curled tail ---------- */
POSE.meowth = (c) => ''
  + ln('M80 106 C104 104 100 80 86 78', c.accent, 6.5)
  + ef(86, 78, 5, 4.6, c.accent)
  + stubLegs('#f6ead0', { top: 104, spread: 15, w: 15, foot: c.accent })
  + e(60, 96, 24, 23, '#f6ead0')
  + limb(40, 88, 28, 102, 7.5, '#f6ead0', 6, padPaw) + limb(80, 88, 92, 102, 7.5, '#f6ead0', 6, padPaw)
  + p('M40 40 L28 8 L56 30 Z', '#f6ead0') + p('M80 40 L92 8 L64 30 Z', '#f6ead0')
  + pf('M36 20 L30 9 L48 26 Z', '#e8a0a8') + pf('M84 20 L90 9 L72 26 Z', '#e8a0a8')
  // SKULL: a wide cat cranium whose cheeks pull in to a muzzle root, so the
  // snout below breaks the outline (the old head was a cream ball whose only
  // species cue was the coin bolted to its forehead)
  + p('M60 26 C80 26 92 40 92 56 C92 66 86 73 76 76'
    + ' C70 77.5 50 77.5 44 76 C34 73 28 66 28 56 C28 40 40 26 60 26 Z', '#f6ead0')
  // MUZZLE: a broad cat snout with whisker pads, a pale chin and the W lip
  + snout(60, 77, 14, 10, '#f6ead0', '#efe0be')
  + ef(49.5, 74.5, 5, 4, '#f6ead0') + ef(70.5, 74.5, 5, 4, '#f6ead0')
  + gloss(46, 40, 12, 7)
  + e(60, 32, 10, 7.5, '#ffd63b', '#b07d18', 2.4)
  + ln('M54 32 h12', '#b07d18', 2)
  + browRidge(60, 48, 12, 8, 4, '#f6ead0')
  + dotEyes(47, 73, 58, 4.6)
  + pf('M60 72 l-3.8 -4.2 h7.6 Z', '#e8433c')
  + ln('M60 74 v3 M60 77 q-7 6 -13 0 M60 77 q7 6 13 0', OUT, 2.2)
  + ln('M32 64 l-18 -7 M32 71 l-19 5 M88 64 l18 -7 M88 71 l19 5', OUT, 2);

/* -- EEVEE ---------------------------------------------------------------
 * Round 8 audit: a generic quadruped whose only species cues were two ear
 * triangles. Rebuilt as a THREE-QUARTER fox: the skull is a wedge that tapers
 * forward-left into a pointed MUZZLE with a black nose and an open jaw (a side
 * muzzle is correct here - this body is turned, unlike the front-on bipeds),
 * a brow shelf over the eyes, big scalloped COLLAR RUFF at the neck, and a fat
 * scalloped tail plume.
 */
POSE.eevee = (c) => ''
  // BUSHY TAIL PLUME off the right hip: a fat scalloped fan, not a whip
  + p('M80 98 C96 102 110 94 115 76 C118 62 114 50 108 42'
    + ' C128 52 136 80 126 100 C118 114 94 120 82 112 C76 108 75 100 80 98 Z', '#f0dfc0')
  + ln('M90 110 C104 104 114 90 116 72', '#d8c4a0', 2)
  + quadLegs(c.color, { top: 102, xs: [34, 52, 76, 94], w: 14, foot: c.accent })
  // barrel body, hips higher than the shoulders
  + p('M34 84 C40 66 54 58 70 60 C90 62 100 76 98 92 C96 103 78 108 60 108'
    + ' C42 108 30 100 34 84 Z', c.color)
  // BOTH ears rooted on the skull
  + p('M24 42 L10 6 L42 28 Z', c.color) + p('M60 34 L80 6 L46 21 Z', c.color)
  + pf('M24 26 L14 8 L35 24 Z', '#c9a06a') + pf('M62 20 L75 8 L53 17 Z', '#c9a06a')
  // SKULL: a wedge, wide at the crown, tapering forward-left
  + p('M44 30 C60 30 72 42 71 56 C70 68 60 76 46 76'
    + ' C34 76 24 70 20 60 C16 50 22 36 30 32 C34 30 39 30 44 30 Z', c.color)
  // MUZZLE: a pointed fox snout projecting clear of the skull, black nose,
  // open jaw underneath
  + p('M22 54 C14 53 6 58 3 65 C9 71 18 73 25 70 C29 67 28 56 22 54 Z', c.color)
  + p('M8 59.5 C4 60.5 1.5 63 1 65.5 C4.5 68.5 9 69 12 67.5 C9.5 65 8.5 62 8 59.5 Z', c.accent, OUT, 2.2)
  + ef(5.4, 63.4, 3.4, 2.7, OUT)
  + ln('M8 68 C12 72 20 72 24 68', OUT, 2.2)
  // COLLAR RUFF: a deep scalloped mane at the neck, well clear of the face
  + p('M30 72 C42 90 74 88 90 78 C99 73 100 90 88 96 C70 105 36 104 26 94'
    + ' C18 86 20 66 30 72 Z', '#f0dfc0')
  + ln('M38 88 q6 -8 12 -1 M54 92 q6 -9 12 -2 M70 90 q6 -9 11 -3', '#d8c4a0', 2)
  + gloss(38, 38, 12, 7)
  + browRidge(40, 44, 13, 7.5, 4, c.color)
  + dotEyes(30, 54, 52, 4.8);

/* -- TOGEPI : egg shell up to the shoulders, tiny arms, spiked crown ------ */
POSE.togepi = (c) => ''
  + p('M60 36 C90 36 96 82 94 100 C92 120 78 126 60 126 C42 126 28 120 26 100'
    + ' C24 82 30 36 60 36 Z', '#fff6e2')
  + [[36, 100], [60, 108], [84, 100]].map(([x, y]) => pf(`M${x} ${y - 13} l10 17 h-20 Z`, '#e8433c')).join('')
  + [[47, 88], [73, 88]].map(([x, y]) => pf(`M${x} ${y + 13} l-10 -17 h20 Z`, '#4fa8e8')).join('')
  + [[28, 22], [45, 10], [60, 4], [75, 10], [92, 22]].map(([x, y]) =>
    p(`M${x} ${y + 18} L${x} ${y} L${x + 13} ${y + 16} Z`, '#fff6e2')).join('')
  + e(26, 120, 13, 8, '#fff6e2') + e(94, 120, 13, 8, '#fff6e2')
  + limb(30, 74, 14, 84, 7.5, '#fff6e2', 6.4) + limb(90, 74, 106, 84, 7.5, '#fff6e2', 6.4)
  + ef(42, 60, 6.4, 7.2, OUT) + ef(78, 60, 6.4, 7.2, OUT)
  + ef(40, 58, 2.4, 2.6, '#fff') + ef(76, 58, 2.4, 2.6, '#fff')
  + ef(28, 72, 6.4, 5.2, '#f7a8b8', 0.85) + ef(92, 72, 6.4, 5.2, '#f7a8b8', 0.85)
  + smile(60, 70, 8.5);

/* -- GARDEVOIR : no legs - a floor-length gown, bob crest, red chest fin -- */
POSE.gardevoir = (c) => ''
  + p('M60 62 C46 82 26 112 14 126 C38 132 82 132 106 126 C94 112 74 82 60 62 Z', '#f6f8ff')
  + pf('M60 76 C52 92 40 112 34 122 C48 126 72 126 86 122 C80 112 68 92 60 76 Z', '#e3eaff')
  + p('M52 48 C56 44 64 44 68 48 C70 60 70 68 68 74 C64 78 56 78 52 74'
    + ' C50 68 50 60 52 48 Z', '#f6f8ff')
  // round-3 audit: the arms were hairlines (w 6). Thicker, plus GREEN shoulder
  // pauldrons and gown folds, so the read is not carried by the skirt alone.
  + limb(50, 56, 26, 80, 9, '#f6f8ff', 6.4, slimHand)
  + limb(70, 56, 94, 80, 9, '#f6f8ff', 6.4, slimHand)
  + p('M50 50 C41 47 33 52 34 60 C41 61 48 57 52 53 Z', c.color)
  + p('M70 50 C79 47 87 52 86 60 C79 61 72 57 68 53 Z', c.color)
  + ln('M58 78 C54 94 49 112 43 125 M62 78 C66 94 71 112 77 125', '#d5deff', 2.1)
  + p('M60 58 l-10 18 h20 Z', '#e8433c')
  + p('M60 64 l-8 28 h16 Z', '#e8433c')
  + e(60, 30, 23, 22, '#f6f8ff')
  + p('M60 2 C88 6 86 34 84 40 C78 46 70 42 72 36 C76 18 70 10 60 10'
    + ' C50 10 44 18 48 36 C50 42 42 46 36 40 C34 34 32 6 60 2 Z', c.color)
  + pf('M34 38 C26 52 30 66 38 68 C44 58 42 46 34 38 Z', c.color)
  + pf('M86 38 C94 52 90 66 82 68 C76 58 78 46 86 38 Z', c.color)
  + ef(51, 30, 4.8, 5.6, '#e8433c') + ef(69, 30, 4.8, 5.6, '#e8433c')
  + ef(51, 30, 2.3, 3.2, OUT) + ef(69, 30, 2.3, 3.2, OUT)
  + ln('M55 42 q5 4 10 0', OUT, 2);

/* -- MEW -----------------------------------------------------------------
 * Plan: a tiny pink kitten-embryo with a HEAD WIDER THAN ITS WHOLE BODY, a
 * pinched pear torso hardly bigger than the skull's cheeks, stubby forelimbs
 * folded up under the chin, oversized hind feet, and a VERY long bare whip
 * tail with a fat spade tip curling up beside it. The head:body ratio is the
 * read - nothing else on the roster is this top-heavy.
 */
POSE.mew = (c) => ''
  // whip tail: leaves the hip, sweeps right and rears up, spade tip on top
  + ln('M70 108 C100 114 122 100 116 74 C113 60 104 52 96 48', c.color, 4.6)
  + p('M99 50 C96 38 100 26 108 20 C110 32 116 34 118 28 C124 40 118 54 106 58'
    + ' C102 56 100 54 99 50 Z', c.color)
  + pf('M102 48 C100 39 103 30 108 26 C109 34 113 35 115 31 C118 40 113 50 105 53 Z', '#f8b8d2')
  // oversized hind feet planted wide
  + p('M32 100 C18 104 12 116 20 ' + (FEET - 2) + ' C32 ' + (FEET + 2)
    + ' 44 120 44 108 Z', c.color)
  + p('M88 100 C102 104 108 116 100 ' + (FEET - 2) + ' C88 ' + (FEET + 2)
    + ' 76 120 76 108 Z', c.color)
  + ef(24, FEET - 6, 8, 4.4, '#f8c0d6') + ef(96, FEET - 6, 8, 4.4, '#f8c0d6')
  // small pear torso - deliberately narrower than the skull above it
  + p('M60 60 C74 60 80 78 79 94 C78 106 70 112 60 112 C50 112 42 106 41 94'
    + ' C40 78 46 60 60 60 Z', c.color)
  + pf('M60 72 C68 72 71 84 70 94 C69 102 65 106 60 106 C55 106 51 102 50 94'
    + ' C49 84 52 72 60 72 Z', '#f8c0d6')
  // stubby forelimbs folded up under the chin (not hanging tubes)
  + p('M46 70 C36 72 30 80 32 88 C36 82 42 80 48 82 Z', c.color)
  + p('M74 70 C84 72 90 80 88 88 C84 82 78 80 72 82 Z', c.color)
  + padPaw(30, 90, 8, c.color) + padPaw(90, 90, 8, c.color)
  // small rounded ears low on the sides of a very large skull
  + p('M36 22 C28 10 30 2 38 2 C44 4 47 12 47 20 Z', c.color)
  + p('M84 22 C92 10 90 2 82 2 C76 4 73 12 73 20 Z', c.color)
  + pf('M38 18 C34 10 35 6 39 6 C42 8 43 14 43 18 Z', '#f0a0c0')
  + pf('M82 18 C86 10 85 6 81 6 C78 8 77 14 77 18 Z', '#f0a0c0')
  + e(60, 36, 34, 31, c.color)
  + gloss(46, 22, 14, 8)
  + ef(48, 36, 5.6, 7, '#3b5bd0') + ef(72, 36, 5.6, 7, '#3b5bd0')
  + ef(48, 37, 2.6, 4, OUT) + ef(72, 37, 2.6, 4, OUT)
  + ef(46, 32, 2.2, 2.2, '#fff') + ef(70, 32, 2.2, 2.2, '#fff')
  + pf('M60 48 l-3.4 -3.8 h6.8 Z', '#d2568c') + smile(60, 51, 6.5);

/* -- CELEBI : fairy sprite, antennae, translucent wings, tiny feet -------- */
POSE.celebi = (c) => ''
  + p('M44 58 C20 40 4 50 12 68 C22 82 40 76 48 66 Z', '#dff8ff')
  + p('M76 58 C100 40 116 50 108 68 C98 82 80 76 72 66 Z', '#dff8ff')
  + chunkyLegs(c.color, { top: 100, spread: 15, w: 15, foot: c.color, claw: '#eaffb4', clawN: 2 })
  // pot-bellied torso with a real shoulder->hip break (was a second ball)
  + p('M60 64 C74 64 82 76 82 90 C82 102 72 107 60 107 C48 107 38 102 38 90'
    + ' C38 76 46 64 60 64 Z', c.color)
  + ef(60, 92, 15, 12, '#dff3c8', 0.7)
  + limb(40, 78, 27, 94, 9, c.color, 6.6, padPaw, 0.4)
  + limb(80, 78, 93, 94, 9, c.color, 6.6, padPaw, 0.4)
  + ln('M48 26 C42 8 34 0 26 -4 M72 26 C78 8 86 0 94 -4', c.color, 4.6)
  + ef(25, -5, 5.4, 5.4, '#eaffb4') + ef(95, -5, 5.4, 5.4, '#eaffb4')
  // SKULL: a wide crown with pointed side fins and a small tapered chin, so
  // the head is a shape rather than a green ball behind two antennae
  + p('M60 20 C78 20 90 32 90 44 C90 52 86 58 78 61'
    + ' C72 63.5 68 66 60 66 C52 66 48 63.5 42 61 C34 58 30 52 30 44'
    + ' C30 32 42 20 60 20 Z', c.color)
  + p('M31 40 L16 34 L32 50 Z', c.color) + p('M89 40 L104 34 L88 50 Z', c.color)
  + snout(60, 59, 8.5, 5.5, c.color, '#dff3c8')
  + browRidge(60, 36, 11, 7.5, 4, c.color)
  + gloss(48, 29, 11, 7)
  + ef(49, 46, 5.6, 6.2, '#2a3a6a') + ef(71, 46, 5.6, 6.2, '#2a3a6a')
  + ef(47.6, 44.2, 2.1, 2.3, '#fff') + ef(69.6, 44.2, 2.1, 2.3, '#fff')
  + ln('M55.4 59.6 q4.6 3.4 9.2 0', OUT, 2);

/* -- JIGGLYPUFF : one balloon, no torso/head split, hair curl ------------- */
POSE.jigglypuff = (c) => ''
  + e(60, 74, 45, 45, c.color)
  + gloss(42, 50, 16, 11)
  + p('M26 42 L14 16 L42 32 Z', c.color) + p('M94 42 L106 16 L78 32 Z', c.color)
  + pf('M20 26 L15 17 L28 30 Z', c.accent) + pf('M100 26 L105 17 L92 30 Z', c.accent)
  + p('M50 32 C44 12 58 4 68 2 C56 14 62 26 68 30 Z', c.color)
  + e(28, 116, 13, 8.5, c.color) + e(92, 116, 13, 8.5, c.color)
  + limb(20, 82, 6, 98, 8.5, c.color, 7) + limb(100, 82, 114, 98, 8.5, c.color, 7)
  + ef(44, 68, 9.6, 11, '#ffffff') + ef(76, 68, 9.6, 11, '#ffffff')
  + ef(44, 69, 5.6, 6.6, '#2f6fd0') + ef(76, 69, 5.6, 6.6, '#2f6fd0')
  + ef(42, 65, 3, 3.2, '#ffffff') + ef(74, 65, 3, 3.2, '#ffffff')
  + smile(60, 90, 9) + ef(28, 84, 6.4, 5, '#f9a8c0', 0.8) + ef(92, 84, 6.4, 5, '#f9a8c0', 0.8);

/* -- SQUIRTLE : the SHELL is the body - domed carapace, small head --------
 * Round 8 audit: the shell carried the whole read and the creature inside it
 * was a snoutless blue ball on two pebble legs. Now the skull path narrows at
 * the cheeks into a projecting TURTLE BEAK (rounded upper lip, seam, chin),
 * there is a brow shelf over the eyes, and the legs are `chunkyLegs` columns
 * on broad webbed-toe feet.
 */
POSE.squirtle = (c) => ''
  + p('M85 88 C105 84 108 64 100 54 C113 64 113 92 94 99 C86 101 83 94 85 88 Z', '#f2c48a')
  + chunkyLegs(c.color, { top: 94, spread: 18, w: 19, foot: c.belly, claw: '#fdf3d6' })
  + e(60, 78, 33, 27, '#c9822f')
  + ef(60, 78, 25, 20, '#f2c48a')
  + [[60, 78], [44, 70], [76, 70], [48, 88], [72, 88]].map(([x, y]) =>
    ln(`M${x} ${y - 7.5} l7.5 4.7 v8.4 l-7.5 4.7 l-7.5 -4.7 v-8.4 Z`, '#a86a20', 2.4)).join('')
  + limb(32, 72, 16, 92, 11, c.color, 7, webHand, 0.35)
  + limb(88, 72, 104, 92, 11, c.color, 7, webHand, 0.35)
  // SKULL: dome + cheeks pulling in to a beak root
  + p('M32 34 C32 16 45 7 60 7 C75 7 88 16 88 34'
    + ' C88 44 83 51 73 54 C68 55.5 52 55.5 47 54 C37 51 32 44 32 34 Z', c.color)
  // BEAK: a short rounded upper lip projecting past the skull line, with a
  // pale under-jaw and a hard seam where the two halves meet.
  + snout(60, 56, 12.5, 10, c.color, c.belly)
  + ln('M48.5 57.5 C53 62.5 67 62.5 71.5 57.5', OUT, 2.4)
  + ln('M57 52.4 q1 1.3 1.9 0 M61.1 52.4 q1 1.3 1.9 0', OUT, 1.3)
  + browRidge(60, 26, 12.5, 8, 4.4, c.color)
  + gloss(47, 19, 12, 7)
  + ef(48, 34, 6.6, 7.6, '#ffffff') + ef(72, 34, 6.6, 7.6, '#ffffff')
  + ef(49, 35, 3.2, 4.2, OUT) + ef(73, 35, 3.2, 4.2, OUT)
  + ef(46, 31, 2.3, 2.3, '#fff') + ef(70, 31, 2.3, 2.3, '#fff');

/* -- CHARMANDER ----------------------------------------------------------
 * Round 8 fix - "a snoutless orange ball-head with hairline stick arms and
 * pebble feet, identifiable only by its tail flame". The head is no longer a
 * circle with a face printed on it:
 *   - The SKULL PATH itself steps in at the cheeks and then projects forward
 *     and DOWN into a rounded reptile muzzle, so the silhouette is a keyhole,
 *     not a ball. The muzzle mass is replayed with `snout()` over the step so
 *     the break line arcs cheek-to-cheek and the snout reads as sitting in
 *     FRONT of the face plane.
 *   - A real LOWER JAW: a wide jaw-hinge bump either side, a chin plate under
 *     the mouth line, and two small upper fangs over the lip.
 *   - A heavy BROW SHELF (`browRidge`) overhangs the eyes with a frown seam
 *     between, so the eyes sit under bone instead of floating on a balloon.
 *   - LIMBS are trunks, not hairlines: arms nearly half again as thick ending
 *     in `claw3` paws, and `chunkyLegs` replaces the pebble-on-a-nub stubs
 *     with thick knee'd columns on broad three-clawed feet.
 * It stays clearly a CHILD of Charizard (no wings, no neck, oversized head,
 * belly plate, tail torch) without becoming a shrunken copy of it.
 */
POSE.charmander = (c) => ''
  // TAIL: a thick root off the right hip that sweeps UP and clear of the arm,
  // so the torch burns as its own separate flame in open air.
  + p('M74 98 C98 98 110 78 102 60 C114 74 112 102 86 110 C75 112 72 104 74 98 Z', c.color)
  + pf('M90 104 C98 98 104 86 102 76 C108 88 104 100 92 106 Z', c.accent)
  + hot('M102 62 C94 48 102 32 112 22 C110 38 120 40 122 30 C128 46 120 66 106 72'
    + ' C102 69 103 66 102 62 Z', '#ffd63b')
  + hot('M104 62 C99 50 104 38 111 30 C110 42 116 42 117 36 C121 48 116 60 108 65 Z', '#ff8e2b')
  // THICK knee'd legs on broad three-clawed feet (was: two pebbles on nubs)
  + chunkyLegs(c.color, { top: 94, spread: 17, w: 19, foot: c.color, claw: '#fff0c2' })
  // squat pear torso with a cream belly plate (top kept LOW so the jaw and the
  // short neck are not swallowed by the chest)
  + p('M60 71 C76 71 85 80 85 91 C85 101 74 105 60 105 C46 105 35 101 35 91'
    + ' C35 80 44 71 60 71 Z', c.color)
  + ef(60, 92, 17.5, 12.5, c.belly)
  + ln('M48 89 C53 96 67 96 72 89', '#e0c89a', 1.6)
  // TRUNK arms: heavy through the deltoid, ending in fat three-talon paws.
  // Round-3 audit: still hairline-ish at podium scale, so the forearm and the
  // paw both grew (w 12 -> 14.5, paw 8 -> 9.6) and the reach shortened so the
  // mass reads instead of the taper.
  + limb(41, 82, 25, 96, 14.5, c.color, 9.6, claw3, 0.34)
  + limb(79, 82, 95, 96, 14.5, c.color, 9.6, claw3, 0.34)
  // SKULL: a domed cranium whose lower silhouette PULLS IN at the cheeks and
  // stops well above the chin, so the muzzle mass below it breaks the outline
  // instead of being printed on a ball.
  + p('M30 33 C30 14 43 4 60 4 C77 4 90 14 90 33'
    + ' C90 43 85 49 76 51'          // right cheek falls back and in
    + ' C70 52.5 50 52.5 44 51'      // narrow muzzle root (well inside the
    //                                  muzzle's own width, so its top arc
    //                                  crosses the face as a real break line)
    + ' C35 49 30 43 30 33 Z', c.color)
  // MUZZLE: a rounded reptile snout PROJECTING below AND wider than the skull's
  // muzzle root. Its top arc is the break line that puts the snout in front of
  // the face plane; the cream underside is the lower jaw.
  // (round-3 audit: the muzzle was a WIDE FLAT band that read as a duck bill.
  // It is now narrower than the cheeks and DEEPER, so it protrudes as a
  // rounded reptile snout, with a second smaller nose-bridge mass stacked on
  // its upper plane to give the profile a real step.)
  + snout(60, 57, 12.6, 14, c.color, c.belly)
  + ef(60, 49.5, 9.4, 5.2, c.color)
  // jaw-hinge bumps either side of the muzzle root: the mandible corners
  + ef(46.5, 50.5, 5, 3.8, c.color) + ef(73.5, 50.5, 5, 3.8, c.color)
  // nostrils on the muzzle's top plane, forward-facing
  + ef(56, 49.6, 1.7, 1.3, OUT) + ef(64, 49.6, 1.7, 1.3, OUT)
  // mouth: a wide lizard lip with two small upper fangs over it, and a chin
  // crease under it so the mandible has a front plane
  + grin(60, 60, 8.4)
  + teeth(60, 60.6, 5.4, 2)
  + ln('M53.5 68 C56.5 70.4 63.5 70.4 66.5 68', '#dcbf90', 1.6)
  // BROW SHELF over the eyes + frown seam, so the eyes sit under bone
  + browRidge(60, 27, 12, 8, 4, c.color)
  + gloss(46, 17, 12, 6.5)
  + ef(48, 33.5, 6, 6.8, '#ffffff') + ef(72, 33.5, 6, 6.8, '#ffffff')
  + ef(48.8, 34.5, 3, 3.9, OUT) + ef(72.8, 34.5, 3, 3.9, OUT)
  + ef(46.4, 31, 1.7, 1.7, '#ffffff') + ef(70.4, 31, 1.7, 1.7, '#ffffff');

/* -- BULBASAUR : squat three-quarter quadruped, the BULB is the tallest thing
 * Round 9 audit - "the worst figure on the podium: a mint ball head with a
 * printed smile, one lone spike, four identical pill legs, and a plain green
 * blob that is the only thing saying Bulbasaur". Rebuilt like Charmander was:
 *   - The SKULL PATH steps IN at the muzzle root and the toad MUZZLE projects
 *     forward-left clear of the forehead, with a nostril pair on its top plane,
 *     a pale under-jaw and a hard jaw/mouth seam - so the head is a wedge with
 *     a snout on it, not a circle with a face printed on it.
 *   - A BROW SHELF over the red eyes, and TWO symmetrical pointed EAR-FINS
 *     rooted on the crown (was: one stray spike floating off the temple).
 *   - LEGS are `stoutQuadLegs`: tapered knee'd columns on broad three-clawed
 *     feet, near pair heavier than the far pair (was: four identical pills).
 *   - The BULB is a real bulb: a segmented dome with meridian seams, a base
 *     collar seam where it meets the back, and a LEAF SPROUT crowning it - so
 *     the species read is spread across head, legs and bulb, not carried by
 *     one accessory.
 */
POSE.bulbasaur = (c) => {
  const bulbDark = '#4f9a34';
  const bulbLit = '#7ec24a';
  const bulbSeam = '#2f6b1f';
  const leaf = '#96d45c';
  const leafLit = '#b6e57c';
  const jaw = '#a9e2cd';
  return ''
    // FOUR MASSIVE LEGS: knee'd columns on broad three-clawed feet
    + stoutQuadLegs(c.color, {
      top: 100, xs: [26, 47, 76, 97], w: 18, claw: '#f6fbe0', far: '#54a48f',
    })
    // squat toad barrel, haunch higher than the shoulder
    + p('M18 88 C24 66 40 56 60 56 C82 56 96 68 98 86 C100 98 82 105 58 105'
      + ' C34 105 14 100 18 88 Z', c.color)
    + [[40, 78], [58, 88], [82, 78], [70, 66]].map(([x, y]) => ef(x, y, 6.8, 5, c.accent, 0.8)).join('')
    // ---------------------------------------------------------------- BULB
    // a segmented dome: dark shell, lit crown, three meridian seams and the
    // collar seam where the shell is seated into the back
    + e(74, 50, 26, 23, bulbDark)
    + pf('M50 46 C52 28 64 21 74 21 C86 21 96 30 97 46 C90 36 58 36 50 46 Z', bulbLit)
    + ln('M60 28 C54 40 53 54 57 66', bulbSeam, 2.3)
    + ln('M74 23 C72 38 72 54 74 70', bulbSeam, 2.3)
    + ln('M88 28 C94 40 95 54 91 66', bulbSeam, 2.3)
    + ln('M51 56 C60 66 88 66 97 56', bulbSeam, 2.1)
    + gloss(62, 34, 11, 6)
    // LEAF SPROUT crowning the bulb: two broad blades with midribs plus a
    // small upright shoot, seated on a stem knot
    + p('M70 26 C58 18 46 12 34 11 C40 22 54 32 68 32 Z', leaf)
    + ln('M38 13 C50 20 60 26 66 30', bulbSeam, 1.6)
    + p('M78 26 C90 18 102 12 114 11 C108 22 94 32 80 32 Z', leaf)
    + ln('M110 13 C98 20 88 26 82 30', bulbSeam, 1.6)
    + p('M74 24 C71.5 16 72.5 10 75 5 C80 11 79.5 19 78 25 Z', leafLit)
    + e(74, 27, 6.6, 4.8, bulbSeam)
    // ---------------------------------------------------------------- HEAD
    // SKULL: a wedge - crown over the top, forehead dropping to a STEP at the
    // muzzle root, then the cheek swelling back out and down to the jaw hinge.
    + p('M64 84 C64 65 52 55 38 55 C25 55 16 63 15 73'
      + ' C14.5 79 18 82 23 83'         // step IN: the muzzle root
      + ' C19 88 20 97 29 101'          // cheek back out, down to the jaw
      + ' C38 105 57 103 63 96'
      + ' C65.5 92 64 88 64 84 Z', c.color)
    // MUZZLE: a big rounded toad snout projecting a clear 13 units past the
    // forehead. Its upper arc is the break line that puts it in FRONT of the
    // face plane instead of printed on it.
    + p('M24 74 C11 69 2 76 2 86 C2 96 15 101 26 97 C34 93 33 78 24 74 Z', c.color)
    // pale under-jaw + the hard mouth seam between the halves
    + pf('M3.5 88 C6 96 21 100 29 93 C21 96 9 95 3.5 88 Z', jaw)
    + ln('M3 87 C9 95 22 96 29.5 90', OUT, 2.5)
    + ln('M13 96.4 q3 2 6 1', OUT, 1.5)
    // nostril pair on the muzzle's top plane
    + ef(7.6, 80.6, 1.8, 1.35, OUT) + ef(14.6, 77.8, 1.8, 1.35, OUT)
    // jaw-hinge bump where the mandible meets the skull
    + ef(30, 97, 5.4, 4, c.color)
    // EAR-FINS: a matched pointed pair rooted on the crown, each with a darker
    // inner fin - one sweeping out over the muzzle side, one standing up
    + p('M15 66 C10 56 9 48 9 41 C18 46 27 51 33 57 Z', c.color)
    + pf('M16 60 C14 54 14 49 14.5 45 C20 49 25 53 28.5 56.5 Z', c.accent)
    + p('M35 58 C39 48 43 41 48 35 C51 44 52 53 51 61 Z', c.color)
    + pf('M37.5 56 C40 50 42.5 46 45.5 42 C47.5 48 48 54 47.5 58.5 Z', c.accent)
    // BROW SHELF over the eyes, then the red eyes themselves
    + gloss(31, 66, 11, 6)
    + browRidge(36, 72.5, 11.5, 7.2, 3.4, c.color)
    + ef(25, 79, 5.4, 6.2, '#e8433c') + ef(47.5, 80, 5.4, 6.2, '#e8433c')
    + ef(25.6, 79.8, 2.6, 3.5, OUT) + ef(48.1, 80.8, 2.6, 3.5, OUT)
    + ef(23, 76.4, 1.7, 1.7, '#ffffff') + ef(45.5, 77.4, 1.7, 1.7, '#ffffff');
};

/* -- DITTO : no limbs, no face structure - a slumped puddle --------------- */
POSE.ditto = (c) => ''
  + p('M60 40 C92 40 110 66 108 94 C106 118 84 126 60 126 C36 126 14 118 12 94'
    + ' C10 66 28 40 60 40 Z', c.color)
  + p('M18 72 C6 58 12 46 18 42 C20 56 22 64 26 68 Z', c.color)
  + p('M102 72 C114 58 108 46 102 42 C100 56 98 64 94 68 Z', c.color)
  + gloss(40 , 60, 17, 10)
  + ef(44, 78, 4.6, 4.6, OUT) + ef(76, 78, 4.6, 4.6, OUT)
  + ln('M48 98 h24', OUT, 3.6)
  + ef(60, 114, 28, 8, '#ffffff', 0.14);

/* ------------------------------------------------------------- fallback */
/** Generic bipedal creature - only ever used if a new id joins the roster. */
function genericPose(c) {
  return ''
    + stubLegs(c.color, { top: 100, spread: 16, w: 16, foot: c.accent })
    + p('M42 56 C36 72 36 88 42 100 C52 108 68 108 78 100 C84 88 84 72 78 56'
      + ' C68 50 52 50 42 56 Z', c.color)
    + pf('M48 66 C45 78 45 90 48 96 C56 102 64 102 72 96 C75 90 75 78 72 66'
      + ' C64 62 56 62 48 66 Z', c.belly)
    + limb(40, 64, 24, 88, 8, c.color, 6.4) + limb(80, 64, 96, 88, 8, c.color, 6.4)
    + p('M42 36 L30 6 L54 24 Z', c.color) + p('M78 36 L90 6 L66 24 Z', c.color)
    + e(60, 38, 27, 25, c.color)
    + gloss(48, 26, 11, 7)
    + eyes(49, 71, 38, 5.2)
    + smile(60, 50, 7);
}

/** Which ids have a bespoke pose (regression check: must cover the roster). */
export const POSED_IDS = Object.freeze(Object.keys(POSE).sort());

/** Ids from `list` that would fall back to the generic body - must be empty. */
export function missingPoses(list) {
  return (list || []).map((r) => (r && r.id) || r).filter((id) => !POSE[id]);
}

/**
 * Per-species apparent-size trim. Poses that do not fill the 120x140 rig
 * (compact quadrupeds, blobs, balloons) get scaled up, and the ones that
 * sprawl (Charizard's wingspan, Rayquaza's coil) get pulled back, so the
 * three tiers read at the same apparent size.
 */
export const FIT = Object.freeze({
  ditto: 1.24, charmander: 1.1, squirtle: 1.08, jigglypuff: 1.06, bulbasaur: 1.1,
  snorlax: 1.0, meowth: 1.04, togepi: 1.04, mew: 1.04, eevee: 1.06,
  gengar: 1.0, charizard: 1.02, rayquaza: 0.98, dragonite: 0.98,
  lucario: 1.04, mewtwo: 1.02, blaziken: 1.02, machamp: 1.0,
});

/** Drawn height for a racer at a nominal tier height (scale-matched). */
export function figureHeight(racer, base) {
  return Math.round(base * (FIT[racer && racer.id] || 1));
}

/* --------------------------------------------------------------- passes */
let UID = 0;

function replay(draw, c, mode, paint) {
  MODE = mode; PAINT = paint || '';
  const out = draw(c);
  MODE = 'ink'; PAINT = '';
  return out;
}

function figureDefs(uid) {
  return `<defs>
    <radialGradient id="${uid}sh" gradientUnits="userSpaceOnUse" cx="30" cy="18" r="128">
      <stop offset="0" stop-color="#0a0620" stop-opacity="0"/>
      <stop offset=".42" stop-color="#0a0620" stop-opacity=".03"/>
      <stop offset=".68" stop-color="#0b0722" stop-opacity=".1"/>
      <stop offset=".86" stop-color="#0d0824" stop-opacity=".2"/>
      <stop offset="1" stop-color="#120b2a" stop-opacity=".3"/>
    </radialGradient>
    <radialGradient id="${uid}lt" gradientUnits="userSpaceOnUse" cx="36" cy="20" r="74">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".34"/>
      <stop offset=".3" stop-color="#fff8e6" stop-opacity=".17"/>
      <stop offset=".62" stop-color="#fff6dd" stop-opacity=".05"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${uid}bnc" gradientUnits="userSpaceOnUse" cx="76" cy="${FEET - 6}" r="52">
      <stop offset="0" stop-color="#ffd9a0" stop-opacity=".2"/>
      <stop offset=".55" stop-color="#ffd9a0" stop-opacity=".07"/>
      <stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${uid}bo" gradientUnits="userSpaceOnUse" cx="60" cy="${FEET + 6}" r="58">
      <stop offset="0" stop-color="#ffcf6a" stop-opacity=".34"/>
      <stop offset="1" stop-color="#ffcf6a" stop-opacity="0"/>
    </radialGradient>
    <filter id="${uid}rim" x="-30%" y="-30%" width="160%" height="160%"
      color-interpolation-filters="sRGB">
      <feMorphology in="SourceAlpha" operator="erode" radius="2.4" result="core"/>
      <feOffset in="core" dx="2.4" dy="3" result="o"/>
      <feComposite in="core" in2="o" operator="out" result="edge"/>
      <feGaussianBlur in="edge" stdDeviation=".8" result="soft"/>
      <feFlood flood-color="#fff9e8" flood-opacity=".5"/>
      <feComposite in2="soft" operator="in"/>
    </filter>
    <filter id="${uid}soft" x="-60%" y="-260%" width="220%" height="620%">
      <feGaussianBlur stdDeviation="3.4"/>
    </filter>
  </defs>`;
}

/** Soft elliptical contact shadow painted on the plinth's top surface. */
function contactShadow(uid) {
  return `<g filter="url(#${uid}soft)">
    <ellipse cx="60" cy="${FEET + 5}" rx="44" ry="9.5" fill="rgba(6,10,30,.46)"/>
    <ellipse cx="60" cy="${FEET + 4}" rx="28" ry="6.5" fill="rgba(4,7,22,.5)"/>
  </g>
  <ellipse cx="60" cy="${FEET + 3}" rx="16" ry="4" fill="rgba(3,6,20,.45)"/>`;
}

/**
 * Full-body podium figure for a roster entry: hull + colour + volumetric
 * shading + rim light + contact shadow.
 * @param {object} racer roster entry ({ id, color, accent, kart })
 * @param {{height?:number, shadow?:boolean}} [opt]
 */
export function podiumFigureSvg(racer, opt = {}) {
  const height = opt.height || 300;
  const { x: BX, y: BY, w: BW, h: BH } = FIG_BOX;
  const width = Math.round((height * BW) / FIG_H);
  const c = pal(racer);
  const draw = POSE[racer.id] || genericPose;
  const uid = `pf${(UID += 1)}`;
  const ink = replay(draw, c, 'ink');
  return `<svg class="pkr-rp-figure" data-species="${racer.id || 'unknown'}"
    viewBox="${BX} ${BY} ${BW} ${BH}" width="${width}" height="${Math.round((height * BH) / FIG_H)}"
    aria-hidden="true">${figureDefs(uid)}
    ${opt.shadow === false ? '' : contactShadow(uid)}
    <ellipse cx="60" cy="${FEET - 4}" rx="50" ry="15" fill="url(#${uid}bo)"/>
    <g class="pkr-rp-hull">${replay(draw, c, 'hull')}</g>
    <g class="pkr-rp-ink" id="${uid}body">${ink}</g>
    <g class="pkr-rp-shade">${replay(draw, c, 'shade', `url(#${uid}sh)`)}</g>
    <g class="pkr-rp-lite">${replay(draw, c, 'lite', `url(#${uid}lt)`)}</g>
    <g class="pkr-rp-bounce">${replay(draw, c, 'lite', `url(#${uid}bnc)`)}</g>
    <g class="pkr-rp-rim" filter="url(#${uid}rim)">${ink}</g>
  </svg>`;
}

export default {
  podiumFigureSvg, figureHeight, missingPoses, FIT, POSED_IDS, FEET, FIG_W, FIG_H, KIT,
};
