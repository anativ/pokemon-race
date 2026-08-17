/* dev helper: podium figure sheet, optionally as flat silhouettes.
 * node src/assets/results/_sil.mjs OUT.png ids h sil W H
 * e.g.  node src/assets/results/_sil.mjs /tmp/a.png blaziken,charmander,ditto 420 1 1300 560
 */
import { chromium } from 'playwright';
import { serveRepo } from '../../../tools/screenshot.mjs';

const OUT = process.argv[2];
const ids = process.argv[3] === 'all' ? '' : (process.argv[3] || 'blaziken');
const h = process.argv[4] || 380;
const sil = process.argv[5] === '1' ? '&sil=1' : '';
const W = Number(process.argv[6] || 1300);
const H = Number(process.argv[7] || 560);
const { origin, close } = await serveRepo();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(`${origin}/src/assets/results/_devfigs.html?ids=${ids}&h=${h}${sil}`,
  { waitUntil: 'load' });
await p.waitForTimeout(350);
await p.screenshot({ path: OUT, fullPage: false });
console.log('errors:', errs.length, errs.slice(0, 3).join(' | '));
await b.close();
await close();
