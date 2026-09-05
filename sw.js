const CACHE_NAME = "anf-lighting-v4";

const LOCAL_FILES = [
  "./",
  "./index.html",
  "./manifest.json"
];

// CDN yang dipakai ANF LIGHTING
const CDN_FILES = [
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"
];


// ==========================================
// INSTALL
// ==========================================

self.addEventListener("install", event => {

  event.waitUntil(
    (async () => {

      const cache = await caches.open(CACHE_NAME);

      // Cache file lokal
      await cache.addAll(LOCAL_FILES);

      // Cache CDN
      for (const url of CDN_FILES) {

        try {

          const response = await fetch(url, {
            mode: "no-cors",
            cache: "no-store"
          });

          await cache.put(url, response.clone());

          console.log("[SW] CDN cached:", url);

        } catch (error) {

          console.warn("[SW] CDN gagal dicache:", url, error);

        }

      }

    })()
  );

  // Aktifkan SW baru langsung
  self.skipWaiting();

});


// ==========================================
// ACTIVATE
// ==========================================

self.addEventListener("activate", event => {

  event.waitUntil(
    (async () => {

      const keys = await caches.keys();

      await Promise.all(

        keys.map(key => {

          if (key !== CACHE_NAME) {

            console.log("[SW] Hapus cache lama:", key);

            return caches.delete(key);

          }

        })

      );

      await self.clients.claim();

    })()
  );

});


// ==========================================
// FETCH
// ==========================================

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(

    (async () => {

      const cache = await caches.open(CACHE_NAME);

      // Cek cache dulu
      const cachedResponse = await cache.match(event.request);

      if (cachedResponse) {

        // Update cache di belakang layar
        event.waitUntil(

          fetch(event.request)
            .then(response => {

              if (
                response &&
                (
                  response.ok ||
                  response.type === "opaque"
                )
              ) {

                return cache.put(
                  event.request,
                  response.clone()
                );

              }

            })
            .catch(() => {
              // Offline → abaikan error
            })

        );

        return cachedResponse;
      }


      // Kalau belum ada cache → coba internet
      try {

        const networkResponse = await fetch(event.request);

        if (
          networkResponse &&
          (
            networkResponse.ok ||
            networkResponse.type === "opaque"
          )
        ) {

          await cache.put(
            event.request,
            networkResponse.clone()
          );

        }

        return networkResponse;

      } catch (error) {

        // Kalau offline dan tidak ada cache
        console.warn(
          "[SW] Tidak ada cache:",
          event.request.url
        );

        throw error;

      }

    })()

  );

});


// ==========================================
// SKIP WAITING
// ==========================================

self.addEventListener("message", event => {

  if (event.data?.type === "SKIP_WAITING") {

    self.skipWaiting();

  }

});
