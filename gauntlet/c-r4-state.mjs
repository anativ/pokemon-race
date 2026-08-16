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
await page.evaluate(() => window.__pkr.seed && window.__pkr.seed(7));

const summarize = async (t) => {
  await page.evaluate(ms => window.__pkr.step(ms), t);
  return await page.evaluate(() => {
    const s = window.__pkr.state();
    const rs = s.race.racers;
    return {
      n: rs.length,
      ids: rs.map(r => r.id),
      positions: rs.map(r => r.position).sort((a, b) => a - b),
      progress: rs.map(r => +(r.lap * 1000 + (r.trackPos || r.z || 0) / 100).toFixed(1)),
      finished: !!s.results,
      hud: s.race.hud, phase: s.race.phase,
    };
  });
};
const a = await summarize(4000);
console.log('t=4000 n=' + a.n, 'uniqIds=' + new Set(a.ids).size, 'pos=' + JSON.stringify(a.positions));
console.log('hud=', JSON.stringify(a.hud));
const b = await summarize(26000);
console.log('t=30000 n=' + b.n, 'uniqIds=' + new Set(b.ids).size, 'pos=' + JSON.stringify(b.positions));
const moved = a.progress.map((p, i) => b.progress[i] - p);
console.log('minAdvance=', Math.min(...moved).toFixed(1), 'maxAdvance=', Math.max(...moved).toFixed(1));
console.log('errors=', errs.length, errs.slice(0, 5));
await browser.close(); await close();
