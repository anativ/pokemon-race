/** Item use + race to the finish + results, with real key presses. */
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
import path from 'node:path';

const SHOTS = path.resolve('gauntlet/shots');
const { origin, close } = await serveRepo();
const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

const problems = [];
let where = 'boot';
page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${where}] ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`[${where}] pageerror: ${e.message}`));

const shot = async (n) => {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: path.join(SHOTS, `smoothing-${n}.png`) });
  console.log('[fin] shot', n);
};
const st = () => page.evaluate(() => window.__pkr.state());
const hudText = () => page.evaluate(() => {
  const h = document.querySelector('#pkr-layer-hud');
  return h ? h.innerText.replace(/\s+/g, ' ').trim() : '';
});

// Enter the race the way the menus leave it: chosen racer + chosen track.
await page.goto(`${origin}/index.html?screen=race&track=ryme-city&racer=garchomp`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
where = 'race';
await page.waitForTimeout(400);
await page.keyboard.down('ArrowUp');

// Drive until we hold an item, then FIRE it and catch the flash.
let fired = false;
for (let i = 0; i < 14 && !fired; i++) {
  await page.waitForTimeout(600);
  const s = await st();
  if (s.race.hud.item) {
    console.log('[fin] holding', s.race.hud.item, '-> firing');
    await page.keyboard.press('Space');
    await page.waitForTimeout(220);
    await shot('07-item-use');
    console.log('[fin] HUD after fire:', await hudText());
    const s2 = await st();
    console.log('[fin] slot after fire =', s2.race.hud.item);
    fired = true;
  }
}
console.log('[fin] fired =', fired);

// Fast-forward to the finish deterministically.
await page.keyboard.up('ArrowUp');
for (let i = 0; i < 14; i++) {
  await page.evaluate(() => window.__pkr.press('ArrowUp', 12000));
  const s = await st();
  console.log('[fin] step', i, 'phase=', s.race.phase, 'lap=', s.race.hud.lap, 'pos=', s.race.hud.pos);
  if (s.race.phase === 'finished') break;
}
await shot('08-race-finished');
await page.evaluate(() => window.__pkr.resume());
await page.waitForTimeout(3200);
where = 'results';
console.log('[fin] screen now =', await page.evaluate(() => window.__pkr.screen()));
await shot('09-results');
const rs = await st();
console.log('[fin] results =', JSON.stringify(rs.results).slice(0, 400));

console.log(problems.length ? `[fin] PROBLEMS(${problems.length}):` : '[fin] no console problems');
for (const p of problems) console.log('  -', p);
await browser.close();
await close();
