import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
const track = process.argv[2] || 'pallet-town';
for (const spec of process.argv.slice(3)) {
  const [seed, warm] = spec.split(':').map(Number);
  await page.goto(`${url}/index.html?screen=race&track=${track}&racer=pikachu&item=hyper-beam&seed=${seed}`);
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
  await page.evaluate(w => window.__pkr.step(w), warm);
  await page.waitForTimeout(80);
  const pre = await page.evaluate(() => {
    const s = window.__pkr.state().race;
    const me = s.racers.find(r => r.id === s.playerId);
    const ahead = s.racers.filter(r => r.dist > me.dist).sort((a, b) => a.dist - b.dist).slice(0, 2)
      .map(r => `${r.id}+${(r.dist - me.dist).toFixed(1)}@${r.lane.toFixed(2)}`);
    return { pos: s.hud.pos, myLane: me.lane.toFixed(2), ahead };
  });
  console.log(spec, JSON.stringify(pre));
  await page.keyboard.press('Space');
  await page.waitForTimeout(60);
  await page.evaluate(() => window.__pkr.step(200));
  await page.waitForTimeout(90);
  await page.screenshot({ path: `gauntlet/shots/beam-anchor-p3r2-scan-${track}-${seed}-${warm}.png`, clip: { x: 380, y: 300, width: 1060, height: 600 } });
}
console.log('ERRORS', errs.length, errs.slice(0, 3).join(' | '));
await browser.close(); await close();
