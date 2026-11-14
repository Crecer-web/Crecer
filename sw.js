/* =================================================================
   SERVICE WORKER SEGURO - PLATAFORMA CRECER
   ================================================================= */

const CACHE_NAME = 'crecer-cache-v10';
const ASSETS_TO_CACHE = [
    '/',
    '/bienvenida.html',
    '/login.html',
    '/register.html',
    '/reset-password.html',
    '/inicio.html',
    '/horario.html',
    '/notas.html',
    '/recursos.html',
    '/papelera.html',
    '/perfil.html',
    '/exportar.html',
    '/css/global.css',
    '/css/login.css',
    '/css/register.css',
    '/css/reset-password.css',
    '/css/inicio.css',
    '/css/horario.css',
    '/css/notas.css',
    '/css/recursos.css',
    '/css/papelera.css',
    '/css/perfil.css',
    '/css/exportar.css',
    '/js/global.js',
    '/js/login.js',
    '/js/register.js',
    '/js/reset-password.js',
    '/js/inicio.js',
    '/js/horario.js',
    '/js/notas.js',
    '/js/recursos.js',
    '/js/papelera.js',
    '/js/perfil.js',
    '/js/exportar.js',
    '/js/firebase-config.js',
    '/img/logo.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.error('[Service Worker Error en Instalación]:', error);
            })
    );
    self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/api/') || url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseapp.com') || url.hostname.includes('gstatic.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((respuestaEnCache) => {
                if (respuestaEnCache) {
                    return respuestaEnCache;
                }
                return fetch(event.request).catch(() => {
                    if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('/bienvenida.html');
                    }
                });
            })
    );
});