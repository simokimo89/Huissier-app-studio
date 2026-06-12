/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = 'bailiff-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Perform App Shell cache install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching Application Shell Assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate & clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Expiring old cached database instances...', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept requests for offline resilience
self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);

  // Exclude API requests from shell cache checks (Always query fresh transactions from server)
  if (reqUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fallback for API data request during deep blackout
        return new Response(
          JSON.stringify({
            success: false,
            error: 'لا يوجد اتصال بالإنترنت حالياً. السجل معلق بمجلد المزامنة المحلي.',
            isOffline: true
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Assets and page files: Stale-While-Revalidate strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background to update the cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
        }).catch(() => { /* Ignore background fetch errors while offline */ });
        return cachedResponse;
      }

      // If not in cache, fallback to network
      return fetch(event.request).then((networkResponse) => {
        // Add text assets and images to general cache dynamically
        if (
          networkResponse.status === 200 &&
          event.request.method === 'GET' &&
          (reqUrl.origin === self.location.origin || reqUrl.href.includes('fonts.googleapis.com'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback for general navigation page loads
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});

// Capture service worker offline synchronization triggers
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-judicial-queue') {
    console.log('[Service Worker] Triggering background sync event for judicial queue...');
    // Handled in the reactive frontend sync log, or delegates a post to server here
  }
});
