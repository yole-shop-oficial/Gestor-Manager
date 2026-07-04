# 🚀 YOLE SHOP APP V1.0 — Master Development Roadmap

## 1. Visión General
YOLE SHOP APP es una PWA profesional para la **gestión de gestores, pedidos, pagos, comisiones, wallet, chat y notificaciones**, con experiencia visual nativa Android. La app **no administra catálogo ni inventario**: los productos se siguen gestionando vía WhatsApp; YOLE SHOP APP administra exclusivamente la operación, personas y dinero.

## 2. Objetivos
- Centralizar la gestión de pedidos de todos los gestores.
- Automatizar el cálculo de comisiones y el saldo de la billetera.
- Proveer dashboards reales para Administrador y Gestores.
- Integrar un chat Admin ↔ Gestor (solo texto).
- Garantizar seguridad, escalabilidad y funcionamiento **Offline First**.
- Operar exclusivamente con datos reales desde Supabase (sin mocks).

## 3. Arquitectura de Alto Nivel

### 3.1 Frontend
- **Framework:** Next.js (App Router, PWA-like shell).
- **Lenguaje:** TypeScript.
- **UI:** TailwindCSS + diseño propio tipo Android Premium.
- **Estado asíncrono:** React Query (para datos remotos Supabase).
- **Animaciones:** Framer Motion.
- **Ruteo:** Next.js App Router (rutas app/ como si fuera móvil nativa).

### 3.2 Backend as a Service — Supabase

#### Proyecto Supabase 1 (Auth & Perfiles)
- Finalidad: **identidad y comunicación**.
- Tablas (ejemplo conceptual, se definirán en detalle en fases siguientes):
  - `auth.users` (de Supabase Auth).
  - `profiles` (datos personales y de configuración).
  - `notifications` (notificaciones personales).
  - `messages` (chat Admin ↔ Gestor, solo texto).
- Responsabilidades:
  - Registro, login, logout, refresh token.
  - Recuperar/cambiar contraseña.
  - Perfiles completos (nombre, teléfono, dirección, rol, estado, etc.).
  - Preferencias (tema, idioma, notificaciones).
  - Chat y notificaciones.

#### Proyecto Supabase 2 (Operación Comercial)
- Finalidad: **pedidos, comisiones, wallet, estadísticas**.
- Tablas (conceptuales):
  - `orders` (pedido: producto texto, precio, talla, cliente, dirección, pago...).
  - `order_images` (hasta 10 imágenes por pedido, vía Storage).
  - `wallet_entries` (movimientos de billetera).
  - `payout_requests` (solicitudes de pago).
  - `metrics_*` (tablas de agregados/estadísticas si son necesarias).
- Responsabilidades:
  - Registro de pedidos reales.
  - Cálculo automático de comisiones y wallet.
  - Gestión de solicitudes de pago.
  - Estadísticas de ventas/pedidos/comisiones.

### 3.3 Clientes Supabase en la App
- `src/services/supabase/authClient.ts`
  - Conectado **solo** a Proyecto 1.
  - Uso: Auth, perfiles, notificaciones, chat.
- `src/services/supabase/businessClient.ts`
  - Conectado **solo** a Proyecto 2.
  - Uso: pedidos, wallet, comisiones, estadísticas, imágenes.
- Regla: **Nunca mezclar consultas** entre clientes.

### 3.4 Almacenamiento Local y Offline
- IndexedDB (via biblioteca ligera o wrapper propio) para:
  - Cache de pedidos locales.
  - Cola de sincronización.
- Service Worker para cache estático y modo PWA.

## 4. Organización del Repositorio (Feature First)

```text
src/
  app/                     # Rutas, layouts, entrypoints
  components/              # Componentes UI reutilizables (Atomic Design)
    layout/                # Header, BottomNav, contenedores
    ui/                    # Primitivas (botones, inputs, etc.)
  features/                # Módulos de negocio
    auth/                  # Login, registro, sesión, roles
    profile/               # Perfil de gestor
    orders/                # Creación y gestión de pedidos
    wallet/                # Billetera y comisiones
    payouts/               # Solicitudes de pago
    notifications/         # Notificaciones personales
    chat/                  # Chat Admin ↔ Gestor (texto)
    analytics/             # Dashboards y estadísticas
    settings/              # Configuración (tema, idioma, etc.)
  services/
    supabase/              # authClient, businessClient
    sync/                  # Motor Offline First (IndexedDB + cola)
    security/              # Helpers de seguridad (rate limit, CSRF, etc.)
  lib/                     # Utils generales (formato, fechas, etc.)
  types/                   # Tipos globales compartidos
```

## 5. Roadmap por Fases (Actualizado)

### FASE 0 — Auditoría y Limpieza ✅
- Eliminar catálogo, inventario y productos falsos.
- Eliminar auth simulado y stores en localStorage.
- Dejar todas las pantallas de negocio en modo "No existen datos disponibles".

