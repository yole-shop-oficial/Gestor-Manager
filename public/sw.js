// Service Worker para YOLE SHOP APP PWA
// v6 — NO intercepta Supabase (causaba CORS + respuestas null)
//
// CAMBIOS v6:
//   - Eliminado caching de /rest/v1/ y /rest/v1/rpc/ de Supabase
//   - Eliminado caching de Storage de Supabase
//   - Supabase requests pasan DIRECTO al network (sin SW)
//   - Solo se cachean assets estáticos (_next/static, icons, fonts)
//   - Navigation: Network First (igual que antes)
//
// Esto arregla: CORS errors, respuestas null, sesión bloqueada.

const CACHE_VERSION = "yole-shop-v6";
const ASSETS_CACHE = "yole-assets-v6";
const NAV_CACHE = "yole-nav-v6";

const PRECACHE_ASSETS = [
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-180x180.png",
  "/icons/favicon.png",
];

// ─── Install: precache + activate immediately ───
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(ASSETS_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => {})
  );
});

// ─── Activate: borrar TODOS los caches viejos ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !key.includes("v6"))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Message: SKIP_WAITING ───
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Fetch ───
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ⚠️ CRÍTICO: NUNCA interceptar Supabase
  // El SW caching de Supabase causaba CORS errors y respuestas null
  // cuando los proyectos se pausaban/restauraban.
  if (url.hostname.includes("supabase.co")) {
    return; // Dejar que la petición vaya directo al network
  }

  // Solo cachear GET
  if (request.method !== "GET") return;

  // ─── Navigation → Network First ───
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(NAV_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(
                "<!DOCTYPE html><html><body style='background:#0a0e27;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui'><div style='text-align:center'><h1>📵 Sin conexión</h1><p>Verifica tu conexión a internet</p></div></body></html>",
                { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
              )
          )
        )
    );
    return;
  }

  // ─── Static assets → Cache First ───
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(ASSETS_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ─── Todo lo demás → directo al network (sin caché) ───
});

// ─── Background Sync ───
self.addEventListener("sync", (event) => {
  if (event.tag === "yole-sync-pending") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "SYNC_PENDING" }));
      })
    );
  }
});
