import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`${origin}/index.html?screen=race&racer=pikachu&track=pallet-town&coins=10&item=thunder`);
await p.waitForFunction(() => window.__pkr && window.__pkr.isReady, null, { timeout: 20000 });
const probe = () => p.evaluate(() => {
  const st = window.__pkr.state().race;
  const pl = st.racers.find(r => r.isPlayer || r.player || r.id === st.playerId);
  const dom = document.body.innerText.replace(/\s+/g, ' ');
  return { hud: st.hud, phase: st.phase, cd: st.countdown, speed: Math.round((pl && pl.speed) || 0), dom };
});
for (const ms of [0, 500, 500, 1000, 1000, 700, 300, 500]) {
  if (ms) await p.evaluate(m => window.__pkr.step(m), ms);
  const r = await probe();
  console.log(`t=${JSON.stringify(r.phase)} cd=${JSON.stringify(r.cd)} speed=${r.speed} hud=${JSON.stringify(r.hud)}`);
  console.log('   dom:', r.dom.slice(0, 90));
}
console.log('errors', errs.length, errs.slice(0, 2));
await b.close(); await close();
