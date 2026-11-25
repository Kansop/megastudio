/* MegaStudio service worker: precache app shell, stale-while-revalidate for everything same-origin */
const VERSION = 'megastudio-b0d88f0c6a';
const SHELL = [
  './',
  'css/app.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'index.html',
  'js/apps/botchat.js',
  'js/apps/budget.js',
  'js/apps/calendar.js',
  'js/apps/chess.js',
  'js/apps/code.js',
  'js/apps/dashboard.js',
  'js/apps/database.js',
  'js/apps/files.js',
  'js/apps/flashcards.js',
  'js/apps/focus.js',
  'js/apps/fractal.js',
  'js/apps/games.js',
  'js/apps/games2.js',
  'js/apps/games3.js',
  'js/apps/games4.js',
  'js/apps/gantt.js',
  'js/apps/graph.js',
  'js/apps/inbox.js',
  'js/apps/kanban.js',
  'js/apps/maps.js',
  'js/apps/music.js',
  'js/apps/notes.js',
  'js/apps/paint.js',
  'js/apps/photo.js',
  'js/apps/physics.js',
  'js/apps/pixel.js',
  'js/apps/recorder.js',
  'js/apps/settings.js',
  'js/apps/sheets.js',
  'js/apps/slides.js',
  'js/apps/terminal.js',
  'js/apps/toolbox.js',
  'js/apps/video.js',
  'js/apps/voxel.js',
  'js/apps/weather.js',
  'js/apps/whiteboard.js',
  'js/apps/writer.js',
  'js/boot.js',
  'js/core.js',
  'js/gif.js',
  'js/md.js',
  'js/qr.js',
  'js/tour.js',
  'manifest.webmanifest'
];
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
