// PianoKids Service Worker
// ─────────────────────────────────────────────────────────────
// IMPORTANTE: subí BUILD en cada deploy. Es lo que invalida la caché vieja.
// Si no lo subís, los usuarios que ya instalaron la app siguen viendo la versión anterior.
const BUILD = '2.4.0';
const CACHE_NAME = `pianokids-${BUILD}`;

// Assets que se intentan precachear en el install.
// Si alguno falla (404, offline, CDN caído) NO se rompe la instalación.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './audio.js',
  './ritmo.js',
  './partitura.js',
  './data/canciones.js',
  './data/curriculum.js',
  './data/escenas.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&family=Fredoka+One&display=swap'
];

// ── INSTALL ──────────────────────────────────────────────────
// Precache tolerante: cachea recurso por recurso y sigue aunque alguno falle.
// (El bug anterior: cache.addAll aborta entero si UN recurso responde 404,
//  y como estaba dentro de waitUntil, el SW nunca llegaba a instalarse.)
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(ASSETS.map(async url => {
      const isCross = url.startsWith('http');
      const req = new Request(url, isCross ? { mode: 'no-cors' } : undefined);
      const res = await fetch(req, { cache: 'reload' });
      // Las respuestas opaque (cross-origin no-cors) tienen status 0 y son válidas para cachear.
      if (!res || (res.status !== 0 && !res.ok)) throw new Error(`${url} → ${res && res.status}`);
      await cache.put(req, res);
    }));
    const fallidos = results.filter(r => r.status === 'rejected');
    if (fallidos.length) console.warn('[SW] Assets no cacheados:', fallidos.map(f => f.reason.message));
    console.log(`[SW] Instalado build ${BUILD} (${results.length - fallidos.length}/${results.length} assets)`);
    await self.skipWaiting();
  })());
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
    console.log(`[SW] Activo build ${BUILD}`);
  })());
});

// Permite forzar la actualización desde la página.
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const esNavegacion = req.mode === 'navigate' || req.destination === 'document';

  if (esNavegacion) {
    // NETWORK-FIRST para el documento: así un deploy nuevo llega al usuario
    // en la siguiente visita, en lugar de quedar congelado en la versión cacheada.
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        // Sin red: servimos la última versión buena.
        const cached = await caches.match('./index.html') || await caches.match(req);
        return cached || new Response('Sin conexión y sin copia guardada.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // CACHE-FIRST para el resto (íconos, fuentes, motor de audio): inmutables por build.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.status === 0)) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      return Response.error();
    }
  })());
});
