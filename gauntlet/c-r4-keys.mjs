import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => window.__pkr.step(4000));
const out = await page.evaluate(() => {
  const s = window.__pkr.state();
  const dump = (o, d = 0) => {
    if (d > 2 || !o || typeof o !== 'object') return typeof o;
    if (Array.isArray(o)) return `Array(${o.length})<` + (o.length ? dump(o[0], d + 1) : '') + '>';
    const r = {}; for (const k of Object.keys(o)) r[k] = dump(o[k], d + 1); return r;
  };
  return JSON.stringify(dump(s), null, 1);
});
console.log(out.slice(0, 3000));
await browser.close(); await close();
