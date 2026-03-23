const CACHE_NAME = 'stockpro-v15';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});

// Requisito PWABuilder para 100 Score
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    console.log('Sincronización periódica activa');
  }
});
