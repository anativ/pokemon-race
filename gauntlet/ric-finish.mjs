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
for (let i = 0; i < 12; i++) {
  await page.evaluate(() => window.__pkr.step(20000));
  const st = await page.evaluate(() => {
    const s = window.__pkr.state(); const r = s.race || {};
    return { screen: s.screen, phase: r.phase, t: Math.round(s.t / 1000), fin: (r.racers || []).filter(x => x.finished).length, results: s.results ? (s.results.order || s.results.standings || s.results).length : 0 };
  });
  console.log(JSON.stringify(st));
  if (st.phase === 'finished' || st.screen === 'results') break;
}
const final = await page.evaluate(() => {
  const s = window.__pkr.state(); const r = s.race || {};
  return { screen: s.screen, phase: r.phase, order: (r.racers || []).map(x => [x.position, x.id, x.finished, x.lap]).sort((a, b) => a[0] - b[0]), results: s.results };
});
console.log(JSON.stringify(final).slice(0, 1800));
console.log('ERRORS', errs.length, errs.slice(0, 4).join(' | '));
await browser.close(); await close();
