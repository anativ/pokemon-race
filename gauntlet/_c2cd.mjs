import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const s = await serveRepo(); const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1600,height:900} });
await p.goto(s.origin+'/index.html?screen=race&racer=pikachu&track=pallet-town&t=0');
await p.waitForFunction(()=>window.__pkr && window.__pkr.isReady===true);
const info=async()=>p.evaluate(()=>{const r=window.__pkr.state().race;const pl=r.racers.find(x=>x.isPlayer)||r.racers[0];
 return {phase:r.phase, cd:r.countdown, speed:+(pl.speed||0).toFixed(2), txt:(document.querySelector('[class*=countdown]')||document.body).textContent.replace(/\s+/g,' ').trim().slice(0,60)};});
for (let i=0;i<5;i++){
  if(i) await p.evaluate(()=>window.__pkr.step(1000));
  console.log('t='+i+'s', JSON.stringify(await info()));
  await p.screenshot({path:`gauntlet/shots/hud-r2-cd-${i}s.png`});
}
await b.close(); await s.close();
