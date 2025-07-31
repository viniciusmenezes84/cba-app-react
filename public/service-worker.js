// Nome do cache
const CACHE_NAME = 'cba-portal-cache-v1';
// Ficheiros a serem guardados em cache para funcionamento offline
const urlsToCache = [
  '/',
  '/index.html'
];

// Evento de Instalação: Guarda os ficheiros principais em cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Fetch: Interceta os pedidos de rede
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o ficheiro estiver em cache, retorna-o
        if (response) {
          return response;
        }

        // Caso contrário, busca na rede
        return fetch(event.request).then(
          response => {
            // Se a resposta for válida, guarda uma cópia em cache para a próxima vez
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

// Evento de Ativação: Limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
