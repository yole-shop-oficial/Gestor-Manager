# 🔍 AUDITORÍA COMPLETA — YOLE SHOP v2.0
**Fecha:** 14 julio 2026  
**Auditor:** Arquitecto Senior Next.js + Supabase  
**Alcance:** 99 archivos src/, 2 proyectos Supabase, 14 tablas, 87 queries

---

## ÍNDICE

1. [ERROR 1 — Árbol Comercial muestra "3 directos" cuando hay solo 2 gestores](#error-1)
2. [ERROR 2 — Chat muestra gestores repetidos (Janny x2, Merlyn x2)](#error-2)
3. [ERROR 3 — Mensajes privados NO se envían correctamente](#error-3)
4. [ERROR 4 — Panel Admin no carga datos](#error-4)
5. [ERROR 5 — Botón flotante pierde posición al cambiar pantalla](#error-5)
6. [ERROR 6 — Consultas innecesarias a Supabase](#error-6)
7. [ERROR 7 — Renderizados innecesarios](#error-7)
8. [ERROR 8 — Cache inexistente o mal implementado](#error-8)
9. [ERROR 9 — Realtime: suscripciones y listeners](#error-9)
10. [ERROR 10 — Supabase: tablas, índices, RLS, funciones](#error-10)
11. [Diagrama de flujo de datos](#diagrama)
12. [Plan de reparación por prioridad](#plan)

---

<a id="error-1"></a>
## ❌ ERROR 1 — Árbol Comercial muestra "3 directos" cuando hay solo 2 gestores

### Descripción
El admin tiene 2 gestores hijos (Janny y Merlyn), pero la UI muestra "3 directos". Esto ocurre en el CommercialTree y en el perfil del admin.

### Qué lo produce
El campo `children_count` en la tabla `profiles` tiene valor **3** cuando el conteo real de hijos (`WHERE parent_id = admin_id`) es **2**.

### Dónde ocurre
- **BD (P1):** `profiles.children_count = 3` para el admin `715414ad...`
- **UI:** `CommercialTree.tsx` línea 351: `{node.children_count > 0 && ' · ${node.children_count} directos'}`
- **UI:** `profile/page.tsx` línea que muestra "Directos" desde `profile.children_count`

### Qué archivos participan
| Archivo | Rol |
|---------|-----|
| `sql/project1-full-schema.sql` | Define el trigger `handle_new_user` que hace `children_count + 1` |
| `src/features/network/components/CommercialTree.tsx` | Lee `children_count` del DB y lo muestra |
| `src/app/profile/page.tsx` | Muestra `childrenCount` del profile |
| `src/app/admin/page.tsx` | Muestra datos del admin |

### Qué tablas participan
- `public.profiles` — campo `children_count` (incorrecto: 3, real: 2)

### Qué consultas participan
```sql
-- La que muestra el dato incorrecto:
SELECT children_count FROM profiles WHERE id = '715414ad...';  -- Returns 3

-- La que muestra el dato correcto:
SELECT count(*) FROM profiles WHERE parent_id = '715414ad...';  -- Returns 2
```

### Cómo solucionarlo
**CAUSA RAÍZ:** El trigger `handle_new_user` incrementa `children_count` en cada registro, pero NUNCA lo decrementa cuando un usuario es eliminado o su `parent_id` cambia. Además, la función `update_network_counts()` no se ejecuta automáticamente.

**SOLUCIÓN:**
1. Crear función SQL `recalculate_children_count()` que haga `UPDATE profiles SET children_count = (SELECT count(*) FROM profiles p2 WHERE p2.parent_id = profiles.id)`
2. Ejecutarla AHORA para corregir el dato
3. Agregar trigger `AFTER DELETE ON profiles` que decremente `children_count` del padre
4. Reemplazar la lectura de `children_count` en el frontend por una subconsulta real o por una función `get_children_count(p_user_id)` que sea SECURITY DEFINER

### Impacto
**ALTO** — Muestra datos incorrectos al admin en todas las vistas de red

---

<a id="error-2"></a>
## ❌ ERROR 2 — Chat muestra gestores repetidos (Janny x2, Merlyn x2)

### Descripción
En el sidebar del chat, cada gestor aparece 2 veces. Janny aparece 2 veces y Merlyn aparece 2 veces.

### Qué lo produce
Existen **conversaciones privadas duplicadas** en la BD. Cada gestor tiene 2 conversaciones privadas separadas con el admin.

### Dónde ocurre
- **BD (P1):** La tabla `conversations` tiene 4 conversaciones privadas cuando debería tener solo 2:
  - Janny: conv `d7f7ab53` Y conv `3e4929ff` (DUPLICADA)
  - Merlyn: conv `67902db9` Y conv `0ddc07fa` (DUPLICADA)
  - Orphan: conv `48617dae` (solo 1 miembro — admin solo)
- **UI:** `ChatSidebar.tsx` línea 34: `gestorConvs = conversations.filter(c => c.other_user_role === 'gestor')` — devuelve TODAS las conversaciones privadas con gestores, incluyendo duplicadas

### Qué archivos participan
| Archivo | Rol |
|---------|-----|
| `src/features/chat/components/ChatLayout.tsx` | `ensurePrivateConv()` crea conversaciones SIN verificar si ya existe una |
| `src/features/chat/components/ChatSidebar.tsx` | Filtra `gestorConvs` sin deduplicar por `other_user_id` |
| `src/features/chat/hooks/useConversations.ts` | Retorna conversaciones sin deduplicar |

### Qué tablas participan
- `public.conversations` — contiene duplicados
- `public.conversation_members` — membresías duplicadas

### Qué consultas participan
```sql
-- El ChatLayout busca conversación existente pero el check es racy:
SELECT conversation_id FROM conversation_members WHERE user_id = :me;
-- Luego para cada membership:
SELECT conversation_id FROM conversation_members WHERE conversation_id = :convId AND user_id = :target;
```

### Cómo solucionarlo
**CAUSA RAÍZ:** La función `ensurePrivateConv()` en ChatLayout tiene una condición de carrera. Si se llama 2 veces rápidamente (ej: doble-click en contacto), crea 2 conversaciones porque la segunda llamada no encuentra la primera (aún no se ha insertado).

**SOLUCIÓN:**
1. **BD:** Crear constraint UNIQUE parcial: solo una conversación privada por par de usuarios
2. **BD:** Eliminar conversaciones duplicadas y el orphan
3. **Frontend:** En `ensurePrivateConv()`, usar una query directa en vez de iterar memberships:
   ```sql
   SELECT c.id FROM conversations c
   JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = :me
   JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = :target
   WHERE c.type = 'private'
   LIMIT 1;
   ```
4. **Frontend:** En ChatSidebar, deduplicar `gestorConvs` por `other_user_id` como defensa

### Impacto
**CRÍTICO** — Los mensajes se dividen entre 2 conversaciones, causando confusión y datos fragmentados

---

<a id="error-3"></a>
## ❌ ERROR 3 — Mensajes privados NO se envían correctamente

### Descripción
El Chat Global funciona, pero los mensajes privados no llegan al destinatario. El botón enviar parece funcionar pero el mensaje no aparece para el otro usuario.

### Qué lo produce
**Dos problemas combinados:**

1. **`recipient_id` incorrecto:** En las conversaciones duplicadas (3e4929ff, 0ddc07fa), los mensajes tienen `recipient_id = sender_id` (admin se envía a sí mismo). Esto ocurre porque el `ensurePrivateConv` crea la conversación y agrega miembros, pero cuando se envía el primer mensaje, la query que busca el otro miembro (`conversation_members WHERE user_id != me`) puede fallar o devolver vacío si la inserción de miembros aún no se ha propagado.

2. **RLS en conversation_members INSERT:** La política `cm_insert_all` permite insertar si `user_id = auth.uid()`, si el usuario creó la conversación, o si es admin. Pero cuando el admin crea una conversación y agrega al gestor como miembro, la inserción del gestor usa `user_id = gestor_id`, que NO es `auth.uid()`. Esto funciona SOLO si el admin es `created_by` de la conversación. Revisando la política:
   ```
   WITH CHECK (user_id = auth.uid() 
     OR EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_members.conversation_id AND c.created_by = auth.uid())
     OR current_user_is_admin())
   ```
   Esto debería funcionar para el admin. Pero si `current_user_is_admin()` devuelve `false` (JWT sin role), la inserción del otro miembro falla silenciosamente.

### Dónde ocurre
- **ChatLayout.tsx** líneas ~155-175 (lógica de envío)
- **BD:** Tabla `messages` con `recipient_id` incorrecto

### Qué archivos participan
| Archivo | Rol |
|---------|-----|
| `src/features/chat/components/ChatLayout.tsx` | `sendMessage()` — obtiene recipient y envía |
| `src/features/chat/components/ChatLayout.tsx` | `ensurePrivateConv()` — crea conv y agrega miembros |
| `src/features/chat/hooks/useConversations.ts` | Lee conversaciones |
| `src/features/chat/hooks/useMessages.ts` | Lee mensajes |

### Qué tablas participan
- `public.messages` — `recipient_id` incorrecto
- `public.conversations` — conversaciones duplicadas
- `public.conversation_members` — membresías
- `auth.users` — `app_metadata.role` (JWT claims)

### Qué consultas participan
```javascript
// ChatLayout sendMessage — obtiene recipient:
const { data: members } = await supabase
  .from("conversation_members").select("user_id")
  .eq("conversation_id", activeConvId).neq("user_id", user.id).limit(1);
insertData.recipient_id = members?.[0]?.user_id || user.id;
// Si members está vacío, recipient_id = user.id (SELF!)
```

### Cómo solucionarlo
**CAUSA RAÍZ:** Combinación de (a) conversaciones duplicadas que causan que el usuario abra la conversación "equivocada", y (b) fallback a `user.id` cuando no se encuentra el otro miembro.

**SOLUCIÓN:**
1. Eliminar conversaciones duplicadas de la BD
2. Agregar constraint UNIQUE para prevenir duplicados
3. En `sendMessage()`, si no se encuentra el otro miembro, NO enviar — mostrar error
4. En `ensurePrivateConv()`, usar query JOIN en vez de iteración N+1
5. Verificar que `app_metadata.role = 'admin'` esté en el JWT (ya corregido en P1)

### Impacto
**CRÍTICO** — Funcionalidad central de chat rota

---

<a id="error-4"></a>
## ❌ ERROR 4 — Panel Admin no carga datos

### Descripción
El panel de admin no muestra gestores, KPIs, ni datos de payouts.

### Qué lo produce
**Ya parcialmente corregido.** Las causas eran:

1. **RLS recursiva (FIXED):** Las políticas en `app_logs`, `conversation_members`, `message_reactions` hacían `SELECT FROM profiles WHERE role='admin'`, lo que disparaba la RLS de `profiles` que usa `current_user_is_admin()`, causando recursión infinita → HTTP 500 en TODAS las queries.

2. **JWT sin `app_metadata.role` (FIXED):** El usuario admin NO tenía `app_metadata.role = 'admin'` en su JWT, por lo que `current_user_is_admin()` siempre devolvía `false`, bloqueando todas las políticas admin.

3. **`profiles_select_all` muy restrictiva (FIXED):** Solo el admin podía ver todos los perfiles; los gestores no podían ver a otros gestores (necesario para chat).

### Dónde ocurre
- **BD:** Políticas RLS (corregido)
- **auth.users:** `app_metadata.role` (corregido)
- **Frontend:** El admin debe CERRAR SESIÓN y volver a entrar para obtener un JWT nuevo con `role: admin`

### Qué archivos participan
| Archivo | Rol |
|---------|-----|
| `src/app/admin/page.tsx` | Panel admin — hace queries que fallaban |
| `src/services/supabase/connectivity.ts` | Verificación de conexión |
| `src/hooks/useSession.tsx` | Obtiene perfil y role |

### Cómo solucionarlo
**PENDIENTE:** El admin debe hacer LOGOUT y LOGIN de nuevo. El JWT anterior no tiene `app_metadata.role = 'admin'`. El nuevo JWT sí lo tendrá.

### Impacto
**CRÍTICO** (ya corregido en BD, pendiente re-login del admin)

---

<a id="error-5"></a>
## ❌ ERROR 5 — Botón flotante pierde posición al cambiar pantalla

### Descripción
El FloatingToolKit se puede arrastrar, pero al navegar a otra página, vuelve a la posición original (abajo-derecha).

### Qué lo produce
La posición se almacena en `useMotionValue` de Framer Motion, que es un valor en memoria que **se reinicializa** cada vez que el componente se desmonta y remonta (cambio de ruta = desmontaje + montaje).

### Dónde ocurre
- `FloatingToolKit.tsx` líneas 43-44:
  ```tsx
  const posX = useMotionValue(16);
  const posY = useMotionValue(16);
  ```
  Estos valores se inicializan SIEMPRE en (16, 16) al montar el componente.

### Qué archivos participan
| Archivo | Rol |
|---------|-----|
| `src/components/floating/FloatingToolKit.tsx` | Componente del botón flotante |
| `src/components/layout/main-layout.tsx` | Monta FloatingToolKit en cada página |

### Cómo solucionarlo
**CAUSA RAÍZ:** Los `useMotionValue` no persisten entre montajes.

**SOLUCIÓN:**
1. Guardar posición en `localStorage` al soltar el botón (onPointerUp)
2. Leer de `localStorage` al inicializar los MotionValues
3. Key de localStorage: `yole_floating_pos` con valor `{x: number, y: number}`
4. Inicializar con: `const saved = JSON.parse(localStorage.getItem('yole_floating_pos') || '{}');`
5. `const posX = useMotionValue(saved.x ?? 16);`
6. `const posY = useMotionValue(saved.y ?? 16);`
7. En `handlePointerUp`, guardar: `localStorage.setItem('yole_floating_pos', JSON.stringify({x: posX.get(), y: posY.get()}))`

### Impacto
**MEDIO** — UX frustrante pero no bloquea funcionalidad

---

<a id="error-6"></a>
## ❌ ERROR 6 — Consultas innecesarias a Supabase

### Descripción
La aplicación hace demasiadas requests a Supabase, consumiendo el límite del plan Free (500K requests/mes, 500MB bandwidth).

### Análisis detallado

#### Requests por carga de página (Admin):

| Componente | Queries | Frecuencia |
|------------|---------|------------|
| `useSession` | 1 (profile) | Una vez al login |
| `get_admin_dashboard` RPC | 1 | staleTime 60s |
| profiles (gestores list) | 1 | staleTime 60s |
| payout_requests | 1 + 1 (managers) | staleTime 30s |
| AdminAnalytics: orders | 1 | staleTime 120s |
| AdminAnalytics: profiles | 1 | **DUPLICADO** con gestores list |
| AdminAnalytics: wallet_entries | 1 | staleTime 120s |
| AdminAnalytics: payout_requests | 1 | **DUPLICADO** con payouts |
| get_usage_metrics RPC | 1 | staleTime 60s |
| app_logs | 1 | staleTime 30s |
| CommercialTree: profiles | 1 | **DUPLICADO** 3ra vez |
| CommercialTree: get_network_stats RPC | 1 | staleTime 60s |
| useConversations (chat preload) | 3-15 | **N+1** cada 25s polling |
| useUnreadNotifications | 1 | staleTime 60s |
| logger flush | 1 (getSession) + 1 (insert) | Cada 30s |
| connectivity check | 2 (P1 + P2) | Al cargar la app |

**TOTAL: ~20-30 requests al cargar Admin, +5-15 cada 25s por chat polling**

#### Patrones N+1 (CRÍTICO):

**useConversations** (cada 25 segundos):
1. `SELECT * FROM profiles WHERE role = 'admin'` (o get_descendants)
2. `SELECT * FROM conversation_members WHERE user_id = :me`
3. `SELECT * FROM conversations WHERE id IN (...)`
4. **POR CADA conversación** (N+1):
   - `SELECT count FROM messages WHERE conversation_id = :id` (count)
   - `SELECT user_id FROM conversation_members WHERE conversation_id = :id AND user_id != :me`
   - `SELECT * FROM profiles WHERE id = :otherUserId`
5. Con 5 conversaciones = 5 + 5 + 5 = **15 sub-queries adicionales**

**TOTAL useConversations por ciclo: ~18 requests × (60s/25s) = ~43 requests/minuto**

#### Consultas duplicadas (mismos datos, queries separadas):

| Dato | Query 1 | Query 2 | Query 3 |
|------|---------|---------|---------|
| `profiles` (todos) | admin gestores list | AdminAnalytics | CommercialTree |
| `payout_requests` | admin payouts | AdminAnalytics | — |
| `orders` (gestor) | GestorDashboard RPC | GestorAnalytics | orders page |
| `wallet_entries` (gestor) | GestorDashboard RPC | GestorAnalytics | wallet page |

### Cómo solucionarlo
1. **Eliminar N+1 en useConversations:** Crear RPC `get_chat_overview(p_user_id)` que devuelva todo en 1 query
2. **Compartir datos entre componentes:** Usar React Query con la misma key para mismo dato
3. **Reducir polling:** Chat de 25s → 60s, notificaciones de 45s → 120s
4. **Eliminar logger.getSession():** No llamar `auth.getSession()` en cada flush
5. **Crear RPCs compuestas:** `get_admin_full_data()` que devuelva KPIs + gestores + payouts en 1 call
6. **Aumentar staleTime:** KPIs de 30-60s → 120s, analytics de 120s → 300s

### Impacto
**ALTO** — Puede agotar el límite del plan Free en días

---

<a id="error-7"></a>
## ❌ ERROR 7 — Renderizados innecesarios

### Descripción
Varios componentes se re-renderizan más de lo necesario.

### Problemas encontrados

1. **useSyncEngine en MainLayout:** `useSyncEngine()` se ejecuta en CADA página porque `MainLayout` envuelve todo. Esto crea una instancia del sync engine + listeners de online/offline + lectura de IndexedDB en CADA render.

2. **useUnreadNotifications en Header:** Se ejecuta siempre, haciendo una query a `notifications` en cada montaje.

3. **useConversations polling:** El `setInterval` de 25s invalida queries que causan re-render de todo el árbol de chat.

4. **Framer Motion en listas:** Cada item de lista usa `motion.div` con `initial/animate`, causando animaciones repetidas al re-render.

5. **now state en notifications:** `useState(() => Date.now())` + `setInterval(() => setNow(Date.now()), 60000)` causa re-render cada 60s de TODA la lista de notificaciones.

6. **Doble profile fetch:** `useSession` tiene su propio profile cache (module-level Map), y existe `profileCache.ts` en services/cache que NADIE USA. Dos sistemas de cache separados para lo mismo.

### Qué archivos participan
| Archivo | Problema |
|---------|----------|
| `src/components/layout/main-layout.tsx` | useSyncEngine en cada página |
| `src/hooks/useUnreadNotifications.ts` | Query siempre activa |
| `src/features/chat/hooks/useConversations.ts` | Polling cada 25s |
| `src/app/notifications/page.tsx` | `setNow` cada 60s |
| `src/hooks/useSession.tsx` | Profile cache duplicado con profileCache.ts |
| `src/services/cache/profileCache.ts` | **NO SE USA EN NINGÚN LADO** |

### Cómo solucionarlo
1. Mover `useSyncEngine` a un contexto global (no por página)
2. Aumentar polling intervals
3. Eliminar `profileCache.ts` (no se usa) y consolidar con el cache de useSession
4. Memoizar componentes de lista con `React.memo`
5. Reemplazar `setNow` por `useMemo` con timestamp relativo

### Impacto
**MEDIO** — Degradación de rendimiento, especialmente en móviles

---

<a id="error-8"></a>
## ❌ ERROR 8 — Cache inexistente o mal implementado

### Descripción
No existe un sistema de cache coherente. Hay fragmentos pero no se usan.

### Estado actual del cache

| Sistema | Ubicación | Se usa? | Problema |
|---------|-----------|---------|----------|
| React Query | `query-provider.tsx` | ✅ Sí | staleTime 30s por defecto es muy bajo |
| Profile cache (useSession) | `useSession.tsx` (module-level Map) | ✅ Sí | Solo para el perfil del usuario actual |
| Profile cache (services) | `services/cache/profileCache.ts` | ❌ NO | Existe pero NADIE lo importa/usa |
| Connectivity cache | `connectivity.ts` → localStorage | ✅ Sí | OK, 24h TTL |
| IndexedDB (sync) | `sync-engine.ts` | ✅ Sí | Solo para offline, no para lectura |
| IndexedDB (profiles) | `sync-engine.ts` → `cached_profiles` store | ❌ NO | El store existe pero solo profileCache.ts lo usa, que a su vez no se usa |
| Client factory cache | `clientFactory.ts` → Map | ✅ Sí | OK, singleton por storageKey |

### Qué falta
- **Cache de profiles para chat/red:** Se consulta `profiles` 3-4 veces en la página admin
- **Cache de conversaciones:** Se re-query cada 25s
- **Cache de wallet:** La invalidación no funciona (key mismatch)
- **Cache de órdenes:** Se query en 3 lugares separados

### Cómo solucionarlo
1. Eliminar `services/cache/` (no se usa) o integrarlo
2. Aumentar staleTime en React Query: 30s → 120s por defecto
3. Compartir queries: mismo `queryKey` para mismos datos
4. Usar `queryClient.setQueryData` para actualizar cache después de mutations
5. Precargar datos críticos al login (profiles, conversations)

### Impacto
**ALTO** — Cada página hace queries que podrían usar cache

---

<a id="error-9"></a>
## ❌ ERROR 9 — Realtime: suscripciones y listeners

### Descripción
El sistema Realtime está completamente desactivado (NO-OP) y reemplazado por polling. Esto funciona pero es ineficiente.

### Estado actual

```typescript
// useRealtime.ts — TODO es no-op
export function useRealtime(_config: UseRealtimeConfig): void {
  // No-op: Realtime desactivado. Usamos polling en su lugar.
}
```

### Polling activo

| Componente | Intervalo | Qué invalida |
|------------|-----------|--------------|
| useConversations | 25s | Conversations + contacts |
| notifications page | 45s | Notifications list |
| logger flush | 30s | app_logs INSERT |
| notifications time | 60s | Re-render lista |

### Suscripciones fantasma
El código SIGUE llamando a `useRealtime()` con configuraciones que nunca se activan:
- `useConversations.ts` — 1 suscripción fantasma
- `useMessages.ts` — 1 suscripción fantasma
- `useUnreadNotifications.ts` — 1 suscripción fantasma
- `notifications/page.tsx` — 1 suscripción fantasma

Estas no hacen nada pero añaden confusión al código.

### Cómo solucionarlo
1. **Opción A (recomendada para Free tier):** Eliminar `useRealtime` y sus llamadas. Usar solo polling con intervalos razonables (60-120s). Reducir el polling de chat de 25s a 60s.
2. **Opción B:** Reactivar Realtime solo para mensajes nuevos (INSERT en `messages`), que es la funcionalidad más crítica. El resto sigue con polling.
3. Eliminar las llamadas fantasma a `useRealtime` en todos los archivos.

### Impacto
**MEDIO** — Polling excesivo consume requests, pero Realtime en Free tier también tiene límites

---

<a id="error-10"></a>
## ❌ ERROR 10 — Supabase: tablas, índices, RLS, funciones

### Índices faltantes

| Tabla | Columna(s) | Query que lo necesita | Impacto |
|-------|------------|----------------------|---------|
| `messages` | `(conversation_id, created_at)` | useMessages paginado | **SIN ÍNDICE** — full table scan |
| `conversation_members` | `(user_id, conversation_id)` | ensurePrivateConv lookup | Solo hay PK compuesta |
| `profiles` | `(parent_id)` | Árbol comercial | Solo está `idx_profiles_role_status` |
| `notifications` | `(user_id, is_read, created_at)` | Badge no leídas | Parcialmente cubierto |

### RLS: Política problemática en messages INSERT

La política `messages_insert_all` solo verifica `sender_id = auth.uid()`. Pero NO verifica que el `conversation_id` sea válido o que el `recipient_id` sea miembro de la conversación. Esto permite:
- Insertar mensajes en conversaciones ajenas
- Poner cualquier `recipient_id`

### Funciones innecesarias

| Función | Problema |
|---------|----------|
| `update_network_counts()` | Itera TODOS los perfiles — O(n) — nunca se llama automáticamente |
| `is_ancestor_of()` | SECURITY DEFINER pero consulta profiles con RLS — puede ser lento |
| `get_descendants()` | SECURITY DEFINER pero usa `path <@` que requiere ltree extension |
| `check_message_rate_limit()` | Hace SELECT count en messages cada INSERT — costoso |

### Trigger problems

| Trigger | Problema |
|---------|----------|
| `enforce_message_rate_limit` on messages | Hace count(*) cada INSERT — O(messages) por insert |
| `trigger_order_sold` on orders | Llama `distribute_commissions` que itera margins JSON |
| 3 triggers on orders UPDATE | Se ejecutan TODOS en cada update (status, notification, sold) |

### Datos inconsistentes en BD

| Tabla | Campo | Valor actual | Valor correcto |
|-------|-------|-------------|----------------|
| `profiles` (admin) | `children_count` | 3 | 2 |
| `profiles` (admin) | `total_network_size` | 4 | 3 |
| `conversations` | Orphan `48617dae` | 1 miembro | Debe eliminarse |
| `conversations` | Duplicate `3e4929ff` | Duplicada con Janny | Debe eliminarse |
| `conversations` | Duplicate `0ddc07fa` | Duplicada con Merlyn | Debe eliminarse |
| `messages` (varios) | `recipient_id` | = sender_id | Debe ser el otro usuario |

### Cómo solucionarlo
1. Crear índices faltantes (ver tabla arriba)
2. Agregar check en messages INSERT RLS: `EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = NEW.conversation_id AND user_id = NEW.sender_id)`
3. Reemplazar `check_message_rate_limit` con un enfoque basado en Redis/app-level rate limiting
4. Corregir datos inconsistentes con UPDATE directo
5. Eliminar conversaciones duplicadas y orphan

### Impacto
**ALTO** — Performance degradada, datos incorrectos, seguridad débil

---

<a id="diagrama"></a>
## 📊 DIAGRAMA DE FLUJO DE DATOS

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (Cliente)                         │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ SessionProvider│    │ QueryProvider │    │   ThemeProvider     │  │
│  │ (useSession)  │    │ (React Query)│    │   (next-themes)     │  │
│  └──────┬───────┘    └──────┬───────┘    └────────────────────┘  │
│         │                   │                                      │
│  ┌──────▼───────────────────▼──────────────────────────────────┐   │
│  │                    PÁGINAS (App Router)                      │   │
│  │  /admin  /chat  /orders  /wallet  /profile  /network  /     │   │
│  └─────────────────────────┬──────────────────────────────────┘   │
│                            │                                       │
│  ┌─────────────────────────▼──────────────────────────────────┐   │
│  │                    HOOKS                                     │   │
│  │  useSupabaseQuery ──→ useSession (client, userId)          │   │
│  │  useSupabaseInfiniteQuery ──→ useSession                   │   │
│  │  useConversations (25s polling, N+1 queries)               │   │
│  │  useMessages (paginado cursor)                              │   │
│  │  useNetworkTree                                              │   │
│  │  useUnreadNotifications                                     │   │
│  │  useSyncEngine (IndexedDB + online listener)                │   │
│  │  useRealtime (NO-OP)                                        │   │
│  └─────────────────────────┬──────────────────────────────────┘   │
│                            │                                       │
│  ┌─────────────────────────▼──────────────────────────────────┐   │
│  │              CLIENT FACTORY (Singleton)                      │   │
│  │  yole-auth-p1      → Supabase P1 (login + sesión)          │   │
│  │  yole-auth-p2      → Supabase P2 (login)                   │   │
│  │  yole-register-p1  → Supabase P1 (registro, no persist)    │   │
│  │  yole-register-p2  → Supabase P2 (registro, no persist)    │   │
│  │  yole-auth-p1-logger → Supabase P1 (logs, no persist)      │   │
│  └─────────────────────────┬──────────────────────────────────┘   │
│                            │                                       │
└────────────────────────────┼───────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼───────────────────────────────────────┐
│                     SUPABASE P1 (Auth)                             │
│  URL: lustmqeqbninkavixttz.supabase.co                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ profiles (13) │ │ conversations│ │ messages     │              │
│  │ orders        │ │ conv_members │ │ notifications│              │
│  │ wallet_entries│ │ order_images │ │ payout_req   │              │
│  │ round_robin   │ │ app_logs     │ │ audit_log    │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
│  RLS: 14 tablas con RLS activo                                    │
│  Funciones: 8 SQL functions (SECURITY DEFINER)                    │
│  Triggers: 8 (en profiles, orders, messages, payouts)             │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                     SUPABASE P2 (Business)                        │
│  URL: lqwyidsixjzjffwtrltw.supabase.co                           │
│  Misma estructura que P1, 1 gestor (pending)                      │
│  Sin usuarios activos actualmente                                  │
└────────────────────────────────────────────────────────────────────┘
```

---

<a id="plan"></a>
## 📋 PLAN DE REPARACIÓN — Ordenado por Prioridad

### 🔴 NIVEL CRÍTICO (Bloquea funcionalidad)

| # | Error | Acción | Archivos | Estimado |
|---|-------|--------|----------|----------|
| 1 | E2: Chat duplicados | Eliminar convs duplicadas + constraint UNIQUE + fix ensurePrivateConv | ChatLayout.tsx, SQL migration | 2h |
| 2 | E3: Mensajes privados rotos | Fix recipient_id fallback + eliminar convs duplicadas | ChatLayout.tsx | 1h |
| 3 | E4: Admin no carga | Confirmar re-login admin con nuevo JWT | — | 5min |
| 4 | E10: Datos inconsistentes | SQL: corregir children_count, eliminar convs orphan/duplicadas | SQL scripts | 30min |

### 🟠 NIVEL ALTO (Degradación severa)

| # | Error | Acción | Archivos | Estimado |
|---|-------|--------|----------|----------|
| 5 | E1: Árbol "3 directos" | Recalcular children_count + trigger AFTER DELETE | SQL, CommercialTree.tsx | 1.5h |
| 6 | E6: Consultas innecesarias | Crear RPC get_chat_overview, compartir queries, reducir polling | useConversations.ts, nuevas RPCs | 3h |
| 7 | E8: Cache mal implementado | Eliminar profileCache.ts muerto, aumentar staleTime, compartir keys | Multiple | 2h |
| 8 | E10: Índices faltantes | CREATE INDEX en messages, conversation_members, profiles | SQL | 30min |
| 9 | E10: RLS messages INSERT | Agregar verificación de conversation_members | SQL policy | 30min |

### 🟡 NIVEL MEDIO (UX y rendimiento)

| # | Error | Acción | Archivos | Estimado |
|---|-------|--------|----------|----------|
| 10 | E5: Botón flotante posición | Guardar en localStorage onPointerUp + leer al init | FloatingToolKit.tsx | 30min |
| 11 | E7: Renderizados innecesarios | Mover useSyncEngine a contexto, memoizar listas | main-layout.tsx, components | 1.5h |
| 12 | E9: useRealtime fantasma | Eliminar llamadas muertas a useRealtime | 4 archivos | 30min |
| 13 | E6: Logger getSession extra | Eliminar auth.getSession del flush, usar client directo | logger.ts | 30min |
| 14 | E8: Wallet invalidation | Corregir key mismatch: "wallet-full" vs "wallet" | useSupabaseQuery.ts, wallet/page.tsx | 15min |

### 🟢 NIVEL BAJO (Mejora técnica)

| # | Error | Acción | Archivos | Estimado |
|---|-------|--------|----------|----------|
| 15 | E10: Rate limit trigger | Reemplazar check_message_rate_limit con app-level check | SQL, anti-spam.ts | 1h |
| 16 | E7: profileCache duplicado | Eliminar services/cache/ o integrarlo con useSession | services/cache/ | 30min |
| 17 | E6: AdminAnalytics 4 queries | Crear RPC get_admin_analytics_data() | Nueva RPC, AdminAnalytics.tsx | 1h |
| 18 | E9: Reactivar Realtime | Solo para messages INSERT (canal crítico) | useRealtime.ts | 2h |

---

**TIEMPO TOTAL ESTIMADO:** ~17 horas

**⚠️ NO ESCRIBIR CÓDIGO HASTA RECIBIR APROBACIÓN**
