import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const errs = [];
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('requestfailed', r => errs.push('REQFAIL ' + r.url()));

for (const track of ['pallet-town', 'ryme-city', 'mt-coronet']) {
  await p.goto(`${origin}/index.html?screen=race&track=${track}&rolling=1`);
  await p.waitForFunction(() => window.__pkr && window.__pkr.isReady);
  await p.evaluate(() => window.__pkr.step(1500));
  await p.screenshot({ path: `gauntlet/shots/rw-r3-final-${track}.png` });
  // drive forward
  const d0 = await p.evaluate(() => window.__pkr.state().race.racers.find(r => r.isPlayer || r.id === window.__pkr.state().race.playerId));
  const before = await p.evaluate(() => JSON.stringify(window.__pkr.state().race.hud) + '|' + window.__pkr.state().race.racers[0].dist);
  await p.keyboard.down('ArrowUp');
  for (let i = 0; i < 4; i++) {
    await p.evaluate(() => window.__pkr.step(500));
    await p.screenshot({ path: `gauntlet/shots/rw-r3-drive-${track}-${i}.png` });
  }
  await p.keyboard.up('ArrowUp');
  await p.keyboard.down('ArrowUp'); await p.keyboard.down('ArrowLeft');
  for (let i = 0; i < 3; i++) await p.evaluate(() => window.__pkr.step(500));
  await p.screenshot({ path: `gauntlet/shots/rw-r3-turn-${track}.png` });
  await p.keyboard.up('ArrowUp'); await p.keyboard.up('ArrowLeft');
  // 60 stepped frames
  await p.evaluate(async () => { for (let i = 0; i < 60; i++) window.__pkr.step(16); });
  const after = await p.evaluate(() => JSON.stringify(window.__pkr.state().race.hud) + '|' + window.__pkr.state().race.racers[0].dist);
  console.log(track, 'before', before, '\n  after ', after);
}
console.log('ERRORS:', errs.length, errs.slice(0, 10));
await b.close(); await close();
