import { chromium } from 'playwright';
import { serveRepo } from '/Users/alonnativ/code/playground/private/Gauntlet-Loop/pokemon-racing/tools/screenshot.mjs';
import fs from 'node:fs';

const OUT = '/private/tmp/claude-502/-Users-alonnativ-code-playground-private-Gauntlet-Loop-pokemon-racing/ca43fb0e-08f6-4788-9c4f-a8a1543e0f12/scratchpad';
const errs = [];
let pass = 0; let fail = 0;
const ok = (n, c, extra = '') => { if (c) { pass += 1; console.log('  PASS', n, extra); } else { fail += 1; console.log('  FAIL', n, extra); } };

const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));

async function boot(q) {
  await page.goto(`${origin}/index.html${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady, null, { timeout: 15000 });
}

/* ---------- 1. real race at seed 7, step to finish, compare podium -------- */
await boot('?screen=race&track=pallet-town&racer=snorlax&seed=7');
await page.evaluate(() => window.__pkr.seed(7));
let st = null;
for (let i = 0; i < 40; i += 1) {
  st = await page.evaluate(() => { window.__pkr.step(4000); return window.__pkr.state(); });
  if (st.race && st.race.phase === 'finished') break;
}
ok('race reaches finished at seed 7', st.race && st.race.phase === 'finished', `phase=${st.race && st.race.phase}`);
// auto-advance to results
for (let i = 0; i < 6 && (await page.evaluate(() => window.__pkr.screen())) !== 'results'; i += 1) {
  await page.evaluate(() => window.__pkr.step(1000));
}
const scr = await page.evaluate(() => window.__pkr.screen());
ok('auto-advances to results', scr === 'results', `screen=${scr}`);
const s1 = await page.evaluate(() => window.__pkr.state());
const dom1 = await page.evaluate(() => ({
  banner: [...document.querySelectorAll('[data-pkr-banner] [data-name]')].map((n) => n.textContent.trim()),
  podium: [...document.querySelectorAll('.pkr-rp-col')]
    .sort((a, b) => Number(a.dataset.place) - Number(b.dataset.place))
    .map((n) => n.querySelector('[data-podium-name]').textContent.trim()),
  species: [...document.querySelectorAll('.pkr-rp-col')]
    .sort((a, b) => Number(a.dataset.place) - Number(b.dataset.place))
    .map((n) => n.querySelector('.pkr-rp-figure').dataset.species),
  rank: (document.querySelector('[data-final-rank]') || {}).textContent,
  coins: (document.querySelector('[data-total-coins]') || {}).textContent,
  footer: document.body.innerText.replace(/\s+/g, ' '),
}));
const res = s1.results;
const expect = res.order.slice(0, 3).map((o) => window0(o.id));
function window0(id) { return id; }
const names = await page.evaluate((ids) => ids.map((id) => window.__pkr.roster.find((r) => r.id === id).name), res.order.slice(0, 3).map((o) => o.id));
ok('podium names == state() standings', JSON.stringify(dom1.podium) === JSON.stringify(names), `${dom1.podium} vs ${names}`);
ok('banner names == state() standings', JSON.stringify(dom1.banner) === JSON.stringify(names));
ok('figure species == standings ids', JSON.stringify(dom1.species) === JSON.stringify(res.order.slice(0, 3).map((o) => o.id)), dom1.species.join(','));
ok('FINAL RANK matches state', dom1.footer.includes(`FINAL RANK: ${ord(res.rank)}`), `rank=${res.rank} footer has ${dom1.rank}`);
ok('TOTAL COINS matches state', dom1.footer.includes(`TOTAL COINS: ${res.coins}`), `coins=${res.coins}`);
ok('footer has both labels', /TOTAL COINS/.test(dom1.footer) && /FINAL RANK/.test(dom1.footer));
function ord(n) { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

/* ---------- 2. a different seed yields a different podium ---------------- */
await boot('?screen=results&racer=pikachu&seed=19');
const dom2 = await page.evaluate(() => [...document.querySelectorAll('[data-podium-name]')].map((n) => n.textContent.trim()));
ok('different seed -> different podium', JSON.stringify(dom2) !== JSON.stringify(dom1.podium), `${dom2} vs ${dom1.podium}`);
await boot('?screen=results&racer=mewtwo&seed=7');
const dom3 = await page.evaluate(() => [...document.querySelectorAll('[data-podium-name]')].map((n) => n.textContent.trim()));
ok('different racer -> different podium', JSON.stringify(dom3) !== JSON.stringify(dom1.podium), `${dom3}`);

/* ---------- 3. the celebration animates (2 shots 1s apart) --------------- */
await boot('?screen=results&racer=snorlax&seed=19');
await page.waitForTimeout(400);
const a = await page.screenshot({ clip: { x: 200, y: 60, width: 1200, height: 700 } });
await page.waitForTimeout(1000);
const b = await page.screenshot({ clip: { x: 200, y: 60, width: 1200, height: 700 } });
fs.writeFileSync(`${OUT}/anim-a.png`, a); fs.writeFileSync(`${OUT}/anim-b.png`, b);
ok('celebration animates between two 1s-apart shots', Buffer.compare(a, b) !== 0, `${a.length} vs ${b.length} bytes`);

/* ---------- 4. continue key returns to a menu ---------------------------- */
await page.evaluate(() => window.__pkr.resume());
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
const after = await page.evaluate(() => window.__pkr.screen());
ok('[A]/Enter returns to a menu', ['track-select', 'character-select', 'title'].includes(after), `-> ${after}`);
await boot('?screen=results&racer=snorlax&seed=19');
await page.evaluate(() => window.__pkr.resume());
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const after2 = await page.evaluate(() => window.__pkr.screen());
ok('[B]/Esc returns to a menu', ['title', 'track-select', 'character-select'].includes(after2), `-> ${after2}`);

/* ---------- 5. every species has a bespoke pose ------------------------- */
const miss = await page.evaluate(async () => {
  const m = await import('/src/assets/results/podium-figures.js');
  const { roster } = await import('/src/data/roster.js');
  return m.missingPoses(roster);
});
ok('no roster id falls back to the generic body', miss.length === 0, miss.join(','));

/* ---------- 6. silhouettes actually differ ------------------------------ */
const uniq = await page.evaluate(async () => {
  const m = await import('/src/assets/results/podium-figures.js');
  const { roster } = await import('/src/data/roster.js');
  const set = new Set(roster.map((r) => m.podiumFigureSvg(r, { height: 200 })
    .replace(/pf\d+/g, '').replace(/#[0-9a-f]{3,8}/gi, '')));
  return { total: roster.length, unique: set.size };
});
ok('24 geometrically distinct bodies (colour-blind)', uniq.unique === uniq.total, `${uniq.unique}/${uniq.total}`);

ok('zero console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await browser.close(); await close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
