/* dev helper: results screen animation + error check (two shots 1s apart). */
import { chromium } from 'playwright';
import crypto from 'node:crypto';
import { serveRepo } from '../../../tools/screenshot.mjs';
const q = process.argv[2] || 'screen=results&racer=charizard&pos=2&seed=1';
const out = process.argv[3] || '';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(`${origin}/index.html?${q}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pkr && window.__pkr.isReady);
await p.waitForTimeout(600);
const a = await p.screenshot();
await p.waitForTimeout(1000);
const c = await p.screenshot();
if (out) await p.screenshot({ path: out });
const h = (x) => crypto.createHash('sha1').update(x).digest('hex').slice(0, 10);
console.log('errors:', errs.length, 'shotA', h(a), 'shotB', h(c), 'animated:', h(a) !== h(c),
  JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.pkr-rp-figure')].map((n) => n.dataset.species))),
  errs.slice(0, 2).join(' | '));
await b.close(); await close();
