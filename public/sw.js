// Service Worker para YOLE SHOP APP PWA
// v4 — Offline First: runtime cache for images, API GET cache with TTL, Background Sync
//
// Estrategia:
//   Navigation  = Network First, cache fallback (offline pages)
//   Assets      = Cache First (CSS, JS, fonts, icons)
//   API GET     = Stale-While-Revalidate (30s TTL)
//   Images      = Cache First (7 day TTL) — Supabase Storage
//   API POST    = Never cached (always network)

const CACHE_NAME = "yole-shop-v4";
const ASSETS_CACHE = "yole-assets-v4";
const API_CACHE = "yole-api-v4";
const IMAGES_CACHE = "yole-images-v4";

const API_TTL = 30_000; // 30s for API GET cache
const IMAGE_TTL = 7 * 24 * 3600_000; // 7 days for images

const PRECACHE_ASSETS = [
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-180x180.png",
  "/icons/favicon.png",
];

// ─── Install: precache static assets ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ASSETS_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => {
        console.warn("[SW v4] Precache falló (no crítico):", err);
      })
  );
});

// ─── Activate: clean old caches, take control ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== ASSETS_CACHE && key !== API_CACHE && key !== IMAGES_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: route-based strategy ───
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache non-GET requests
  if (request.method !== "GET") return;

  // ─── Supabase API GET → Stale-While-Revalidate ───
  if (url.hostname.includes("supabase.co") && url.pathname.startsWith("/rest/v1/")) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE, API_TTL));
    return;
  }

  // ─── Supabase Storage images → Cache First (7 days) ───
  if (url.hostname.includes("supabase.co") && url.pathname.includes("/storage/")) {
    event.respondWith(cacheFirstWithTTL(request, IMAGES_CACHE, IMAGE_TTL));
    return;
  }

  // ─── Navigation (HTML pages) → Network First, cache fallback ───
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match("/welcome").then((fallback) => {
              return fallback || new Response(
                "<!DOCTYPE html><html><body style='background:#0a0e27;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui'><div style='text-align:center'><h1>📵 Sin conexión</h1><p>Verifica tu conexión a internet</p></div></body></html>",
                { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
              );
            });
          });
        })
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
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // ─── Everything else → Network First ───
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => cached || new Response("", { status: 404 }));
      })
  );
});

// ─── Background Sync (if supported) ───
self.addEventListener("sync", (event) => {
  if (event.tag === "yole-sync-pending") {
    // Notify all clients to trigger sync
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "SYNC_PENDING" }));
      })
    );
  }
});

// ─── Helper: Cache First ───
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.status === 200) {
    const clone = response.clone();
    caches.open(cacheName).then((cache) => cache.put(request, clone));
  }
  return response;
}

// ─── Helper: Cache First with TTL ───
async function cacheFirstWithTTL(request, cacheName, ttl) {
  const cached = await caches.match(request);
  if (cached) {
    const dateHeader = cached.headers.get("sw-cache-date");
    if (dateHeader) {
      const age = Date.now() - parseInt(dateHeader, 10);
      if (age < ttl) return cached;
    } else {
      return cached; // No date header, serve anyway
    }
  }
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const clone = response.clone();
      const headers = new Headers(clone.headers);
      headers.set("sw-cache-date", Date.now().toString());
      const body = await clone.blob();
      const newResponse = new Response(body, { status: clone.status, statusText: clone.statusText, headers });
      caches.open(cacheName).then((cache) => cache.put(request, newResponse));
    }
    return response;
  } catch (err) {
    // Network failed, return stale cache if available
    if (cached) return cached;
    return new Response("", { status: 404 });
  }
}

// ─── Helper: Stale-While-Revalidate ───
async function staleWhileRevalidate(request, cacheName, ttl) {
  const cached = await caches.match(request);
  let staleData = null;

  if (cached) {
    const dateHeader = cached.headers.get("sw-cache-date");
    if (dateHeader) {
      const age = Date.now() - parseInt(dateHeader, 10);
      if (age < ttl) {
        return cached; // Fresh enough, no revalidation needed
      }
    }
    staleData = cached; // Stale but usable while revalidating
  }

  // Revalidate in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.status === 200) {
        const clone = response.clone();
        const headers = new Headers(clone.headers);
        headers.set("sw-cache-date", Date.now().toString());
        clone.blob().then((body) => {
          const newResponse = new Response(body, { status: clone.status, statusText: clone.statusText, headers });
          caches.open(cacheName).then((cache) => cache.put(request, newResponse));
        });
      }
      return response;
    })
    .catch(() => staleData); // If fetch fails, return stale

  // Return stale immediately if available, otherwise wait for fetch
  return staleData || fetchPromise;
}
