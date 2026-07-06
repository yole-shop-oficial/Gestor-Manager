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

## 🟡 FASE 6: OPTIMIZACIÓN DE RENDER
**Prioridad**: MEDIA | **Tiempo estimado**: 2h | **Depende de**: Fase 2

### Objetivo
Eliminar re-renderizados innecesarios, memoizar componentes, reducir repaints.

### Tareas
- [ ] `React.memo` en componentes puros:
  - `StatCard` (GestorDashboard)
  - `QuickAction` (GestorDashboard)
  - `AdminStat` (Admin)
  - `FilterChip` (Orders)
  - `OrderCard` (Orders)
  - `ProfileRow` (Profile)
  - `DetailRow` (OrderDetail)
- [ ] `useMemo` en cálculos:
  - Analytics calculations (GestorAnalytics, AdminAnalytics)
  - Wallet balance sum
  - Filtered order lists
- [ ] Eliminar animación infinita del dot del Header:
  - Cambiar `animate-pulse` por estado estático
  - O usar CSS `animation-iteration-count: 3` y parar
- [ ] Optimizar FloatingToolKit drag:
  - Usar `useMotionValue` + `useTransform` en lugar de state para position
  - Evitar re-render en cada pointermove
- [ ] `npm run typecheck && npm run build && npm run test`

### Verificación
- React DevTools Profiler: menos renders al interactuar
- Header dot no causa repaints constantes
- Drag del FloatingToolKit no causa lag

---

## 🟡 FASE 7: PAGINACIÓN UNIVERSAL
**Prioridad**: MEDIA | **Tiempo estimado**: 1.5h | **Depende de**: Fase 2

### Objetivo
Todas las listas usan paginación real con cursor, no `limit: 500`.

### Tareas
- [ ] Orders (`orders/page.tsx`):
  - `useInfiniteQuery` con cursor (`created_at` + `id`)
  - Infinite scroll: cargar 20 más al llegar al final
  - Indicador de carga mientras fetch
- [ ] Admin gestores list:
  - Paginación 20 por página
  - Botones "Anterior" / "Siguiente"
- [ ] Wallet entries:
  - Paginación 15 por página
  - Load more button
- [ ] Chat mensajes:
  - Cursor pagination (30 inicial)
  - Scroll up = cargar 30 más
- [ ] Notifications:
  - Paginación 20 por scroll
- [ ] `npm run typecheck && npm run build && npm run test`

### Verificación
- Orders: Network tab muestra queries de 20 en 20
- Admin: no carga 500 registros de golpe
- Chat: scroll up carga más mensajes sin saltar

---

## 🟡 FASE 8: COMPONENTES COMPARTIDOS
**Prioridad**: MEDIA | **Tiempo estimado**: 1h | **Depende de**: Fase 1

### Objetivo
Extraer componentes duplicados a `src/components/shared/`.

### Tareas
- [ ] Crear `src/components/shared/StatusBadge.tsx` (usado en 3 archivos)
  ```typescript
  interface StatusBadgeProps {
    status: "pending" | "active" | "denied" | "blocked" | "confirmed" | "sold" | "cancelled" | "approved" | "paid" | "rejected";
    size?: "sm" | "md";
  }
  ```
- [ ] Crear `src/components/shared/DetailRow.tsx` (usado en 2 archivos)
- [ ] Crear `src/components/shared/DiagnosticPanel.tsx` (usado en 3 archivos)
- [ ] Crear `src/components/shared/EmptyState.tsx` (usado en 6+ archivos)
- [ ] Crear `src/components/shared/LoadingSpinner.tsx` (usado en 10+ archivos)
- [ ] Crear `src/components/shared/index.ts` (barrel export)
- [ ] Reemplazar todas las ocurrencias duplicadas
- [ ] `npm run typecheck && npm run build && npm run test`

