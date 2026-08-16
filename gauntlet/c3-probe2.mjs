import { chromium } from 'playwright';
import { serveRepo } from '../tools/screenshot.mjs';
import path from 'node:path';
const [q, step] = process.argv.slice(2);
const { origin, close } = await serveRepo(path.resolve('.'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
p.on('console', m => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', e => errs.push(String(e)));
await p.goto(`${origin}/index.html${q}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pkr?.isReady === true, null, { timeout: 15000 });
const snap = async (label) => {
  const r = await p.evaluate(() => {
    const s = window.__pkr.state();
    const R = s.race || {};
    const list = (R.racers || R.standings || R.field || []).map(x => ({
      id: x.id || x.key || x.name, lap: x.lap, prog: +(x.progress ?? x.u ?? x.s ?? 0).toFixed(3), pos: x.position,
    }));
    return { t: s.t, raceKeys: Object.keys(R), lap: R.lap, pos: R.position, coins: R.coins, item: R.item,
      speed: R.speed != null ? Math.round(R.speed) : R.player?.speed != null ? Math.round(R.player.speed) : null,
      countdown: R.countdown ?? R.phase ?? R.started, n: list.length, list };
  });
  console.log(label, JSON.stringify(r));
};
await snap('t0');
await p.evaluate(() => window.__pkr.step(20000));
await p.waitForTimeout(200);
await snap('t20k');
console.log('errs', errs.length, errs.slice(0, 3));
await b.close(); await close();
