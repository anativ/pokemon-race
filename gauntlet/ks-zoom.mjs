// kart-shell-sculpt: big single-kart poses for silhouette judging.
// node gauntlet/ks-zoom.mjs out.png [racer] [scale]
import { serveRepo } from './../tools/screenshot.mjs';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const out = process.argv[2] || 'gauntlet/shots/ks-zoom.png';
const id = process.argv[3] || 'pikachu';
const S = Number(process.argv[4] || 230);
const { origin, server } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 980 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(String(e.message)));
await p.goto(origin + '/index.html?screen=race&track=pallet-town&racer=pikachu');
await p.waitForFunction('window.__pkr && window.__pkr.isReady');

const url = await p.evaluate(async ([s, id]) => {
  const [{ drawKart }, roster] = await Promise.all([
    import('/src/race/kart.js'), import('/src/data/roster.js'),
  ]);
  const list = roster.ROSTER || roster.roster || roster.default;
  const r = list.find((x) => x.id === id);
  const cv = document.createElement('canvas');
  cv.width = 1440; cv.height = 980;
  const c = cv.getContext('2d');
  c.fillStyle = '#9fb6c8'; c.fillRect(0, 0, 1440, 980);
  const poses = [
    { steer: 0, label: 'steer 0' },
    { steer: -1, label: 'steer -1 (left)' },
    { steer: 0.55, yaw: 0.9, label: 'nose-on-ish' },
    { steer: 0, yaw: -0.55, label: 'yaw -0.55' },
  ];
  c.font = '18px sans-serif';
  poses.forEach((po, i) => {
    const x = 360 + (i % 2) * 720;
    const y = 400 + Math.floor(i / 2) * 470;
    c.fillStyle = '#08151d';
    c.fillText(`${id} ${po.label}`, x - 330, y - 330);
    drawKart(c, x, y, s, r, { steer: po.steer, yaw: po.yaw, spin: 0.7, time: 1.2 });
  });
  return cv.toDataURL('image/png');
}, [S, id]);
mkdirSync('gauntlet/shots', { recursive: true });
writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote', out, 'errs', errs.length, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
