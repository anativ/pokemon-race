/**
 * Fresh-eyes smoothing playthrough.
 * Drives the WHOLE flow with real key presses, screenshots each stage,
 * and records every console error with the screen it happened on.
 *
 *   node gauntlet/smoothing-play.mjs <stage>
 * stages: menus | race | all
 */
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const SHOTS = path.resolve('gauntlet/shots');
const STAGE = process.argv[2] || 'all';

const log = (...a) => console.log('[play]', ...a);

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const { origin, close } = await serveRepo();
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

  const problems = [];
  let where = 'boot';
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${where}] console.error: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${where}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${where}] requestfailed: ${r.url()}`));

  const shot = async (name) => {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: path.join(SHOTS, `smoothing-${name}.png`) });
    log('shot', name);
  };
  const key = async (k, wait = 260) => { await page.keyboard.press(k); await page.waitForTimeout(wait); };
  const st = () => page.evaluate(() => window.__pkr.state());

  await page.goto(`${origin}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true, null, { timeout: 15000 });
  await page.waitForTimeout(500);

  // ---- 1. title
  where = 'title';
  await shot('01-title');
  log('screen=', await page.evaluate(() => window.__pkr.screen()));

  // ---- 2. character select (navigate the grid, pick a NON-default racer)
  await key('Enter', 600);
  where = 'character-select';
  log('after Enter ->', await page.evaluate(() => window.__pkr.screen()));
  await key('ArrowRight'); await key('ArrowRight'); await key('ArrowDown');
  await shot('02-character-select');
  const sel = await st();
  log('selected racer =', JSON.stringify(sel.select));

  // ---- 3. track select (pick the SECOND track, ryme-city, not the default)
  await key('Enter', 600);
  where = 'track-select';
  log('after confirm ->', await page.evaluate(() => window.__pkr.screen()));
  await key('ArrowRight', 400);
  await shot('03-track-select');
  const sel2 = await st();
  log('select state =', JSON.stringify(sel2.select));

  if (STAGE === 'menus') { await report(); return; }

  // ---- 4. countdown
  await key('Enter', 500);
  where = 'race';
  log('after start ->', await page.evaluate(() => window.__pkr.screen()));
  await shot('04-countdown');
  let s = await st();
  log('race phase=', s.race && s.race.phase, 'countdown=', s.race && s.race.countdown,
      'track=', s.race && s.race.trackId, 'player=', s.race && s.race.playerId);

  // ---- 5. race a while (real driving: hold accelerate)
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(4500);
  await shot('05-race-early');
  s = await st();
  log('t=4.5s phase=', s.race.phase, 'hud=', JSON.stringify(s.race.hud), 'dist=', s.race.racers.find((r) => r.id === s.race.playerId)?.dist.toFixed(1));
  await page.waitForTimeout(6000);
  await page.keyboard.up('ArrowUp');
  await shot('06-race-mid');
  s = await st();
  log('t=10.5s hud=', JSON.stringify(s.race.hud));

  await report();

  async function report() {
    const finalScreen = await page.evaluate(() => window.__pkr.screen());
    log('final screen =', finalScreen);
    log(problems.length ? `PROBLEMS (${problems.length}):` : 'no console problems');
    for (const p of problems) console.log('  -', p);
    await browser.close();
    await close();
  }
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
