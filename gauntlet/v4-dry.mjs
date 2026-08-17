import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const probs=[];
for (const seed of [3, 11]) {
  const p = await b.newPage({ viewport:{width:1600,height:900} });
  p.on('console',m=>{if(m.type()==='error')probs.push('s'+seed+': '+m.text())});
  p.on('pageerror',e=>probs.push('s'+seed+' pageerror: '+e.message));
  // pos=1 => nobody in front => dry fire
  await p.goto(origin+`/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&rolling=1&lap=2&pos=1&seed=${seed}`);
  await p.waitForFunction(()=>window.__pkr&&window.__pkr.isReady===true);
  await p.evaluate(()=>window.__pkr.step(4000));
  const st = await p.evaluate(()=>window.__pkr.state());
  console.log('seed',seed,'pos',st.race.hud.pos,'item',st.race.hud.item);
  await p.keyboard.press('Space');
  for (const [ms,tag] of [[50,'t50'],[60,'t110'],[90,'t200'],[150,'t350']]) {
    await p.evaluate(m=>window.__pkr.step(m), ms);
    await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await p.screenshot({path:`gauntlet/shots/verify4-15-dry-s${seed}-${tag}.png`, clip:{x:480,y:420,width:760,height:470}});
  }
  const dbg = await p.evaluate(()=>window.__pkr.state().race.racers.filter(r=>r.item).length);
  console.log('seed',seed,'shots done');
  await p.close();
}
await b.close(); await close();
console.log(probs.length?'PROBLEMS '+probs.join(' | '):'clean');
