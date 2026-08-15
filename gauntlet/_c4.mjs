import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';

const SHOTS = new URL('./shots/', import.meta.url).pathname;
const { origin, close } = await serveRepo(new URL('../', import.meta.url).pathname);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));

const track = process.argv[2] || 'pallet-town';
const tag = process.argv[3] || track;
await page.goto(`${origin}/index.html?screen=race&track=${track}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true, null, { timeout: 15000 });
await page.evaluate(() => window.__pkr.seed(7));
await page.evaluate(() => window.__pkr.step(4000));

const snap = () => page.evaluate(() => {
  const s = window.__pkr.state();
  const r = (s.race && (s.race.player || (s.race.racers && s.race.racers[0]))) || {};
  return { z: r.z ?? r.dist ?? r.s, x: r.x, head: r.heading ?? r.angle ?? r.dir, lap: r.lap, prog: r.progress, speed: r.speed };
});

await page.keyboard.down('ArrowUp');
for (let i = 1; i <= 4; i++) {
  await page.evaluate(() => window.__pkr.step(500));
  await page.screenshot({ path: `${SHOTS}rw-r4c-${tag}-drive-${i}.png` });
  console.log(`DRIVE ${i}`, JSON.stringify(await snap()));
}
// keep driving to reach a real bend, shot every 1500ms
for (let i = 1; i <= 8; i++) {
  await page.evaluate(() => window.__pkr.step(1500));
  await page.screenshot({ path: `${SHOTS}rw-r4c-${tag}-far-${i}.png` });
  console.log(`FAR ${i}`, JSON.stringify(await snap()));
}
await page.keyboard.down('ArrowLeft');
for (let i = 1; i <= 3; i++) {
  await page.evaluate(() => window.__pkr.step(500));
  console.log(`TURN ${i}`, JSON.stringify(await snap()));
}
await page.screenshot({ path: `${SHOTS}rw-r4c-${tag}-turn.png` });
await page.keyboard.up('ArrowLeft');
await page.keyboard.up('ArrowUp');

// 60 stepped frames
for (let i = 0; i < 60; i++) await page.evaluate(() => window.__pkr.step(16));
console.log('PROBLEMS', problems.length, problems.slice(0, 5));
await browser.close(); await close();
