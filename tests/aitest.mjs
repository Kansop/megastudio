// End-to-end WebLLM check with Chrome's software WebGPU (slow, but proves download → cache → stream works)
import puppeteer from 'puppeteer-core'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const T = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || '' }); fs.createReadStream(f).pipe(r); }).listen(0);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--use-webgpu-adapter=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${srv.address().port}/#/botchat/ai`); await p.waitForFunction(() => window.MS && MS.booted);
console.log('gpu', JSON.stringify(await p.evaluate(() => MS.ai.gpuInfo())));
const model = process.argv[2] || 'smol';
const t0 = Date.now();
const out = await p.evaluate(async (k) => { const m = MS.ai.MODELS.find((x) => x.key === k); let last = -1; await MS.ai.load(m, (pr, t) => { const q = Math.floor(pr * 10); if (q !== last) { last = q; console.error('progress ' + t.slice(0, 100)); } }); let n = 0; const r = await MS.ai.chat([{ role: 'user', content: 'Say hi in five words.' }], () => n++, { max_tokens: 24 }); return { text: r.text, chunks: n, usage: r.usage, cached: await MS.ai.isCached(m) }; }, model).catch((e) => ({ err: e.message }));
console.log(JSON.stringify(out), (Date.now() - t0) / 1000 + 's');
await b.close(); srv.close();
