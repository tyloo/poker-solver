// Offline support: hashed build assets are cache-first; pages and their data are
// network-first so a new deploy shows up, falling back to the cache when offline.
const CACHE = "poker-solver-v1";
const PAGES = ["/", "/equity", "/ranges", "/solver"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PAGES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function store(key, response) {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(key, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request).then((response) => store(request, response))));
    return;
  }

  // Pages are cached by path alone, so the URL query (tool state) does not split the cache.
  const key = request.mode === "navigate" ? url.pathname : request;
  event.respondWith(
    fetch(request)
      .then((response) => store(key, response))
      .catch(async () => (await caches.match(key, { ignoreSearch: true })) ?? (request.mode === "navigate" ? caches.match("/") : Response.error())),
  );
});
