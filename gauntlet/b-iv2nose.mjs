import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(`${url}/index.html?screen=race&track=pallet-town&racer=pikachu`);
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
const out = await page.evaluate(async () => {
  const m = await import('/src/race/kart3d.js');
  const res = {};
  for (const yaw of [0, 0.17, 0.4]) {
    const f = m.makeFrame(1, { yaw, roll: 0, pitch: 0 });
    res['yaw' + yaw] = {
      nose: f.p(0, 0.42, -1.45),
      noseHi: f.p(0, 0.72, -1.30),
      rear: f.p(0, 0.42, -0.72),
      seat: f.p(0, 1.05, -0.15),
      headTop: f.p(0, 2.0, 0.05),
      unitNose: f.unit(-1.45),
    };
  }
  return res;
});
console.log(JSON.stringify(out, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v), 1));
await browser.close(); await close();
