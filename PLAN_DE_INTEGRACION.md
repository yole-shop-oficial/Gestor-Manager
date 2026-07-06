# 🚀 YOLE SHOP APP v2.0 — PLAN DE INTEGRACIÓN POR FASES

> **Basado en**: Auditoría Arquitectónica Completa (14 secciones)  
> **Fecha**: 2026-07-06  
> **Objetivo**: Soportar 1000 gestores, 300 simultáneos, en plan gratuito Supabase  
> **Principio**: Cada fase debe compilar, pasar tests y desplegarse antes de avanzar

---

## 📊 RESUMEN EJECUTIVO

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Requests dashboard gestor | 5-8 | ≤ 2 |
| Requests dashboard admin | 12-16 | ≤ 3 |
| Canales realtime abiertos | 4 permanentes | 1-2 dinámicos |
| Usuarios simultáneos (plan gratis) | ~15 | ≥ 60 |
| Bundle size JS | ~600KB | ≤ 350KB |
| Código duplicado | ~30% | ≤ 10% |
| Dependencias muertas | 5 (~380KB) | 0 |

---

## 🔴 FASE 0: LIMPIEZA INMEDIATA
**Prioridad**: CRÍTICA | **Tiempo estimado**: 30 min | **Riesgo**: Bajo

### Objetivo
Eliminar lastre que no hace nada pero pesa 380KB en el bundle.

### Tareas
- [ ] `npm uninstall zustand recharts drizzle-orm drizzle-kit pg bcryptjs @types/bcryptjs @types/pg`
- [ ] Eliminar `src/db/schema.ts` (export {} vacío)
- [ ] Eliminar `src/db/index.ts` (placeholder sin uso)
- [ ] Eliminar `drizzle.config.json` si existe
- [ ] Verificar que ningún archivo importa estos módulos
- [ ] `npm run typecheck` — sin errores
- [ ] `npm run build` — compila correctamente
- [ ] `npm run test` — 17 tests pasan

### Entregables
- package.json limpio (0 dependencias muertas)
- ~380KB menos de bundle
- Build + tests verdes

### Rollback
```bash
git revert HEAD --no-edit
```

---

## 🔴 FASE 1: UNIFICAR HOOKS DE SESIÓN
**Prioridad**: ALTA | **Tiempo estimado**: 1h | **Depende de**: Fase 0

### Objetivo
Un solo hook `useSession()` que reemplace `useSupabaseUser` + `useAppUser`. Cache de perfil 5 min en memoria.

### Tareas
- [ ] Crear `src/hooks/useSession.ts`
  - Devuelve: `{ user, client, project, profile, isAdmin, isActive, isPending, profileLoading }`
  - Cache de perfil en `Map<string, { profile, cachedAt }>` con TTL 5 min
  - Si el perfil está en cache y < 5 min, devuelve cache sin fetch
  - Si no, hace fetch a `profiles` y actualiza cache
- [ ] Crear `src/hooks/index.ts` (barrel export)
- [ ] Migrar todas las páginas de `useAppUser` → `useSession`:
  - `src/app/page.tsx` (GestorDashboard)
  - `src/app/admin/page.tsx`
  - `src/app/orders/page.tsx`
  - `src/app/orders/new/page.tsx`
  - `src/app/wallet/page.tsx`
  - `src/app/notifications/page.tsx`
- [ ] Migrar páginas de `useSupabaseUser` → `useSession`:
  - `src/app/chat/page.tsx`
  - `src/app/orders/[id]/page.tsx`
- [ ] Eliminar `profile/page.tsx` consulta duplicada (usar `useSession` directamente)
- [ ] Mantener `useSupabaseUser` y `useAppUser` como aliases temporales que llamen `useSession` (backward compat)
- [ ] `npm run typecheck && npm run build && npm run test`

### Archivos nuevos
```
src/hooks/useSession.ts
src/hooks/index.ts
```

### Archivos modificados
```
src/app/page.tsx
src/app/admin/page.tsx
src/app/orders/page.tsx
src/app/orders/new/page.tsx
src/app/orders/[id]/page.tsx
src/app/wallet/page.tsx
src/app/chat/page.tsx
src/app/notifications/page.tsx
src/app/profile/page.tsx
```

### Verificación
- Dashboard gestor: profile se carga 1 vez, no 2
- Profile page: usa cache, no hace nueva consulta
- Admin: `isAdmin` funciona correctamente
- Chat: funciona sin necesidad de profile

---

