import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
const track = process.argv[2] || 'pallet-town';
await page.goto(`${url}/index.html?screen=race&track=${track}&racer=pikachu&item=hyper-beam&pos=1&seed=4`);
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
let best = null;
for (let i = 0; i < 14; i++) {
  await page.evaluate(() => window.__pkr.step(2000));
  const info = await page.evaluate(() => {
    const s = window.__pkr.state().race;
    const me = s.racers.find(r => r.id === s.playerId);
    const ahead = s.racers.filter(r => r.dist > me.dist);
    const near = ahead.sort((a, b) => a.dist - b.dist)[0];
    return { t: s.elapsed.toFixed(1), pos: s.hud.pos, n: ahead.length, gap: near ? +(near.dist - me.dist).toFixed(1) : null };
  });
  console.log(i, JSON.stringify(info));
  if (info.n === 0 || (info.gap !== null && info.gap > 400)) { best = info; break; }
}
if (best) {
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');
  await page.waitForTimeout(60);
  for (const [ms, name] of [[16, '1fire'], [184, '2t200'], [200, '3t400']]) {
    await page.evaluate(m => window.__pkr.step(m), ms);
    await page.waitForTimeout(90);
    await page.screenshot({ path: `gauntlet/shots/beam-anchor-p3r2-DRY-${name}-z.png`, clip: { x: 500, y: 380, width: 760, height: 430 } });
  }
  console.log('DRY captured', JSON.stringify(best));
} else console.log('no lead state found');
console.log('ERRORS', errs.length, errs.slice(0, 3).join(' | '));
await browser.close(); await close();
