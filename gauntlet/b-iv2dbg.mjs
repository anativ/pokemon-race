import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';

const track = process.argv[2] || 'pallet-town';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`${url}/index.html?screen=race&track=${track}&racer=pikachu&item=hyper-beam`);
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => { window.__fxdbg = null; });
await page.evaluate(() => window.__pkr.step(6000));
await page.waitForTimeout(200);
const dump = async (label) => {
  const d = await page.evaluate(() => window.__fxdbg);
  console.log(label, JSON.stringify(d, (k, v) => (typeof v === 'number' ? +v.toFixed(1) : v)));
};
await dump('BEFORE');
await page.keyboard.press('Space');
await page.evaluate(() => window.__pkr.step(16)); await page.waitForTimeout(100);
await dump('T16');
await page.evaluate(() => window.__pkr.step(184)); await page.waitForTimeout(100);
await dump('T200');
await page.evaluate(() => window.__pkr.step(200)); await page.waitForTimeout(100);
await dump('T400');
await browser.close();
await close();
