import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto(origin+'/index.html?screen=race&track=pallet-town&racer=pikachu&rolling=1');
await p.waitForFunction(()=>window.__pkr&&window.__pkr.isReady===true);
const read = () => p.evaluate(()=>[...document.querySelectorAll('[data-dot]')].map(g=>g.getAttribute('transform')+' '+g.dataset.dot).join(' | '));
for (const t of [1000, 12000, 25000]) {
  await p.evaluate(ms=>window.__pkr.step(ms), t);
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
  console.log('t+',t, (await read()).slice(0,300));
}
await b.close(); await close();
