import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1600,height:900} });
await p.goto(origin+'/index.html?screen=race&track=ryme-city&racer=gengar&lap=2&pos=3&rolling=1');
await p.waitForFunction(()=>window.__pkr&&window.__pkr.isReady===true);
const probe = () => p.evaluate(()=>{
  const cv=document.querySelector('#pkr-canvas'); const g=cv.getContext('2d');
  let bestRun=0, y0=-1, run=0, start=-1;
  for (let yy=200; yy<560; yy+=2){
    const d=g.getImageData(Math.round(cv.width*200/1600), Math.round(cv.height*yy/900),1,1).data;
    const magenta = d[0]>170 && d[2]>120 && d[1]<110 && d[0]-d[1]>80;
    if (magenta){ if(run===0) start=yy; run+=2; if(run>bestRun){bestRun=run;y0=start;} } else run=0;
  }
  return {bestRun,y0};
});
for (let i=0;i<16;i++){ await p.evaluate(()=>window.__pkr.step(400));
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
  const r = await probe();
  const d = await p.evaluate(()=>{const s=window.__pkr.state().race; return s.racers.find(x=>x.id===s.playerId).dist;});
  console.log('t'+((i+1)*400).toString().padStart(5),'dist',d.toFixed(0),'magentaBandPx',r.bestRun,'topY',r.y0);
  if (r.bestRun>60) await p.screenshot({path:`gauntlet/shots/verify4-19-band-t${(i+1)*400}.png`});
}
await b.close(); await close();
