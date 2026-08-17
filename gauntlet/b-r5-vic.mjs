import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${url}/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=6`);
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => window.__pkr.step(8000));
await page.keyboard.press('Space');
let acc = 0;
for (const ms of [80, 120, 120, 120, 120]) {
  await page.evaluate((m) => window.__pkr.step(m), ms);
  await page.waitForTimeout(60);
  acc += ms;
  const b = await page.evaluate(() => window.__pkrBeam || null);
  await page.screenshot({ path: `gauntlet/shots/r5-vic-${acc}.png` });
  console.log(acc, b ? `mode=${b.mode} tgt=${b.target} cone=${JSON.stringify(b.cone)} hit=${JSON.stringify(b.hit)}` : 'NOBEAM');
}
console.log('ERRORS', errs.length, errs.slice(0,3).join(' | '));
await browser.close(); await close();
