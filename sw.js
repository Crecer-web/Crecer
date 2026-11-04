/* =================================================================
   SERVICE WORKER - PLATAFORMA CRECER (PWA Offline & Push)
   ================================================================= */

const CACHE_NAME = 'crecer-cache-v3';

const urlsToCache = [
    './bienvenida.html',
    './login.html',
    './register.html',
    './inicio.html',
    './notas.html',
    './recursos.html',
    './perfil.html',
    './horario.html',
    './papelera.html',
    './css/global.css',
    './js/global.js',
    './js/firebase-config.js',
    './img/logo.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        }).catch((err) => {
            console.warn("Advertencia al precargar archivos en cache:", err);
        })
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

// Estrategia Network First para peticiones web con respaldo offline
self.addEventListener('fetch', (event) => {
    const req = event.request;

    if (req.method !== 'GET') return;

    // Ignorar llamadas a servicios externos de Firebase Auth, Firestore o Apis remotas
    if (req.url.includes('firestore.googleapis.com') || 
        req.url.includes('identitytoolkit.googleapis.com') ||
        req.url.includes('fcmregistrations.googleapis.com') ||
        req.url.includes('api.brevo.com')) {
        return;
    }

    event.respondWith(
        fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
            }
            return networkResponse;
        }).catch(() => {
            return caches.match(req).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                if (req.headers.get('accept')?.includes('text/html')) {
                    return caches.match('./inicio.html') || caches.match('./login.html');
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