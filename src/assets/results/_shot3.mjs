/* dev helper: screenshot any URL of the game (results by default). */
import { chromium } from 'playwright';
import { serveRepo } from '../../../tools/screenshot.mjs';
const OUT = process.argv[2];
const q = process.argv[3] || 'screen=results&racer=charizard&pos=2&seed=1';
const wait = Number(process.argv[4] || 1200);
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(`${origin}/index.html?${q}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pkr && window.__pkr.isReady);
await p.waitForTimeout(wait);
await p.screenshot({ path: OUT });
console.log('errors:', errs.length,
  JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.pkr-rp-figure')].map((n) => n.dataset.species))),
  errs.slice(0, 2).join(' | '));
await b.close(); await close();
