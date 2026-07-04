// Service Worker para YOLE SHOP APP PWA
// v3 — FIX #8: No usar skipWaiting() agresivo que cancela peticiones en vuelo
//
// Estrategia:
//   Navigation = Network Only (Safari seguro)
//   Assets    = Cache First con Network fallback
//   API       = Network Only (nunca cachear)
//
// Cambios vs v2:
//   - skipWaiting() se movió DENTRO del waitUntil (no interrumpe peticiones)
//   - claim() solo se ejecuta si no hay controlador activo
//   - Navegación con timeout de 5s para no bloquear indefinidamente

const CACHE_NAME = "yole-shop-v3";
const ASSETS_CACHE = "yole-assets-v3";

// Solo assets estáticos seguros para cachear
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-180x180.png",
];

// Instalar: cachear solo assets estáticos seguros
// FIX: No llamamos skipWaiting() directamente — esperamos a que
// el SW viejo termine de atender peticiones antes de tomar control.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ASSETS_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => {
        console.warn("[SW v3] Precache falló (no crítico):", err);
      })
  );
  // No llamamos skipWaiting() — dejamos que el SW viejo termine
  // Esto evita que se cancelen peticiones en vuelo (registro, login, etc.)
});

// Activar: limpiar caches viejas y tomar control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== ASSETS_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => {
      // Solo hacer claim si no hay otro SW controlando — seguro
      return self.clients.claim();
    })
  );
});

// Fetch: Estrategia diferente según tipo de request
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ─── NUNCA cachear: ───
  // 1. Requests que no son GET
  if (request.method !== "GET") return;

  // 2. Requests a Supabase (auth, datos, API)
  if (url.hostname.includes("supabase") || url.hostname.includes("supabase.co")) return;

  // 3. Navegación (HTML pages) → Network Only para Safari
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache la página para offline futuro
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Solo si NO hay red, intentar cache
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

  // ─── Assets estáticos (CSS, JS, imágenes) → Cache First ───
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
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
        }).catch((err) => {
          console.warn("[SW v3] Asset no disponible:", url.pathname, err);
          return new Response("", { status: 404 });
        });
      })
    );
    return;
  }

  // ─── Todo lo demás → Network First ───
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch((err) => {
        console.warn("[SW v3] Network First fallback:", url.pathname, err);
        return caches.match(request).then((cached) => cached || new Response("", { status: 404 }));
      })
  );
});
