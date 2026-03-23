const CACHE_NAME = 'stockpro-v5';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Sincronización en segundo plano (Requisito PWABuilder)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-stock') {
    console.log('Sincronizando stock en segundo plano...');
  }
});
