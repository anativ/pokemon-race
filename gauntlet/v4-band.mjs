import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1600,height:900} });
await p.goto(origin+'/index.html?screen=race&track=ryme-city&racer=gengar&rolling=1');
await p.waitForFunction(()=>window.__pkr&&window.__pkr.isReady===true);
// sample the pixel column x=200 over the sky band rows, every 400ms of sim
const probe = () => p.evaluate(()=>{
  const cv=document.querySelector('#pkr-canvas'); const g=cv.getContext('2d');
  const sx = Math.round(cv.width*200/1600), rows=[];
  for (const yy of [300,360,400,440,480,520]) {
    const d=g.getImageData(sx, Math.round(cv.height*yy/900),1,1).data;
    rows.push(`${yy}:${d[0]},${d[1]},${d[2]}`);
  }
  return rows.join('  ');
});
for (let i=0;i<14;i++){ await p.evaluate(()=>window.__pkr.step(400));
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
  const st=await p.evaluate(()=>window.__pkr.state().race.racers.find(r=>r.id===window.__pkr.state().race.playerId).dist);
  console.log('t'+((i+1)*400).toString().padStart(5),'dist',st.toFixed(0),await probe()); }
await b.close(); await close();