## 🔴 FASE 2: REACT QUERY COMO CAPA DE DATOS
**Prioridad**: CRÍTICA | **Tiempo estimado**: 2h | **Depende de**: Fase 1

### Objetivo
Toda consulta Supabase pasa por React Query. Cache automático, deduplicación, stale-while-revalidate, retry.

### Tareas
- [x] Crear `src/hooks/useSupabaseQuery.ts` — wrapper tipado con `invalidate` helpers
- [x] Configurar QueryClient global (retry: 2, gcTime: 10min, staleTime: 30s, refetchOnWindowFocus: false)
- [x] Migrar Dashboard Gestor (`GestorDashboard.tsx`):
  - Query key: `["gestor-dashboard", userId]`, staleTime: 30s
  - 4 count queries combinadas en 1 Promise.all
- [x] Migrar Dashboard Admin (`admin/page.tsx`):
  - Query key: `["admin-dashboard"]`, staleTime: 60s (KPIs)
  - Gestores list: `["admin-gestores"]`, staleTime: 60s
  - Payouts: `["admin-payouts"]`, staleTime: 30s
- [x] Migrar AdminAnalytics:
  - Query key: `["admin-analytics"]`, staleTime: 120s
- [x] Migrar GestorAnalytics:
  - Query key: `["gestor-analytics", userId]`, staleTime: 60s
- [x] Migrar Wallet (`wallet/page.tsx`):
  - Query key: `["wallet", userId]`, staleTime: 30s
- [x] Migrar Orders (`orders/page.tsx`):
  - Query key: `["orders", userId]`, staleTime: 2min
- [x] Migrar Notifications (`notifications/page.tsx`):
  - Query key: `["notifications", userId]`, staleTime: 30s
  - Realtime invalida cache en lugar de setState manual
- [x] Migrar Chat (`chat/page.tsx`):
  - Query key: `["chat", userId]`, staleTime: 0 (siempre fresh)
  - Mensajes optimistas + invalidación por realtime
- [x] Migrar Order Detail (`orders/[id]/page.tsx`):
  - Query key: `["order-detail", orderId]`, staleTime: 30s
  - Invalidación de queries relacionadas al cambiar status
- [x] Migrar New Order (`orders/new/page.tsx`):
  - Invalidación de orders, gestor-dashboard, gestor-analytics al crear pedido
- [x] Profile usa useSession (sin query adicional, cache de 5min)
- [x] Errores visibles en UI (no solo console) en todas las páginas
- [x] `npm run typecheck && npm run build && npm run test`

### Stale times por query
```
Profile           → 5 min (casi nunca cambia)
Dashboard gestor  → 30s (datos que cambian moderado)
Dashboard admin   → 60s (datos agregados)
Admin analytics   → 120s (reportes pesados)
Orders list       → 2 min (cambian con cada pedido nuevo)
Wallet            → 30s (dinero, necesita frescura)
Notifications     → 30s
Chat mensajes     → 0 (siempre fresh)
```

### Verificación
- Abrir dashboard → cerrar → volver a abrir: datos aparecen instantáneamente (cache)
- Network tab: no hay requests duplicados
- Admin dashboard: ≤ 3 requests en lugar de 14

---

## 🔴 FASE 3: REALTIME MANAGER
**Prioridad**: CRÍTICA | **Tiempo estimado**: 1.5h | **Depende de**: Fase 2

### Objetivo
Reducir de 4 canales permanentes a 1-2 dinámicos. 60 conexiones = 60 usuarios en lugar de 15.

### Tareas
- [x] Crear `src/hooks/useRealtime.ts`:
  - Auto-subscribe en mount, auto-unsubscribe en unmount
  - Page Visibility API: detecta cuando tab pierde foco
  - Nunca abre canal si `enabled: false`
  - Deduplicación de canales con tracker
  - Logging de estado (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT)
- [x] Refactorizar Chat realtime:
  - ANTES: 2 canales (INSERT recipient + INSERT sender)
  - DESPUÉS: 1 canal con filter `or(sender_id.eq.{userId},recipient_id.eq.{userId})`
  - Solo activo cuando el componente está montado (en `/chat`)
  - Usa hook `useRealtime` en lugar de useEffect manual
- [x] Refactorizar Notifications realtime:
  - ANTES: 2 canales (INSERT + UPDATE) en useEffect manual
  - DESPUÉS: 1 canal con event `*` y filter `user_id.eq.{userId}`
  - Solo activo en `/notifications` (componente montado)
  - Usa hook `useRealtime` en lugar de useEffect manual
