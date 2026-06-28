// Service worker for instant shell load and installability — NOT for live data.
//
// Window's value is live weather, which can't be produced without a connection. So
// this worker deliberately only caches the app SHELL (HTML/JS/CSS/fonts/icons): it
// makes the page open instantly and be installable, but it never caches a weather
// API response and never pretends the forecast works offline. The cross-origin guard
// below means api.open-meteo.com / api.weather.gov calls pass straight through,
// untouched. When the network is gone, the app falls back to its own last-known data
// (kept in localStorage, per field) with a prominent "as of <time>" staleness flag —
// that is what tells the truth about freshness, not the cache.
//
// Strategy:
//   - navigations: network-first (an online visitor always gets fresh HTML), falling
//     back to the cached app shell when offline.
//   - other same-origin GETs (JS/CSS/fonts/icons): stale-while-revalidate, so the
//     shell loads instantly and refreshes in the background.
// The cache name is versioned; old caches are cleared on activate.

const CACHE = "window-v1";
const SHELL = "/";

self.addEventListener("install", (event) => {
  // Note: no skipWaiting() here. When a controller is already running (an updated
  // visit), the new worker waits so it can't swap assets out from under an open tab;
  // the page shows a "refresh" prompt and calls skipWaiting() via the message below.
  // On a first-ever visit there's no controller, so the browser activates immediately.
  event.waitUntil(caches.open(CACHE).then((c) => c.add(SHELL)));
});

// The page posts this when the user accepts the update, letting the waiting worker
// take over; the page then reloads on controllerchange.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Cross-origin (the weather providers) is never touched — those must hit the
  // network so freshness is real, and are handled by the app's own cache/staleness
  // logic instead.
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(SHELL, { ignoreSearch: true })),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
