import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo(process.cwd());
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
p.on('console', m => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', e => errs.push(String(e)));
await p.goto(origin + '/index.html?screen=race&racer=pikachu&track=pallet-town&t=0');
await p.waitForFunction(() => window.__pkr?.isReady === true, null, { timeout: 15000 });
const f = () => p.evaluate(() => {
  const R = window.__pkr.state().race;
  const me = R.racers.find(r => r.id === R.playerId) || R.racers[0];
  const dots = [...document.querySelectorAll('svg image, svg circle')].length;
  const chips = [...document.querySelectorAll('[class*=minimap] g, [class*=map] g')].length;
  const dom = (document.body.innerText || '').replace(/\s*\n\s*/g, '|');
  const player = document.querySelector('[class*=self],[class*=player],[class*=me]');
  const pb = player ? player.getBoundingClientRect() : null;
  return { cd: Math.round(R.countdown), phase: R.phase, spd: Math.round(me.speed), hud: R.hud, dom: dom.slice(0, 120), dots, chips, px: pb ? Math.round(pb.x) : null, py: pb ? Math.round(pb.y) : null };
});
let acc = 0;
for (const target of [0, 500, 1000, 2000, 2900, 3200, 4000]) {
  if (target > acc) { await p.evaluate(d => window.__pkr.step(d), target - acc); acc = target; }
  await p.waitForTimeout(60);
  console.log('t=' + acc, JSON.stringify(await f()));
}
await p.evaluate(() => window.__pkr.step(16000)); acc += 16000;
await p.waitForTimeout(120);
console.log('t=' + acc, JSON.stringify(await f()));
await p.evaluate(() => window.__pkr.step(3000)); acc += 3000;
await p.waitForTimeout(120);
console.log('t=' + acc, JSON.stringify(await f()));
console.log('ERRS', errs.length, errs.slice(0, 3));
await b.close(); await close();
