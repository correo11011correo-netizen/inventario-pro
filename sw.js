const CACHE_NAME = 'stockpro-v30';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caché abierto correctamente");
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Periodic background sync
self.addEventListener("periodicsync", e => {
  if (e.tag === "update-data") {
    e.waitUntil(fetchAndCacheData());
  }
});

// Background sync
self.addEventListener("sync", e => {
  if (e.tag === "send-data") {
    e.waitUntil(sendDataToServer());
  }
});

// Push notifications
self.addEventListener("push", e => {
  const d = e.data ? e.data.text() : "Nueva actualización";
  e.waitUntil(
    self.registration.showNotification("StockPro", {
      body: d,
      icon: "icon-192.png"
    })
  );
});

// Placeholder functions for sync
async function fetchAndCacheData() {
  console.log("Sincronizando datos periódicamente...");
  // Implementación de lógica de fetch y caché
}

async function sendDataToServer() {
  console.log("Enviando datos pendientes al servidor...");
  // Implementación de lógica de envío
}