- [x] Header notification dot: conectado a datos reales via `useUnreadNotifications`
  - ANTES: dot rojo animado infinito hardcodeado (siempre visible)
  - DESPUÉS: badge con conteo real, solo visible si hay notificaciones sin leer
  - `useUnreadNotifications`: query `["unread-count", userId]` + 1 canal ligero permanente
  - Badge muestra número (1-9+), se actualiza en tiempo real
- [x] Cerrar TODOS los canales al desmontar componente (auto-cleanup en useRealtime)
- [x] `npm run typecheck && npm run build && npm run test`

### Canales realtime por ruta (después de FASE 3)
```
Siempre activo (header badge):
  └── notif-badge-{userId} (INSERT notifications, lightweight count invalidation)

Solo en /chat:
  └── chat-msgs-{userId} (INSERT messages, or-filter)

Solo en /notifications:
  └── notifs-{userId} (INSERT+UPDATE+DELETE notifications)

Total máximo: 2 canales simultáneos (header + página actual)
ANTES: 4+ canales permanentes por usuario → AHORA: 1-2 dinámicos
```

### Verificación
- Abrir chat → Network tab: 1 canal realtime
- Salir de chat → Network tab: 0 canales
- Abrir notifications → 1 canal
- Dashboard → 0-1 canal (solo notifications si header badge)
- Total: nunca más de 2 canales simultáneos

---

## 🔴 FASE 4: OPTIMIZACIÓN SQL
**Prioridad**: ALTA | **Tiempo estimado**: 1h | **Depende de**: Fase 2

### Objetivo
Agregar índices faltantes, crear funciones SQL para dashboards, consolidar triggers.

### Tareas
- [x] Ejecutar en AMBOS proyectos (P1 + P2):
  - `idx_wallet_entries_order_id` ON wallet_entries(order_id)
  - `idx_notifications_is_read` ON notifications(user_id, is_read) WHERE is_read = false (partial index)
  - `idx_orders_status` ON orders(status) (for admin queries)
  - `idx_profiles_role_status` ON profiles(role, status) (for admin queries)
  - All created with CONCURRENTLY (no table lock, safe for production)
- [x] Función: `get_gestor_dashboard(p_manager_id uuid)` en ambos proyectos
  - 1 SQL request instead of 4 separate count queries
  - SECURITY DEFINER + STABLE (runs as function creator, cached by Postgres)
  - Returns: total_orders, pending_orders, sold_orders, balance
- [x] Función: `get_admin_dashboard()` en ambos proyectos
  - 1 SQL request instead of 6 separate count queries
  - Returns: total_users, pending_users, active_users, total_orders, pending_orders, pending_payouts
- [x] GRANT EXECUTE on both functions TO authenticated, anon
- [x] Actualizar `GestorDashboard.tsx` → usa `supabase.rpc("get_gestor_dashboard")`
- [x] Actualizar `admin/page.tsx` → usa `supabase.rpc("get_admin_dashboard")`
- [x] Storage DELETE policy: "Authenticated users can delete their order images"
  - ON storage.objects FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1])
  - Applied to both projects
- [x] Fix `notifications_insert_system` policy: CHECK(true) → CHECK(auth.uid() IS NOT NULL)
  - Applied to both projects
- [x] `npm run typecheck && npm run build && npm run test`

### Resultados
| Query | Antes | Después |
|-------|-------|---------|
| Gestor dashboard | 4 requests (orders×3 + wallet×1) | 1 request (RPC) |
| Admin dashboard KPIs | 6 requests (profiles×3 + orders×2 + payouts×1) | 1 request (RPC) |
| Notifications unread count | Full scan si no hay índice | Partial index (solo no leídas) |
| Storage delete images | No policy (imposible borrar) | Policy con auth check |

### Verificación
- Dashboard gestor: 1 request en lugar de 4 (función SQL)
- Dashboard admin: 1 request para KPIs en lugar de 5+
- `EXPLAIN ANALYZE` de las queries demuestra uso de índices

---

## 🔴 FASE 5: REDISEÑO DEL CHAT
**Prioridad**: ALTA | **Tiempo estimado**: 4h | **Depende de**: Fase 3

### Objetivo
Chat profesional con conversaciones, chat global, anti-spam, paginación cursor, typing indicator.

### Tareas — Sub-fase 5A: Tablas SQL (1h)
- [x] Crear tablas en AMBOS proyectos (P1 + P2):
  - `conversations` (id, type, name, created_by, last_message_at, last_message_preview, created_at)
  - `conversation_members` (conversation_id, user_id, joined_at, last_read_at, is_muted)
  - `message_reactions` (id, message_id, user_id, emoji, created_at)
  - Added `conversation_id` column to existing `messages` table
