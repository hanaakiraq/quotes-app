const CACHE_NAME = 'quotes-app-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/data/wisdom.json',
  '/data/success.json',
  '/data/friendship.json',
  '/data/love.json',
  '/data/patience.json',
  '/data/knowledge.json',
  '/data/motivation.json',
  '/data/life.json',
  '/data/custom.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});