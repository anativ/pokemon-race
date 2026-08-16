import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=pikachu`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr?.isReady === true, null, { timeout: 20000 });
await page.evaluate(() => window.__pkr.seed(3));
// coin/pickup check
const c0 = await page.evaluate(() => { const r = window.__pkr.state().race; const m = r.racers.find(x => x.id === r.playerId); return { coins: m.coins, item: m.item }; });
await page.evaluate(() => window.__pkr.step(9000));
const c1 = await page.evaluate(() => { const r = window.__pkr.state().race; const m = r.racers.find(x => x.id === r.playerId); return { coins: m.coins, item: m.item }; });
console.log('COINS', JSON.stringify(c0), '->', JSON.stringify(c1));
for (let i = 0; i < 12; i++) {
  await page.evaluate(() => window.__pkr.step(20000));
  const st = await page.evaluate(() => { const s = window.__pkr.state(); const r = s.race; return { phase: r.phase, fin: r.racers.filter(x => x.finished).length, res: s.results ? (s.results.rows || s.results.order || s.results.racers || []).length : 0 }; });
  if (st.phase === 'finished' || st.fin === 12 || st.res === 12) { console.log('DONE at iter', i, JSON.stringify(st)); break; }
  if (i === 11) console.log('NOT FINISHED', JSON.stringify(st));
}
const fin = await page.evaluate(() => {
  const s = window.__pkr.state();
  const rows = s.results ? (s.results.rows || s.results.order || s.results.racers || []) : [];
  return { phase: s.race.phase, n: rows.length, order: rows.map((r, i) => `${r.pos ?? i + 1}:${r.id}`).join(','), unique: new Set(rows.map(r => r.pos)).size };
});
console.log('FINISH', JSON.stringify(fin));
console.log('ERRORS', errs.length, errs.slice(0, 4).join(' | '));
await browser.close(); await close();
