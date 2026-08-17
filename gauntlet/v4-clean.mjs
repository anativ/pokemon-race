import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const urls=[];
for (const s of ['title','character-select','track-select','results']) urls.push(`?screen=${s}`);
for (const t of ['pallet-town','ryme-city','mt-coronet']) { urls.push(`?screen=race&track=${t}`); urls.push(`?screen=race&track=${t}&rolling=1&lap=3&pos=1&item=hyper-beam`); urls.push(`?screen=results&track=${t}&pos=3`);}
let bad=0;
for (const u of urls) {
  const p = await b.newPage({ viewport:{width:1600,height:900} });
  const probs=[]; p.on('console',m=>{if(m.type()==='error')probs.push(m.text())});
  p.on('pageerror',e=>probs.push('pageerror: '+e.message)); p.on('requestfailed',r=>probs.push('reqfail: '+r.url()));
  await p.goto(origin+'/index.html'+u); await p.waitForFunction(()=>window.__pkr&&window.__pkr.isReady===true);
  await p.evaluate(()=>window.__pkr.step(9000));
  await p.keyboard.press('Space'); await p.evaluate(()=>window.__pkr.step(3000));
  if(probs.length){bad++;console.log('FAIL',u,probs.join(' | '));}
  await p.close();
}
console.log(bad?`${bad}/${urls.length} URLS WITH ERRORS`:`ALL ${urls.length} URLs CLEAN`);
await b.close(); await close();
