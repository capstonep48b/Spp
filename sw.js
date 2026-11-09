/**
 * Service Worker - Aplikasi SPP PAUD Setia Bhakti
 * Provides high-efficiency caching, instant load times, and offline capabilities.
 */

const CACHE_NAME = 'spp-cache-v3';
const STATIC_ASSETS = [
  './',
  'index.html',
  'style.min.css',
  'style.css',
  'logo.webp',
  'logo.png',
  'favicon.svg',
  'init.js',
  'env.js',
  'app.js',
  'libs/tailwind.js',
  'libs/lucide.min.js',
  'libs/react.production.min.js',
  'libs/react-dom.production.min.js',
  'libs/supabase.min.js'
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

  // Jangan tangani selain GET requests
  if (req.method !== 'GET') return;

  // Supabase REST/Realtime API - selalu network first / bypass service worker cache
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/rest/v1/')) {
    return;
  }

  // Google Fonts caching (fonts.googleapis.com, fonts.gstatic.com) - Cache First
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

  // Local Static Assets (vendor libs, images, css) - Stale While Revalidate
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
      }).catch(() => {
        // Fallback offline
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

