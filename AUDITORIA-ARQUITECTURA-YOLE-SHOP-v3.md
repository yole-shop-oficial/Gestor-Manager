# 🏗️ AUDITORÍA TOTAL + ARQUITECTURA — YOLE SHOP v3.0

**Documento confidencial · 7 de julio 2026**  
*Plataforma de Distribución Jerárquica con Árbol Comercial Infinito*

---

## RESUMEN EJECUTIVO

Tras una auditoría exhaustiva de 93 archivos (~13,121 líneas de código), 2 proyectos Supabase (16 tablas, 14 SQL functions, 30+ RLS policies), y el análisis del nuevo modelo de negocio jerárquico, se presentan los hallazgos y el plan de transformación arquitectónica.

---

# PARTE I: AUDITORÍA DEL ESTADO ACTUAL

---

## 1. INVENTARIO DE CÓDIGO

### 1.1 Distribución por capas

| Capa | Archivos | Líneas | % |
|---|---|---|---|
| `app/` (páginas) | 16 | ~4,120 | 31% |
| `components/` (UI) | 18 | ~2,840 | 22% |
| `features/` (negocio) | 19 | ~2,800 | 21% |
| `hooks/` | 8 | ~860 | 7% |
| `services/` (infra) | 10 | ~960 | 7% |
| `lib/` | 7 | ~470 | 4% |
| `__tests__/` | 5 | ~930 | 7% |
| **TOTAL** | **83** | **~12,980** | **100%** |

### 1.2 Archivos más grandes (top 10)

1. `welcome/page.tsx` — 722 líneas (landing page gigante)
2. `admin/page.tsx` — 576 líneas (todo en un solo archivo)
3. `SetupBot.tsx` — 553 líneas
4. `MonitoringDashboard.tsx` — 440 líneas
5. `useSession.tsx` — 408 líneas (crítico, ya reescrito)
6. `wallet/page.tsx` — 404 líneas
7. `FloatingToolKit.tsx` — 370 líneas
8. `orders/new/page.tsx` — 339 líneas
9. `RegisterWizard.tsx` — 317 líneas
10. `settings/page.tsx` — 301 líneas

### 1.3 Violaciones de Clean Architecture detectadas

| Violación | Ubicación | Gravedad |
|---|---|---|
| Lógica de negocio en páginas | `admin/page.tsx` (576 líneas monolíticas) | 🔴 CRÍTICA |
| Sin separación features/ para órdenes | `orders/new/` tiene todo inline | 🔴 CRÍTICA |
| Sin separación features/ para wallet | `wallet/page.tsx` mezcla UI + lógica | 🔴 CRÍTICA |
| Sin capa de repositorio | Todas las queries Supabase están inline en componentes | 🔴 CRÍTICA |
| CSS inline masivo | `welcome/page.tsx` — 722 líneas Tailwind | 🟡 MEDIA |
| No hay modelos de dominio | Tipos planos, sin comportamiento | 🟡 MEDIA |
| Mutaciones directas sin capa de servicio | `wallet/page.tsx`, `admin/page.tsx` | 🟡 MEDIA |

---

## 2. BASE DE DATOS ACTUAL

### 2.1 Proyecto 1 — `yole-auth` (`lustmqeqbninkavixttz`)

**Tablas (16):**

| Tabla | Columnas | Propósito | Compatible árbol? |
|---|---|---|---|
| `profiles` | 25 | Usuarios | ❌ Sin parent_id, manager_code, level |
| `orders` | 16 | Pedidos | ❌ Sin cadena de distribución, sin márgenes |
| `order_images` | 9 | Imágenes | ✅ OK |
| `wallet_entries` | 7 | Wallet | ⚠️ Sin trazabilidad de red |
| `payout_requests` | 9 | Solicitudes retiro | ⚠️ Sin jerarquía |
| `notifications` | 6 | Notificaciones | ✅ OK |
| `messages` | 7 | Chat | ⚠️ Solo sender/recipient |
| `conversations` | 7 | Conversaciones | ⚠️ Sin parent contextual |
| `conversation_members` | 5 | Miembros | ✅ OK |
| `message_reactions` | 5 | Reacciones | ✅ OK |
| `round_robin_counter` | 3 | Contador | ✅ OK |
| `app_logs` | 7 | Logs | ✅ OK |
| `_trigger_log` | 3 | Debug | ✅ OK |
| `manager_wallet_summary` | 4 | Vista | ⚠️ Necesita update |

