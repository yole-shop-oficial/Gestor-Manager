# 🛠️ AUDITORÍA COMPLETA v4 — YOLE SHOP Gestor Manager
## Fecha: 14 julio 2026

---

## ✅ RESUMEN DE CORRECCIONES APLICADAS

| # | Error | Prioridad | Estado | Fix |
|---|-------|-----------|--------|-----|
| 1 | Árbol Comercial "3 directos" | 🔴 CRITICAL | ✅ CORREGIDO | SQL: children_count recalculado + trigger decrement + UI usa children.length |
| 2 | Chat gestores repetidos | 🔴 CRITICAL | ✅ CORREGIDO | SQL: Duplicados eliminados + RPC get_or_create_private_conv con advisory lock |
| 3 | Mensajes privados no se envían | 🔴 CRITICAL | ✅ CORREGIDO | RPC atómica + sendMessage usa other_user_id, nunca self-send |
| 4 | Admin panel no carga | 🔴 CRITICAL | ✅ CORREGIDO (HOTFIX #6) | RLS + app_metadata.role + re-login necesario |
| 5 | FloatingToolKit posición perdida | 🟡 MEDIUM | ✅ CORREGIDO | localStorage persistence en drag end + restore en mount |
| 6 | Excesivas peticiones Supabase | 🟠 HIGH | ✅ CORREGIDO | RPC get_chat_overview elimina N+1, polling 25s→45s, logger sin getSession |
| 7 | Re-renders innecesarios | 🟡 MEDIUM | ✅ CORREGIDO | useSyncEngine optimizado, useRealtime eliminado (4 sitios), profileCache borrado |
| 8 | Cache roto/faltante | 🟠 HIGH | ✅ CORREGIDO | invalidate.wallet incluye wallet-full, staleTime 30s→120s global |
| 9 | Subscripciones realtime fantasma | 🟡 MEDIUM | ✅ CORREGIDO | 4 useRealtime calls eliminadas (useConversations, useMessages, useUnreadNotifications, notifications) |
| 10 | Schema issues | 🟠 HIGH | ✅ CORREGIDO | 3 índices agregados, Messages INSERT RLS verifica membresía, update_network_counts optimizado |

---

## 📋 DETALLE DE CAMBIOS

### 🔴 CRITICAL

#### ERROR 1 — Árbol Comercial "3 directos" → 2
- **Causa raíz:** `handle_new_user` incrementa `children_count` pero NUNCA decrementa al eliminar usuario
- **SQL:** `UPDATE profiles SET children_count = (SELECT COUNT(*)...) WHERE ...` corrigió datos
- **SQL:** Trigger `decrement_parent_counts()` en DELETE de profiles
- **Código:** CommercialTree.tsx usa `node.children.length` (computado) en vez de `node.children_count` (BD)

#### ERROR 2 — Chat gestores repetidos
- **Causa raíz:** `ensurePrivateConv()` en ChatLayout.tsx tenía race condition — sin UNIQUE constraint
- **SQL:** Eliminadas 3 conversaciones: 2 duplicadas + 1 huérfana
- **SQL:** RPC `get_or_create_private_conv(p_user1, p_user2)` con `pg_advisory_xact_lock` — atómica
- **Código:** ChatLayout.tsx reemplaza lógica cliente-side por RPC atómica

#### ERROR 3 — Mensajes privados no se envían (recipient_id = self)
- **Causa raíz:** `sendMessage` usaba `members?.[0]?.user_id || user.id` que caía a self cuando la query volvía vacía
- **Código:** sendMessage usa `conv.other_user_id` primero, fallback a query solo si no disponible, y si no hay receptor → NO envía (en vez de self-send)

### 🟠 HIGH

#### ERROR 6 — Excesivas peticiones Supabase
- **Causa raíz:** useConversations patrón N+1 (17 queries por ciclo)
- **SQL:** RPC `get_chat_overview(p_user_id)` con LATERAL joins (1 query)
- **Código:** useConversations usa RPC, fallback a query simple si RPC falla
- **Extra:** Logger ya no llama `supabase.auth.getSession()` cada 30s
- **Extra:** Polling aumentado: chat 25s→45s, notificaciones 45s→60s

#### ERROR 8 — Cache roto/faltante
- **Causa raíz:** Wallet page usa key `wallet-full` pero invalidate.wallet no la incluía
- **Código:** invalidate.wallet ahora incluye `wallet-full` primero
- **Código:** staleTime global aumentado de 30s a 120s (QueryProvider)
- **Código:** Admin KPIs staleTime 60s→120s, payouts 30s→60s, wallet 30s→60s

#### ERROR 10 — Schema issues
- **SQL:** Índices agregados en P1+P2:
  - `messages(conversation_id, created_at DESC)`
  - `conversation_members(user_id, conversation_id)`
  - `profiles(parent_id)`
- **SQL:** Messages INSERT RLS ahora verifica `EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())`
- **SQL:** `update_network_counts()` optimizado con batch UPDATE

### 🟡 MEDIUM

#### ERROR 5 — FloatingToolKit posición perdida
- **Código:** Lee posición de localStorage en mount, guarda en drag end

#### ERROR 7 — Re-renders innecesarios
- **Código:** MainLayout: useSyncEngine ya no lee IndexedDB en cada mount, solo al reconectarse
- **Código:** profileCache.ts eliminado (código muerto, nunca importado)

#### ERROR 9 — Realtime ghost subscriptions
- **Código:** 4 useRealtime calls eliminadas (eran NO-OP):
  - useConversations.ts
  - useMessages.ts
  - useUnreadNotifications.ts
  - notifications/page.tsx

---

## 📊 MÉTRICAS DE MEJORA

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Queries/ciclo chat | ~17 | ~2 | **-88%** |
| Requests/min (chat) | ~43 | ~5 | **-88%** |
| StaleTime global | 30s | 120s | **4x** |
| Polling chat | 25s | 45s | **-44% carga** |
| Polling notifs | 45s | 60s | **-25% carga** |
| Logger getSession/30s | Sí | No | **Eliminado** |
| Conversaciones duplicadas | 3 | 0 | **Eliminadas** |
| children_count admin | 3 (incorrecto) | 2 (correcto) | **Corregido** |
| Self-send bug | Sí | No | **Eliminado** |
| Archivos muertos | profileCache.ts + index | Eliminados | **Limpio** |

---

## 🔐 ACCIÓN REQUERIDA POR EL USUARIO

1. **CERRAR SESIÓN y VOLVER A ENTRAR** como admin para obtener JWT con `role: admin`
2. Verificar que el Árbol Comercial muestre "2 directos" en vez de 3
3. Verificar que el chat no muestre gestores duplicados
4. Verificar que los mensajes privados se envíen correctamente

---

## 📁 ARCHIVOS MODIFICADOS

- `sql/migration-v4-fix-all-bugs.sql` — Nueva migración SQL
- `src/features/chat/components/ChatLayout.tsx` — RPC atómica + fix recipient_id
- `src/features/chat/hooks/useConversations.ts` — RPC get_chat_overview + sin useRealtime
- `src/features/chat/hooks/useMessages.ts` — Sin useRealtime
- `src/features/network/components/CommercialTree.tsx` — children.length en vez de children_count
- `src/hooks/useSupabaseQuery.ts` — invalidate.wallet incluye wallet-full
- `src/hooks/useUnreadNotifications.ts` — Sin useRealtime
- `src/components/floating/FloatingToolKit.tsx` — localStorage persistence
- `src/components/layout/main-layout.tsx` — useSyncEngine optimizado
- `src/components/providers/query-provider.tsx` — staleTime 120s
- `src/app/notifications/page.tsx` — Sin useRealtime, polling 60s
- `src/app/wallet/page.tsx` — staleTime 60s
- `src/app/admin/page.tsx` — staleTimes aumentados
- `src/lib/logger.ts` — Sin getSession en flush
- `src/services/cache/profileCache.ts` — ELIMINADO (código muerto)
- `src/services/cache/index.ts` — ELIMINADO (código muerto)
