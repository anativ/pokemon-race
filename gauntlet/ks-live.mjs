// kart-shell-sculpt: in-game capture, straight + ArrowLeft held, with a crop of
// the hero kart. node gauntlet/ks-live.mjs [racer]
import { serveRepo } from './../tools/screenshot.mjs';
import { chromium } from 'playwright';

const id = process.argv[2] || 'pikachu';
const { origin, server } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(String(e.message)));
await p.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=${id}&rolling=1&lap=2`);
await p.waitForFunction('window.__pkr && window.__pkr.isReady');
await p.evaluate(() => window.__pkr.step(2000));
await p.waitForTimeout(250);
await p.screenshot({ path: `gauntlet/shots/ks-live-${id}.png` });
// hero kart crop: bottom centre of the frame
await p.screenshot({ path: `gauntlet/shots/ks-live-${id}-crop.png`, clip: { x: 560, y: 500, width: 520, height: 380 } });

await p.keyboard.down('ArrowLeft');
await p.waitForTimeout(1100);
await p.screenshot({ path: `gauntlet/shots/ks-steer-${id}.png` });
await p.screenshot({ path: `gauntlet/shots/ks-steer-${id}-crop.png`, clip: { x: 520, y: 500, width: 560, height: 380 } });
await p.keyboard.up('ArrowLeft');
console.log('errs', errs.length, errs.slice(0, 4).join(' | '));
await b.close(); server.close();
