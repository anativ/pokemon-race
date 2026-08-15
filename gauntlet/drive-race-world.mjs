import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';

const SHOTS = new URL('./shots/', import.meta.url).pathname;
const { origin, close } = await serveRepo(new URL('../', import.meta.url).pathname);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
await page.goto(`${origin}/index.html?screen=race&track=pallet-town`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true, null, { timeout: 15000 });
await page.evaluate(() => window.__pkr.seed(7));
await page.evaluate(() => window.__pkr.step(4000)); // clear countdown

const snap = () => page.evaluate(() => {
  const s = window.__pkr.state();
  const r = (s.race && (s.race.player || (s.race.racers && s.race.racers[0]))) || {};
  return { t: s.t, keys: Object.keys(s.race || {}), player: JSON.parse(JSON.stringify(r)) };
});

console.log('BEFORE', JSON.stringify(await snap()).slice(0, 900));

// hold ArrowUp 2000ms, shot every 500
await page.keyboard.down('ArrowUp');
for (let i = 1; i <= 4; i++) {
  await page.evaluate(() => window.__pkr.step(500));
  await page.screenshot({ path: `${SHOTS}race-world-r1-drive-${i}.png` });
  const s = await snap();
  console.log(`DRIVE ${i}`, JSON.stringify(s.player).slice(0, 500));
}
await page.keyboard.up('ArrowUp');

// turn: up+left 1500ms
await page.keyboard.down('ArrowUp');
await page.keyboard.down('ArrowLeft');
for (let i = 1; i <= 3; i++) {
  await page.evaluate(() => window.__pkr.step(500));
  const s = await snap();
  console.log(`TURN ${i}`, JSON.stringify(s.player).slice(0, 500));
}
await page.screenshot({ path: `${SHOTS}race-world-r1-turn.png` });
await page.keyboard.up('ArrowLeft');
await page.keyboard.up('ArrowUp');

// 60 stepped frames
for (let i = 0; i < 60; i++) await page.evaluate(() => window.__pkr.step(16));
console.log('AFTER60', JSON.stringify((await snap()).player).slice(0, 500));
console.log('PROBLEMS', problems.length, problems.slice(0, 8).join(' | '));
await browser.close();
await close();
