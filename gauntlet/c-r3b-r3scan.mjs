import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const track = process.argv[2] || 'pallet-town';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(`${url}/index.html?screen=race&track=${track}&racer=pikachu&item=hyper-beam`);
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
let t = 0;
for (let i = 0; i < 14; i++) {
  await page.evaluate(() => window.__pkr.step(3000)); t += 3000;
  const r = await page.evaluate(() => {
    const s = window.__pkr.state().race;
    const me = s.racers.find(x => x.id === s.playerId);
    const half = s.lapLen / 2;
    const fw = (a,b)=>{let g=b-a;while(g<-half)g+=s.lapLen;while(g>half)g-=s.lapLen;return g;};
    const cands = s.racers.filter(x=>x.id!==me.id&&!x.finished).map(x=>({id:x.id,g:+fw(me.dist,x.dist).toFixed(0),dl:+(x.lane-me.lane).toFixed(2)}))
      .filter(x=>x.g>=150&&x.g<=460&&Math.abs(x.dl)<=1.0).sort((a,b)=>a.g-b.g);
    return { lapLen: Math.round(s.lapLen), pos: s.hud.pos, item: s.hud.item, cands: cands.slice(0,3) };
  });
  console.log(t, JSON.stringify(r));
}
await browser.close(); await close();
