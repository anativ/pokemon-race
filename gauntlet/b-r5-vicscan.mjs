import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
for (const pos of [6, 9, 12]) {
  for (const t of [4000, 8000, 12000]) {
    await page.goto(`${url}/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=${pos}`);
    await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
    await page.evaluate((m) => window.__pkr.step(m), t);
    await page.keyboard.press('Space');
    await page.evaluate(() => window.__pkr.step(120));
    await page.waitForTimeout(50);
    const b = await page.evaluate(() => window.__pkrBeam || null);
    console.log(pos, t, b ? `${b.mode} tgt=${b.target}` : 'none');
  }
}
await browser.close(); await close();
