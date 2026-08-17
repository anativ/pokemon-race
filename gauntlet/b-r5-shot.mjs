import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
const tag0 = process.argv[2] || 'a';
for (const [tag, key] of [['straight', null], ['left', 'ArrowLeft']]) {
  await page.goto(`${url}/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=1`);
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
  await page.evaluate(() => window.__pkr.step(6000));
  if (key) { await page.keyboard.down(key); await page.evaluate(() => window.__pkr.step(700)); }
  await page.keyboard.press('Space');
  let acc = 0;
  for (const ms of [100, 150]) {
    await page.evaluate((m) => window.__pkr.step(m), ms);
    await page.waitForTimeout(70);
    acc += ms;
    const b = await page.evaluate(() => window.__pkrBeam || null);
    const cx = (b.cone.x0 + b.cone.x1) / 2, cy = (b.cone.y0 + b.cone.y1) / 2;
    const clip = { x: Math.max(0, Math.min(1600 - 620, cx - 310)), y: Math.max(0, Math.min(900 - 440, cy - 220)), width: 620, height: 440 };
    await page.screenshot({ path: `gauntlet/shots/r5-${tag0}-${tag}-${acc}.png`, clip });
    console.log(tag, acc, `onBody=${b.onBody} ov=${b.bodyOverlap} clear=${b.clear} cone=${JSON.stringify(b.cone)}`);
  }
  if (key) await page.keyboard.up(key);
}
console.log('ERRORS', errs.length, errs.slice(0,3).join(' | '));
await browser.close(); await close();
