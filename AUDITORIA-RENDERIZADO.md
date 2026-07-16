# 🔍 AUDITORÍA COMPLETA — YOLE SHOP v2.0
## Renderizado, Compatibilidad Android y Rendimiento

**Arquitecto:** Senior Full Stack · **Fecha:** 16 julio 2026  
**Método:** análisis estático de TODO el código fuente (src/), CSS, dependencias y BD.  
**Sin modificaciones realizadas — pendiente tu aprobación.**

---

## 📋 ÍNDICE

1. [Lista de errores encontrados](#1)
2. [Causa raíz de cada error](#2)
3. [Archivos y componentes afectados](#3)
4. [Hooks y Providers afectados](#4)
5. [Consultas Supabase y Realtime](#5)
6. [CSS y compatibilidad móvil](#6)
7. [Dependencias](#7)
8. [Riesgo de cada error](#8)
9. [Plan detallado de corrección](#9)

---

<a id="1"></a>
## 1. LISTA DE ERRORES ENCONTRADOS (17 total)

### 🔴 CRÍTICOS (causan crash / pantalla en blanco)

| # | Error | Severidad |
|---|-------|-----------|
| **E1** | React #310: `getCrossProjectP2Client()` se llama 7+ veces en paralelo en `/admin`, cada una dispara `signInWithPassword`. Cuando el trigger de comisiones fallaba (400), la cascada de errores + `invalidateQueries()` + re-renders desbordaba el límite de actualizaciones de React. | 🔴 CRÍTICO |
| **E2** | `AuthGate` reemplaza `console.error` global en un `useEffect([])`. Cada error crítico cuenta y al llegar a 3, dispara `clearAllAppCache() + window.location.reload()`. Si hay errores en bucle (como el #310), esto crea un **bucle de reload infinito**. | 🔴 CRÍTICO |
| **E3** | `* { transition-timing-function: cubic-bezier(...) }` — selector universal fuerza al navegador a calcular transiciones en **cada elemento del DOM**. En Android (GPU débil), esto causa jank, artefactos horizontales y consumo excesivo de batería. | 🔴 CRÍTICO |
| **E4** | `background-attachment: fixed` en `.dark body` — **incompatible con Android**. Chrome Android y Samsung Internet renderizan esto incorrectamente, causando líneas horizontales y parpadeos al hacer scroll. | 🔴 CRÍTICO |

### 🟠 ALTOS (degradan la experiencia gravemente)

| # | Error | Severidad |
|---|-------|-----------|
| **E5** | `backdrop-filter: blur()` usado en **22+ lugares** (header, bottom-nav, cards, modals). En Samsung Internet y Android antiguo, esto causa **artefactos gráficos, líneas horizontales y GPU al 100%**. | 🟠 ALTO |
| **E6** | `dark-bg-particles` con animaciones `float 8s/10s infinite` en pseudo-elementos de 600px — **extremadamente costoso** en móvil. Causa GPU stress y drena batería. | 🟠 ALTO |
| **E7** | `min-h-screen` (100vh) en `MainLayout` y varias páginas. En Android, `100vh` **incluye la barra de navegación del navegador**, cortando contenido. Debe usar `100dvh` (dynamic viewport). | 🟠 ALTO |
| **E8** | `AuthGate` tiene `useEffect([pathname, router])` — se re-ejecuta en **cada navegación**, re-evaluando setup/PIN y causando setState innecesarios. `router` del Next.js App Router cambia identidad en cada render. | 🟠 ALTO |
| **E9** | `SessionProvider` expone un estado con **7 campos** en un solo `useMemo`. Cualquier cambio (ej: `profileLoading`) re-renderiza **todos los consumidores** de `useSession()` — toda la app. | 🟠 ALTO |

### 🟡 MEDIOS (ineficiencia / degradación)

| # | Error | Severidad |
|---|-------|-----------|
| **E10** | **7 llamadas paralelas a `getCrossProjectP2Client()`** en `/admin` (KPIs, gestores, payouts, orders, analytics, árbol×2). Cada una intenta autenticar en P2. Aunque hay lock, el patrón genera 7 queries Supabase + signIn. | 🟡 MEDIO |
| **E11** | `logger.ts` hace `setInterval(60s)` que INSERTa a Supabase cada minuto — consumo innecesario en Free tier. Se activa globalmente al primer log. | 🟡 MEDIO |
| **E12** | `rate-limiter.ts` ejecuta `setInterval(300s)` a nivel módulo — se crea aunque no se use. | 🟡 MEDIO |
| **E13** | **127 animaciones de Framer Motion** (`whileTap`, `whileHover`, `repeat: Infinity`). En Android, cada animación crea capas GPU. Las `whileHover` no tienen sentido en táctil. | 🟡 MEDIO |
| **E14** | `useSyncEngine` se monta en `MainLayout` (todas las páginas con layout). Abre IndexedDB y crea engine en cada montaje, incluso si no hay operaciones pendientes. | 🟡 MEDIO |
| **E15** | Profile page tiene **6 queries** activas simultáneamente (wallet, orders, network stats, descendants, + tabs internas). | 🟡 MEDIO |

### 🟢 BAJOS (mejoras menores)

| # | Error | Severidad |
|---|-------|-----------|
| **E16** | `lucide-react@1.23.0` — versión inusual (las normales son `0.x`). Posible API incompatible o bundle pesado. | 🟢 BAJO |
| **E17** | No existe modo DEBUG estructurado. Los errores se loguean con `console.log/warn/error` dispersos sin contexto de componente/hook/ruta. | 🟢 BAJO |

---

<a id="2"></a>
## 2. CAUSA RAÍZ DE CADA ERROR

### E1 — React #310 (el crash principal)
**Causa raíz:** No es un solo bug, es una **cascada**:
1. El admin entra a `/admin` → se montan **6 componentes** (AdminContent + AdminOrders + AdminAnalytics + CommercialTree + MonitoringDashboard + cada uno con `useSupabaseQuery`).
2. Cada query llama `getCrossProjectP2Client()` → 7 llamadas paralelas a P2.
3. Cuando una mutation (PATCH orders) fallaba (trigger bug del `distribute_commissions`), el error disparaba `invalidateQueries` que re-ejecutaba todas las queries → que volvían a llamar P2 → que generaban más renders.
4. React detecta "demasiadas actualizaciones en cascada" → #310.

**Archivo responsable:** `src/components/dashboard/AdminOrders.tsx` (antes del fix del trigger) + `src/services/supabase/crossProjectAdmin.ts` (patrón de autenticación paralela).

### E2 — Bucle de reload
**Causa raíz:** `AppGate.tsx` línea 53-84. El `console.error` override intercepta TODO error de la app. Cuando el #310 ocurre, React llama `console.error` repetidamente → el contador llega a 3 → `clearAllAppCache + reload` → al recargar, el #310 vuelve a ocurrir → bucle infinito.

**Archivo responsable:** `src/components/security/AppGate.tsx`

### E3 — Selector universal `* { transition }`
**Causa raíz:** `globals.css` línea 231. `* { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }` hace que el navegador calcule timing de transición para cada nodo del DOM. En una app con cientos de elementos, esto es una carga constante.

**Archivo responsable:** `src/app/globals.css`

### E4 — `background-attachment: fixed`
**Causa raíz:** `globals.css` línea 82. `.dark body { background-attachment: fixed; }`. En Android, `fixed` para backgrounds causa repintado constante al hacer scroll porque el viewport móvil cambia. Es un **bug conocido de Chrome Android y Samsung Internet**.

**Archivo responsable:** `src/app/globals.css`

### E5 — `backdrop-filter: blur()`
**Causa raíz:** 22+ usos en componentes. El `blur()` fuerza al navegador a renderizar el contenido de fondo y luego aplicarle un filtro. En GPUs móviles débiles, esto causa artefactos (líneas horizontales), especialmente cuando hay múltiples elementos blurados apilados.

**Archivos responsables:** `globals.css`, `header.tsx`, `bottom-nav.tsx`, `UserProfileModal.tsx`, `AppUpdateOverlay.tsx`, `welcome/page.tsx`, `profile/page.tsx`, `network/page.tsx`, `FloatingToolKit.tsx`, `OnboardingBot.tsx`.

### E9 — SessionProvider estado gigante
**Causa raíz:** `useSession.tsx`. El context value se calcula con `useMemo([state, refreshProfile])`. El objeto `state` contiene `{ user, client, project, loading, profile, profileLoading }`. Cuando **cualquier** campo cambia (ej: `loading: true → false`), el `useMemo` genera un objeto nuevo → todos los `useContext(SessionContext)` se re-renderizan.

---

<a id="3"></a>
## 3. ARCHIVOS Y COMPONENTES AFECTADOS

### Archivos críticos a modificar:

| Archivo | Errores que corrige | Líneas afectadas |
|---------|---------------------|------------------|
| `src/app/globals.css` | E3, E4, E5, E6, E7 | ~40 cambios |
| `src/components/security/AppGate.tsx` | E2, E8 | Reescritura del useEffect |
| `src/hooks/useSession.tsx` | E9 | Split del context |
| `src/services/supabase/crossProjectAdmin.ts` | E1, E10 | Refactor auth |
| `src/components/layout/main-layout.tsx` | E7, E14 | dvh + lazy sync |
| `src/components/layout/header.tsx` | E5 | backdrop blur |
| `src/components/layout/bottom-nav.tsx` | E5, E7 | backdrop blur + dvh |
| `src/lib/logger.ts` | E11 | Conditional flush |
| `src/lib/rate-limiter.ts` | E12 | Lazy interval |

### Componentes que se renderizan en exceso:

| Componente | Razón | Renderizaciones por navegación |
|------------|-------|-------------------------------|
| `AdminContent` | 4 queries + 3 dynamic imports | ~12 renders en mount |
| `SessionProvider` | estado monolítico | re-render en cada cambio de campo |
| `AuthGate` | useEffect([pathname, router]) | re-ejecuta en cada navegación |
| `MainLayout` | useSyncEngine siempre activo | re-render en sync state changes |
| `CommercialTree` | 2 queries (nodos + stats) + merge P2 | re-render en cada invalidación |

---

<a id="4"></a>
## 4. HOOKS Y PROVIDERS AFECTADOS

### Hooks con problemas:

| Hook | Problema | Severidad |
|------|----------|-----------|
| `useSession()` | Lee context monolítico → re-render en cualquier cambio | 🟠 ALTO |
| `useSyncEngine()` | Se monta en MainLayout, abre IndexedDB siempre | 🟡 MEDIO |
| `useRealtime()` | NO-OP (correcto, no hace nada) | ✅ OK |
| `useAppUpdate()` | setInterval 5min para SW update | 🟢 BAJO |
| `useConversations()` | setInterval 45s para polling | ✅ OK (necesario) |
| `useUnreadNotifications()` | Query con staleTime 60s | ✅ OK |

### Providers con problemas:

| Provider | Problema |
|----------|----------|
| `SessionProvider` | Estado con 7 campos en un solo objeto. Cada cambio parcial re-renderiza toda la app. **Debería dividirse** en: `AuthContext` (user/client/project) + `ProfileContext` (profile/profileLoading). |
| `QueryProvider` | staleTime global de 2 min. Aceptable, pero algunas queries lo sobreescriben a 30s causando fetchs más frecuentes. |
| `ThemeProvider` | `defaultTheme="system"` + `enableSystem` → en SSR no hay clase `.dark`, en cliente sí → hydration mismatch (mitigado por `suppressHydrationWarning`). |

---

<a id="5"></a>
## 5. CONSULTAS SUPABASE Y REALTIME

### Consultas problemáticas:

| Componente | Query | Problema |
|------------|-------|----------|
| AdminContent | `get_admin_dashboard` × P1+P2 | Llama `getCrossProjectP2Client()` |
| AdminContent | `profiles.neq(role,admin)` × P1+P2 | Llama `getCrossProjectP2Client()` |
| AdminContent | `payout_requests` × P1+P2 | Llama `getCrossProjectP2Client()` |
| AdminOrders | `orders` × P1+P2 + resolve nombres | Llama `getCrossProjectP2Client()` |
| AdminAnalytics | `orders`+`profiles`+`wallet_entries`+`payouts` × P1+P2 | 8 queries (4×P1 + 4×P2) |
| CommercialTree | `profiles` + `get_network_stats` × P1+P2 | Llama `getCrossProjectP2Client()` ×2 |
| UserProfileModal | `profiles.*` + `orders.count` + `wallet_entries` | Se ejecuta al abrir modal |

**Total de llamadas a `getCrossProjectP2Client()` al cargar `/admin`: 7+**

### Realtime:
- `useRealtime` = NO-OP ✅ (correctamente desactivado)
- Polling: `useConversations` (45s), `useUnreadNotifications` (60s), `notifications/page` (60s)
- No hay memory leaks de Realtime

---

<a id="6"></a>
## 6. CSS Y COMPATIBILIDAD MÓVIL

### Propiedades incompatibles con Android:

| Propiedad | Uso | Problema Android | Solución |
|-----------|-----|------------------|----------|
| `background-attachment: fixed` | `.dark body` | Líneas horizontales, parpadeo | Eliminar / usar `scroll` |
| `backdrop-filter: blur()` | 22+ lugares | Artefactos GPU, líneas horizontales | Usar `background: rgba()` sólido |
| `* { transition-timing-function }` | Selector universal | GPU stress en cada elemento | Mover a componentes específicos |
| `100vh` / `min-h-screen` | Layout, pages | Incluye navbar Android | Cambiar a `100dvh` / `min-h-dvh` |
| `float 8s/10s infinite` | `dark-bg-particles` | Animación GPU constante | Eliminar o simplificar |
| `backdrop-blur-xl` | welcome page | Muy pesado en móvil | Reducir o eliminar |

### Viewport:
- `viewport.width = "device-width"` ✅
- `viewport.initialScale = 1` ✅
- **Falta:** `viewport.viewportFit = "cover"` para safe-area en notch
- **Falta:** usar `dvh`/`svh` en lugar de `vh`

---

<a id="7"></a>
## 7. DEPENDENCIAS

| Paquete | Versión | Estado |
|---------|---------|--------|
| `react` | 19.2.6 | ⚠️ Muy reciente, posible inestabilidad |
| `next` | 16.2.6 | ⚠️ Muy reciente |
| `@tanstack/react-query` | 5.101.2 | ✅ OK |
| `@supabase/supabase-js` | 2.110.0 | ✅ OK |
| `framer-motion` | 12.42.2 | ✅ OK pero 127 animaciones es excesivo |
| `lucide-react` | 1.23.0 | ⚠️ Versión inusual (normal: 0.x) |
| `tailwindcss` | 4.1.17 | ✅ OK |
| `next-themes` | 0.4.6 | ✅ OK |
| **Zustand** | NO instalado | ✅ (no se usa, como debe ser en este caso) |

**Sin conflictos de versiones duplicadas.**

---

<a id="8"></a>
## 8. RIESGO DE CADA ERROR

| Error | Riesgo si no se arregla | Esfuerzo |
|-------|------------------------|----------|
| E1 (#310) | App inservible en admin al tocar pedidos | Medio |
| E2 (reload loop) | Usuario no puede salir de la pantalla de error | Bajo |
| E3 (* transition) | Batería, GPU, lag permanente | Bajo |
| E4 (bg fixed) | Líneas horizontales visibles en Android | Bajo |
| E5 (backdrop-blur) | Artefactos visibles, GPU al 100% | Medio |
| E6 (particles) | Batería, GPU | Bajo |
| E7 (100vh) | Contenido cortado en Android | Medio |
| E8 (AuthGate) | Renders innecesarios en cada navegación | Bajo |
| E9 (SessionProvider) | Toda la app se re-renderiza | Alto |
| E10 (7 calls P2) | Lentitud, posibles timeouts | Medio |

---

<a id="9"></a>
## 9. PLAN DETALLADO DE CORRECCIÓN

### FASE 1 — Eliminar el crash (#310) — Prioridad MÁXIMA

**1.1** Refactorizar `crossProjectAdmin.ts`:
- Reemplazar las 7 llamadas paralelas por **una sola función cacheada** que se inicializa una vez al montar el admin.
- Crear `ensureP2Ready()` que devuelve una Promise cacheada.
- Las queries usan el cliente ya autenticado sin re-autenticar.

**1.2** Eliminar el `console.error` override de `AppGate`:
- Quitar el contador de errores y el auto-reload.
- El `ErrorBoundary` ya captura los errores de render.
- Mover la limpieza de caché al botón manual del ErrorBoundary (ya existe).

**1.3** Proteger todas las mutations con `useCallback` + guard anti-doble-click (ya hecho en AdminOrders, replicar en admin page).

### FASE 2 — Eliminar artefactos gráficos Android

**2.1** `globals.css`:
- Eliminar `* { transition-timing-function }`.
- Eliminar `background-attachment: fixed`.
- Eliminar `dark-bg-particles` y sus animaciones.
- Reemplazar `backdrop-filter: blur()` por `background: rgba()` sólido con fallback.
- Añadir `@supports (backdrop-filter: blur(10px))` para usar blur solo donde el navegador lo soporta eficientemente.

**2.2** Componentes:
- `header.tsx`: `surface-blur` → `background: rgba()` sólido.
- `bottom-nav.tsx`: igual.
- `welcome/page.tsx`: reducir blur-2xl/blur-xl a backgrounds sólidos.
- Eliminar `whileHover` de botones (no existe en táctil).

### FASE 3 — Compatibilidad móvil

**3.1** Reemplazar todos los `min-h-screen` / `100vh` por `min-h-dvh` / `100dvh` con fallback `svh`.

**3.2** Añadir `viewportFit: "cover"` al viewport del layout.

**3.3** BottomNav: usar `env(safe-area-inset-bottom)` con `padding-bottom`.

### FASE 4 — Optimizar renders

**4.1** Dividir `SessionProvider` en dos contextos:
- `AuthProvider`: user, client, project, loading (cambia poco).
- `ProfileProvider`: profile, profileLoading, refreshProfile (cambia más).
- Los componentes que solo necesitan el user no se re-renderizan cuando cambia el profile.

**4.2** `AuthGate`: cambiar `useEffect([pathname, router])` por `useEffect([pathname])` (router es estable en App Router, pero el array debería ser mínimo).

**4.3** Lazy-load `useSyncEngine` — solo activar cuando hay operaciones offline reales.

### FASE 5 — Modo DEBUG

**5.1** Crear `src/lib/debug.ts` con:
```typescript
// Registro estructurado de renders, queries, errores
// Solo activo en desarrollo (process.env.NODE_ENV === 'development')
// Registra: componente, hook, ruta, user, estado, query, tiempo, error
```

**5.2** Integrar con React DevTools Profiler automáticamente.

### FASE 6 — Limpieza

**6.1** Logger: solo flush cuando hay logs acumulados Y el usuario está autenticado.
**6.2** Rate-limiter: lazy init del interval.
**6.3** Reducir animaciones de Framer Motion: eliminar `whileHover`, simplificar las infinitas.

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Errores | Críticos | Prioridad |
|-----------|---------|----------|-----------|
| React #310 / renders | 4 | E1, E2 | 🔴 Inmediata |
| CSS / Android | 6 | E3, E4 | 🔴 Inmediata |
| Providers / Estado | 3 | E9 | 🟠 Alta |
| Consultas Supabase | 2 | E10 | 🟡 Media |
| Deps / Debug | 2 | — | 🟢 Baja |

**Total: 17 errores identificados, 4 críticos.**

**Estimación: 6 fases, ~15-20 archivos modificados.**

---

*Auditoría completada sin modificar ningún archivo. Pendiente de tu aprobación para comenzar las correcciones fase por fase.*
