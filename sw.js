const CACHE_NAME = 'stockpro-v20';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});

self.addEventListener('sync', e => { console.log('Sync activo'); });

self.addEventListener('periodicsync', e => {
  if (e.tag === 'sync-data') { console.log('Periodic sync ok'); }
});
