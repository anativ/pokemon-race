// Overflow check: no HUD/countdown element may leave the 1600x900 stage.
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';

const { origin, close } = await serveRepo();
const browser = await chromium.launch();
let bad = 0;
for (const [w, h] of [[1600, 900], [1280, 720]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${origin}/index.html?screen=race&racer=gengar&track=ryme-city&lap=2&pos=1&coins=14&item=green-shell&paused=1`);
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady);
  const over = await page.evaluate(() => {
    const stage = document.getElementById('pkr-stage').getBoundingClientRect();
    const out = [];
    const nodes = document.querySelectorAll('.pkr-hud > div > *, .pkr-hud > div, .pkr-countdown > *');
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const pad = 1;
      if (r.left < stage.left - pad || r.top < stage.top - pad
        || r.right > stage.right + pad || r.bottom > stage.bottom + pad) {
        out.push(`${n.className || n.tagName} L${Math.round(r.left - stage.left)} T${Math.round(r.top - stage.top)} R${Math.round(r.right - stage.right)} B${Math.round(r.bottom - stage.bottom)}`);
      }
    }
    return out;
  });
  console.log(`${w}x${h}`, over.length ? `FAIL ${JSON.stringify(over)}` : 'PASS no overflow');
  if (over.length) bad++;
  await page.close();
}
await browser.close();
await close();
process.exit(bad ? 1 : 0);
