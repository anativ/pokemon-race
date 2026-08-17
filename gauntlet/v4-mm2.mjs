import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
for (const [tag,track,racer] of [['neon','ryme-city','gengar'],['grass','pallet-town','pikachu'],['snow','mt-coronet','snorlax']]) {
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto(origin+`/index.html?screen=race&track=${track}&racer=${racer}&lap=2&pos=3&rolling=1`);
  await p.waitForFunction(()=>window.__pkr&&window.__pkr.isReady===true);
  await p.evaluate(()=>window.__pkr.step(5200));
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await p.screenshot({path:`gauntlet/shots/verify4-06-minimap-${tag}.png`, clip:{x:1244,y:460,width:340,height:352}});
  console.log('mm',tag);
  await p.close();
}
await b.close(); await close();
