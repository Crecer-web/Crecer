const CACHE_NAME = 'crecer-cache-v2';

const urlsToCache = [
    './',
    './bienvenida.html',
    './login.html',
    './inicio.html',
    './formularios.html',
    './notas.html',
    './recursos.html',
    './perfil.html',
    './papelera.html',
    './css/global.css',
    './css/inicio.css',
    './js/global.js',
    './img/logo.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

// Activación y limpieza de caches obsoletas
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
        }).then(() => self.clients.claim())
    );
});

// Estrategia Network First para peticiones web
self.addEventListener('fetch', (event) => {
    const req = event.request;

    if (req.method !== 'GET') return;

    // Ignorar peticiones a servicios internos de Firebase Auth y Firestore
    if (req.url.includes('firestore.googleapis.com') || 
        req.url.includes('identitytoolkit.googleapis.com') ||
        req.url.includes('fcmregistrations.googleapis.com')) {
        return;
    }

    event.respondWith(
        fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
            }
            return networkResponse;
        }).catch(() => {
            return caches.match(req).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                if (req.headers.get('accept')?.includes('text/html')) {
                    return caches.match('./inicio.html');
                }
            });
        })
    );
});

// Evento Push para Notificaciones PWA
self.addEventListener('push', (event) => {
    let payload = { title: 'CRECER', body: 'Tienes una nueva notificación académica.' };
    if (event.data) {
        try {
            payload = event.data.json();
        } catch (e) {
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: 'img/logo.png',
        badge: 'img/logo.png',
        vibrate: [100, 50, 100],
        data: {
            url: payload.url || 'inicio.html'
        }
    };

    event.waitUntil(
        self.registration.showNotification(payload.title || 'CRECER', options)
    );
});

// Apertura de la app al hacer clic en la notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || 'inicio.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let client of windowClients) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});