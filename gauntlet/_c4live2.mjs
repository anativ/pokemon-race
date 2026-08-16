import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';

const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push(String(e)));
await p.goto(`${origin}/index.html?screen=race&racer=pikachu&track=pallet-town&lap=2&pos=1&coins=10&item=thunder`);
await p.waitForFunction(() => window.__pkr && window.__pkr.isReady, null, { timeout: 20000 });

const read = () => p.evaluate(() => {
  const st = window.__pkr.state();
  const dots = document.querySelectorAll('.mm-dot');
  const me = document.querySelector('.mm-me');
  const r = me && me.getBoundingClientRect();
  const txt = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, '') : null; };
  const race = st.race || {};
  const player = (race.racers || []).find(x => x.isPlayer) || {};
  return {
    dots: dots.length,
    me: r ? [Math.round(r.x), Math.round(r.y)] : null,
    lapText: txt('[class*="lap"]'), posText: txt('[class*="pos"],[class*="ordinal"]'), coinText: txt('[class*="coin"]'),
    stateKeys: Object.keys(race),
    lap: race.lap ?? player.lap, pos: race.position ?? player.position ?? player.place,
    coins: race.coins ?? player.coins, item: race.item ?? player.item, speed: Math.round(player.speed ?? race.speed ?? -1),
  };
});
for (const t of [0, 5000, 15000]) {
  if (t) await p.evaluate(ms => window.__pkr.step(ms), t);
  console.log('t+' + t, JSON.stringify(await read()));
}
console.log('errors', errs.length);
await b.close(); await close();
