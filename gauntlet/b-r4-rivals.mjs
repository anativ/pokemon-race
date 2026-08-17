// Rivals fire beams too, through the non-player branch of kartRig. Run a long
// rolling race on each track with a big roster and assert nothing throws and
// every dry burst still reports its near cap on painted bodywork.
import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
let seen = 0;
let bad = 0;
for (const racer of ['snorlax', 'gengar', 'pikachu']) {
  for (const track of ['pallet-town', 'ryme-city', 'mt-coronet']) {
    await page.goto(`${url}/index.html?screen=race&track=${track}&racer=${racer}&rolling=1&seed=7`);
    await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
    for (let i = 0; i < 40; i++) {
      await page.evaluate(() => window.__pkr.step(250));
      const b = await page.evaluate(() => window.__pkrBeam);
      if (!b) continue;
      seen++;
      if (b.mode === 'burst' && b.onBody !== true) { bad++; console.log('BAD', racer, track, JSON.stringify(b.cone), b.bodyOverlap); }
    }
    console.log(racer, track, 'beamFrames', seen, 'bad', bad, 'errors', errs.length);
  }
}
console.log('TOTAL beamFrames', seen, 'bad', bad, 'errors', errs.length, errs.slice(0, 3).join(' | '));
await browser.close(); await close();
