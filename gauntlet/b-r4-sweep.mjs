// Dry-fire sweep: straight / hard left / hard right on three tracks, sampled at
// +100 and +250 ms. Reports the measured overlap of the DRAWN near cap with the
// painted bodywork for every frame.
import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
let bad = 0;
for (const track of ['pallet-town', 'ryme-city', 'mt-coronet']) {
  for (const key of [null, 'ArrowLeft', 'ArrowRight']) {
    await page.goto(`${url}/index.html?screen=race&track=${track}&racer=pikachu&item=hyper-beam&pos=1`);
    await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
    await page.evaluate(() => window.__pkr.step(6000));
    if (key) { await page.keyboard.down(key); await page.evaluate(() => window.__pkr.step(700)); }
    await page.keyboard.press('Space');
    let acc = 0;
    for (const ms of [100, 150]) {
      await page.evaluate((m) => window.__pkr.step(m), ms);
      await page.waitForTimeout(60);
      acc += ms;
      const b = await page.evaluate(() => window.__pkrBeam);
      const ok = b && b.mode === 'burst' && b.onBody === true && b.bodyOverlap >= 0.7;
      if (!ok) bad++;
      const tag = `${track}-${key || 'straight'}-${acc}`;
      await page.screenshot({ path: `gauntlet/shots/b-r4-sw-${tag}.png` });
      console.log(`SHOT ${tag} ${JSON.stringify(b.cone)}`);
      console.log(`${track} ${key || 'straight'} +${acc}`, b ? `mode=${b.mode} onBody=${b.onBody} ov=${b.bodyOverlap} clear=${b.clear} cone=${b.cone.x0},${b.cone.y0}->${b.cone.x1},${b.cone.y1}` : 'NO BEAM', ok ? 'OK' : 'FAIL');
    }
    if (key) await page.keyboard.up(key);
  }
}
console.log('FAILS', bad, 'errors', errs.length, errs.slice(0, 3).join(' | '));
await browser.close(); await close();
