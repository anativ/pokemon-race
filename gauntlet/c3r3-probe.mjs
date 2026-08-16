import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=pikachu`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr?.isReady === true, null, { timeout: 20000 });
await page.evaluate(() => window.__pkr.seed(7));
await page.evaluate(() => window.__pkr.step(4000));
const s = await page.evaluate(() => {
  const st = window.__pkr.state();
  const r = st.race || {};
  return { topKeys: Object.keys(st), raceKeys: Object.keys(r), racer0: r.racers ? JSON.stringify(r.racers[0]).slice(0, 600) : null };
});
console.log(JSON.stringify(s, null, 1));
await browser.close(); await close();
