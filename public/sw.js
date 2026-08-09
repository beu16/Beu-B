// Service Worker for Beu Verify PWA
const CACHE_NAME = 'beu-verify-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Never intercept API requests or non-GET requests - let browser handle network directly
  if (url.pathname.startsWith('/api') || event.request.method !== 'GET') {
    return;
  }

  // 2. Navigation fallback for single page app
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }
  
  // 3. Cache first for static assets with network fallback
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Background Sync capability
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-receipts') {
    event.waitUntil(Promise.resolve());
  }
});

// Periodic Sync capability
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-rates') {
    event.waitUntil(Promise.resolve());
  }
});

// Push Notifications capability
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.text() : 'Beu Verify Notification';
  event.waitUntil(
    self.registration.showNotification('Beu Verify', {
      body: data,
      icon: '/icon-192.png',
      badge: '/icon-192.png'
    })
  );
});
