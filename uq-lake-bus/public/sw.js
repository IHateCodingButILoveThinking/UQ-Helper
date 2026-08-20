const CACHE_VERSION = "uq-campus-app-v3";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL_URLS = [
  "/site.webmanifest",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/app-icon-192.png",
  "/app-icon-512.png",
];

async function cacheResponse(cache, request) {
  try {
    const response = await fetch(request, { cache: "reload" });
    if (response.ok) await cache.put(request, response);
  } catch {
    // One optional asset should not prevent the PWA from installing.
  }
}

async function cacheAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  await Promise.all(APP_SHELL_URLS.map((url) => cacheResponse(cache, url)));

  try {
    const response = await fetch("/", { cache: "reload" });
    if (!response.ok) return;

    const html = await response.clone().text();
    await Promise.all([
      cache.put("/", response.clone()),
      cache.put("/index.html", response.clone()),
    ]);

    const builtAssets = [
      ...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g),
    ].map((match) => match[1]);
    await Promise.all(
      [...new Set(builtAssets)].map((url) => cacheResponse(cache, url)),
    );
  } catch {
    // The online shell will be cached during the next successful navigation.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(APP_SHELL_CACHE);
            await cache.put("/", response.clone());
          }
          return response;
        } catch {
          return (
            (await caches.match(request, { ignoreSearch: true })) ||
            (await caches.match("/")) ||
            (await caches.match("/index.html"))
          );
        }
      })(),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response?.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) =>
              cache.put(request, responseClone),
            );
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    }),
  );
});
