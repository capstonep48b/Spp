/**
 * Service Worker - Aplikasi SPP PAUD Setia Bhakti
 * Provides high-efficiency caching, instant load times, and offline capabilities.
 */

const CACHE_NAME = 'spp-cache-b5c55870';
const STATIC_ASSETS = [
  './',
  'index.html',
  'logo.webp',
  'favicon.svg',
  'env.js?v=8ee00723',
  'login.min.js?v=b8f101af',
  'libs/react.production.min.js',
  'libs/react-dom.production.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Source maps & Supabase REST/Realtime API - selalu bypass service worker cache
  if (url.pathname.endsWith('.map') || url.hostname.includes('supabase.co') || url.pathname.includes('/rest/v1/')) {
    return;
  }

  // HTML Navigations / Root - Network First agar pembaruan halaman langsung aktif
  const isHtmlRequest =
    req.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html');

  if (isHtmlRequest) {
    event.respondWith(
      fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(req).then((cached) => cached || caches.match('index.html'));
      })
    );
    return;
  }

  // Google Fonts caching - Cache First
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(req);
        if (cachedResponse) return cachedResponse;
        try {
          const networkResponse = await fetch(req);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse;
        }
      })
    );
    return;
  }

  // Local Static Assets - Stale While Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
