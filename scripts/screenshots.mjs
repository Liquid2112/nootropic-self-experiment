#!/usr/bin/env node
/**
 * Phone-size screenshots of the app's web build, for PRs.
 *
 *   node scripts/screenshots.mjs [outDir] [--no-build] [--no-seed] [--routes=/,/progress]
 *
 * 1. `expo export --platform web` into /tmp/claude-0/webbuild (skip with --no-build).
 * 2. Serves it on :8099 with COOP/COEP (expo-sqlite's wasm worker needs
 *    SharedArrayBuffer) and SPA fallback to index.html.
 * 3. Seeding: starts `expo start` (Metro on :8082) if it is not already up, and
 *    loads src/dev/seedEntry.ts as a standalone bundle on a blank same-origin
 *    page (/__seed), proxied through :8099, so it writes demo data into the
 *    same OPFS database the app then opens. No app file imports it.
 *    --no-seed captures the empty (first-launch) state instead (no Metro).
 *    Metro does not pick up file edits in this container, so the script starts
 *    its own on :8082 and stops it at the end; don't leave a stale one there.
 * 4. Opens each route at 390x844 @2x and saves <outDir>/<name>.png, logging
 *    console errors per route.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// ESM ignores NODE_PATH; resolve Playwright via CJS so a global install works.
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const OUT = path.resolve(args.find((a) => !a.startsWith('--')) ?? '/tmp/claude-0/shots');
const BUILD = opt('build-dir') ?? '/tmp/claude-0/webbuild';
const PORT = Number(opt('port') ?? 8099);
const METRO = Number(opt('metro-port') ?? 8082);
const SEED = !flag('no-seed');
const ROUTES = (opt('routes') ?? '/,/progress,/achievements,/reaction-test,/welcome,/goal-picker,/experiment-setup,/paywall,/dictionary,/verdict')
  .split(',');

const BOOT_ROUTE = opt('boot-route') ?? '/welcome';
const log = (...a) => console.log('[shots]', ...a);

// ---------------------------------------------------------------- build
if (!flag('no-build')) {
  log('exporting web build ->', BUILD);
  fs.rmSync(BUILD, { recursive: true, force: true });
  const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', BUILD], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, CI: '1' },
  });
  if (r.status !== 0) throw new Error('expo export failed');
}
if (!fs.existsSync(path.join(BUILD, 'index.html'))) throw new Error(`no build at ${BUILD}`);

// ---------------------------------------------------------------- metro (seed only)
let metroProc = null;
async function metroUp() {
  try {
    const r = await fetch(`http://localhost:${METRO}/status`);
    return r.ok;
  } catch {
    return false;
  }
}
if (SEED && !(await metroUp())) {
  log(`starting Metro on :${METRO} for the seed bundle`);
  metroProc = spawn('npx', ['expo', 'start', '--port', String(METRO)], {
    cwd: ROOT,
    stdio: 'ignore',
    env: { ...process.env, CI: '1' },
    detached: true,
  });
  for (let i = 0; i < 90 && !(await metroUp()); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await metroUp())) throw new Error('Metro did not start');
}

// ---------------------------------------------------------------- server
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const ISOLATION = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'no-store',
};
const SEED_PAGE = `<!doctype html><meta charset="utf-8"><title>seed</title>
<script src="/src/dev/seedEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable"></script>`;

function proxyToMetro(req, res) {
  const preq = http.request(
    { host: 'localhost', port: METRO, path: req.url, method: req.method, headers: { ...req.headers, host: `localhost:${METRO}` } },
    (pres) => {
      const headers = { ...pres.headers, ...ISOLATION };
      res.writeHead(pres.statusCode ?? 502, headers);
      pres.pipe(res);
    },
  );
  preq.on('error', () => {
    res.writeHead(502);
    res.end('metro unavailable');
  });
  req.pipe(preq);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__seed') {
    res.writeHead(200, { 'Content-Type': TYPES['.html'], ...ISOLATION });
    return res.end(SEED_PAGE);
  }
  const file = path.join(BUILD, decodeURIComponent(url.pathname));
  if (file.startsWith(BUILD) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', ...ISOLATION });
    return fs.createReadStream(file).pipe(res);
  }
  // Metro dev assets (seed bundle, its worker, wasm) go to the dev server.
  if (url.pathname.endsWith('.bundle') || url.pathname.startsWith('/assets/') && url.search.includes('unstable_path') || url.pathname.startsWith('/node_modules/') || url.pathname.startsWith('/src/')) {
    return proxyToMetro(req, res);
  }
  // SPA fallback.
  if (path.extname(url.pathname) === '') {
    res.writeHead(200, { 'Content-Type': TYPES['.html'], ...ISOLATION });
    return fs.createReadStream(path.join(BUILD, 'index.html')).pipe(res);
  }
  res.writeHead(404, ISOLATION);
  res.end('not found');
});
await new Promise((r) => server.listen(PORT, r));
const BASE = `http://localhost:${PORT}`;
log('serving', BUILD, 'at', BASE);
if (flag('serve-only')) {
  log('--serve-only: Ctrl-C to stop');
  await new Promise(() => {});
}

// ---------------------------------------------------------------- browser
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'light',
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});

// Record the Metro module ids of expo-sqlite's web modules as the bundle
// defines them, so the boot page can start the SQLite worker and wait for it.
await context.addInitScript(() => {
  let realDefine;
  window.__SQLITE_IDS__ = {};
  Object.defineProperty(globalThis, '__d', {
    configurable: true,
    get: () => realDefine,
    set: (fn) => {
      realDefine = function (factory, id, ...rest) {
        const src = typeof factory === 'function' ? Function.prototype.toString.call(factory) : '';
        if (src.includes('expo-sqlite.webWorkerStart')) window.__SQLITE_IDS__.module = id;
        if (src.includes('assertSyncWorkerCanPost') && src.includes('has not finished loading')) {
          window.__SQLITE_IDS__.channel = id;
        }
        return fn.call(this, factory, id, ...rest);
      };
    },
  });
});

/** Start expo-sqlite's web worker (if the bundle has it) and wait until sync calls work. */
async function warmSqlite(page) {
  const ok = await page
    .waitForFunction(
      () => {
        const ids = window.__SQLITE_IDS__ ?? {};
        if (ids.module === undefined || ids.channel === undefined) return false;
        window.__r(ids.module);
        try {
          window.__r(ids.channel).assertSyncWorkerCanPost();
          return true;
        } catch {
          return false;
        }
      },
      null,
      { timeout: 20000, polling: 100 },
    )
    .then(() => true, () => false);
  if (!ok) log('   warning: SQLite worker did not become ready (screen may be blank)');
}

