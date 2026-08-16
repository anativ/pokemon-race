import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
let sawItem = 0, maxCoins = 0;
for (let i = 0; i < 30; i++) {
  await page.evaluate(() => window.__pkr.step(1000));
  const h = await page.evaluate(() => window.__pkr.state().race.hud);
  if (h.item) sawItem++;
  maxCoins = Math.max(maxCoins, h.coins);
}
console.log('coinsMax=' + maxCoins, 'framesWithItem=' + sawItem);
console.log('errors30s=' + errs.length, errs.slice(0, 4));
await page.screenshot({ path: 'gauntlet/shots/ri-r4-grass-30s.png' });
await browser.close(); await close();