- [x] RLS policies para todas las tablas nuevas (conversations, conversation_members, message_reactions)
- [x] Índices: idx_conversations_type, idx_conversation_members_user, idx_messages_conversation, idx_message_reactions_message
- [x] Conversación "Global" creada (id fijo: 00000000-0000-0000-0000-000000000001)
- [x] Migración de 2 mensajes existentes en P1 → asignados a conversación privada
- [x] Admin añadido como miembro de conversación global

### Tareas — Sub-fase 5B: Componentes (2h)
- [x] Crear `src/features/chat/`:
  - `types.ts` — Conversation, ConversationMember, ChatMessage, MessageReaction
  - `anti-spam.ts` — Rate limiting (10s, 5/min, 300 chars, URL detection, flood detection)
  - `hooks/useConversations.ts` — Lista de conversaciones con unread count
  - `hooks/useMessages.ts` — Mensajes por conversación con cursor pagination
  - `components/ChatLayout.tsx` — Layout principal (sidebar + window)
  - `components/ChatSidebar.tsx` — Lista de conversaciones (global + privada + privadas múltiples)
  - `components/ChatWindow.tsx` — Ventana de chat con mensajes, composer, spam error
- [x] Chat privado: crear/buscar conversación 1:1 con admin (findOrCreatePrivateConv)
- [x] Chat Global: conversación type='global', todos pueden escribir
- [x] Anti-spam para Chat Global:
  - Rate limit: 1 mensaje cada 10s
  - Max 5 por minuto
  - Max 300 caracteres con contador
  - Detección flood (3 iguales en 30s)
  - No links (regex URL)
- [x] Spam error visible en UI (toast rojo con motivo)
- [x] 7 tests de anti-spam

### Tareas — Sub-fase 5C: Integración (1h)
- [x] Actualizar `src/app/chat/page.tsx` → usa nuevo `ChatLayout`
- [x] Realtime: 2 canales dinámicos (conversations list + active conversation messages)
- [x] Backward compatible: mensajes sin conversation_id siguen funcionando
- [x] `npm run typecheck && npm run build && npm run test`

### Verificación
- Chat privado funciona (gestor ↔ admin)
- Chat Global funciona (todos pueden escribir)
- Anti-spam bloquea mensajes rápidos
- Typing indicator aparece
- Solo 1 canal realtime abierto cuando se está en una conversación
- 0 canales cuando se sale del chat

---

## 🟡 FASE 6: OPTIMIZACIÓN DE RENDER ✅
**Prioridad**: MEDIA | **Tiempo estimado**: 2h | **Depende de**: Fase 2

### Objetivo
Eliminar re-renderizados innecesarios, memoizar componentes, reducir repaints.

### Tareas
- [x] `React.memo` en componentes puros:
  - `StatCard` (GestorDashboard)
  - `QuickAction` (GestorDashboard)
  - `AdminStat` (Admin)
  - `FilterChip` (Orders)
  - `OrderCard` (Orders)
  - `ProfileRow` (Profile)
  - `DetailRow` (OrderDetail)
  - `MiniKPI` (GestorAnalytics)
  - `KPI` + `StatusBars` (AdminAnalytics)
- [x] `useMemo` en cálculos:
  - `filteredOrders` + `statusCounts` (Orders) — evita recalcular en cada render
  - `maxCount` (GestorAnalytics) — evita Math.max en cada render
  - `displayName` (GestorDashboard) — evita split en cada render
  - `statusConfig` + `commission` (OrderDetail) — evita lookup en cada render
  - `statusColor` + `statusLabel` + `genderLabel` (Profile) — evita switches en cada render
  - `balance` + `totalCommissions` + `totalPayouts` + `entries` + `payouts` (Wallet) — derivaciones estables
  - `statusBadge` memoizado con `useCallback` (Admin)
  - `total` + porcentajes en `StatusBars` (AdminAnalytics) — cálculo extraído a componente memoizado
- [x] Eliminar animación infinita del dot del Header:
  - Ya corregido en FASE 3: badge usa `AnimatePresence` + scale (no `animate-pulse`)
  - Badge solo visible cuando `hasUnread === true`, se oculta cuando no hay notificaciones
