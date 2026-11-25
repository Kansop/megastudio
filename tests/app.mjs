// Dev helper: node app.mjs <hash> <shot.png> [js-to-eval-after-load] [--mobile]
import puppeteer from 'puppeteer-core'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const T = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || '' }); fs.createReadStream(f).pipe(r); }).listen(0);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); const mobile = process.argv.includes('--mobile');
await p.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1280, height: 800 });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'log') console.log('CONSOLE', m.type(), m.text()); });
await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.waitForFunction(() => window.MS && MS.booted);
await p.evaluate((h) => (location.hash = h), process.argv[2]); await new Promise((r) => setTimeout(r, 900));
const js = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : null;
if (js) { const out = await p.evaluate(`(async()=>{ ${js} })()`); if (out !== undefined) console.log('RESULT', typeof out === 'string' ? out : JSON.stringify(out)); await new Promise((r) => setTimeout(r, 700)); }
await p.screenshot({ path: process.argv[3] || '/tmp/shot.png' });
await b.close(); srv.close();
