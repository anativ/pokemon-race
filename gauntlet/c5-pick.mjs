import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
const log=[];
for (let i=0;i<10;i++){ await page.evaluate(()=>window.__pkr.step(2000));
  log.push(await page.evaluate(()=>{const h=window.__pkr.state().race.hud;return h.coins+'/'+(h.item||'-');})); }
console.log('coins/item over time:', log.join('  '));
await browser.close(); await close();