**SQL Functions (14):** handle_new_user, handle_order_sold, notify_admins_new_order, notify_order_status_change, notify_payout_status_change, get_gestor_dashboard, get_admin_dashboard, get_usage_metrics, check_message_rate_limit, cleanup_old_logs, current_user_is_admin, increment_registration_counter, set_updated_at, test_trigger_insert

**RLS Policies (30+):** Bien implementadas pero basadas en modelo `manager_id = auth.uid()` — no soporta visión jerárquica.

### 2.2 Proyecto 2 — `yole-business` (`lqwyidsixjzjffwtrltw`)

- Espejo exacto del P1 (mismas tablas/funciones)
- **0 usuarios, 0 pedidos** — Sin uso real
- Le falta `test_trigger_insert` vs P1

### 2.3 Datos reales en P1

| Entidad | Cantidad |
|---|---|
| Usuarios | 3 (1 admin + 2 gestores) |
| Pedidos | 0 |
| Mensajes | 2 |
| Notificaciones | 2 |

### 2.4 Problemas críticos del schema actual

1. **`profiles` no tiene `parent_id`**: Imposible modelar jerarquía
2. **`profiles` no tiene `manager_code`**: No hay código de afiliación único
3. **`profiles` no tiene `level` o `path`**: No se puede recorrer el árbol
4. **`orders` no tiene cadena de distribución**: Solo `manager_id`
5. **`orders` no tiene márgenes por nivel**: Solo base_price + sale_price
6. **`wallet_entries` no tiene `source_level`**: Sin trazabilidad
7. **Chat no jerárquico**: Sin chat Manager↔Subgestor

---

## 3. ANÁLISIS DE PERFORMANCE

### 3.1 Consultas por pantalla

| Pantalla | Queries al cargar | Realtime |
|---|---|---|
| Dashboard Gestor | 1 (RPC) + 1 (lazy) | 0 |
| Dashboard Admin | 5 (4 queries + lazy) | 0 |
| Pedidos (lista) | 1 (infinite) | 0 |
| Wallet | 4 (summary+entries+payouts+infinite) | 0 |
| Notificaciones | 1 (infinite) | 1 channel |
| Chat | 2 (convs+msgs) | 2 channels |

**Total carga admin:** ~15 queries + 4 realtime channels

### 3.2 Problemas de rendimiento

| Problema | Impacto | Solución |
|---|---|---|
| Wallet 4 queries en paralelo | Alto consumo plan gratuito | Unificar en 1 RPC |
| AdminAnalytics 500 filas en cliente | CPU móvil gama baja | SQL functions server-side |
| Sin caché de perfiles entre pantallas | Re-fetch cada ruta | Static cache + TTL |
| Sin SWR para datos compartidos | Cada pantalla re-fetcha | Capa de caché compartida |
| Infinite scroll sin virtualización | DOM crece sin límite | Virtualización |

### 3.3 Consumo Supabase (plan gratuito: 50K queries/mes)

- **10 usuarios/día:** ~500 queries/día ≈ 15K/mes ✅ OK
- **100 usuarios/día:** ~5K queries/día ≈ 150K/mes ❌ EXCEDE

---

## 4. MATRIZ DE VULNERABILIDADES

| Vulnerabilidad | Estado | Riesgo |
|---|---|---|
| XSS | ✅ Mitigado (sanitize.ts, CSP) | Bajo |
| CSRF | ✅ Mitigado (JWT) | Bajo |
| SQL Injection | ✅ Mitigado (Supabase + RLS) | Bajo |
| Rate Limiting | ✅ Cliente | Medio (sin server) |
| RLS | ✅ 30 políticas | Bajo |
| Escalabilidad árbol | ❌ Inexistente | **Crítico** |

