import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const s = await serveRepo(); const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1600,height:900} });
await p.goto(s.origin+'/index.html?screen=race&racer=pikachu&track=pallet-town&t=0');
await p.waitForFunction(()=>window.__pkr && window.__pkr.isReady===true);
const clip={x:560,y:0,width:480,height:260};
const shots=[];
for(const ms of [0,600,1200,1700,2100,2600]){
  if(ms) await p.evaluate((d)=>window.__pkr.step(d),ms-(shots.at(-1)||0));
  shots.push(ms);
  await p.screenshot({path:`gauntlet/shots/hud-r2-cdcrop-${ms}.png`, clip});
}
await b.close(); await s.close(); console.log('ok');