### FASE 1 — Arquitectura Supabase & Roadmap ✅
- [x] Definir este Master Development Roadmap.
- [x] Crear `authClient` y `businessClient` separados.
- [x] Crear estructura de carpetas `features/*`, `services/*`.
- [x] Alinear las rutas actuales (Home, Pedidos, Wallet, Perfil, Login, Registro) con el modelo de negocio (sin mocks).
- [x] Implementar round-robin entre 2 proyectos Supabase.
- [x] Validaciones específicas Cuba (+53, carnet 11 dígitos, tarjeta 13-19 dígitos).
- [x] Página de bienvenida (Welcome) con diseño mobile-first.
- [x] Chat Admin ↔ Gestor (página funcional).
- [x] FloatingToolKit de diagnósticos.
- [x] PWA con Service Worker y manifest.json.
- [x] Dashboard principal con datos reales de Supabase.
- [x] Páginas de Pedidos y Wallet conectadas a datos reales.
- [x] Página de Perfil con datos reales del gestor.

### FASE 2 — Core Auth (Supabase Proyecto 1/2 con Round-Robin) ✅
- [x] Integrar Supabase Auth (login, registro, logout, refresh token) con round-robin.
- [x] Implementar formulario de registro profesional con React Hook Form + Zod.
- [x] Guardar perfiles en `profiles` (en el proyecto asignado por round-robin).
- [x] Proteger rutas por rol (admin/gestor) con AuthGate y redirección a /welcome.
- [x] Login que busca en ambos proyectos automáticamente.

### FASE 3 — Modelo de Pedidos (Supabase, proyecto del usuario) 🔄
- [x] Definir tablas `orders` y `order_images` en ambos proyectos.
- [x] Página de Pedidos que lee datos reales de Supabase.
- [ ] Implementar formulario de creación de pedido:
  - Producto (texto), precio, talla(s), cliente, dirección, teléfono, tipo de pago.
  - Precio domicilio, hora entrega, observaciones (opcionales).
- [ ] Subida de hasta 10 imágenes por pedido:
  - Eliminar metadatos EXIF.
  - Redimensionar, comprimir, convertir a WebP antes de subir.

### FASE 4 — Wallet & Comisiones (Supabase, proyecto del usuario) 🔄
- [x] Definir `wallet_entries` y lógica de cálculo.
- [x] Página de Wallet que muestra balance, comisiones y movimientos reales.
- [ ] Actualizar wallet únicamente desde pedidos vendidos (trigger en Supabase).
- [x] Mostrar saldo disponible, total comisiones, total pagado.

### FASE 5 — Solicitudes de Pago (Supabase Proyecto 2)
- [ ] Definir tabla `payout_requests`.
- [ ] Flujo: pendiente → aprobado → pagado → rechazado.
- [ ] Integración con wallet (bloqueo/desbloqueo de montos).

### FASE 6 — Chat & Notificaciones (Supabase Proyecto del usuario) 🔄
- [x] Definir tablas `messages` y `notifications` en ambos proyectos.
- [x] Chat Admin ↔ Gestor (solo texto) — página funcional.
- [ ] Notificaciones personales (nuevos pedidos, pagos, cambios de estado).
- [ ] Real-time con Supabase subscriptions para chat y notificaciones.

### FASE 7 — Dashboards y Estadísticas Reales
- [ ] Panel Admin: métricas globales (ventas, pedidos, comisiones, ganancias).
- [ ] Panel Gestor: rendimiento individual.
- [ ] Gráficos y KPIs basados en datos de Supabase 2.

### FASE 8 — Offline First & Sync Engine
- [ ] Diseñar motor de sincronización (services/sync).
- [ ] Cache local de pedidos y cambios en IndexedDB.
- [ ] Cola de sincronización con reintentos y resolución de conflictos.
- [ ] Detección de conexión y feedback visual.

### FASE 9 — Seguridad Avanzada
- [ ] Configurar RLS estrictas en Supabase 1 y 2.
- [ ] Validaciones con Zod en cliente y servidor.
- [ ] Rate limiting y protección fuerza bruta en endpoints sensibles.
- [ ] Medidas contra XSS, CSRF, inyección y spam.

### FASE 10 — Optimización y PWA 🔄
- [x] Service Worker + estrategia de cache Network First.
- [x] Manifest.json configurado con iconos e idioma español.
- [x] Instalable en Android/iOS/Windows.
- [ ] Lazy loading y code splitting por feature.
- [ ] Mejora de rendimiento en dispositivos de gama media-baja.

### FASE 11 — Testing y Calidad
- [ ] Tests unitarios (lógica de dominio, servicios, helpers).
- [ ] Tests de integración (flujos críticos: login, crear pedido, vender, wallet).
- [ ] Tests E2E para flujos clave de Admin y Gestor.

