// Antigravity Autonomous Studio - Service Worker
const CACHE_NAME = 'agi-studio-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/?auto=true',
  '/index.html',
  '/manifest.json',
  '/app.js',
  '/office.js',
  '/audio.js',
  '/assets/logo.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-only for live API and SSE endpoints
  if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
    return;
  }

  // Stale-while-revalidate for static files
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return networkResponse;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