- [x] Optimizar FloatingToolKit drag:
  - `useState({ x, y })` → `useMotionValue(16)` para posX y posY
  - `setPos()` (re-render) → `posX.set()` / `posY.set()` (sin re-render)
  - `didDrag` ref para distinguir click vs drag (sin re-render)
  - `<div style={{ bottom: pos.y, right: pos.x }}>` → `<motion.div style={{ bottom: posY, right: posX }}>`
- [x] `npm run typecheck && npm run build && npm run test` — ✅ 24 tests, 0 errores

### Verificación
- React DevTools Profiler: menos renders al interactuar
- Header dot no causa repaints constantes (ya corregido en FASE 3)
- Drag del FloatingToolKit no causa re-renders (useMotionValue)

---

## 🟡 FASE 7: PAGINACIÓN UNIVERSAL ✅
**Prioridad**: MEDIA | **Tiempo estimado**: 1.5h | **Depende de**: Fase 2

### Objetivo
Todas las listas usan paginación real con cursor, no `limit: 500`.

### Tareas
- [x] Crear `src/hooks/useSupabaseInfiniteQuery.ts`:
  - Wrapper tipado de `useInfiniteQuery` con soporte para cursor pagination
  - Expone `flatData` (array aplanado) + `totalLoaded` + `fetchNextPage` + `hasNextPage`
  - Integrado con `useSession` para client/userId automáticos
  - Exportado desde `src/hooks/index.ts`
- [x] Orders (`orders/page.tsx`):
  - `useSupabaseInfiniteQuery` con cursor `created_at` (20 por página)
  - Infinite scroll con `IntersectionObserver` (rootMargin: 200px)
  - Botón "Cargar más pedidos..." automático al hacer scroll
  - Indicador "Todos los pedidos cargados (N)"
- [x] Admin gestores list (`admin/page.tsx`):
  - `useSupabaseInfiniteQuery` con cursor (20 por página)
  - Botón "Cargar más gestores (N cargados)"
  - Indicador "Todos los gestores cargados (N)"
- [x] Wallet entries (`wallet/page.tsx`):
  - Query separada: `wallet-summary` (useSupabaseQuery) + `wallet-entries` (infinite, 15 por página) + `wallet-payouts` (useSupabaseQuery)
  - Botón "Cargar más (N cargados)" con ChevronDown
  - Indicador "Todos los movimientos cargados (N)"
  - `invalidate.wallet()` actualizado para invalidar las 3 keys nuevas
- [x] Chat messages (`useMessages.ts`):
  - `useSupabaseInfiniteQuery` con cursor (30 inicial)
  - `fetchOlder` / `hasOlder` / `fetchingOlder` exportados
  - Botón "Cargar mensajes anteriores" en la parte superior del chat
  - Auto-detección de scroll al inicio para cargar más
  - ChatWindow actualizado con scroll-up detection + botón manual
  - ChatLayout actualizado para pasar los nuevos props
- [x] Notifications (`notifications/page.tsx`):
  - `useSupabaseInfiniteQuery` con cursor (20 por página)
  - Infinite scroll con `IntersectionObserver`
  - Indicador "Todas las notificaciones cargadas (N)"
- [x] `npm run typecheck && npm run build && npm run test` — ✅ 24 tests, 0 errores

### Paginación por página
```
Orders          → 20 por página, infinite scroll automático (IntersectionObserver)
Admin gestores  → 20 por página, botón "Cargar más"
Wallet entries  → 15 por página, botón "Cargar más"
Chat mensajes   → 30 por página, scroll up + botón manual
Notifications   → 20 por página, infinite scroll automático (IntersectionObserver)
```

### Verificación
- Orders: Network tab muestra queries de 20 en 20 al hacer scroll
- Admin: no carga 500 registros de golpe, solo 20 + cargar más
- Chat: scroll up carga más mensajes sin saltar
- Wallet: botón "Cargar más" aparece si hay más de 15 movimientos
- Notifications: scroll al final carga más notificaciones

---

## 🟡 FASE 8: COMPONENTES COMPARTIDOS ✅
**Prioridad**: MEDIA | **Tiempo estimado**: 1h | **Depende de**: Fase 1

### Objetivo
Extraer componentes duplicados a `src/components/shared/`.

### Tareas
- [x] Crear `src/components/shared/StatusBadge.tsx` (reemplazado en 4 archivos)
  - Soporta 11 statuses: pending, active, denied, blocked, confirmed, sold, cancelled, approved, paid, rejected
  - Sizes: sm (default) y md
  - Icono opcional
  - Dark mode con variantes de color apropiadas
- [x] Crear `src/components/shared/DetailRow.tsx` (reemplazado en OrderDetail)
  - label/value pair con highlight opcional
  - React.memo
