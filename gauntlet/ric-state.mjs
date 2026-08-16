import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';

const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=pikachu`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr?.isReady === true, null, { timeout: 15000 });
await page.evaluate(() => window.__pkr.seed(7));

const snap = async (ms) => {
  await page.evaluate((m) => window.__pkr.step(m), ms);
  return page.evaluate(() => {
    const s = window.__pkr.state();
    const r = s.race || s;
    const list = (r.racers || s.racers || []).map(x => ({
      id: x.id, pos: x.position ?? x.pos, lap: x.lap, prog: Math.round((x.progress ?? x.dist ?? x.s ?? 0) * 10) / 10,
      item: x.item, finished: x.finished, coins: x.coins,
    }));
    return { keys: Object.keys(s), raceKeys: Object.keys(r), n: list.length, list, finished: r.finished, phase: r.phase, t: s.t };
  });
};

const a = await snap(4000);
console.log('T4000 n=', a.n, 'phase=', a.phase, 'keys=', a.raceKeys.join(','));
console.log(JSON.stringify(a.list));
const b = await snap(26000);
console.log('T30000 n=', b.n, 'phase=', b.phase);
console.log(JSON.stringify(b.list));
const posA = a.list.map(x => x.pos).sort((x, y) => x - y).join(',');
const posB = b.list.map(x => x.pos).sort((x, y) => x - y).join(',');
console.log('posA', posA);
console.log('posB', posB);
const moved = a.list.every((x, i) => (b.list[i].prog !== x.prog) || b.list[i].lap !== x.lap);
console.log('ALL_MOVED', moved, 'UNIQ_IDS', new Set(a.list.map(x => x.id)).size);
console.log('ERRORS', errs.length, errs.slice(0, 5).join(' | '));
await browser.close(); await close();
