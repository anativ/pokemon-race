import { chromium } from 'playwright';
import { serveRepo } from '/Users/alonnativ/code/playground/private/Gauntlet-Loop/pokemon-racing/tools/screenshot.mjs';
const OUT = process.argv[2];
const seed = Number(process.argv[3] || 7);
const racer = process.argv[4] || 'pikachu';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=${racer}&seed=${seed}&laps=1&rolling=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pkr && window.__pkr.isReady);
const info = await p.evaluate(async () => {
  for (let i = 0; i < 400; i++) {
    window.__pkr.step(1000);
    if (window.__pkr.state().race.phase === 'finished') break;
  }
  window.__pkr.step(3000);
  return { screen: window.__pkr.screen(), phase: window.__pkr.state().race.phase };
});
await p.waitForTimeout(900);
const spec = await p.evaluate(() => [...document.querySelectorAll('.pkr-rp-figure')].map((n) => n.dataset.species));
await p.screenshot({ path: OUT });
console.log(JSON.stringify({ info, spec, errs: errs.length, e0: errs[0] || '' }));
await b.close(); await close();
