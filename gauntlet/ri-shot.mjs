// item-use before/after capture. node gauntlet/ri-shot.mjs <item> <outPrefix> [pre-step]
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';

const item = process.argv[2] || 'hyper-beam';
const out = process.argv[3] || 'gauntlet/shots/ri-item';
const pre = Number(process.argv[4] || 2600);
const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=pikachu&item=${item}&rolling=1`,
  { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady, null, { timeout: 20000 });
await page.evaluate((m) => window.__pkr.step(m), pre);
await page.screenshot({ path: `${out}-before.png` });
await page.evaluate(() => { window.__pkr.press(' ', 60); });
await page.evaluate(() => window.__pkr.step(180));
await page.screenshot({ path: `${out}-mid.png` });
await page.evaluate(() => window.__pkr.step(220));
await page.screenshot({ path: `${out}-after.png` });
const s = await page.evaluate(() => {
  const r = window.__pkr.state().race;
  return { item: r.hud.item, speeds: r.racers.map((x) => Math.round(x.speed)) };
});
console.log(JSON.stringify(s));
console.log(errs.length ? `CONSOLE ERRORS: ${errs.slice(0, 4).join(' | ')}` : 'no console errors');
await browser.close();
await close();
