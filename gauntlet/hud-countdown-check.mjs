// Countdown sequence check: token + lit columns + player speed at each beat.
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

const probe = () => page.evaluate(() => {
  const n = document.querySelector('[data-countdown]');
  const st = window.__pkr.state().race;
  const p = st.racers.find((r) => r.id === st.playerId);
  return {
    visible: !!n && !n.hidden,
    tok: n && !n.hidden ? n.dataset.count : null,
    red: document.querySelectorAll('.cd-col.lit:not(.green)').length,
    green: document.querySelectorAll('.cd-col.lit.green').length,
    phase: st.phase, speed: Math.round(p.speed * 100) / 100,
  };
});

const rows = [];
rows.push([0, await probe()]);
for (const ms of [1000, 1000, 1000, 1000]) {
  await page.evaluate((m) => window.__pkr.step(m), ms);
  rows.push([rows.length, await probe()]);
}
for (const [s, r] of rows) console.log(`t=${s}s`, JSON.stringify(r));

const ok = [];
ok.push(['t0 shows 3', rows[0][1].tok === '3' && rows[0][1].visible]);
ok.push(['t1 shows 2', rows[1][1].tok === '2']);
ok.push(['t2 shows 1', rows[2][1].tok === '1']);
ok.push(['t3 shows GO + all green', rows[3][1].tok === 'GO' && rows[3][1].green === 5]);
ok.push(['t4 rig gone', rows[4][1].visible === false]);
ok.push(['speed 0 until GO', rows[0][1].speed === 0 && rows[1][1].speed === 0 && rows[2][1].speed === 0]);
ok.push(['moving after GO', rows[4][1].speed > 0]);
ok.push(['no console errors', errs.length === 0]);
for (const [k, v] of ok) console.log(v ? 'PASS' : 'FAIL', k);
if (errs.length) console.log('ERRORS', errs.slice(0, 3));
await browser.close();
await close();
process.exit(ok.every(([, v]) => v) ? 0 : 1);
