// rider-art r3: race capture + zoom crops. node gauntlet/ra3-shot.mjs <racer> <step>
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';

const racer = process.argv[2] || 'garchomp';
const step = Number(process.argv[3] || 2000);
const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${origin}/index.html?screen=race&track=pallet-town&racer=${racer}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady, null, { timeout: 20000 });
await page.evaluate((m) => window.__pkr.step(m), step);
await page.screenshot({ path: `gauntlet/shots/ra3-${racer}.png` });
// zoom: bottom-centre (player kart)
await page.screenshot({ path: `gauntlet/shots/ra3-${racer}-zoom.png`, clip: { x: 560, y: 430, width: 480, height: 360 } });
await page.screenshot({ path: `gauntlet/shots/ra3-${racer}-mid.png`, clip: { x: 380, y: 250, width: 840, height: 260 } });
console.log(errs.length ? `CONSOLE ERRORS: ${errs.slice(0, 4).join(' | ')}` : 'no console errors');
await browser.close();
await close();
