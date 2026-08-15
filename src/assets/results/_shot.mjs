import { chromium } from 'playwright';
import { serveRepo } from '../../../tools/screenshot.mjs';
const OUT = process.argv[2];
const seed = Number(process.argv[3] || 7);
const racer = process.argv[4] || 'snorlax';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=${racer}&seed=${seed}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pkr && window.__pkr.isReady);
await p.evaluate((s) => window.__pkr.seed(s), seed);
for (let i = 0; i < 40; i += 1) {
  const st = await p.evaluate(() => { window.__pkr.step(4000); return window.__pkr.state(); });
  if (st.race && st.race.phase === 'finished') break;
}
for (let i = 0; i < 8 && (await p.evaluate(() => window.__pkr.screen())) !== 'results'; i += 1) await p.evaluate(() => window.__pkr.step(1000));
await p.evaluate(() => window.__pkr.resume());
await p.waitForTimeout(900);
await p.screenshot({ path: OUT });
console.log('errors:', errs.length, JSON.stringify(await p.evaluate(() => window.__pkr.state().results.order.slice(0, 3))));
await b.close(); await close();
