import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 3 });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
const mode = process.argv[2];
if (mode === 'dry') {
  await page.goto(`${url}/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=1&seed=4`);
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
  await page.evaluate(() => window.__pkr.step(2000));
} else {
  await page.goto(`${url}/index.html?screen=race&track=ryme-city&racer=pikachu&item=hyper-beam&seed=5`);
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
  await page.evaluate(() => window.__pkr.step(8000));
}
await page.waitForTimeout(100);
await page.keyboard.press('Space');
await page.waitForTimeout(60);
await page.evaluate(() => window.__pkr.step(120));
await page.waitForTimeout(100);
await page.screenshot({ path: `gauntlet/shots/beam-anchor-p3r2-${mode}-hi.png`, clip: { x: 620, y: 480, width: 400, height: 230 } });
console.log('ERRORS', errs.length, errs.slice(0, 3).join(' | '));
await browser.close(); await close();
