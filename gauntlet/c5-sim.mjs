import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
const snap = async ms => { await page.evaluate(m => window.__pkr.step(m), ms); return page.evaluate(() => {
  const s = window.__pkr.state(); const rs = s.race.racers;
  return { n: rs.length, ids: rs.map(r=>r.id), pos: rs.map(r=>r.pos).sort((a,b)=>a-b),
    tot: rs.map(r=>r.lap*100000 + r.dist), hud: s.race.hud, phase: s.race.phase }; }); };
const a = await snap(4000);
console.log('t=4000 n='+a.n, 'uniqIds='+new Set(a.ids).size, 'pos='+JSON.stringify(a.pos), 'hud='+JSON.stringify(a.hud));
const b = await snap(26000);
console.log('t=30000 n='+b.n, 'uniqIds='+new Set(b.ids).size, 'pos='+JSON.stringify(b.pos));
const d = a.tot.map((p,i)=>b.tot[i]-p);
console.log('advance min='+Math.min(...d).toFixed(0), 'max='+Math.max(...d).toFixed(0), 'stuck='+d.filter(x=>x<200).length);
console.log('errors='+errs.length, errs.slice(0,4));
await browser.close(); await close();