- [x] Crear `src/components/shared/ErrorPanel.tsx` (reemplazado en 7+ archivos)
  - Variants: "error" (red) y "warning" (yellow)
  - Compact mode para errores inline
  - Reemplaza 10+ patrones `bg-red-50 dark:bg-red-500/10 border border-red-200...` duplicados
- [x] Crear `src/components/shared/EmptyState.tsx` (reemplazado en 4+ archivos)
  - Icon + title + description
  - Border-dashed card container
  - Reemplaza 6+ patrones de "Sin X aún" duplicados
- [x] Crear `src/components/shared/LoadingSpinner.tsx` (reemplazado en 10+ archivos)
  - Sizes: sm (w-4 h-4), md (w-8 h-8), lg (w-12 h-12)
  - Variants: "primary" y "muted"
  - `centered` prop para centrar en contenedor
  - Reemplaza 20+ Loader2 inline duplicados
- [x] Crear `src/components/shared/index.ts` (barrel export)
- [x] Reemplazar todas las ocurrencias duplicadas en:
  - `GestorDashboard.tsx` — StatusBadge (2), LoadingSpinner (1), ErrorPanel (1)
  - `admin/page.tsx` — StatusBadge (1), LoadingSpinner (2), ErrorPanel (1)
  - `orders/page.tsx` — StatusBadge (OrderCard), EmptyState (1), LoadingSpinner (1), ErrorPanel (1)
  - `orders/[id]/page.tsx` — DetailRow (8 usos), StatusBadge (1), LoadingSpinner (1)
  - `profile/page.tsx` — StatusBadge (1), LoadingSpinner (1), eliminados statusColor/statusLabel
  - `wallet/page.tsx` — EmptyState (1), LoadingSpinner (1), ErrorPanel (1)
  - `notifications/page.tsx` — EmptyState (1), LoadingSpinner (1), ErrorPanel (1)
  - `GestorAnalytics.tsx` — LoadingSpinner (1), ErrorPanel (1)
  - `AdminAnalytics.tsx` — LoadingSpinner (1), ErrorPanel (1), EmptyState (1)
- [x] `npm run typecheck && npm run build && npm run test` — ✅ 24 tests, 0 errores

### Verificación
- `grep -r "badge-yellow bg-yellow-100" src/` → solo 1 resultado (en StatusBadge.tsx) ✅
- `grep -r "bg-red-50 dark:bg-red-500/10 border border-red-200" src/` → solo en ErrorPanel.tsx ✅
- `grep -r "function DetailRow" src/` → solo 1 resultado (en DetailRow.tsx) ✅
- Visual: todo se ve igual que antes (mismas clases CSS)

---

## 🟡 FASE 9: OFFLINE FIRST REAL ✅
**Prioridad**: MEDIA | **Tiempo estimado**: 2h | **Depende de**: Fase 2, Fase 3

### Objetivo
Service Worker con precache + runtime cache. Sync automático al reconectar.

### Tareas
- [x] Service Worker v4 (`public/sw.js`):
  - Precache: manifest.json, icons (favicon, 180, 192, 512)
  - Runtime cache: imágenes de Supabase Storage (Cache First, 7 días TTL)
  - API GET cache: Stale-While-Revalidate (30s TTL) para endpoints `/rest/v1/`
  - Navigation: Network First con fallback a cache + página offline HTML
  - Static assets: Cache First (CSS, JS, fonts, images)
  - Background Sync listener: notifica a los clients para sincronizar
  - Cache versioning: `yole-shop-v4`, `yole-assets-v4`, `yole-api-v4`, `yole-images-v4`
  - TTL implementado con header personalizado `sw-cache-date`
- [x] Sincronización automática:
  - `window.addEventListener('online')` → trigger `syncNow()`
  - Background Sync API: SW envía `SYNC_PENDING` message → clients escuchan y sincronizan
  - Fallback: sync on app focus (via refreshState on mount)
- [x] Hook `useSyncEngine` (`src/hooks/useSyncEngine.ts`):
  - Conecta con `createRealSyncEngine()` de sync-engine
  - Auto-sync al reconectar (online event + SW messages)
  - Invalida React Query cache después de sync exitoso
  - Expone: `state`, `pendingCount`, `hasPending`, `enqueue()`, `syncNow()`, `refreshState()`
  - Exportado desde `src/hooks/index.ts`
