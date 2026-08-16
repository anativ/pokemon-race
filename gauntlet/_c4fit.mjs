import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
const { origin, close } = await serveRepo();
const b = await chromium.launch();
for (const [w, h] of [[1600, 900], [1280, 720]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(`${origin}/index.html?screen=race&racer=pikachu&track=pallet-town&coins=10&item=thunder`);
  await p.waitForFunction(() => window.__pkr && window.__pkr.isReady, null, { timeout: 20000 });
  await p.evaluate(() => window.__pkr.step(1500));
  const bad = await p.evaluate(([w, h]) => {
    const out = [];
    document.querySelectorAll('[class*="hud"] *, [class*="mm-"], [class*="cd-"], [class*="count"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      if (r.left < -1 || r.top < -1 || r.right > w + 1 || r.bottom > h + 1) out.push(el.className + ' ' + JSON.stringify([r.left | 0, r.top | 0, r.right | 0, r.bottom | 0]));
    });
    return [out.slice(0, 6), document.documentElement.scrollWidth, document.documentElement.scrollHeight];
  }, [w, h]);
  console.log(w + 'x' + h, 'overflow=', JSON.stringify(bad));
  await p.close();
}
await b.close(); await close();
