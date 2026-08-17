import { serveRepo } from '../tools/screenshot.mjs';
import { chromium } from 'playwright';
const { origin: url, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url + '/index.html?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&pos=1&plugins=../gauntlet/_b_r4_probe.js');
await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
await page.evaluate(() => window.__pkr.step(6000));
const corner = process.argv[2] === 'corner';
if (corner) { await page.keyboard.down('ArrowLeft'); await page.evaluate(() => window.__pkr.step(700)); }
await page.keyboard.press('Space');
await page.evaluate(() => window.__pkr.step(100));
await page.waitForTimeout(80);
console.log(JSON.stringify(await page.evaluate(() => window.__pkrProbe), null, 1));
if (corner) await page.keyboard.up('ArrowLeft');
await browser.close(); await close();
