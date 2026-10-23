/*
 * CBA PWA: cache only fingerprinted build assets and an anonymous offline page.
 * Never cache documents (HTML), user profiles, authentication or Supabase/API data.
 */
const STATIC_CACHE = 'cba-pwa-static-v2-20261023';
const OFFLINE_CACHE = 'cba-pwa-offline-v2-20261023';
const OLD_CACHES = ['cba-portal-cache-v1'];
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => cache.addAll([OFFLINE_URL, '/icon-192x192.png'])));
  // Wait for the athlete to accept an update to avoid interrupting a game.
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(key => OLD_CACHES.includes(key) ||
        (key.startsWith('cba-pwa-') && ![STATIC_CACHE, OFFLINE_CACHE].includes(key)))
      .map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // no Supabase / external APIs

  if (request.mode === 'navigate') {
    // Never cache authenticated pages, login responses, or application HTML.
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(async () =>
      (await caches.match(OFFLINE_URL)) ||
      new Response('Sem conexão. Reconecte-se para acessar o Portal CBA.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    ));
    return;
  }

  const fingerprintedAsset =
    /^\/static\/(js|css)\/[a-zA-Z0-9._-]+\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname);
  if (!fingerprintedAsset) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    })
  );
});
