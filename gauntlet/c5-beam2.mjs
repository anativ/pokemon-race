import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => window.__pkr.step(6000)); await page.waitForTimeout(150);
await page.keyboard.press('Space');
let acc=0;
for (const ms of [40,40,60,60]) { await page.evaluate(m=>window.__pkr.step(m), ms); await page.waitForTimeout(100); acc+=ms;
  await page.screenshot({ path: `gauntlet/shots/ri-r5-beamzoom-t${acc}.png`, clip:{x:420,y:330,width:1000,height:560} }); console.log('z',acc); }
await browser.close(); await close();
