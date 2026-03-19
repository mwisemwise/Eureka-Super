const CACHE = "eureka-super-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js",
  "./src/css/styles.css",
  "./src/js/constants.js",
  "./src/js/utils.js",
  "./src/js/storage.js",
  "./src/js/crypto.js",
  "./src/js/app.js",
  "./assets/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
