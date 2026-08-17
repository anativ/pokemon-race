import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';

const track = process.argv[2] || 'pallet-town';
const tag = process.argv[3] || 'p';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await page.goto(`${url}/index.html?screen=race&track=${track}&racer=pikachu&item=hyper-beam`);
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => { window.__fxdbg = null; });
await page.evaluate(() => window.__pkr.step(6000));
await page.waitForTimeout(200);

const snap = async (name) => {
  await page.waitForTimeout(120);
  await page.screenshot({ path: `gauntlet/shots/iv2-${tag}-${name}.png` });
};
const brief = async () => page.evaluate(() => {
  const s = window.__pkr.state().race;
  const p = s.racers.find((r) => r.id === s.playerId);
  const near = s.racers
    .map((r) => ({ id: r.id, gap: +(r.dist - p.dist).toFixed(1), lane: +r.lane.toFixed(2), speed: +r.speed.toFixed(0), spun: +(r.spun || 0).toFixed(2) }))
    .filter((r) => r.gap > -60 && r.gap < 420)
    .sort((a, b) => a.gap - b.gap);
  const B = (window.__pkr.raceRef && window.__pkr.raceRef.beams) || [];
  return { player: { lane: +p.lane.toFixed(2), speed: +p.speed.toFixed(0), item: s.hud.item }, near };
});

console.log('BEFORE', JSON.stringify(await brief()));
await snap('t000');
await page.keyboard.press('Space');
await page.evaluate(() => window.__pkr.step(16));
console.log('T16', JSON.stringify(await brief()));
await snap('t016');
await page.evaluate(() => window.__pkr.step(184));
console.log('T200', JSON.stringify(await brief()));
await snap('t200');
await page.evaluate(() => window.__pkr.step(200));
console.log('T400', JSON.stringify(await brief()));
await snap('t400');
console.log('ERRORS', JSON.stringify(errs));
await browser.close();
await close();
