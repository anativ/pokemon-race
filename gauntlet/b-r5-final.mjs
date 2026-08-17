import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
function inPoly(p, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
for (const [tag, key] of [['straight', null], ['left', 'ArrowLeft']]) {
  await page.goto(`${url}/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=1`);
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
  await page.evaluate(() => window.__pkr.step(6000));
  if (key) { await page.keyboard.down(key); await page.evaluate(() => window.__pkr.step(700)); }
  await page.keyboard.press('Space');
  let acc = 0;
  for (const ms of [100, 150, 200, 200]) {
    await page.evaluate((m) => window.__pkr.step(m), ms);
    await page.waitForTimeout(50);
    acc += ms;
    const b = await page.evaluate(() => window.__pkrBeam || null);
    if (!b) { console.log(tag, acc, 'NOBEAM'); continue; }
    const root = { x: b.cone.x0, y: b.cone.y0 };
    const on = b.hull.some((poly) => inPoly(root, poly));
    console.log(tag, acc, `${b.mode} rootInHull=${on} ov=${b.bodyOverlap} len=${Math.round(Math.hypot(b.cone.x1-b.cone.x0, b.cone.y1-b.cone.y0))} r0/r1=${b.cone.r0}/${b.cone.r1}`);
  }
  if (key) await page.keyboard.up(key);
}
await page.goto(`${url}/index.html?screen=race&track=pallet-town&racer=charmander&pos=5`);
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
for (let i = 0; i < 6; i++) await page.evaluate(() => window.__pkr.step(4000));
console.log('ERRORS', errs.length, errs.slice(0,3).join(' | '));
await browser.close(); await close();
