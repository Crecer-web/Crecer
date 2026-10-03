const CACHE_NAME = 'crecer-cache-v1';
const urlsToCache = [
  '/',
  '/bienvenida.html',
  '/login.html',
  '/inicio.html',
  '/css/global.css',
  '/js/global.js',
  '/img/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});