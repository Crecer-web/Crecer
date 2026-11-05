/* =================================================================
   SERVICE WORKER - PLATAFORMA CRECER (PRODUCCIÓN Y OFFLINE)
   ================================================================= */

const CACHE_NAME = 'crecer-cache-v7';
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

// Evento de Instalación: Carga de recursos esenciales al almacenamiento en caché
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker CRECER]: Instalando caché de recursos principales.');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.error('[Service Worker Error en Instalación]:', error);
            })
    );
    self.skipWaiting();
});

// Evento de Activación: Limpieza exhaustiva de cachés obsoletas y antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker CRECER]: Eliminando caché obsoleta:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Evento Fetch: Interceptación segura de peticiones HTTP en la red
self.addEventListener('fetch', (event) => {
    const urlPeticion = event.request.url;

    // Omitir por completo la intercepción en peticiones de API o autenticación de Firebase
    if (urlPeticion.includes('/api/') || urlPeticion.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((respuestaEnCache) => {
                if (respuestaEnCache) {
                    return respuestaEnCache;
                }
                return fetch(event.request).catch(() => {
                    // Si la red falla y es una petición de navegación HTML, redirigir a bienvenida
                    if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('/bienvenida.html');
                    }
                });
            })
    );
});