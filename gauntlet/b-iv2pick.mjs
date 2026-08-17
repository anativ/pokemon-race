import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(`${url}/index.html?screen=race&track=${process.argv[2]}&racer=pikachu&item=hyper-beam`);
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => window.__pkr.step(6000));
await page.waitForTimeout(150);
console.log(JSON.stringify(await page.evaluate(() => {
  const s = window.__pkr.state().race;
  const p = s.racers.find(r => r.id === s.playerId);
  return s.racers.filter(r=>r.id!==p.id).map(r=>({id:r.id, gap:+(r.dist-p.dist).toFixed(1), off:+Math.abs(r.lane-p.lane).toFixed(2)})).filter(r=>r.gap>60&&r.gap<300);
})));
await browser.close(); await close();
