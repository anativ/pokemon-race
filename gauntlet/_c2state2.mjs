import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const s = await serveRepo(); const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1600,height:900} });
await p.goto(s.origin+'/index.html?screen=race&racer=pikachu&track=pallet-town&lap=2&pos=1&coins=10&item=thunder');
await p.waitForFunction(()=>window.__pkr && window.__pkr.isReady===true);
const dump = async(tag)=>console.log(tag, JSON.stringify(await p.evaluate(()=>{const r=window.__pkr.state().race;const o={};for(const k of Object.keys(r)){const v=r[k];o[k]=(v&&typeof v==='object')?(Array.isArray(v)?'arr'+v.length:JSON.stringify(v).slice(0,120)):v;}
 const hud=document.body.textContent.replace(/\s+/g,' ').trim().slice(0,120); return {race:o,hud};})));
await dump('T0');
await p.evaluate(()=>window.__pkr.step(20000)); await dump('T20');
await b.close(); await s.close();
