// Antigravity Autonomous Studio - Service Worker
const CACHE_NAME = 'agi-studio-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/?auto=true',
  '/index.html',
  '/manifest.json',
  '/style.css',
  '/icons.js',
  '/pwa.js',
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
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(e.request.url);
  } catch (err) {
    return;
  }

  // Strictly skip non-HTTP requests (e.g., chrome-extension://, ws://, data:)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network-only for live API and SSE telemetry endpoints
  if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
    return;
  }

  // Stale-while-revalidate for static files
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        // Only cache valid http/https successful responses
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return networkResponse;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
