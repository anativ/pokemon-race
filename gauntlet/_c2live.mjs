import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const s = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1600,height:900} });
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(s.origin+'/index.html?screen=race&racer=pikachu&track=pallet-town&lap=2&pos=1&coins=10&item=thunder');
await p.waitForFunction('window.__pkr && window.__pkr.isReady === true');
const snap = async () => p.evaluate(()=>{
  const st = window.__pkr.state();
  const txt = sel => { const e=document.querySelector(sel); return e? e.textContent.trim().replace(/\s+/g,' ') : null; };
  const hud = document.querySelector('.hud, #hud, [class*="hud"]');
  const dots = document.querySelectorAll('[class*="minimap"] [class*="dot"], [class*="minimap"] circle, .pkr-minimap-dot');
  return { lap: st.lap, pos: st.position ?? st.pos, coins: st.coins, item: st.item, speed: st.speed,
    hudText: hud ? hud.textContent.trim().replace(/\s+/g,' ').slice(0,200) : null,
    dotCount: dots.length, dotPos: [...dots].slice(0,14).map(d=> d.getAttribute('cx')? d.getAttribute('cx')+','+d.getAttribute('cy') : (d.style.left+','+d.style.top)) };
});
console.log('T0', JSON.stringify(await snap()));
await p.evaluate(()=>window.__pkr.step(20000));
console.log('T20', JSON.stringify(await snap()));
await p.evaluate(()=>window.__pkr.step(3000));
console.log('T23', JSON.stringify(await snap()));
console.log('ERRORS', errs.length, errs.slice(0,3));
await b.close(); await s.close();
