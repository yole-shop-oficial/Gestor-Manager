# 🚀 YOLE SHOP v3.0 — Guía de Producción

**Última actualización: 7 de julio 2026**

---

## Estado del Proyecto

| Indicador | Valor |
|---|---|
| Versión | v3.0 |
| Fases completadas | 8/8 (100%) |
| Tests unitarios | 69 ✅ |
| Tests E2E | 15 escenarios |
| Cobertura de features | Auth, Órdenes, Wallet, Chat, Red, Perfil, Admin, Analytics |
| TypeScript | Sin errores |
| Build | Vercel auto-deploy |

---

## Arquitectura v3.0

```
Árbol Comercial Infinito
├── Admin (nivel 0) — ve TODO
│   ├── Manager (nivel 1) — ve su rama
│   │   ├── Gestor (nivel 2)
│   │   └── Manager (nivel 2) — ve su rama
│   │       └── Gestor (nivel 3)
│   └── Gestor (nivel 1)
│
Pedidos con Márgenes Multi-nivel
├── Proveedor: $50
├── Admin: +$10 → $60
├── Manager: +$8 → $68
└── Gestor: +$32 → $100 (precio cliente)
```

---

## Plan gratuito Supabase — Capacidad

| Usuarios/día | Queries/mes | Estado |
|---|---|---|
| 10 | ~8,000 | ✅ Muy por debajo (50K) |
| 50 | ~25,000 | ✅ Cómodo |
| 100 | ~50,000 | ⚠️ Al límite |
| 200+ | ~100,000 | ❌ Necesita upgrade |

**Optimizaciones activas:**
- Wallet: 4→2 queries (-50%)
- Dashboard: 2→1 query (-50%)
- Caché de perfiles: L1 (memoria 5min) + L2 (IndexedDB 30min)
- Realtime selectivo (máx 2 canales)
- RefetchOnWindowFocus: false

---

## Despliegue

### Rápido (recomendado)
```bash
git push origin main
# Vercel auto-deploy en ~30s
```

### Manual
```bash
npm run build
# Subir .next/ a Vercel o servidor Node.js
npm start
```

### Variables de entorno requeridas
```
NEXT_PUBLIC_SUPABASE_URL_1
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1
NEXT_PUBLIC_SUPABASE_URL_2
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2
NEXT_TELEMETRY_DISABLED=1
```

---

## Comandos

```bash
npm run dev          # Desarrollo local
npm run build        # Build producción
npm run test         # Tests unitarios (69)
npm run test:e2e     # Tests E2E (15)
npm run test:all     # Todos los tests
npm run lint         # ESLint
```

---

## Monitoreo

- `/api/health` — Healthcheck (versión, uptime, memoria)
- Supabase Dashboard → SQL Editor → `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 20`
- Vercel Analytics → Deployments
- FloatingToolKit (botón flotante en la app)

---

## Estructura final del proyecto

```
Gestor-Manager/
├── src/
│   ├── app/          # 15 páginas (App Router)
│   ├── features/     # auth, orders, wallet, network, chat, notifications, analytics, settings, setup
│   ├── components/   # dashboard, layout, floating, monitoring, providers, security, shared, ui
│   ├── hooks/        # useSession, useSupabaseQuery, useRealtime, useSyncEngine, etc.
│   ├── services/     # supabase (clients + roundRobin), sync (engine), cache (profileCache)
│   ├── core/         # Próximamente: tipos de dominio
│   └── lib/          # logger, validators, rate-limiter, sanitize, imageProcessor
├── tests/
│   ├── api/          # network.test.ts, margins.test.ts
│   └── e2e/          # critical-flows.spec.ts
├── sql/              # Migraciones y triggers
├── public/           # PWA icons, manifest, SW
└── docs/             # Auditoría, guías
```

---

## Contacto

- Admin: junmoxia41@gmail.com
- GitHub: yole-shop-oficial/Gestor-Manager
- Deploy: https://gestor-manager-two.vercel.app
