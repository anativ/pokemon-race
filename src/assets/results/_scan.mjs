/* dev helper: find seeds whose real-race podium contains a given pair. */
import { chromium } from 'playwright';
import { serveRepo } from '../../../tools/screenshot.mjs';

const want = (process.argv[2] || 'charizard,dragonite').split(',');
const racer = process.argv[3] || 'charizard';
const n = Number(process.argv[4] || 24);
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
await p.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=${racer}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pkr && window.__pkr.isReady);
const hits = [];
for (let s = 1; s <= n; s += 1) {
  await p.evaluate((v) => { window.__pkr.goto('race', { track: 'pallet-town', racer: v.r }); window.__pkr.seed(v.s); }, { s, r: racer });
  let st = null;
  for (let i = 0; i < 40; i += 1) {
    st = await p.evaluate(() => { window.__pkr.step(4000); return window.__pkr.state(); });
    if (st.race && st.race.phase === 'finished') break;
  }
  const top = (st.race.racers || []).slice().sort((a, x) => a.pos - x.pos).slice(0, 3).map((r) => r.id);
  if (want.every((w) => top.includes(w))) hits.push([s, top.join('+')]);
  else if (process.env.ALL) console.log(s, top.join('+'));
}
console.log('HITS', JSON.stringify(hits));
await b.close(); await close();
