import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1600,height:900} });
await p.goto(origin+'/index.html?screen=race&track=ryme-city&racer=gengar&lap=2&pos=3&rolling=1');
await p.waitForFunction(()=>window.__pkr&&window.__pkr.isReady===true);
await p.evaluate(()=>window.__pkr.step(5200));
await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
console.log(await p.evaluate(()=>{
  const cv=document.querySelector('#pkr-canvas'), g=cv.getContext('2d');
  const px=(x,y)=>{const d=g.getImageData(Math.round(cv.width*x/1600),Math.round(cv.height*y/900),1,1).data;return `#${[...d].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('')}`;};
  return ['L20:'+px(20,420),'C800:'+px(800,420),'R1580:'+px(1580,420),'top:'+px(800,352),'bot:'+px(800,494)].join(' ');
}));
// same frame with scenery/props suppressed is not available; instead check pallet-town for a red band
await p.goto(origin+'/index.html?screen=race&track=pallet-town&racer=pikachu&lap=2&pos=3&rolling=1');
await p.waitForFunction(()=>window.__pkr&&window.__pkr.isReady===true);
let hits=0;
for(let i=0;i<25;i++){ await p.evaluate(()=>window.__pkr.step(400));
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
  const n=await p.evaluate(()=>{const cv=document.querySelector('#pkr-canvas'),g=cv.getContext('2d');let run=0,best=0;
    for(let yy=200;yy<520;yy+=2){const d=g.getImageData(Math.round(cv.width*120/1600),Math.round(cv.height*yy/900),1,1).data;
      const flat=d[0]>150&&d[0]-d[1]>60&&d[0]-d[2]>60; if(flat){run+=2;best=Math.max(best,run);}else run=0;} return best;});
  if(n>40){hits++;console.log('pallet band at t',(i+1)*400,'px',n);}
}
console.log('pallet-town band frames:',hits,'/25');
await b.close(); await close();
