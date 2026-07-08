const CACHE_NAME = 'rakexura-price-tracker-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle API requests normally
  if (event.request.url.includes('/api')) {
    return;
  }

  // Network-first strategy for pages and assets to ensure updates are served immediately
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GET requests for offline fallback
        if (response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is down/offline
        return caches.match(event.request);
      })
  );
});
