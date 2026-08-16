import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
page.on('console', m=>{if(m.type()==='error') errs.push(m.text());});
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => window.__pkr.step(6000));
await page.waitForTimeout(150);
const before = await page.evaluate(()=>{const s=window.__pkr.state();return {item:s.race.hud.item, speeds:s.race.racers.map(r=>Math.round(r.speed))};});
await page.screenshot({ path: 'gauntlet/shots/ri-r5-beam-before.png' });
await page.keyboard.press('Space');
let acc=0;
for (const ms of [120,130,150,200,200]) {
  await page.evaluate(m=>window.__pkr.step(m), ms); await page.waitForTimeout(110); acc+=ms;
  await page.screenshot({ path: `gauntlet/shots/ri-r5-beam-t${acc}.png` });
  console.log('shot', acc);
}
const after = await page.evaluate(()=>{const s=window.__pkr.state();return {item:s.race.hud.item, speeds:s.race.racers.map(r=>Math.round(r.speed))};});
console.log('before item=', before.item, 'after item=', after.item);
console.log('speeds before', before.speeds.join(','));
console.log('speeds after ', after.speeds.join(','));
console.log('errors='+errs.length, errs.slice(0,3));
await browser.close(); await close();
