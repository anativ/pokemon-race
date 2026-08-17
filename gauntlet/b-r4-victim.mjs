import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=6');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => window.__pkr.step(6000));
await page.keyboard.press('Space');
let acc = 0;
for (const ms of [60, 100, 100, 150, 150]) {
  await page.evaluate((m) => window.__pkr.step(m), ms);
  await page.waitForTimeout(70);
  acc += ms;
  const b = await page.evaluate(() => window.__pkrBeam);
  console.log('t=' + acc, b ? JSON.stringify({ mode: b.mode, target: b.target, cone: b.cone, hit: b.hit, clear: b.clear }) : 'none');
  await page.screenshot({ path: `gauntlet/shots/b-r4-victim-${acc}.png` });
}
console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
await browser.close(); await close();
