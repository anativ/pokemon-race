import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(`${origin}/index.html?screen=race&track=${process.argv[3] || 'pallet-town'}&racer=pikachu`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pkr && window.__pkr.isReady, null, { timeout: 20000 });
let found = -1;
for (let i = 0; i < 120; i++) {
  await p.evaluate(() => window.__pkr.step(120));
  const gap = await p.evaluate(() => {
    const race = window.__pkrRace;
    const me = race.racers.find((r) => r.isPlayer);
    const cam = me.dist - 106;
    let best = 1e9;
    for (const pk of race.pickups) {
      if (pk.cool > 0) continue;
      for (let k = 0; k <= 1; k++) {
        let d = pk.dist + k * race.lapLen - cam;
        while (d < -race.lapLen / 2) d += race.lapLen;
        if (d > 30 && d < best) best = d;
      }
    }
    return best;
  });
  if (gap > 55 && gap < 125) { found = gap; break; }
}
await p.screenshot({ path: process.argv[2] || 'gauntlet/shots/ri-pickup.png' });
console.log('gap', Math.round(found));
console.log(errs.length ? `CONSOLE ERRORS: ${errs.slice(0, 3).join(' | ')}` : 'no console errors');
await b.close(); await close();
