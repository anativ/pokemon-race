/**
 * verify4 fresh-eyes playthrough.
 *   node gauntlet/v4-play.mjs <stage>
 * stages: menus | race | item | finish
 * Every stage boots its own page, records console problems, shoots to gauntlet/shots/verify4-*.png
 */
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const SHOTS = path.resolve('gauntlet/shots');
const STAGE = process.argv[2] || 'menus';
const log = (...a) => console.log('[v4]', ...a);

const problems = [];
let where = 'boot';

async function boot(origin, browser, qs) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${where}] console.error: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${where}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${where}] requestfailed: ${r.url()}`));
  await page.goto(`${origin}/index.html${qs}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(350);
  return page;
}

const two = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function shot(page, name, clip) {
  await two(page);
  await page.screenshot({ path: path.join(SHOTS, `verify4-${name}.png`), ...(clip ? { clip } : {}) });
  log('shot', name);
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const { origin, close } = await serveRepo();
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const st = (page) => page.evaluate(() => window.__pkr.state());
  const key = async (page, k, wait = 240) => { await page.keyboard.press(k); await page.waitForTimeout(wait); };

  if (STAGE === 'menus') {
    where = 'title';
    const page = await boot(origin, browser, '');
    await shot(page, '01-title');
    log('screen', await page.evaluate(() => window.__pkr.screen()));
    await key(page, 'Enter', 550);
    where = 'character-select';
    await key(page, 'ArrowRight'); await key(page, 'ArrowRight'); await key(page, 'ArrowDown', 400);
    await shot(page, '02-select');
    log('select', JSON.stringify((await st(page)).select));
    await key(page, 'Enter', 550);
    where = 'track-select';
    await key(page, 'ArrowRight', 420);
    await shot(page, '03-track');
    log('select2', JSON.stringify((await st(page)).select));
    await key(page, 'Enter', 500);
    where = 'race-countdown';
    log('screen', await page.evaluate(() => window.__pkr.screen()));
    await shot(page, '04-countdown');
    const s = await st(page);
    log('phase', s.race.phase, 'cd', s.race.countdown, 'track', s.race.trackId, 'player', s.race.playerId);
  }

  if (STAGE === 'race') {
    for (const [tag, track] of [['grass', 'pallet-town'], ['neon', 'ryme-city']]) {
      where = `race-${tag}`;
      const page = await boot(origin, browser, `?screen=race&track=${track}&racer=pikachu&lap=2&pos=3&coins=14&item=green-shell&rolling=1`);
      await page.evaluate(() => window.__pkr.step(5200));
      await shot(page, `05-race-${tag}`);
      const s = await st(page);
      log(tag, 'phase', s.race.phase, 'hud', JSON.stringify(s.race.hud));
      // minimap + kart crops
      await shot(page, `06-minimap-${tag}`, { x: 1150, y: 20, width: 440, height: 400 });
      await shot(page, `07-kart-${tag}`, { x: 520, y: 400, width: 700, height: 460 });
      await page.close();
    }
  }

  if (STAGE === 'item') {
    where = 'item';
    // drive into a poke-ball row with no item, then fire what we get
    const page = await boot(origin, browser, '?screen=race&track=pallet-town&racer=pikachu&rolling=1&seed=7');
    let s = await st(page);
    log('start item', JSON.stringify(s.race.hud));
    let picked = null;
    for (let i = 0; i < 40 && !picked; i++) {
      await page.evaluate(() => window.__pkr.step(500));
      s = await st(page);
      if (s.race.hud.item) picked = s.race.hud.item;
    }
    log('picked item =', picked, 'after steps; hud', JSON.stringify(s.race.hud));
    await shot(page, '08-item-held');
    await page.close();

    // hyper-beam fire sequence (the dry-burst / beam cone path)
    for (const [tag, it] of [['beam', 'hyper-beam'], ['shell', 'green-shell'], ['bolt', 'thunderbolt']]) {
      where = `fire-${tag}`;
      const p2 = await boot(origin, browser, `?screen=race&track=pallet-town&racer=pikachu&item=${it}&rolling=1&lap=2&pos=4`);
      await p2.evaluate(() => window.__pkr.step(4000));
      const before = (await st(p2)).race.hud.item;
      await p2.keyboard.press('Space');
      await p2.evaluate(() => window.__pkr.step(60));
      await two(p2);
      await shot(p2, `09-fire-${tag}-t60`);
      await p2.evaluate(() => window.__pkr.step(140));
      await shot(p2, `10-fire-${tag}-t200`, { x: 380, y: 300, width: 1060, height: 580 });
      const after = (await st(p2)).race.hud.item;
      log(tag, 'item before', before, '-> after', after);
      await p2.close();
    }
  }

  if (STAGE === 'finish') {
    where = 'finish';
    const page = await boot(origin, browser, '?screen=race&track=pallet-town&racer=pikachu&lap=3&pos=1&coins=180&rolling=1');
    let s = await st(page);
    for (let i = 0; i < 120 && s.race && s.race.phase !== 'finished'; i++) {
      await page.evaluate(() => window.__pkr.step(1000));
      s = await st(page);
      if (await page.evaluate(() => window.__pkr.screen()) !== 'race') break;
    }
    log('screen after racing', await page.evaluate(() => window.__pkr.screen()), 'phase', s.race && s.race.phase);
    await shot(page, '11-finish');
    // let the auto-advance run in real time
    await page.evaluate(() => window.__pkr.resume && window.__pkr.resume());
    await page.waitForTimeout(3000);
    log('screen now', await page.evaluate(() => window.__pkr.screen()));
    await shot(page, '12-results-auto');
    await page.close();

    where = 'podium';
    for (const [tag, racer] of [['pikachu', 'pikachu'], ['charmander', 'charmander'], ['snorlax', 'snorlax']]) {
      const p = await boot(origin, browser, `?screen=results&track=pallet-town&racer=${racer}&pos=1&coins=250`);
      await shot(p, `13-podium-${tag}`);
      await shot(p, `14-podium-${tag}-crop`, { x: 420, y: 250, width: 780, height: 560 });
      await p.close();
    }
  }

  log(problems.length ? `PROBLEMS (${problems.length}):` : 'ZERO console problems');
  for (const p of problems) console.log('  -', p);
  await browser.close();
  await close();
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
