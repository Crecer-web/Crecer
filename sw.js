/* =================================================================
   SERVICE WORKER - PLATAFORMA CRECER (MODO SEGURO)
   ================================================================= */

const CACHE_NAME = 'crecer-cache-v5';
const ASSETS_TO_CACHE = [
    '/',
    '/bienvenida.html',
    '/login.html',
    '/reset-password.html',
    '/css/global.css',
    '/css/login.css',
    '/css/reset-password.css',
    '/js/global.js',
    '/js/recuperar.js',
    '/js/reset-password.js',
    '/js/firebase-config.js'
];

// Evento de Instalación: Guarda los recursos principales en caché
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker]: Caché abierto con éxito.');
                return cache.addAll(ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'reload' })));
            })
            .catch((err) => {
                console.error('[Service Worker Error en Install]:', err);
            })
    );
    self.skipWaiting();
});

// Evento de Activación: Limpia cachés antiguos obsoletos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker]: Limpiando caché antiguo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Evento Fetch: Intercepta peticiones de forma segura sin romper promesas
self.addEventListener('fetch', (event) => {
    // Evitar interceptar peticiones hacia la API de Flask o Firebase Auth para no alterar datos dinámicos
    if (event.request.url.includes('/api/') || event.request.url.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).catch(() => {
                    // Si falla la red y no está en caché, evitamos el pantallazo de error devuelto por la promesa
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('/bienvenida.html');
                    }
                });
            })
    );
});