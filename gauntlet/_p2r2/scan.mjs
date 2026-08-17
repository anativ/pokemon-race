import { chromium } from 'playwright';
import { serveRepo } from '../../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
for (const seed of [1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20]) {
  await p.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=pikachu&seed=${seed}&laps=1&rolling=1`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__pkr && window.__pkr.isReady);
  const spec = await p.evaluate(async () => {
    for (let i = 0; i < 400; i++) { window.__pkr.step(1000); if (window.__pkr.state().race.phase === 'finished') break; }
    window.__pkr.step(3000);
    return [...document.querySelectorAll('.pkr-rp-figure')].map((n) => n.dataset.species);
  });
  console.log(seed, spec.join(','));
}
await b.close(); await close();
