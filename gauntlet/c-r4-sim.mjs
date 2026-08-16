import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
const snap = async (ms) => {
  await page.evaluate(m => window.__pkr.step(m), ms);
  return page.evaluate(() => {
    const s = window.__pkr.state();
    const rs = s.race.racers;
    return {
      n: rs.length, ids: rs.map(r => r.id), pos: rs.map(r => r.pos).sort((a, b) => a - b),
      prog: rs.map(r => r.lap * 10000 + r.dist), speeds: rs.map(r => +r.speed.toFixed(0)),
      hud: s.race.hud, phase: s.race.phase, results: s.results,
    };
  });
};
const a = await snap(4000);
console.log('T4000 n=' + a.n, 'uniq=' + new Set(a.ids).size, 'posOK=' + (JSON.stringify(a.pos) === JSON.stringify([...Array(12)].map((_, i) => i + 1))), 'pos=' + a.pos.join(','));
const b = await snap(26000);
console.log('T30000 uniq=' + new Set(b.ids).size, 'posOK=' + (JSON.stringify(b.pos) === JSON.stringify([...Array(12)].map((_, i) => i + 1))));
const adv = a.prog.map((p, i) => b.prog[i] - p);
console.log('advance min=' + Math.min(...adv).toFixed(0), 'max=' + Math.max(...adv).toFixed(0), 'stuck=' + adv.filter(x => x < 100).length);
console.log('minSpeed@30s=' + Math.min(...b.speeds), 'maxSpeed=' + Math.max(...b.speeds));
// finish
let t = 30000, res = null;
for (let i = 0; i < 12 && !res; i++) { const c = await snap(30000); t += 30000; res = c.results; }
console.log('finishedAt~' + t, 'results=' + (res ? 'yes' : 'NO'));
if (res) {
  const ord = (res.standings || res.order || res.racers || []).map(r => r.pos);
  console.log('resultKeys=' + Object.keys(res).join(','), 'count=' + ord.length, 'order=' + ord.join(','));
}
console.log('errors=' + errs.length, errs.slice(0, 4));
await browser.close(); await close();
