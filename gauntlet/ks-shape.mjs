// kart-shell-sculpt: zoomed turntable of the hero kart at several steer angles.
// node gauntlet/ks-shape.mjs gauntlet/shots/ks-a.png [scale]
import { serveRepo } from './../tools/screenshot.mjs';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const out = process.argv[2] || 'gauntlet/shots/ks-a.png';
const S = Number(process.argv[3] || 120);
const { origin, server } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 940 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(String(e.message)));
await p.goto(origin + '/index.html?screen=race&track=pallet-town&racer=pikachu');
await p.waitForFunction('window.__pkr && window.__pkr.isReady');

const url = await p.evaluate(async (s) => {
  const [{ drawKart }, roster] = await Promise.all([
    import('/src/race/kart.js'),
    import('/src/data/roster.js'),
  ]);
  const list = roster.ROSTER || roster.roster || roster.default;
  const pick = (id) => list.find((r) => r.id === id);
  const cv = document.createElement('canvas');
  cv.width = 1500; cv.height = 940;
  const c = cv.getContext('2d');
  c.fillStyle = '#9fb6c8'; c.fillRect(0, 0, 1500, 940);
  const ids = ['pikachu', 'snorlax', 'gengar'];
  const poses = [
    { steer: 0, label: 'straight' },
    { steer: -1, label: 'steer L' },
    { steer: 0.75, label: 'steer R' },
  ];
  c.font = '16px sans-serif';
  ids.forEach((id, i) => {
    poses.forEach((po, j) => {
      const x = 250 + i * 500;
      const y = 250 + j * 300;
      c.fillStyle = '#0a1a24';
      c.fillText(`${id} ${po.label}`, x - 220, y - 190);
      drawKart(c, x, y, s, pick(id), { steer: po.steer, spin: 0.7, time: 1.2 });
    });
  });
  return cv.toDataURL('image/png');
}, S);
mkdirSync('gauntlet/shots', { recursive: true });
writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote', out, 'errs', errs.length, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