### FASE 12 — Producción y Release
- [ ] Hardening de seguridad.
- [ ] Documentación funcional y técnica.
- [ ] Estrategia de despliegue.
- [ ] Monitorización y logging.

## 6. Módulos Principales

- **Auth & Perfiles (Supabase 1)**
  - Registro, login, roles, estado.
  - Perfiles completos, configuración de tema/idioma.
- **Gestores**
  - Información del gestor, experiencia, fecha de ingreso.
- **Pedidos (Supabase 2)**
  - Creación/edición/listado de pedidos.
  - Campos obligatorios y opcionales según negocio.
- **Wallet & Comisiones (Supabase 2)**
  - Cálculo automático desde pedidos vendidos.
- **Payouts (Supabase 2)**
  - Solicitudes de pago y su ciclo de vida.
- **Chat & Notificaciones (Supabase 1)**
  - Mensajes de texto y notificaciones personales.
- **Dashboards & Analytics**
  - Vistas para Administrador y Gestor.
- **Settings**
  - Preferencias locales y remotas.

## 7. Dependencias Clave

- `next`, `react`, `react-dom` — core frontend.
- `@supabase/supabase-js` — cliente Supabase para ambos proyectos.
- `@tanstack/react-query` — cache y fetching de datos remotos.
- `framer-motion` — animaciones suaves tipo app nativa.
- `tailwindcss` — diseño responsivo.
- `zod`, `@hookform/resolvers`, `react-hook-form` — validación y formularios.

## 8. Flujo de Trabajo (High-level)

1. El Gestor inicia sesión (Supabase Auth, Proyecto 1).
2. Obtiene su perfil y estado (activo/inactivo, rol, etc.).
3. Tras atender a un cliente por WhatsApp, abre YOLE SHOP APP y crea un pedido (Proyecto 2).
4. El Admin revisa y cambia el estado del pedido (pendiente → confirmado → vendido/cancelado).
5. Cuando el pedido se marca como vendido, se generan entradas en la wallet del Gestor.
6. El Gestor revisa su billetera y solicita pagos.
7. El Admin gestiona solicitudes de pago.
8. Chat y notificaciones informan a ambas partes de cambios importantes.

## 9. Riesgos y Mitigación

- **Riesgo:** Dependencia fuerte de Supabase (disponibilidad).
  - *Mitigación:* Offline First, cache local y reintentos de sincronización.
- **Riesgo:** Errores de RLS que permitan ver datos de otros gestores.
  - *Mitigación:* Validación y test específicos de políticas RLS.
- **Riesgo:** Latencia en conexiones móviles.
  - *Mitigación:* React Query con cache, prefetch y modos “stale-while-revalidate”.
- **Riesgo:** Abuso de endpoints (fuerza bruta, bots).
  - *Mitigación:* Rate limiting, captchas donde sea necesario, logs y alertas.

## 10. Estrategia de Escalabilidad

- Separación por responsabilidades entre Supabase 1 y 2.
- Feature-first en frontend para aislar módulos.
- Uso de React Query para consumir datos de forma eficiente.
- Posibilidad de extraer micro-servicios específicos en el futuro (por ejemplo, cálculo de estadísticas) sin romper el frontend.

## 11. Estrategia Offline First

- IndexedDB como almacenamiento local secundario (no como fuente de verdad).
- Motor de sincronización que:
  - Registre operaciones offline (crear pedido, actualizar estado, etc.).
  - Reproduzca las operaciones cuando vuelva la conexión.
  - Muestre estados claros (pendiente de sincronizar, sincronizado, error).
- Service Worker para cache estático y shell de la app.

## 12. Estrategia de Seguridad

- Uso exclusivo de JWT de Supabase Auth para sesiones.
- RLS estrictas por rol y por gestor en Supabase 1 y 2.
- Validaciones con Zod en formularios y al recibir datos en el servidor.
- Protección contra XSS, CSRF, inyección, fuerza bruta y spam.
- Nunca confiar en el cliente: todas las reglas críticas en el backend (Supabase).

## 13. Estrategia de Base de Datos

- **Supabase Proyecto 1:** identidad, perfiles, chat, notificaciones.
- **Supabase Proyecto 2:** pedidos, imágenes, wallet, comisiones, payouts, estadísticas.
- No se almacenan usuarios ni auth en Proyecto 2.
- No hay tablas duplicadas ni sincronización artificial entre proyectos.

## 14. Estrategia de Testing

- Tests unitarios para lógica de dominio (cálculo de comisiones, reglas de wallet).
- Tests de integración para flujos entre cliente y Supabase.
- Tests E2E para rutas críticas (crear pedido, vender, ver wallet, solicitar pago).

## 15. Estrategia de Producción

- Builds optimizados de Next.js.
- Monitorización de errores (Sentry u otra solución similar, futuro).
- Logs de auditoría básicos (alta/baja/actualización de pedidos y pagos).
- Proceso claro de despliegue y rollback.