---

# PARTE II: NUEVA ARQUITECTURA

---

## 5. MODELO DE DOMINIO

### 5.1 Entidades principales

```
USUARIO (profiles)
├── id: UUID
├── email, full_name, username
├── role: 'admin' | 'manager' | 'gestor'
├── manager_code: string       ← NUEVO: Código único permanente
├── parent_id: UUID | null     ← NUEVO: Superior jerárquico
├── level: integer             ← NUEVO: Profundidad (0=admin)
├── path: ltree                ← NUEVO: Ruta completa
├── children_count: integer    ← NUEVO: Subordinados directos
├── total_network_size: integer← NUEVO: Tamaño total de red
└── (23 columnas existentes)

PEDIDO (orders)
├── id: UUID
├── manager_id: UUID           ← Quien registra
├── chain: UUID[]              ← NUEVO: Cadena distribución
├── margins: jsonb             ← NUEVO: Márgenes por nivel
├── provider_price: decimal    ← NUEVO: Precio proveedor
├── base_price, sale_price     ← Existente
└── (resto existente)

WALLET_ENTRY
├── source_level: integer      ← NUEVO: Nivel origen comisión
├── source_user_id: UUID       ← NUEVO: Quién generó comisión
└── (resto existente)
```

### 5.2 Jerarquía de roles

```
ADMIN (level=0) — ve TODO
│
├── MANAGER (level=1) — ve su rama
│   ├── MANAGER (level=2) — ve su rama
│   │   └── GESTOR (level=3) — ve solo sus datos
│   └── GESTOR directo
│
└── GESTOR directo bajo ADMIN
```

**Regla:** Gestor con ≥1 subordinado → automáticamente `role='manager'`  
**Regla:** Manager sin subordinados → vuelve a `role='gestor'`

---

## 6. MODELO DE BASE DE DATOS (MIGRACIONES COMPATIBLES)

### 6.1 profiles — ALTER TABLE (ADD COLUMN solo)

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manager_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS path ltree;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS children_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_network_size integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
```

### 6.2 Extensión ltree

```sql
CREATE EXTENSION IF NOT EXISTS ltree;
```

### 6.3 manager_code generator

```sql
CREATE OR REPLACE FUNCTION public.generate_manager_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text; exists_flag boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random()*length(chars)+1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM profiles WHERE manager_code=code) INTO exists_flag;
    EXIT WHEN NOT exists_flag;
  END LOOP;
  RETURN code;
END; $$;
```

### 6.4 orders — ALTER TABLE

```sql
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS chain uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS margins jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_price numeric(12,2);
```

### 6.5 wallet_entries — ALTER TABLE

```sql
ALTER TABLE public.wallet_entries ADD COLUMN IF NOT EXISTS source_level integer;
ALTER TABLE public.wallet_entries ADD COLUMN IF NOT EXISTS source_user_id uuid REFERENCES public.profiles(id);
```

### 6.6 messages — ALTER TABLE

```sql
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
```

### 6.7 Nueva tabla: audit_log

```sql
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  target_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
```

### 6.8 Nuevas SQL Functions requeridas

| Función | Retorno | Propósito |
|---|---|---|
| `get_descendants(p_user_id)` | SETOF profiles | Todos los descendientes |
| `get_ancestors(p_user_id)` | SETOF profiles | Camino hasta admin |
| `calculate_margins(chain, sale_price, base_price)` | jsonb | Márgenes automáticos |
| `get_manager_dashboard(p_user_id)` | json | Dashboard jerárquico |
| `distribute_commissions(p_order_id)` | void | Comisiones multi-nivel |
| `get_network_stats(p_user_id)` | json | Estadísticas de red |
| `update_network_counts()` | void | Actualizar counters |
| `is_ancestor_of(ancestor, descendant)` | boolean | Helper RLS |

### 6.9 Nuevas RLS Policies

```sql
-- profiles: manager ve sus descendientes
CREATE POLICY profiles_select_descendants ON public.profiles
  FOR SELECT USING (is_ancestor_of(auth.uid(), id) OR id = auth.uid());

