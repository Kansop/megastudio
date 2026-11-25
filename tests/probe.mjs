// Ad-hoc probe: node probe.mjs '<hash>' '<js to eval after load>'
import puppeteer from 'puppeteer-core'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.html') ? 'text/html' : '' }); fs.createReadStream(f).pipe(r); }).listen(0);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message)); p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
await p.goto(`http://127.0.0.1:${srv.address().port}/${process.argv[2] || ''}`); await p.waitForFunction(() => window.MS && MS.booted); await new Promise((r) => setTimeout(r, 800));
const res = await p.evaluate(`(async()=>{${process.argv[3] || ''}})()`); console.log(typeof res === 'string' ? res : JSON.stringify(res, null, 1));
if (process.argv[4]) await p.screenshot({ path: process.argv[4] });
await b.close(); srv.close();
