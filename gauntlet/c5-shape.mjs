import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(ms => window.__pkr.step(ms), 4000);
console.log(await page.evaluate(() => {
  const s = window.__pkr.state();
  return JSON.stringify({ topKeys: Object.keys(s), raceKeys: Object.keys(s.race||{}), sample: (s.race?.racers||[])[0] }, null, 1).slice(0,1500);
}));
await browser.close(); await close();
