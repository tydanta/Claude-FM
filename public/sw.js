const CACHE_NAME = "claude-fm-v193-android-api";
const ASSETS = ["/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.hostname === "127.0.0.1" && (url.port === "3010" || url.port === "3011")) return;
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .catch(() => caches.match(event.request))
  );
});
