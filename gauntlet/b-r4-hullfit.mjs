// Measures the body silhouette against the PAINTED kart in the very same frame:
// steps to the end of a dry burst's life, where flameCone's fade has gone to
// zero (nothing drawn) but __pkrBeam is still published.
import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=1');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => window.__pkr.step(6000));
const corner = process.argv[2] === 'corner';
if (corner) { await page.keyboard.down('ArrowLeft'); await page.evaluate(() => window.__pkr.step(700)); }
await page.keyboard.press('Space');
await page.evaluate(() => window.__pkr.step(575));
await page.waitForTimeout(80);
const b = await page.evaluate(() => window.__pkrBeam);
writeFileSync('/tmp/hull.json', JSON.stringify(b.hull));
console.log('life', b.life, 'from', JSON.stringify(b.from));
await page.screenshot({ path: `gauntlet/shots/b-r4-hullfit-${corner ? 'corner' : 'straight'}.png` });
if (corner) await page.keyboard.up('ArrowLeft');
await browser.close(); await close();
