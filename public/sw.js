const CACHE_NAME = 'bolsita-shell-v1';
const BASE_URL = new URL('./', self.location.href);
const INDEX_URL = new URL('', BASE_URL).toString();
const CORE_ASSETS = ['manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'].map((path) =>
  new URL(path, BASE_URL).toString(),
);

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(INDEX_URL, copy));
          return response;
        })
        .catch(() => caches.match(INDEX_URL)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }

        return response;
      });
    }),
  );
});

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const indexResponse = await fetch(INDEX_URL, { cache: 'reload' });
  const html = await indexResponse.clone().text();
  const htmlAssets = Array.from(html.matchAll(/(?:href|src)="([^"]+)"/g), (match) => new URL(match[1], INDEX_URL).toString()).filter(
    (url) => new URL(url).origin === self.location.origin,
  );

  await cache.put(INDEX_URL, indexResponse);
  await cache.addAll([...new Set([...CORE_ASSETS, ...htmlAssets])]);
}
