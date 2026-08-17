import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
const [track, seed, warm, tag] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4]), process.argv[5]];
await page.goto(`${url}/index.html?screen=race&track=${track}&racer=pikachu&item=hyper-beam&seed=${seed}`);
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(w => window.__pkr.step(w), warm);
await page.waitForTimeout(80);
await page.keyboard.press('Space');
await page.waitForTimeout(60);
const clip = { x: 500, y: 380, width: 760, height: 430 };
for (const [ms, name] of [[16, '1fire'], [184, '2t200'], [200, '3t400']]) {
  await page.evaluate(m => window.__pkr.step(m), ms);
  await page.waitForTimeout(90);
  await page.screenshot({ path: `gauntlet/shots/beam-anchor-p3r2-${tag}-${name}-z.png`, clip });
}
const st = await page.evaluate(() => {
  const s = window.__pkr.state().race;
  return s.racers.map(r => `${r.id}:${r.speed.toFixed(0)}`).join(',');
});
console.log('SPEEDS', st);
console.log('ERRORS', errs.length, errs.slice(0, 3).join(' | '));
await browser.close(); await close();
