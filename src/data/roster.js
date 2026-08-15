/**
 * Shared racer roster for Pokemon Racing Game.
 *
 * CONTRACT (see CONTRACTS.md): every entry has
 *   id            kebab-case unique id (used by ?racer=)
 *   name          display name, UPPERCASE friendly
 *   stats.speed         1..5
 *   stats.acceleration  1..5
 *   stats.handling      1..5
 *   stats.weight        1..5
 * plus cosmetic fields used by renderers:
 *   color / accent / kart  (hex), shape (avatar family), glyph (item icon hint)
 *
 * Do not mutate these objects at runtime - clone first. Values are frozen.
 */

/** @typedef {{speed:number,acceleration:number,handling:number,weight:number}} RacerStats */

const RACERS = [
  {
    id: 'pikachu', name: 'PIKACHU', type: 'electric',
    color: '#ffd63b', accent: '#e8a020', kart: '#ffcf2a', shape: 'ears',
    stats: { speed: 4, acceleration: 4, handling: 4, weight: 2 },
    item: 'thunderbolt', tagline: 'Balanced sparkplug',
  },
  {
    id: 'gengar', name: 'GENGAR', type: 'ghost',
    color: '#8e6bd6', accent: '#4a2d80', kart: '#7b4fd0', shape: 'spike',
    stats: { speed: 5, acceleration: 3, handling: 3, weight: 3 },
    item: 'shadow-ball', tagline: 'Night terror',
  },
  {
    id: 'lucario', name: 'LUCARIO', type: 'fighting',
    color: '#3f7fd8', accent: '#1b3f77', kart: '#2f6fd0', shape: 'ears',
    stats: { speed: 4, acceleration: 4, handling: 5, weight: 3 },
    item: 'aura-sphere', tagline: 'Precision drifter',
  },
  {
    id: 'meowth', name: 'MEOWTH', type: 'normal',
    color: '#f2dcae', accent: '#c99a45', kart: '#e8c98a', shape: 'ears',
    stats: { speed: 3, acceleration: 5, handling: 4, weight: 1 },
    item: 'coin-toss', tagline: 'Coin magnet',
  },
  {
    id: 'eevee', name: 'EEVEE', type: 'normal',
    color: '#c98a4c', accent: '#8b5a2a', kart: '#d09a5e', shape: 'ears',
    stats: { speed: 3, acceleration: 5, handling: 5, weight: 2 },
    item: 'quick-attack', tagline: 'Nimble rookie',
  },
  {
    id: 'snorlax', name: 'SNORLAX', type: 'normal',
    color: '#3f7f8c', accent: '#1d4b56', kart: '#d8c48a', shape: 'blob',
    stats: { speed: 4, acceleration: 2, handling: 2, weight: 5 },
    item: 'hyper-beam', tagline: 'Rolling roadblock',
  },
  {
    id: 'charizard', name: 'CHARIZARD', type: 'fire',
    color: '#f08a2c', accent: '#b8471a', kart: '#e2451f', shape: 'wing',
    stats: { speed: 5, acceleration: 3, handling: 3, weight: 4 },
    item: 'flamethrower', tagline: 'Afterburner',
  },
  {
    id: 'greninja', name: 'GRENINJA', type: 'water',
    color: '#3f9fd8', accent: '#1c5d8c', kart: '#2f86c8', shape: 'spike',
    stats: { speed: 4, acceleration: 4, handling: 5, weight: 2 },
    item: 'water-shuriken', tagline: 'Silent cornerer',
  },
  {
    id: 'garchomp', name: 'GARCHOMP', type: 'dragon',
    color: '#6f5fa8', accent: '#c8392c', kart: '#5c4d92', shape: 'wing',
    stats: { speed: 5, acceleration: 3, handling: 3, weight: 4 },
    item: 'dragon-rush', tagline: 'Sand shredder',
  },
  {
    id: 'mewtwo', name: 'MEWTWO', type: 'psychic',
    color: '#dcd2e8', accent: '#8f6fb0', kart: '#c8b6e0', shape: 'ears',
    stats: { speed: 5, acceleration: 4, handling: 4, weight: 2 },
    item: 'psystrike', tagline: 'Glass cannon',
  },
  {
    id: 'togepi', name: 'TOGEPI', type: 'fairy',
    color: '#f6e8b8', accent: '#e2924c', kart: '#f0d890', shape: 'blob',
    stats: { speed: 2, acceleration: 5, handling: 5, weight: 1 },
    item: 'metronome', tagline: 'Lucky lightweight',
  },
  {
    id: 'blaziken', name: 'BLAZIKEN', type: 'fire',
    color: '#e2603c', accent: '#8c2c18', kart: '#cf4a24', shape: 'wing',
    stats: { speed: 4, acceleration: 4, handling: 3, weight: 3 },
    item: 'blaze-kick', tagline: 'Launch specialist',
  },
  {
    id: 'gardevoir', name: 'GARDEVOIR', type: 'psychic',
    color: '#9fd8bc', accent: '#d05a7a', kart: '#eef2f6', shape: 'ears',
    stats: { speed: 3, acceleration: 4, handling: 5, weight: 2 },
    item: 'psychic', tagline: 'Feather grip',
  },
  {
    id: 'mew', name: 'MEW', type: 'psychic',
    color: '#f2b6cc', accent: '#c2718f', kart: '#f6c8da', shape: 'blob',
    stats: { speed: 4, acceleration: 4, handling: 4, weight: 1 },
    item: 'transform', tagline: 'Wildcard',
  },
  {
    id: 'celebi', name: 'CELEBI', type: 'grass',
    color: '#b8e08a', accent: '#4f8c3a', kart: '#a8d472', shape: 'wing',
    stats: { speed: 3, acceleration: 5, handling: 4, weight: 1 },
    item: 'leaf-storm', tagline: 'Time skipper',
  },
  {
    id: 'tyranitar', name: 'TYRANITAR', type: 'rock',
    color: '#9fc46c', accent: '#4f6b2c', kart: '#87ad55', shape: 'spike',
    stats: { speed: 4, acceleration: 2, handling: 2, weight: 5 },
    item: 'rock-slide', tagline: 'Armored bruiser',
  },
  {
    id: 'machamp', name: 'MACHAMP', type: 'fighting',
    color: '#a8b6c4', accent: '#5d6b7a', kart: '#8f9fb0', shape: 'blob',
    stats: { speed: 3, acceleration: 3, handling: 3, weight: 5 },
    item: 'seismic-toss', tagline: 'Four-arm shove',
  },
  {
    id: 'dragonite', name: 'DRAGONITE', type: 'dragon',
    color: '#f2c46c', accent: '#3f8c9f', kart: '#e8b455', shape: 'wing',
    stats: { speed: 5, acceleration: 3, handling: 4, weight: 4 },
    item: 'hurricane', tagline: 'Cruise missile',
  },
  {
    id: 'jigglypuff', name: 'JIGGLYPUFF', type: 'fairy',
    color: '#f6c2d4', accent: '#c26f92', kart: '#f2b0c8', shape: 'blob',
    stats: { speed: 2, acceleration: 5, handling: 4, weight: 1 },
    item: 'sing', tagline: 'Bounce house',
  },
  {
    id: 'rayquaza', name: 'RAYQUAZA', type: 'dragon',
    color: '#4f9f6c', accent: '#c8b03c', kart: '#3f8c5c', shape: 'spike',
    stats: { speed: 5, acceleration: 4, handling: 3, weight: 4 },
    item: 'dragon-ascent', tagline: 'Sky serpent',
  },
  {
    id: 'squirtle', name: 'SQUIRTLE', type: 'water',
    color: '#6cc4e8', accent: '#2f6f9f', kart: '#4fa8d8', shape: 'blob',
    stats: { speed: 3, acceleration: 4, handling: 5, weight: 2 },
    item: 'water-shuriken', tagline: 'Shell slider',
  },
  {
    id: 'charmander', name: 'CHARMANDER', type: 'fire',
    color: '#f2934c', accent: '#c2481f', kart: '#e8552c', shape: 'wing',
    stats: { speed: 3, acceleration: 5, handling: 4, weight: 2 },
    item: 'flamethrower', tagline: 'Tail-flame starter',
  },
  {
    id: 'bulbasaur', name: 'BULBASAUR', type: 'grass',
    color: '#7fc4a8', accent: '#3f7a5c', kart: '#5fae8c', shape: 'blob',
    stats: { speed: 3, acceleration: 4, handling: 4, weight: 3 },
    item: 'leaf-storm', tagline: 'Steady sprout',
  },
  {
    id: 'ditto', name: 'DITTO', type: 'normal',
    color: '#d8b6e0', accent: '#9f76ad', kart: '#cba8d4', shape: 'blob',
    stats: { speed: 3, acceleration: 3, handling: 3, weight: 3 },
    item: 'transform', tagline: 'Copycat',
  },
];

for (const r of RACERS) { Object.freeze(r.stats); Object.freeze(r); }

export const roster = Object.freeze(RACERS);
export const STAT_KEYS = Object.freeze(['speed', 'acceleration', 'handling', 'weight']);
export const STAT_MAX = 5;

/** Default player pick + the 11 rivals that fill a 12-kart field. */
export const DEFAULT_RACER_ID = 'pikachu';
export const FIELD_SIZE = 12;

/** @param {string} id */
export function getRacer(id) {
  return roster.find((r) => r.id === id) || null;
}

/** Racer by id with a safe fallback to the default pick. */
export function racerOr(id, fallbackId = DEFAULT_RACER_ID) {
  return getRacer(id) || getRacer(fallbackId) || roster[0];
}

/** Derived physics numbers a sim can use directly (all in "world units"). */
export function derive(racer) {
  const s = racer.stats;
  return {
    topSpeed: 150 + s.speed * 26,               // units/s
    accel: 42 + s.acceleration * 20,            // units/s^2
    grip: 0.42 + s.handling * 0.1,              // steering authority 0..1
    mass: 0.7 + s.weight * 0.22,                // bump resistance
  };
}

export default roster;
