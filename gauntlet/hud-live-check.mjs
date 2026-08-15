// Live HUD verification for the race-hud-and-countdown piece.
// Usage: node gauntlet/hud-live-check.mjs
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';

const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));

await page.goto(`${origin}/index.html?screen=race&racer=pikachu&track=pallet-town&paused=1`);
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady);

const read = () => page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const st = window.__pkr.state().race;
  return {
    domPos: q('[data-pos]').textContent, domOrd: q('[data-ord]').textContent,
    domLap: q('[data-lap]').textContent, domCoins: q('[data-coins]').textContent,
    domField: q('[data-field]').textContent,
    dots: document.querySelectorAll('.mm-dot').length,
    me: (() => { const c = document.querySelector('.mm-me circle'); return c ? `${c.getAttribute('cx')},${c.getAttribute('cy')}` : null; })(),
    count: (() => { const n = document.querySelector('[data-countdown]'); return n && !n.hidden ? n.dataset.count : null; })(),
    green: document.querySelectorAll('.cd-col.lit.green').length,
    state: { pos: st.hud.pos, lap: st.hud.lap, coins: st.hud.coins, phase: st.phase, item: st.hud.item },
  };
});

const out = [];
const first = await read();
out.push(['t=0', JSON.stringify(first)]);

await page.evaluate(() => window.__pkr.step(20000));
const a = await read();
out.push(['t=20s', JSON.stringify(a)]);

await page.evaluate(() => window.__pkr.step(3000));
const b = await read();
out.push(['t=23s', JSON.stringify(b)]);

const ok = [];
ok.push(['12 dots', a.dots === 12]);
ok.push(['pos matches state', a.domPos === String(a.state.pos)]);
ok.push(['lap matches state', a.domLap === String(a.state.lap)]);
ok.push(['coins matches state', a.domCoins === String(a.state.coins)]);
ok.push(['field is 12', a.domField === '12']);
ok.push(['hud changed from frame 0', a.domLap !== first.domLap || a.domPos !== first.domPos || a.domCoins !== first.domCoins]);
ok.push(['player dot moved 3s apart', a.me !== b.me && !!a.me]);
ok.push(['countdown hidden while racing', a.count === null]);
ok.push(['no console errors', errs.length === 0]);

for (const [k, v] of out) console.log(k, v);
for (const [k, v] of ok) console.log(v ? 'PASS' : 'FAIL', k);
if (errs.length) console.log('ERRORS', errs.slice(0, 4));
await browser.close();
await close();
process.exit(ok.every(([, v]) => v) ? 0 : 1);
