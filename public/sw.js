// Offline support: hashed build assets are cache-first; pages and their data are
// network-first so a new deploy shows up, falling back to the cache when offline.
// scripts/precache.mjs fills PRECACHE with the build's assets (worker chunks included) and versions CACHE.
const CACHE = "poker-solver-v1";
const TOOLS = ["/equity", "/ranges", "/solver", "/glossary"];
// English at "/", French under "/fr".
const PAGES = ["/", ...TOOLS, "/fr", ...TOOLS.map((path) => `/fr${path}`)];
const PRECACHE = [];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([...PAGES, ...PRECACHE])));
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

// A worker takes its location from the response URL, which lacks the "#params=" that Turbopack's worker
// bootstrap reads. A synthetic response has no URL, so the worker keeps the request URL with its hash.
function forRequest(request, response) {
  if (request.destination !== "worker" || !response) return response;
  return new Response(response.body, { headers: response.headers, status: response.status, statusText: response.statusText });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches
        .match(request)
        .then((cached) => cached ?? fetch(request).then((response) => store(request, response)))
        .then((response) => forRequest(request, response)),
    );
    return;
  }

  // Pages are cached by path alone, so the URL query (tool state) does not split the cache.
  const key = request.mode === "navigate" ? url.pathname : request;
  const home = url.pathname === "/fr" || url.pathname.startsWith("/fr/") ? "/fr" : "/";
  event.respondWith(
    fetch(request)
      .then((response) => store(key, response))
      .catch(async () => (await caches.match(key, { ignoreSearch: true })) ?? (request.mode === "navigate" ? caches.match(home) : Response.error())),
  );
});
