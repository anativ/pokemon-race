import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
for (const [tag, key] of [['straight', null], ['left', 'ArrowLeft']]) {
  await page.goto(`${url}/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=1`);
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
  await page.evaluate(() => window.__pkr.step(6000));
  if (key) { await page.keyboard.down(key); await page.evaluate(() => window.__pkr.step(700)); }
  await page.keyboard.press('Space');
  await page.evaluate(() => window.__pkr.step(100));
  await page.waitForTimeout(60);
  const b = await page.evaluate(() => window.__pkrBeam || null);
  console.log('==', tag, JSON.stringify({from: b.from, rider: b.rider, mouth: b.mouth, cone: b.cone}));
  console.log('hull', JSON.stringify(b.hull));
  if (key) await page.keyboard.up(key);
}
console.log('ERRORS', errs.length);
await browser.close(); await close();
