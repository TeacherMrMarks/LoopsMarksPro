const VERSION = 'loops-marks-v7-identity-20261121';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './netlify-client.js', './backup.js', './data.js',
  './audio.js', './stretch.js', './demo.js', './importer.js', './manifest.webmanifest',
  './icon.svg', './icon-192.png', './icon-512.png',
];
const scope = new URL(self.registration.scope);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
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
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin) return;
  const navigating = request.mode === 'navigate' && url.pathname.startsWith(scope.pathname);
  const shellAsset = SHELL.some(file => new URL(file, scope).pathname === url.pathname);
  if (!navigating && !shellAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      // Atualizações online têm prioridade; a cópia offline é reserva.
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') {
        await cache.put(navigating ? new URL('./index.html', scope) : request, response.clone());
      }
      return response;
    } catch (error) {
      const fallback = await cache.match(navigating ? new URL('./index.html', scope) : request);
      if (fallback) return fallback;
      throw error;
    }
  })());
});