let failures = 0;
try {
  // Each run uses a fresh browser context, so OPFS (the web DB) starts empty.
  if (SEED) {
    const page = await context.newPage();
    page.on('pageerror', (e) => log('seed pageerror:', e.message));
    await page.goto(`${BASE}/__seed`);
    await page.waitForFunction(() => window.__SEED_RESULT__, null, { timeout: 120000 });
    const result = await page.evaluate(() => window.__SEED_RESULT__);
    log('seed:', result.split('\n')[0]);
    if (!String(result).startsWith('ok')) failures++;
    await page.close();
  }

  for (const route of ROUTES) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    // expo-sqlite's sync API throws until its web worker has loaded, so a cold
    // load straight onto a DB-backed route renders blank. Boot on a route that
    // does not read the DB, give the worker time, then navigate client-side.
    await page.goto(`${BASE}${BOOT_ROUTE}`, { waitUntil: 'networkidle' });
    await warmSqlite(page);
    if (route !== BOOT_ROUTE) {
      await page.evaluate((r) => {
        window.history.pushState({}, '', r);
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
      }, route);
      await page.waitForLoadState('networkidle');
    }
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(1200); // let entry animations settle
    const name = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_');
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file });
    const finalPath = new URL(page.url()).pathname;
    log(`${route.padEnd(18)} -> ${file}${finalPath !== route ? `  (redirected to ${finalPath})` : ''}`);
    for (const e of errors) log(`   console error: ${e.slice(0, 300)}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
  if (metroProc) process.kill(-metroProc.pid);
}
process.exit(failures ? 1 : 0);
