// contact sheet of riders vs portraits. node gauntlet/ra3-sheet.mjs [ids] [outname]
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';

const only = process.argv[2] || '';
const name = process.argv[3] || 'sheet';
const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${origin}/gauntlet/ra3-sheet.html${only ? `?big=1&only=${only}` : ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__sheetReady, null, { timeout: 20000 });
await page.screenshot({ path: `gauntlet/shots/ra3-${name}.png`, fullPage: true });
console.log(errs.length ? `CONSOLE ERRORS: ${errs.slice(0, 4).join(' | ')}` : 'no console errors');
await browser.close();
await close();