### Verificación
- `grep -r "text-\[10px\].*font-bold.*Pendiente" src/` → solo 1 resultado (en StatusBadge)
- Visual: todo se ve igual que antes

---

## 🟡 FASE 9: OFFLINE FIRST REAL
**Prioridad**: MEDIA | **Tiempo estimado**: 2h | **Depende de**: Fase 2, Fase 3

### Objetivo
Service Worker con precache + runtime cache. Sync automático al reconectar.

### Tareas
- [ ] Service Worker v4 (`public/sw.js`):
  - Precache: HTML shell, CSS, JS core
  - Runtime cache: imágenes de Supabase Storage (Stale-While-Revalidate)
  - Cache API responses (GET) con TTL
  - Versionado: `CACHE-v2.0-{timestamp}`
- [ ] Sincronización automática:
  - `window.addEventListener('online', syncPending)`
  - Background Sync API (si disponible)
  - Fallback: sync on app focus
- [ ] Indicador visual de operaciones pendientes:
  - Badge en BottomNav o Header mostrando "3 pendientes"
  - Lista de operaciones en cola (sync-engine)
- [ ] Conflict resolution básico:
  - Last-write-wins para update operations
  - Para create: agregar `_offline: true` flag
- [ ] Cache de imágenes de pedidos:
  - Al crear pedido offline, guardar imagen en IndexedDB
  - Al reconectar, subir a Storage y actualizar URL
- [ ] `npm run typecheck && npm run build && npm run test`

### Verificación
- Crear pedido offline → aparece en lista con badge "pendiente"
- Reconectar → pedido se sube automáticamente
- Imagen se sube a Storage y se actualiza la URL

---

## 🟢 FASE 10: SEGURIDAD AVANZADA
**Prioridad**: BAJA | **Tiempo estimado**: 1.5h | **Depende de**: Fase 5

### Objetivo
Cierre de brechas de seguridad identificadas en la auditoría.

### Tareas
- [ ] Rate limiting en chat (lado cliente):
  - Integrar `checkRateLimit` en ChatComposer
  - Key: `chat:{userId}`, max 6/min, cooldown toast
- [ ] Rate limiting server-side (trigger SQL):
  ```sql
  CREATE OR REPLACE FUNCTION check_message_rate_limit()
  RETURNS TRIGGER AS $$
  DECLARE
    recent_count int;
  BEGIN
    SELECT count(*) INTO recent_count
    FROM messages
    WHERE sender_id = NEW.sender_id
      AND created_at > now() - interval '1 minute';
    IF recent_count >= 10 THEN
      RAISE EXCEPTION 'Rate limit exceeded: máximo 10 mensajes por minuto';
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  CREATE TRIGGER enforce_message_rate_limit
    BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION check_message_rate_limit();
  ```
- [ ] Validación MIME en upload (`imageProcessor.ts`):
  - Verificar `file.type` empieza con `image/`
  - Rechazar `image/svg+xml` (potencial XSS)
  - Solo aceptar: `image/jpeg`, `image/png`, `image/webp`
- [ ] Sanitización HTML en mensajes:
  - Crear `src/lib/sanitize.ts`:
    ```typescript
    export function sanitizeMessage(text: string): string {
      return text
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/on\w+=/gi, "")
        .replace(/javascript:/gi, "")
        .trim();
    }
    ```
  - Aplicar en ChatComposer antes de enviar
- [ ] Revisar política `notifications_insert_system`:
  - Cambiar `CHECK(true)` por `CHECK(auth.uid() IS NOT NULL)`
- [ ] CSP más estricta en `next.config.ts`:
  - Agregar `Content-Security-Policy` header con directivas
- [ ] `npm run typecheck && npm run build && npm run test`

### Verificación
- Intentar enviar 11 mensajes en 1 minuto → error del servidor
- Intentar subir archivo .txt → rechazado por tipo MIME
- Enviar mensaje con `<script>alert(1)</script>` → sanitizado

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
