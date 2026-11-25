// Headless smoke test: boots MegaStudio, opens every app + every arcade game, fails on JS errors.
// Usage: node tests/smoke.mjs [--shots]
import puppeteer from 'puppeteer-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port; const base = `http://127.0.0.1:${port}/`;
const shots = process.argv.includes('--shots'); if (shots) fs.mkdirSync(path.join(root, 'tests/shots'), { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
await page.goto(base, { waitUntil: 'load' }); await page.waitForFunction(() => window.MS && MS.booted, { timeout: 15000 });
const apps = await page.evaluate(() => MS.apps.map((a) => a.id));
const games = await page.evaluate(() => Object.keys(MS.arcade?.GAMES || {}));
const results = []; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function visit(hash, label) {
  const before = errors.length;
  await page.evaluate((h) => { location.hash = h; }, hash); await sleep(700);
  const crashed = await page.evaluate(() => !!document.querySelector('#view .empty .big') && document.querySelector('#view').textContent.includes('crashed'));
  const empty = await page.evaluate(() => document.querySelector('#view').children.length === 0);
  const errs = errors.slice(before); const ok = !crashed && !empty && !errs.length;
  results.push({ label, ok, errs: crashed ? ['crashed', ...errs] : empty ? ['empty view', ...errs] : errs });
  if (shots) await page.screenshot({ path: path.join(root, 'tests/shots', label.replace(/\W+/g, '_') + '.png') });
}
for (const a of apps) await visit('#/' + a, 'app:' + a);
for (const g of games) await visit('#/arcade/' + g, 'game:' + g);
// palette
await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control'); await sleep(200); await page.keyboard.type('=2+2'); await sleep(200);
const calc = await page.evaluate(() => document.querySelector('#palette-list li')?.textContent || '');
results.push({ label: 'palette calc', ok: calc.includes('= 4'), errs: calc.includes('= 4') ? [] : ['got ' + calc] });
// mobile layout
await page.keyboard.press('Escape'); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await visit('#/dashboard', 'mobile:dashboard');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
results.push({ label: 'mobile no h-overflow', ok: !overflow, errs: overflow ? ['horizontal overflow'] : [] });
await browser.close(); srv.close();
const bad = results.filter((r) => !r.ok);
results.forEach((r) => console.log((r.ok ? 'PASS ' : 'FAIL ') + r.label + (r.ok ? '' : '  ' + r.errs.join(' | '))));
console.log(`\n${results.length - bad.length}/${results.length} passed`);
process.exit(bad.length ? 1 : 0);
