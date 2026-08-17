/* dev helper: scan goto('results') podiums for a species pair. */
import { chromium } from 'playwright';
import { serveRepo } from '../../../tools/screenshot.mjs';
const want = (process.argv[2] || 'charizard,dragonite').split(',');
const racer = process.argv[3] || 'charizard';
const pos = Number(process.argv[4] || 2);
const n = Number(process.argv[5] || 30);
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 600, height: 400 } });
for (let s = 1; s <= n; s += 1) {
  await p.goto(`${origin}/index.html?screen=results&racer=${racer}&pos=${pos}&seed=${s}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__pkr && window.__pkr.isReady);
  const top = await p.evaluate(() => [...document.querySelectorAll('.pkr-rp-figure')].map((n2) => n2.dataset.species));
  const hit = want.every((w) => top.includes(w));
  if (hit || process.env.ALL) console.log(s, top.join('+'), hit ? '<== HIT' : '');
}
await b.close(); await close();
