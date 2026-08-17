// TEMP verify-3 probe: exposes the live race object (read-only) for headless checks.
// Not listed in PLUGIN_MODULES - only loaded via ?plugins=../gauntlet/v3probe.js
import { state } from '../src/core/state.js';
import { riderArt } from '../src/race/species.js';
import { roster } from '../src/data/roster.js';
window.__V3art = () => roster.map((r) => {
  const a = riderArt(r);
  return { id: r.id, hw: Math.round(a.hw), bw: Math.round(a.bw), bespoke: !!a.bespoke, ops: a.ops.length };
});
window.__V3 = {
  race: () => state.race,
  beams: () => (state.race ? state.race.beams.map((b) => ({
    owner: b.owner, target: b.target || null, dry: !!b.dry, lane: b.lane,
    reach: Math.round(b.reach), front: Math.round(b.front), life: +b.life.toFixed(3),
    hits: (b.hits || []).slice(),
  })) : []),
};
