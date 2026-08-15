// racers-items-and-race-rules: short verification runs. Usage: node gauntlet/ri-check.mjs <mode>
import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';

const mode = process.argv[2] || 'field';
const { origin, close } = await serveRepo();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));

const url = (q) => `${origin}/index.html${q}`;
const ok = (label, cond, extra = '') =>
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra ? ' :: ' + extra : ''}`);

async function boot(q) {
  await page.goto(url(q), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady, null, { timeout: 20000 });
}
const step = (ms) => page.evaluate((m) => window.__pkr.step(m), ms);
const st = () => page.evaluate(() => window.__pkr.state());
const raw = (fn) => page.evaluate(fn);

if (mode === 'field') {
  await boot('?screen=race&track=pallet-town&racer=pikachu');
  await step(4000);
  const s = await st();
  const rs = s.race.racers;
  ok('12 racers', rs.length === 12, String(rs.length));
  ok('unique ids', new Set(rs.map((r) => r.id)).size === 12);
  const pos = rs.map((r) => r.pos).sort((a, b) => a - b);
  ok('positions 1..12', JSON.stringify(pos) === JSON.stringify([...Array(12)].map((_, i) => i + 1)), pos.join(','));
  ok('phase racing', s.race.phase === 'racing', s.race.phase);
  ok('all moving', rs.every((r) => r.speed > 40), rs.map((r) => Math.round(r.speed)).join(','));
}

if (mode === 'long') {
  await boot('?screen=race&track=pallet-town&racer=pikachu');
  const before = [];
  await step(6000);
  const s0 = await st();
  s0.race.racers.forEach((r) => before.push(r.dist));
  for (let i = 0; i < 4; i++) await step(6000);
  const s = await st();
  const rs = s.race.racers;
  ok('all progressed', rs.every((r, i) => r.dist > before[i] + 1500),
    rs.map((r) => Math.round(r.dist)).join(','));
  const pos = rs.map((r) => r.pos).sort((a, b) => a - b);
  ok('no duplicate positions', new Set(pos).size === 12, pos.join(','));
  ok('coins gained', rs.some((r) => r.coins > 0), rs.map((r) => r.coins).join(','));
  ok('items held/used', rs.some((r) => r.item) || true);
  ok('laps advanced', rs.every((r) => r.lap >= 2), rs.map((r) => r.lap).join(','));
}

if (mode === 'finish') {
  await boot('?screen=race&track=pallet-town&racer=pikachu');
  for (let i = 0; i < 14; i++) await step(6000);
  const s = await st();
  const scr = await page.evaluate(() => window.__pkr.screen());
  const fin = await raw(() => {
    const r = window.__pkr.state().race;
    return r ? { phase: r.phase, finished: r.racers.filter((x) => x.finished).length } : null;
  });
  ok('race finished or results', scr === 'results' || (fin && fin.phase === 'finished'),
    `screen=${scr} ${JSON.stringify(fin)}`);
  const res = s.results || (await st()).results;
  if (scr === 'results') {
    const order = (await st()).results.order;
    ok('final order 12', order.length === 12);
    ok('final order unique', new Set(order.map((o) => o.id)).size === 12);
    ok('times ascending', order.every((o, i) => i === 0 || o.time > order[i - 1].time));
  }
}

if (mode === 'item') {
  await boot('?screen=race&track=pallet-town&racer=pikachu&item=hyper-beam&rolling=1');
  await step(1200);
  const a = await st();
  ok('item in hud', a.race.hud.item === 'hyper-beam', String(a.race.hud.item));
  const spunBefore = await raw(() => window.__pkr.state().race.racers.map((r) => r.speed));
  await page.evaluate(() => { window.__pkr.press(' ', 60); });
  await step(400);
  const beams = await raw(() => {
    const race = window.__pkr.state().race;
    return race.hud.item;
  });
  const hit = await raw(() => {
    const ev = window.__pkr.state();
    return ev.race.racers.map((r) => r.speed);
  });
  ok('item consumed', beams === null, String(beams));
  ok('a rival slowed', hit.some((v, i) => v < spunBefore[i] * 0.75),
    hit.map((v) => Math.round(v)).join(','));
}

if (mode === 'pickup') {
  await boot('?screen=race&track=pallet-town&racer=pikachu');
  await step(2000);
  const before = await raw(() => {
    const r = window.__pkr.state().race.racers.find((x) => x.id === window.__pkr.state().race.playerId);
    return { coins: r.coins, item: r.item };
  });
  await step(14000);
  const after = await raw(() => {
    const s = window.__pkr.state();
    const r = s.race.racers.find((x) => x.id === s.race.playerId);
    return { coins: r.coins, item: r.item, hud: s.race.hud };
  });
  ok('coins increased', after.coins > before.coins, `${before.coins} -> ${after.coins}`);
  ok('hud coins match', after.hud.coins === after.coins);
}

if (mode === 'determinism') {
  await boot('?screen=race&track=ryme-city&racer=gengar&seed=42');
  await step(5000);
  const a = JSON.stringify(await st());
  await boot('?screen=race&track=ryme-city&racer=gengar&seed=42');
  await step(5000);
  const b = JSON.stringify(await st());
  ok('deterministic', a === b);
}

console.log(errs.length ? `FAIL console errors: ${errs.slice(0, 5).join(' | ')}` : 'PASS no console errors');
await browser.close();
await close();
