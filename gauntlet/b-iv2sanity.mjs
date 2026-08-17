import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const errs = [];
async function run(q, fire) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', m => { if (m.type()==='error') errs.push(q+': '+m.text()); });
  page.on('pageerror', e => errs.push(q+': PE '+e.message));
  await page.goto(url + '/index.html?' + q);
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
  await page.evaluate(() => window.__pkr.step(4000));
  if (fire) { await page.keyboard.press('Space'); await page.evaluate(() => window.__pkr.step(1500)); }
  const st = await page.evaluate(() => JSON.stringify(window.__pkr.state()));
  await page.close();
  return st;
}
for (const it of ['poke-ball','green-shell','shadow-ball','thunderbolt','boost-berry','hyper-beam']) {
  await run(`screen=race&track=mt-coronet&item=${it}`, true);
}
const a = await run('screen=race&track=pallet-town&seed=42&item=hyper-beam', true);
const b = await run('screen=race&track=pallet-town&seed=42&item=hyper-beam', true);
console.log('deterministic:', a === b);
console.log('errors:', JSON.stringify(errs));
await browser.close(); await close();
