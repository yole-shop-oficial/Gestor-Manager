# 🚀 GUÍA DE DESPLIEGUE — YOLE SHOP APP

## Pasos para desplegar en Vercel

### 1. Ejecutar SQL en Supabase

Ejecuta estos archivos **en orden** en el SQL Editor de cada proyecto:

#### Proyecto 1 (Auth + Identidad):
1. `sql/project1-full-schema.sql` — Schema completo (16 pasos)
2. `sql/fix-rls-trigger-safe.sql` — Trigger handle_new_user()
3. `sql/enable-realtime.sql` — Activar Realtime
4. `sql/fix-payouts-admin-rls.sql` — Políticas RLS para payouts
5. `sql/seed-admin.sql` — Crear usuario admin (PASO 2: cambiar role)

#### Proyecto 2 (Business) — Si tienes segundo proyecto:
1. `sql/project2-full-schema.sql` — Schema completo (16 pasos)
2. `sql/fix-rls-trigger-safe-project2.sql` — Trigger handle_new_user()
3. `sql/enable-realtime.sql` — Activar Realtime
4. `sql/fix-payouts-admin-rls.sql` — Políticas RLS para payouts

### 2. Crear usuario administrador

**Opción A (Recomendada):**
1. Regístrate desde la app con tu correo Gmail
2. En Supabase SQL Editor ejecuta:
   ```sql
   UPDATE public.profiles
   SET role = 'admin', status = 'active'
   WHERE email = 'TU_CORREO@gmail.com';
   ```

**Opción B:** Ver `sql/seed-admin.sql` para crear directamente.

### 3. Configurar variables de entorno en Vercel

Ve a tu proyecto en Vercel → Settings → Environment Variables

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL_1` | URL del Proyecto 1 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1` | Anon Key del Proyecto 1 |
| `NEXT_PUBLIC_SUPABASE_URL_2` | URL del Proyecto 2 (o dejar vacío si solo usas P1) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2` | Anon Key del Proyecto 2 (o dejar vacío) |

### 4. Configurar Email Templates en Supabase

Ver `GUIA-EMAIL-SUPABASE.md` para configurar los templates HTML en Authentication → Email Templates.

### 5. Configurar GitHub Secrets (para CI)

Ve a tu repo en GitHub → Settings → Secrets and variables → Actions

| Secret | Valor |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL_1` | URL del Proyecto 1 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1` | Anon Key del Proyecto 1 |
| `NEXT_PUBLIC_SUPABASE_URL_2` | URL del Proyecto 2 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2` | Anon Key del Proyecto 2 |
| `DATABASE_URL` | Connection string (solo si usas Drizzle) |

### 6. Desplegar

```bash
# Inicializar git (solo la primera vez)
git init
git add .
git commit -m "YOLE SHOP APP v2.0 — Fix AuthRetryableFetchError + Realtime + Payouts"

# Conectar con GitHub
git remote add origin https://github.com/yole-shop-oficial/Gestor-Manager.git
git branch -M main
git push -u origin main --force
```

Vercel detectará el push y desplegará automáticamente.

---

## Estructura del Proyecto

```
├── .github/workflows/ci.yml    # CI: tsc + build
├── public/
│   ├── sw.js                   # Service Worker v3
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # PWA icons
├── src/
│   ├── app/                    # Rutas Next.js
│   │   ├── page.tsx            # Dashboard (gestor/admin redirect)
│   │   ├── admin/page.tsx      # Panel admin con gestión de payouts
│   │   ├── login/page.tsx      # Login con round-robin
│   │   ├── register/page.tsx   # Registro 4 pasos
│   │   ├── chat/page.tsx       # Chat realtime con admin
│   │   ├── notifications/page.tsx # Notificaciones realtime
│   │   ├── orders/page.tsx     # Lista de pedidos
│   │   ├── orders/new/page.tsx # Crear pedido
│   │   ├── wallet/page.tsx     # Billetera + solicitud de retiro
│   │   ├── profile/page.tsx    # Perfil del gestor
│   │   ├── settings/page.tsx   # Configuración
│   │   └── welcome/page.tsx    # Landing page
│   ├── features/auth/          # Autenticación
│   │   ├── api.ts              # Registro con round-robin
│   │   ├── api-login.ts        # Login buscando ambos proyectos
│   │   ├── validation.ts       # Zod schemas con validación Cuba
│   │   └── components/         # RegisterWizard, AuthGate
│   ├── services/supabase/      # Clientes Supabase
│   │   ├── clientFactory.ts    # ⭐ Fábrica centralizada (fix principal)
│   │   ├── roundRobin.ts       # Round-robin v3 con fallback
│   │   ├── connectivity.ts     # Verificación sin no-cors
│   │   └── ...                 # Browser + SSR clients
│   └── components/             # UI compartida
├── sql/                        # Scripts SQL para Supabase
├── email-templates/            # Templates HTML para emails
└── vercel-env.txt              # Template para variables Vercel
```

## Funcionalidades Implementadas

- ✅ Registro con round-robin entre 2 proyectos Supabase
- ✅ Login buscando en ambos proyectos
- ✅ Validación Cuba: teléfono +53, carnet 11 dígitos, tarjeta 13-19 dígitos
- ✅ 4-step RegisterWizard con políticas reales
- ✅ Dashboard gestor con estadísticas
- ✅ Panel admin con gestión de usuarios y retiros
- ✅ Chat en tiempo real con admin
- ✅ Notificaciones en tiempo real
- ✅ Billetera con solicitud de retiro
- ✅ Creación de pedidos con notificación al admin
- ✅ PWA con Service Worker, manifest, iconos
- ✅ Dark theme con glass-morphism
- ✅ iOS/Safari fixes (icons, no maximumScale, install banner)
- ✅ FloatingToolKit de diagnóstico
- ✅ Fábrica centralizada de clientes (elimina AuthRetryableFetchError)
