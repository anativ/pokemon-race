import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1600,height:900} });
const probs=[]; p.on('console',m=>{if(m.type()==='error')probs.push(m.text())}); p.on('pageerror',e=>probs.push('pageerror: '+e.message));
await p.goto(origin+'/index.html?screen=race&track=ryme-city&racer=gengar&lap=2&pos=3&rolling=1');
await p.waitForFunction(()=>window.__pkr&&window.__pkr.isReady===true);
await p.evaluate(()=>window.__pkr.step(5200));
await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
await p.screenshot({path:'gauntlet/shots/verify4-16-neon-bl.png', clip:{x:330,y:700,width:420,height:200}});
// sky band probe
await p.screenshot({path:'gauntlet/shots/verify4-17-neon-band.png', clip:{x:0,y:280,width:900,height:280}});
// a few later frames to see if the bl artifact persists
for (const [i,ms] of [[1,900],[2,900],[3,900]]) { await p.evaluate(m=>window.__pkr.step(m),ms);
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await p.screenshot({path:`gauntlet/shots/verify4-18-neon-bl-${i}.png`, clip:{x:330,y:700,width:420,height:200}}); }
await b.close(); await close();
console.log(probs.length?'PROBLEMS '+probs.join(' | '):'clean');