- [x] Indicador visual de operaciones pendientes:
  - Header: badge naranja con `CloudOff` icon + count (solo visible si hay pendientes)
  - MainLayout: banner naranja "Hay cambios pendientes" con botón "Sincronizar ahora"
  - Banner amarillo offline: se mantiene (sin conexión — los cambios se guardarán localmente)
  - Animaciones con AnimatePresence (aparece/desaparece suavemente)
- [x] Exportar `getDB` desde sync-engine para acceso desde useSyncEngine
- [x] `npm run typecheck && npm run build && npm run test` — ✅ 24 tests, 0 errores

### Estrategia de cache del SW v4
```
Navigation      → Network First, cache fallback (offline page)
Static assets   → Cache First (CSS, JS, fonts, icons)
API GET         → Stale-While-Revalidate (30s TTL)
Storage images  → Cache First (7 days TTL)
Non-GET/API     → Never cached
```

### Verificación
- Crear pedido offline → se encola en IndexedDB → aparece badge naranja en header
- Reconectar → auto-sync → badge desaparece → React Query cache invalidada
- Imágenes de pedidos se cargan desde cache (7 días)
- API responses se sirven desde cache si < 30s, revalidan en background

---

## 🟢 FASE 10: SEGURIDAD AVANZADA ✅
**Prioridad**: BAJA | **Tiempo estimado**: 1.5h | **Depende de**: Fase 5

### Objetivo
Cierre de brechas de seguridad identificadas en la auditoría.

### Tareas
- [x] Rate limiting server-side (trigger SQL):
  - `check_message_rate_limit()` — SECURITY DEFINER, max 10 mensajes/minuto por sender
  - `enforce_message_rate_limit` trigger BEFORE INSERT ON messages
  - Aplicado en AMBOS proyectos (P1 + P2) via Supabase Management API
  - RAISE EXCEPTION si excede el límite → el cliente recibe error de Supabase
- [x] Validación MIME estricta en upload (`orders/new/page.tsx`):
  - Antes: `file.type.startsWith("image/")` → aceptaba SVG, ICO, BMP, etc.
  - Ahora: `ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]` → solo estos 3
  - Rechaza `image/svg+xml` (potencial XSS via SVG)
  - Mensaje de error claro: "Solo JPG, PNG y WebP"
- [x] Sanitización HTML en mensajes (`src/lib/sanitize.ts`):
  - `sanitizeMessage(text)`: escapa `<`, `>`, `&`, `"`, `'`, elimina `on\w+=`, `javascript:`, `data:text/html`
  - `stripHtml(text)`: elimina todas las etiquetas HTML, desescapa entities
  - `containsDangerousContent(text)`: detecta `<script>`, `<iframe>`, `<object>`, `<embed>`, event handlers, javascript: URLs
  - Aplicado en ChatLayout antes de enviar mensajes
  - Mensaje con contenido peligroso → error "El mensaje contiene contenido no permitido"
- [x] CSP (Content Security Policy) en `next.config.ts`:
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-eval' 'unsafe-inline'` (requerido por Next.js)
  - `style-src 'self' 'unsafe-inline'` (requerido por Tailwind)
  - `img-src 'self' data: blob: https://*.supabase.co` (solo imágenes de Supabase)
  - `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.supabase.com`
  - `frame-src 'none'`, `object-src 'none'`, `frame-ancestors 'none'`
  - `form-action 'self'`, `base-uri 'self'`
  - `upgrade-insecure-requests`
- [x] 15 tests de sanitización (4 archivos, 39 tests total)
- [x] `npm run typecheck && npm run build && npm run test` — ✅ 39 tests, 0 errores

### Verificación
- Intentar enviar `<script>alert(1)</script>` en chat → bloqueado por containsDangerousContent
- Intentar subir archivo SVG → rechazado por ALLOWED_MIME_TYPES
- Intentar subir archivo .txt → rechazado por tipo MIME
- Intentar enviar 11 mensajes en 1 minuto → error del servidor (SQL trigger)
- CSP header presente en respuestas HTTP

---

## 🟢 FASE 11: MONITOREO Y ANALYTICS
**Prioridad**: BAJA | **Tiempo estimado**: 1h | **Depende de**: Fase 2

### Objetivo
Logger centralizado, dashboard de errores para admin, métricas de uso.

### Tareas
- [ ] Crear tabla `app_logs` en SQL (ambos proyectos):
  ```sql
  CREATE TABLE app_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id),
    level text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
    event text NOT NULL,
    data jsonb,
    user_agent text,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admin can read logs" ON app_logs FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  ```
