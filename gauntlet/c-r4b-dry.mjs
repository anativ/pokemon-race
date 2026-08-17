import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
for (const [tag, key] of [['straight', null], ['left', 'ArrowLeft']]) {
  await page.goto(`${url}/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=1`);
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
  await page.evaluate(() => window.__pkr.step(6000));
  if (key) { await page.keyboard.down(key); await page.evaluate(() => window.__pkr.step(700)); }
  await page.keyboard.press('Space');
  let acc = 0;
  for (const ms of [100, 150]) {
    await page.evaluate((m) => window.__pkr.step(m), ms);
    await page.waitForTimeout(80);
    acc += ms;
    const b = await page.evaluate(() => window.__pkrBeam || null);
    await page.screenshot({ path: `gauntlet/shots/beam-p4r2-dry-${tag}-${acc}.png` });
    await page.screenshot({ path: `gauntlet/shots/beam-p4r2-dryZ-${tag}-${acc}.png`, clip: { x: 560, y: 420, width: 520, height: 420 } });
    console.log(tag, acc, b ? `mode=${b.mode} onBody=${b.onBody} ov=${b.bodyOverlap} cone=${JSON.stringify(b.cone)}` : 'NOBEAM');
  }
  if (key) await page.keyboard.up(key);
}
console.log('ERRORS', errs.length, errs.slice(0,3).join(' | '));
await browser.close(); await close();
