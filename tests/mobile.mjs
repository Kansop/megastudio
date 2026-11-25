// Mobile screenshots of every app: node mobile.mjs [app ...]
import puppeteer from 'puppeteer-core'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const T = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || '' }); fs.createReadStream(f).pipe(r); }).listen(0);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.waitForFunction(() => window.MS && MS.booted);
const apps = process.argv.slice(2).length ? process.argv.slice(2) : await p.evaluate(() => MS.apps.map((a) => a.id));
fs.mkdirSync(path.join(root, 'tests/shots'), { recursive: true });
for (const a of apps) { await p.evaluate((a) => (location.hash = '#/' + a), a); await new Promise((r) => setTimeout(r, 700)); const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.querySelector('#view').scrollWidth })); console.log(a, JSON.stringify(o)); await p.screenshot({ path: path.join(root, 'tests/shots/m_' + a + '.png') }); }
await b.close(); srv.close();
