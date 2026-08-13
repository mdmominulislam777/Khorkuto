const CACHE_NAME = 'highfy-tv-v1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './channels.json',
  './events.json',
  './categories.json',
  './settings.json',
  './manifest.json',
  './assets/logo.png'
];

// Service Worker Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Service Worker Activation
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
  self.clients.claim();
});

// Fetch Interceptor (Excludes streaming video chunks .m3u8 & .ts)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.includes('.m3u8') || url.includes('.ts') || url.includes('key')) {
    return; // Pass through live stream fragments directly to network
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
