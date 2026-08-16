import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=pikachu`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr?.isReady === true, null, { timeout: 15000 });
await page.evaluate(() => window.__pkr.seed(11));
let best = null;
for (let i = 0; i < 60; i++) {
  await page.evaluate(() => window.__pkr.step(250));
  const d = await page.evaluate(() => {
    const api = window.__pkr;
    const r = api.state().race || {};
    const p = (r.racers || []).find(x => x.id === r.playerId);
    const pk = api.items?.pickups || api.pickups || null;
    return { z: p?.z ?? p?.progress, coins: p?.coins, item: p?.item, pk: pk ? pk.length : null };
  });
  if (d.item) { best = { i, ...d }; break; }
}
console.log('PICKUP EVENT', JSON.stringify(best));
await page.waitForTimeout(200);
await page.screenshot({ path: 'gauntlet/shots/ri-crit-r1-pickup-near.png' });
console.log('ERRORS', errs.length);
await browser.close(); await close();
