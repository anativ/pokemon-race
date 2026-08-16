import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PE '+e.message));
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
for (let i=0;i<12;i++) await page.evaluate(() => window.__pkr.step(20000));
const r = await page.evaluate(() => { const s = window.__pkr.state();
  const rs = s.race.racers; return { screen: s.screen, phase: s.race.phase,
    fin: rs.filter(x=>x.finished).length, laps: rs.map(x=>x.lap),
    results: s.results ? s.results.order ? s.results.order.map(o=>o.pos||o.place) : Object.keys(s.results) : null,
    resJson: JSON.stringify(s.results).slice(0,400) }; });
console.log(JSON.stringify(r,null,1));
console.log('errors='+errs.length, errs.slice(0,4));
await browser.close(); await close();
