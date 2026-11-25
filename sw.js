/* MegaStudio service worker: precache app shell, stale-while-revalidate for everything same-origin */
const VERSION = 'megastudio-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/core.js', 'js/md.js', 'js/boot.js', 'js/apps/dashboard.js', 'js/apps/notes.js', 'js/apps/kanban.js', 'js/apps/calendar.js', 'js/apps/sheets.js', 'js/apps/paint.js', 'js/apps/music.js', 'js/apps/code.js', 'js/apps/files.js', 'js/apps/games.js', 'js/apps/settings.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => null);
    if (cached) { e.waitUntil(net); return cached; }
    const res = await net; if (res) return res;
    if (e.request.mode === 'navigate') return cache.match('index.html');
    return new Response('Offline', { status: 503 });
  }));
});
