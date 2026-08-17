import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=1');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => window.__pkr.step(6000));
const corner = process.argv[2] === 'corner';
if (corner) {
  // steer hard left into a bend before firing
  await page.evaluate(async () => { window.__pkrHold = true; });
  await page.keyboard.down('ArrowLeft');
  await page.evaluate(() => window.__pkr.step(600));
}
await page.evaluate(() => { window.__pkr.state(); });
const st = await page.evaluate(() => {
  const s = window.__pkr.state();
  return { pos: s.player && s.player.pos, item: s.player && s.player.item, beams: s.beams };
});
console.log('pre', JSON.stringify(st));
await page.keyboard.press('Space');
let acc = 0;
for (const ms of [100, 150]) {
  await page.evaluate((m) => window.__pkr.step(m), ms);
  await page.waitForTimeout(80);
  acc += ms;
  const b = await page.evaluate(() => window.__pkrBeam);
  console.log('t=' + acc, JSON.stringify(b));
  const tag = `${corner ? 'corner' : 'straight'}-${acc}`;
  await page.screenshot({ path: `gauntlet/shots/b-r4-dry-${tag}.png`, clip: { x: 500, y: 300, width: 900, height: 580 } });
  await page.screenshot({ path: `gauntlet/shots/b-r4-full-${tag}.png` });
}
if (corner) await page.keyboard.up('ArrowLeft');
console.log('errors', errs.length, errs.slice(0, 4).join(' | '));
await browser.close(); await close();
