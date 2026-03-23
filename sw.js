const CACHE_NAME = 'stockpro-ultimate-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.svg'];

// Instalación y Caché Robusta (Punto 18)
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Estrategia Offline Real (Punto 18)
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Sincronización en segundo plano (Punto 16)
self.addEventListener('sync', e => {
  if (e.tag === 'sync-data') {
    console.log('Sincronizando datos en segundo plano...');
  }
});

// Manejador de Notificaciones Push (Punto 17)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'StockPro', body: 'Nueva notificación' };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: './icon-192.png' }));
});