-- orders: manager ve órdenes de su rama
CREATE POLICY orders_select_branch ON public.orders
  FOR SELECT USING (auth.uid() = ANY(chain) OR manager_id = auth.uid());

-- wallet: manager ve entries de su rama
CREATE POLICY wallet_select_branch ON public.wallet_entries
  FOR SELECT USING (is_ancestor_of(auth.uid(), manager_id) OR manager_id = auth.uid());
```

---

## 7. ARQUITECTURA DEL ÁRBOL COMERCIAL

### 7.1 Modelo ltree

```
Admin (AAA, level=0, path='AAA')
├── M1 (BBB, level=1, path='AAA.BBB')
│   ├── G1 (CCC, level=2, path='AAA.BBB.CCC')
│   └── M2 (DDD, level=2, path='AAA.BBB.DDD')
│       └── G2 (EEE, level=3, path='AAA.BBB.DDD.EEE')
└── G3 (FFF, level=1, path='AAA.FFF')
```

**Descendientes de BBB:** `SELECT * FROM profiles WHERE path <@ 'AAA.BBB';`

### 7.2 Flujo de pedido con márgenes

```
PROVEEDOR: $50
↓ margen ADMIN 10% → $55
↓ margen MANAGER 15% → $63.25
↓ margen GESTOR 20% → $75.90
PRECIO CLIENTE: $75.90

chain = [admin_id, manager_id, gestor_id]
margins = {
  "0": {"user_id":"AAA","margin":5.00,"price":55.00},
  "1": {"user_id":"BBB","margin":8.25,"price":63.25},
  "2": {"user_id":"CCC","margin":12.65,"price":75.90}
}
```

### 7.3 Distribución de comisiones al vender

```sql
-- Trigger: cuando order.status = 'sold'
-- Para cada nivel en margins:
-- INSERT INTO wallet_entries (manager_id, order_id, amount, entry_type, source_level, source_user_id)
```

### 7.4 Panel Árbol Comercial (CommercialTree)

- Visualización interactiva (react-flow o D3.js)
- Cada nodo: avatar, nombre, rol, nivel, pedidos, wallet, ventas, comisiones, estado, último acceso, subgestores
- Click en nodo → drawer con perfil completo
- Filtros: nivel, estado, rendimiento
- Búsqueda por nombre/código

---

## 8. ARQUITECTURA DEL CHAT (REDISEÑO)

### 8.1 Modelo

```
Conversación Privada (type='private'):
  Admin ↔ Gestor, Manager ↔ Subgestor, Gestor ↔ Gestor (misma rama)

Conversación Grupal (type='group'):
  Chat de rama, Chat Global
```

### 8.2 UI tipo Telegram

```
┌──────────────────────────────────────────┐
│ 🔍 Buscar...                             │
├──────────────┬───────────────────────────┤
│ Sidebar       │ Chat Window              │
│ ⭐ Admins     │ ┌───────────────────────┐ │
│ 👥 Managers   │ │ Mensajes              │ │
│ 👤 Mis Gestor │ │                       │ │
│ 🌐 Global     │ │                       │ │
│ ───────────── │ ├───────────────────────┤ │
│ 📋 Contactos  │ │ [Input mensaje]       │ │
│  ○ Ana (Mgr)  │ └───────────────────────┘ │
│  ○ Luis (Ges) │                           │
└──────────────┴───────────────────────────┘
```

### 8.3 Estrategia Realtime

- **Solo 1 canal activo**: conversación abierta
- Otras conversaciones: polling 30s para badges
- Al cambiar conversación: cerrar canal, abrir nuevo

---

## 9. ESTRATEGIA DE CACHÉ

### 9.1 Tres niveles

```
Nivel 1 — Memoria (React Context + TanStack Query)
  Perfil usuario (sesión), Código afiliación (sesión), Dashboard (30-120s)

