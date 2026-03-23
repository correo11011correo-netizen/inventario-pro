const CACHE_NAME = 'stockpro-v6';
const urlsToCache = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(response => {
        return response || caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-stock') {
    console.log('Sincronización en segundo plano activa');
  }
});
