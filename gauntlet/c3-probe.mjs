import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
import path from 'node:path';
const [q, step] = process.argv.slice(2);
const { origin, close } = await serveRepo(path.resolve('.'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
p.on('console', m => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', e => errs.push(String(e)));
await p.goto(`${origin}/index.html${q}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pkr?.isReady === true, null, { timeout: 15000 });
if (step && +step > 0) await p.evaluate(ms => window.__pkr.step(+ms), step);
await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const txt = (sel) => [...document.querySelectorAll(sel)].map(e => e.textContent.trim());
  const dots = [...document.querySelectorAll('[class*=dot],[class*=chip],[class*=blip],[class*=pip]')];
  const s = window.__pkr.state();
  return {
    hudText: document.querySelector('#hud, .hud, [class*=hud]')?.innerText?.replace(/\n+/g, ' | '),
    dotCount: dots.length,
    dotInfo: dots.slice(0, 14).map(d => { const b = d.getBoundingClientRect(); return `${d.className}@${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}`; }),
    state: { lap: s.lap, pos: s.position ?? s.pos, coins: s.coins, item: s.item, speed: s.speed, t: s.t, racers: (s.racers || []).length },
    keys: Object.keys(s),
  };
});
console.log(JSON.stringify(r, null, 1));
console.log('errs', errs.length, errs.slice(0, 3));
await b.close(); await close();
