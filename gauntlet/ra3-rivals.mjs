// close-quarters rival check. node gauntlet/ra3-rivals.mjs <racer> <track> <step>
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';

const racer = process.argv[2] || 'pikachu';
const track = process.argv[3] || 'pallet-town';
const step = Number(process.argv[4] || 9000);
const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${origin}/index.html?screen=race&track=${track}&racer=${racer}&rolling=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady, null, { timeout: 20000 });
await page.evaluate((m) => window.__pkr.step(m), step);
await page.screenshot({ path: `gauntlet/shots/ra3-riv-${racer}-${track}.png` });
console.log(errs.length ? `CONSOLE ERRORS: ${errs.slice(0, 4).join(' | ')}` : 'no console errors');
await browser.close();
await close();
