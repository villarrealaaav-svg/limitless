const CACHE = 'limitless-v4';

// Solo los archivos críticos del launcher en install — el resto se cachea lazy
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
  './libros.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
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

self.addEventListener('fetch', e => {
  // Firebase y Fonts: red primero, sin cachear
  if (e.request.url.includes('firebase') || e.request.url.includes('fonts.g') || e.request.url.includes('gstatic')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Todo lo demás: cache-first, cachea lazily si no existe
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
