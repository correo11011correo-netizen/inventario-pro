const CACHE_NAME = 'stockpro-v25';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});

self.addEventListener('sync', e => {
  if (e.tag === 'sync-stock') console.log('Background Sync OK');
});

self.addEventListener('periodicsync', e => {
  if (e.tag === 'update-data') console.log('Periodic Sync OK');
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'StockPro', body: 'Alerta de Inventario' };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: './icon-192.png' }));
});
