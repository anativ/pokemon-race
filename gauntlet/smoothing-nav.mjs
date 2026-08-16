/** Seam checks: back-navigation, replay loop, and URL-selection carry. */
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';

const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));

const go = async (q) => {
  await page.goto(`${origin}/index.html${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true);
  await page.waitForTimeout(300);
};
const key = async (k, w = 350) => { await page.keyboard.press(k); await page.waitForTimeout(w); };
const sel = () => page.evaluate(() => ({ s: window.__pkr.screen(), ...window.__pkr.state().select }));

// A. does track-select honour ?track= (or stomp it with its own cursor)?
await go('?screen=track-select&track=mt-coronet&racer=snorlax');
console.log('A track-select ?track=mt-coronet ->', JSON.stringify(await sel()));

await go('?screen=character-select&racer=snorlax');
console.log('A2 char-select ?racer=snorlax ->', JSON.stringify(await sel()));

// B. back navigation: track-select -> B -> character-select, does the racer stick?
await go('');
await key('Enter', 500);                       // title -> character select
await key('ArrowRight'); await key('ArrowRight');
const picked = await sel();
console.log('B picked  ->', JSON.stringify(picked));
await key('Enter', 500);                       // -> track select
await key('ArrowDown', 350);                   // move to track 2
const onTrack = await sel();
console.log('B track   ->', JSON.stringify(onTrack));
await key('Escape', 500);                      // back to character select
console.log('B after B ->', JSON.stringify(await sel()));
await key('Enter', 500);
console.log('B re-fwd  ->', JSON.stringify(await sel()));

// C. results -> A -> track-select, does the racer survive the loop?
await go('?screen=results&track=mt-coronet&racer=snorlax&pos=1&coins=250');
console.log('C results ->', JSON.stringify(await sel()));
await key('Enter', 600);
console.log('C after A ->', JSON.stringify(await sel()));
await key('Escape', 600);
console.log('C after B ->', JSON.stringify(await sel()));

console.log(problems.length ? `PROBLEMS(${problems.length}): ${problems.join(' | ')}` : 'no console problems');
await browser.close();
await close();