Nivel 2 — IndexedDB (Offline First)
  Pedidos (hasta sync), Red gestores (hasta refresh manual),
  Conversaciones (7 días), Notificaciones (30 días)

Nivel 3 — Service Worker Cache
  Assets (Cache First), API GET (SWR 30s), Imágenes (Cache First 7 días)
```

### 9.2 Invalidación

| Evento | Invalidar |
|---|---|
| Nuevo pedido | orders, dashboard, analytics |
| Pedido vendido | orders, wallet, dashboard, analytics (TODA la cadena) |
| Payout | wallet, payouts, notificaciones |
| Nuevo subgestor | network tree, dashboard manager |
| Chat: mensaje | Solo conversación afectada (realtime) |

---

## 10. ESTRATEGIA OFFLINE FIRST

### 10.1 Mejoras al sync-engine existente

- Añadir operaciones jerárquicas
- Conflict resolution: "last write wins" + timestamp
- Priorizar pedidos > chat

### 10.2 Flujo

```
1. App abre → verificar conexión
2. Online → syncNow() procesa cola
3. Offline → trabajar con IndexedDB
4. Vuelve online → sync auto + badge pendientes
5. SW Background Sync como fallback
```

### 10.3 Datos offline por prioridad

| Dato | Prioridad |
|---|---|
| Perfil propio | ALTA |
| Últimos 50 pedidos | ALTA |
| Red de gestores | MEDIA |
| Conversaciones | MEDIA |
| Notificaciones | BAJA |
| Analytics | BAJA (solo online) |

---

## 11. NUEVA ESTRUCTURA DE CARPETAS

```
src/
├── app/
│   ├── (auth)/                    # Sin auth
│   │   ├── welcome, login, register, setup, auth/callback
│   └── (app)/                     # Con auth
│       ├── dashboard, orders, wallet, chat, network/,
│       │   notifications, profile, settings, admin/
├── features/                      # Lógica de negocio
│   ├── auth/        (api/, components/, hooks/, types.ts)
│   ├── orders/      (api/, components/, hooks/, types.ts)
│   ├── wallet/      (api/, components/, hooks/, types.ts)
│   ├── network/     (api/, components/, hooks/, types.ts) ← NUEVO
│   ├── chat/        (api/, components/, hooks/, types.ts)
│   ├── notifications/
│   ├── analytics/
│   └── settings/
├── services/
│   ├── supabase/    (clientes)
│   ├── sync/        (motor offline)
│   └── cache/       ← NUEVO: profileCache, networkCache, orderCache
├── core/            ← NUEVO: dominio compartido
│   └── types/       (user.ts, order.ts, wallet.ts, network.ts)
├── hooks/           (genéricos)
├── components/      (UI genérica)
└── lib/             (utils)
```

---

## 12. PLAN DE OPTIMIZACIÓN SUPABASE

### 12.1 Reducción de queries

| Pantalla | Actual | Objetivo | Técnica |
|---|---|---|---|
| Dashboard Admin | 5 | 1 | RPC unificada |
| Dashboard Gestor | 2 | 1 | RPC unificada |
| Wallet | 4 | 2 | RPC summary |
| AdminAnalytics | 4 | 1 | RPC + caché |
| Chat | 2 | 1+ poll | Realtime selectivo |

### 12.2 Config TanStack Query

```
staleTime: 30s (dashboard, wallet)
staleTime: 120s (analytics, network tree)
staleTime: 0 (chat messages)
gcTime: 10min
refetchOnWindowFocus: false
retry: 2 (backoff exponencial)
```

### 12.3 Realtime optimizado

```
MÁXIMO 2 canales simultáneos:
1. Notificaciones (siempre activo)
2. Conversación activa (solo si chat abierto)

