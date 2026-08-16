import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';

const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()); });

await page.goto(`${origin}/index.html?screen=race&track=ryme-city&racer=garchomp`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.waitForTimeout(300);
await page.keyboard.down('ArrowUp');

for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(700);
  const d = await page.evaluate(() => {
    const overlay = document.querySelector('#pkr-layer-overlay');
    const hud = document.querySelector('#pkr-layer-hud');
    const txt = (el) => el ? el.innerText.replace(/\s+/g, ' ').trim() : '(none)';
    const s = window.__pkr.state();
    return { overlay: txt(overlay), hud: txt(hud), item: s.race.hud.item, phase: s.race.phase };
  });
  console.log(i, 'phase=', d.phase, '| slot=', d.item, '| OVERLAY:', JSON.stringify(d.overlay), '| HUD:', JSON.stringify(d.hud));
}
await page.keyboard.up('ArrowUp');
await browser.close();
await close();
