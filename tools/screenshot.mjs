#!/usr/bin/env node
/**
 * Screenshot CLI for Pokemon Racing Game.
 *
 *   node tools/screenshot.mjs "?screen=race&track=pallet-town" shots/race.png
 *   node tools/screenshot.mjs http://localhost:1234/?screen=title out.png
 *
 * Serves the repo root on a RANDOM free port (port 0), waits for
 * window.__pkr.isReady, then captures 1600x900 (override with --size WxH).
 *
 * Extra flags:
 *   --size 1600x900     viewport size
 *   --wait 400          extra settle ms after ready (default 350)
 *   --step 2500         call __pkr.step(ms) before capturing (deterministic)
 *   --seed 42           call __pkr.seed(n) before stepping
 *   --full              capture the full page instead of the viewport
 *   --quiet             only print the output path
 *
 * Exits non-zero if the page logged a console error or an unhandled rejection.
 */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function serveRepo(rootDir = ROOT) {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        let rel = decodeURIComponent(url.pathname);
        if (rel.endsWith('/')) rel += 'index.html';
        const file = path.join(rootDir, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
        if (!file.startsWith(rootDir) || !existsSync(file)) {
          res.writeHead(404, { 'content-type': 'text/plain' });
          res.end('not found');
          return;
        }
        const body = await readFile(file);
        res.writeHead(200, {
          'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'cache-control': 'no-store',
        });
        res.end(body);
      } catch (err) {
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end(String(err));
      }
    });
    server.on('error', reject);
    // port 0 => OS picks a random free port
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const close = () => new Promise((done) => server.close(() => done()));
      resolve({ server, port, origin: `http://127.0.0.1:${port}`, close });
    });
  });
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const needsValue = ['size', 'wait', 'step', 'seed'].includes(key);
      flags[key] = needsValue ? argv[++i] : true;
    } else positional.push(a);
  }
  return { positional, flags };
}

export async function capture(target, out, flags = {}) {
  const { server, origin } = await serveRepo();
  const [w, h] = String(flags.size || '1600x900').split('x').map(Number);
  const url = /^https?:\/\//i.test(target)
    ? target
    : `${origin}/${String(target).replace(/^\/?/, '').replace(/^index\.html/, '')}`
        .replace(/\/(\?)/, '/index.html$1');

  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (msg) => { if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`); });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => problems.push(`requestfailed: ${req.url()}`));

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__pkr && window.__pkr.isReady === true, null, { timeout: 15000 });
  if (flags.seed != null) await page.evaluate((s) => window.__pkr.seed(Number(s)), flags.seed);
  if (flags.step != null) await page.evaluate((ms) => window.__pkr.step(Number(ms)), flags.step);
  await page.waitForTimeout(Number(flags.wait ?? 350));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out, fullPage: !!flags.full });
  const state = await page.evaluate(() => window.__pkr.state());
  await browser.close();
  server.close();
  return { out: path.resolve(out), url, problems, state };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [target = '?screen=title', out = 'shot.png'] = positional;
  capture(target, out, flags).then(({ out: file, url, problems, state }) => {
    if (flags.quiet) { console.log(file); } else {
      console.log(`[shot] ${url}\n[shot] -> ${file}\n[shot] screen=${state.screen} seed=${state.seed} t=${state.t}`);
    }
    if (problems.length) {
      console.error(`[shot] ${problems.length} page problem(s):`);
      for (const p of problems) console.error(`  - ${p}`);
      process.exitCode = 1;
    }
  }).catch((err) => {
    console.error('[shot] failed:', err);
    process.exitCode = 1;
  });
}
