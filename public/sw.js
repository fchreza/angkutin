// Service worker Angkutin.
//
// Strategi (versi "deploy-safe", karena app ini sering di-deploy):
//   - HTML   : network-only. HTML TIDAK pernah disimpan di cache. Kalau HTML
//              lama tersimpan, ia menunjuk berkas chunk dengan hash lama dan
//              halaman jadi putih setelah deploy.
//   - Chunk  : network-first. Selalu coba server dulu, cache hanya cadangan
//              saat offline.
//   - Aset   : stale-while-revalidate untuk ikon/logo yang jarang berubah.
//   - Lain   : dibiarkan lewat (API, gambar storage, lintas domain).
//
// PENTING: naikkan versi CACHE setiap kali logika di berkas ini berubah.

const CACHE = "angkutin-v1";
const PRECACHE = ["/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
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
  const { request } = event;

  // Jangan pernah menangani selain GET — mutasi tidak boleh di-cache.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API selalu langsung ke jaringan — data listing harus segar.
  if (url.pathname.startsWith("/api/")) return;

  // HTML: network-only, cadangan halaman offline.
  if (
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html")
  ) {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  // Chunk & aset build Next.js: network-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Ikon & manifest: pakai cache dulu, perbarui di latar.
  if (
    url.pathname.startsWith("/brand/") ||
    url.pathname === "/favicon.png" ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      }),
    );
  }
});
