const CACHE = 'limitless-v8';

// Núcleo cacheado en install (para arranque offline). El resto se cachea lazy.
const CORE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo-av.png',
  './personal.html',
  './negocios.html',
  './casa.html',
  './aprende.html',
  './mi-horario.html',
  './finanzas.html',
  './recuperacion.html',
  './pasaje.html',
  './deudas.html'
];

self.addEventListener('install', e => {
  // No abortar install si algún archivo falla (404, etc.)
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(CORE.map(u => c.add(u)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'NOTIF') {
    const { title, body, tag, icon } = e.data;
    self.registration.showNotification(title, { body, icon, tag, badge: icon, vibrate: [200, 100, 200] });
  }
});

function isHtml(req) {
  return req.mode === 'navigate' ||
         req.destination === 'document' ||
         req.url.endsWith('.html') ||
         req.url.endsWith('/');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Firebase: siempre red, nunca caché (datos en vivo)
  if (req.url.includes('firebase') || req.url.includes('firebaseio')) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // HTML / navegación: RED PRIMERO → siempre versión fresca online, caché solo offline.
  // Esto evita que la app se quede congelada en una versión vieja.
  if (isHtml(req)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Fuentes y assets estáticos: caché primero, cachea lazy si no existe
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