- [ ] Ampliar `src/lib/logger.ts`:
  - Buffer de 20 entries
  - Flush a `app_logs` cada 30s o cuando buffer se llena
  - Solo enviar `warn` y `error` en producción
- [ ] Dashboard de errores en admin (`admin/page.tsx`):
  - Tab de "Errores" mostrando últimos 50 logs
  - Filtro por nivel (error, warn)
  - Contador de errores hoy / esta semana
- [ ] Métricas de uso:
  - DAU (Daily Active Users) — query a profiles con `last_sign_in_at`
  - Pedidos/día — query a orders con `created_at > today`
  - Mensajes/día — query a messages
- [ ] `npm run typecheck && npm run build && npm run test`

### Verificación
- Un error en la app → aparece en tabla `app_logs`
- Admin puede ver errores en su dashboard
- Health endpoint muestra métricas actualizadas

---

## 🟢 FASE 12: TESTING Y CI
**Prioridad**: BAJA | **Tiempo estimado**: 2h | **Depende de**: Todas las anteriores

### Objetivo
Cobertura de tests para hooks críticos, flujo E2E, CI robusto.

### Tareas
- [ ] Tests unitarios — hooks:
  - `src/__tests__/useSession.test.ts` — cache hit/miss, TTL, isAdmin
  - `src/__tests__/useSupabaseQuery.test.ts` — staleTime, retry, cache
  - `src/__tests__/useRealtime.test.ts` — subscribe/unsubscribe, visibility
  - `src/__tests__/anti-spam.test.ts` — rate limits, flood detection
- [ ] Tests unitarios — validators (ya existen 14):
  - Agregar tests para `orderInsertSchema`, `payoutRequestSchema`, `profileUpdateSchema`
- [ ] Tests de integración:
  - `src/__tests__/integration/register-to-order.test.ts`
  - Flujo: register → login → crear pedido → verificar dashboard
- [ ] CI mejorado (`.github/workflows/ci.yml`):
  ```yaml
  - name: Lint
    run: npm run lint
  - name: Typecheck
    run: npx tsc --noEmit
  - name: Unit tests
    run: npm run test
  - name: Build
    run: npm run build
  ```
- [ ] `npm run test` — todos los tests pasan

### Verificación
- `npm run test` → 30+ tests pasando
- CI pipeline verde en GitHub

---

## 📊 DEPENDENCIAS ENTRE FASES

```
F0 (Limpieza)
 └── F1 (Hooks unificados)
      ├── F2 (React Query)
      │    ├── F3 (Realtime Manager)
      │    │    └── F5 (Chat rediseño)
      │    │         └── F10 (Seguridad)
      │    ├── F4 (SQL optimizado)
      │    ├── F6 (Render optimizado)
      │    ├── F7 (Paginación)
      │    └── F9 (Offline First)
      └── F8 (Componentes compartidos)
      └── F11 (Monitoreo)
 └── F12 (Testing) — depende de todas
```

## 📊 CRONOGRAMA SUGERIDO

```
Semana 1:
  Día 1: F0 (30min) + F1 (1h) + F2 inicio (2h)
  Día 2: F2 final + F3 (1.5h) + F4 (1h)

Semana 2:
  Día 3: F5A - SQL chat (1h)
  Día 4: F5B - Componentes chat (2h)
  Día 5: F5C - Integración chat (1h) + F6 (2h)

Semana 3:
  Día 6: F7 (1.5h) + F8 (1h)
  Día 7: F9 (2h) + F10 (1.5h)

Semana 4:
  Día 8: F11 (1h) + F12 (2h)
```

## ⚠️ RIESGOS Y MITIGACIÓN

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| React Query rompe algo | Media | Alto | Feature flags, rollback fácil con git |
| Chat rediseño complejo | Alta | Medio | Iterativo: privado primero → global después |
| Índices SQL lockean tablas | Baja | Alto | `CREATE INDEX CONCURRENTLY` en producción |
| Offline cache inconsistente | Media | Medio | TTL corto + invalidación manual |
| Realtime dinámico pierde msgs | Baja | Alto | Cola IndexedDB como fallback |
| Migración mensajes a conversations | Media | Alto | Script SQL con transacción + backup previo |

## 🎯 CHECKPOINT POR FASE

Cada fase DEBE cumplir antes de avanzar:

```bash
npm run typecheck   # 0 errores
npm run test        # todos pasan
npm run build       # compila sin errores
git push            # deploy automático a Vercel
# Verificar en producción que la app funciona
```

---

**FIN DEL PLAN** — 13 fases, ~20h de trabajo, de código muerto a arquitectura SaaS.
