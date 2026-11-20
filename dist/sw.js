const VERSION = 'loops-marks-7f556f868bac';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './netlify-client.js', './backup.js', './data.js',
  './audio.js', './stretch.js', './demo.js', './importer.js', './manifest.webmanifest',
  './icon.svg', './icon-192.png', './icon-512.png',
];
const scope = new URL(self.registration.scope);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('loops-marks-') && name !== VERSION) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin) return;
  if (request.mode === 'navigate' && url.pathname.startsWith(scope.pathname)) {
    // One complete release serves all its assets, even during a deployment.
    event.respondWith(caches.open(VERSION).then(async cache =>
      (await cache.match(new URL('./index.html', scope))) || fetch(request)));
    return;
  }
  if (!SHELL.some(file => new URL(file, scope).pathname === url.pathname)) return;
  event.respondWith(caches.open(VERSION).then(async cache =>
    (await cache.match(url.href, { ignoreSearch: true })) || fetch(request)));
});
