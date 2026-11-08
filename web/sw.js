/* Offline support: keep the game files so it opens without a connection. */
const CACHE = 'payload-push-9da208ad84';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'peerjs.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Game files: network first so updates arrive, cache when offline. Fonts: cache as they load.
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && (url.origin === location.origin || url.host.endsWith('gstatic.com') || url.host.endsWith('googleapis.com'))) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
