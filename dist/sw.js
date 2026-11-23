const VERSION = 'loops-marks-v37-light-studio-20261123';
const SHELL = [
  './', './index.html', './styles.css', './v36-ui.css', './v37-light.css', './stage-fit.js', './app.js', './netlify-client.js', './backup.js', './data.js', './library-model.js',
  './access-mode.js', './audio-output.js', './audio-test.wav', './preferences.js', './midi.js', './mixer.js', './audio.js', './meter.js', './stretch.js', './demo.js', './importer.js', './manifest.webmanifest',
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
  // Safari media requests may ask for a byte range. Never cache a 206 as a full WAV.
  if (url.pathname === new URL('./audio-test.wav', scope).pathname && request.headers.has('Range')) {
    event.respondWith((async () => {
      try {const response=await fetch(request);if(response.ok)return response;} catch {}
      const cache=await caches.open(VERSION);
      const full=await cache.match(new URL('./audio-test.wav',scope));
      if(!full)return fetch(request);
      const bytes=await full.arrayBuffer(), size=bytes.byteLength;
      const range=/^bytes=(\d+)-(\d*)$/.exec(request.headers.get('Range')||'');
      if(!range)return fetch(request);
      const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),size-1):size-1;
      if(start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
      return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/wav','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
    })());return;
  }

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
