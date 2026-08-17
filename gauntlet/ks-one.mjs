// one big pose. node gauntlet/ks-one.mjs out.png racer steer [yaw] [scale]
import { serveRepo } from './../tools/screenshot.mjs';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const [out='gauntlet/shots/ks-one.png', id='pikachu', st='0', yw='', sc='420'] = process.argv.slice(2);
const { origin, server } = await serveRepo();
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1200,height:900} });
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push(String(e.message)));
await p.goto(origin+'/index.html?screen=race&track=pallet-town&racer=pikachu');
await p.waitForFunction('window.__pkr && window.__pkr.isReady');
const url = await p.evaluate(async ([id,st,yw,sc])=>{
  const [{drawKart},roster]=await Promise.all([import('/src/race/kart.js'),import('/src/data/roster.js')]);
  const list=roster.ROSTER||roster.roster||roster.default;
  const cv=document.createElement('canvas'); cv.width=1200; cv.height=900;
  const c=cv.getContext('2d'); c.fillStyle='#9fb6c8'; c.fillRect(0,0,1200,900);
  const o={steer:Number(st),spin:0.7,time:1.2}; if(yw!=='')o.yaw=Number(yw);
  drawKart(c,600,700,Number(sc),list.find(r=>r.id===id),o);
  return cv.toDataURL('image/png');
},[id,st,yw,sc]);
writeFileSync(out, Buffer.from(url.split(',')[1],'base64'));
console.log('wrote',out,'errs',errs.length,errs.slice(0,3).join(' | '));
await b.close(); server.close();