Resto: polling 30-60s + invalidación manual + refetch en foreground
```

---

## 13. ROADMAP DE IMPLEMENTACIÓN

### 🔴 FASE 1: Migración DB (DÍA 1-2)
- [ ] ALTER TABLE profiles (+8 columnas)
- [ ] ALTER TABLE orders (+3 columnas)
- [ ] ALTER TABLE wallet_entries (+2 columnas)
- [ ] ALTER TABLE messages (+3 columnas)
- [ ] CREATE TABLE audit_log
- [ ] CREATE EXTENSION ltree
- [ ] generate_manager_code()
- [ ] update handle_new_user() trigger
- [ ] get_descendants(), get_ancestors(), is_ancestor_of()
- [ ] calculate_margins(), distribute_commissions()
- [ ] Nuevas RLS policies jerárquicas
- [ ] Migrar 3 usuarios existentes (manager_code, level, path)
- [ ] Ejecutar en AMBOS proyectos

### 🟠 FASE 2: Registro con árbol (DÍA 3-4)
- [ ] Campo "Código del Gestor" en RegisterWizard
- [ ] Lógica: buscar parent por código → construir path
- [ ] Asignar level = parent.level + 1
- [ ] Generar manager_code único al registrarse
- [ ] Zod schemas actualizados

### 🟡 FASE 3: Perfil profesional (DÍA 5-6)
- [ ] Pantalla completa con tabs: Info, Docs, Wallet, Historial, Pedidos, Subgestores, Comisiones, Actividad, Chat, Auditoría
- [ ] Mostrar manager_code visible/copiable
- [ ] Estadísticas de red (si manager)

### 🟢 FASE 4: Árbol Comercial (DÍA 7-9)
- [ ] CommercialTree.tsx con react-flow
- [ ] Panel Admin: árbol completo
- [ ] Panel Manager: su rama
- [ ] Métricas por nodo, navegación, filtros

### 🔵 FASE 5: Pedidos con márgenes (DÍA 10-12)
- [ ] OrderForm actualizado: calcular márgenes por nivel
- [ ] chain + margins en inserción
- [ ] Trigger distribute_commissions al vender
- [ ] Wallet multi-nivel

### 🟣 FASE 6: Chat jerárquico (DÍA 13-15)
- [ ] ChatSidebar tipo Telegram
- [ ] Secciones: Admins, Managers, Mis Gestores, Global
- [ ] Búsqueda de contactos
- [ ] Chat Manager↔Subgestor
- [ ] Realtime selectivo

### ⚪ FASE 7: Optimización (DÍA 16-18)
- [ ] Capa de caché (profileCache, networkCache)
- [ ] RPC unificadas
- [ ] Reducción 50% queries
- [ ] Virtualización de listas
- [ ] Lazy loading mejorado

### 🟤 FASE 8: Testing + Prod (DÍA 19-21)
- [ ] Tests unitarios nuevas funciones
- [ ] Tests E2E (Playwright)
- [ ] Pruebas de carga (100+ usuarios)
- [ ] Documentación actualizada
- [ ] Deploy producción

---

## 14. MÉTRICAS DE ÉXITO

| Métrica | Objetivo |
|---|---|
| Queries por sesión | < 20 |
| Realtime channels simultáneos | ≤ 2 |
| Tiempo carga inicial | < 2s |
| Tiempo dashboard (caché) | < 500ms |
| Usuarios plan gratuito | 200+ |
| Profundidad árbol | Ilimitada |
| Sync offline | < 5s / 50 ops |
| Cobertura tests | > 80% |

---

## 15. RIESGOS Y MITIGACIÓN

| Riesgo | Prob | Impacto | Mitigación |
|---|---|---|---|
| ltree no disponible | Baja | Medio | Fallback UUID array |
| Migración rompe datos | Baja | Crítico | Solo ADD COLUMN, nunca DROP |
| RLS jerárquica compleja | Media | Alto | Testing exhaustivo multi-rol |
| Queries recursivas lentas | Media | Medio | Índices GIST + caché agresiva |
| Realtime excede límites | Baja | Medio | Selectivo + polling fallback |

---

**Fin del documento de arquitectura. Listo para revisión y aprobación.**
