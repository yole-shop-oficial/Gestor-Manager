# 🔴 INFORME DE AUDITORÍA TÉCNICA COMPLETA
## Proyecto: YOLE SHOP APP — Flujo de Registro
## Fecha: 2026-07-04
## Estado actual: CORRECCIONES APLICADAS ✅

---

## ═══════════════════════════════════════════════════════════
## ✅ CORRECCIONES APLICADAS (2026-07-04)
## ═══════════════════════════════════════════════════════════

### ✅ FIX #1 — Fábrica centralizada de clientes Supabase
**Nuevo archivo:** `src/services/supabase/clientFactory.ts`

**Problema:** 6-7 instancias de GoTrueClient con storageKeys duplicados causaban `AuthRetryableFetchError`.

**Solución:** Creé `clientFactory.ts` que mantiene un `Map<string, SupabaseClient>` global. Cada storageKey produce exactamente UN singleton. Todos los demás archivos usan `getOrCreateClient()` en vez de `createClient()` directamente.

**StorageKeys centralizadas:**
| StorageKey | Uso | persistSession |
|------------|-----|----------------|
| `yole-auth-p1` | Cliente auth persistente Proyecto 1 | true |
| `yole-auth-p2` | Cliente auth persistente Proyecto 2 | true |
| `yole-business-p2` | Cliente business Proyecto 2 | false |
| `yole-register-p1` | Cliente temporal registro P1 | false |
| `yole-register-p2` | Cliente temporal registro P2 | false |

**Archivos actualizados para usar la fábrica:**
- `authBrowserClient.ts` → usa `getOrCreateClient()` con `STORAGE_KEYS.AUTH_P1`
- `businessBrowserClient.ts` → usa `getOrCreateClient()` con `STORAGE_KEYS.BUSINESS_P2`
- `roundRobin.ts` → usa `getOrCreateClient()` con storageKeys oficiales

**Resultado:** Ya NO hay colisión entre `authBrowserClient` y `createLoginClient()` para P1, porque AMBOS obtienen el MISMO singleton de la fábrica.

---

### ✅ FIX #2 — `createTempClient()` → singleton por storageKey
**Archivo:** `src/services/supabase/roundRobin.ts`

**Problema:** Cada llamada a `createTempClient()` creaba una NUEVA instancia de GoTrueClient, causando "Multiple GoTrueClient instances detected".

**Solución:** Reemplacé `createTempClient()` por `getOrCreateRegistrationClient()` que usa la fábrica. Ahora la primera llamada crea el cliente, las siguientes reutilizan el mismo.

---

### ✅ FIX #3 — `determineProjectForRegistration()` con fallback
**Archivo:** `src/services/supabase/roundRobin.ts`

**Problema:** Si las env vars del Proyecto 2 no estaban configuradas, lanzaba `Error` y bloqueaba todo el registro.

**Solución:** Ahora:
- Si NINGÚN proyecto está configurado → Error (correcto, no se puede funcionar)
- Si solo P1 está configurado → Usa P1 con warning
- Si solo P2 está configurado → Usa P2 con warning (caso raro)
- Si ambos están configurados → Round-robin normal

---

### ✅ FIX #4 — `connectivity.ts` sin `mode: "no-cors"`
**Archivo:** `src/services/supabase/connectivity.ts`

**Problema:** `mode: "no-cors"` siempre resuelve como respuesta opaca (type: "opaque", status: 0), lo que significa que NUNCA fallaba, incluso si el proyecto estaba caído.

**Solución:**
- Reemplacé todos los `fetch(..., { mode: "no-cors" })` por fetch normal con timeout (8s)
- Nueva función `checkSupabaseUrl()` que usa `AbortController` para timeout
- Si el servidor responde (cualquier status < 500) = conectado
- Si hay error de red o timeout = no conectado
- La consulta a `_connectivity_check` se reemplazó por `round_robin_counter` (tabla que SÍ existe)

---

### ✅ FIX #5 — Catch vacíos eliminados
**Archivos:** `connectivity.ts`, `FloatingToolKit.tsx`

**Problema:** 5+ bloques catch vacíos que ocultaban errores.

**Solución:** Todos los catch ahora tienen `console.error()` o `console.warn()` con el mensaje del error.

---

### ✅ FIX #6 — SSR clients usan `NEXT_PUBLIC_` en vez de `VITE_`
**Archivos:** `authClient.ts`, `businessClient.ts`

**Problema:** Usaban `process.env.VITE_SUPABASE_*` que es una convención de Vite, no de Next.js.

**Solución:** Ahora intentan `NEXT_PUBLIC_SUPABASE_*` primero, luego `SUPABASE_*` (sin prefijo, solo servidor). Mensajes de warning actualizados.

---

### ✅ FIX #7 — FloatingToolKit usa diagnósticos de la fábrica
**Archivo:** `src/components/floating/FloatingToolKit.tsx`

**Mejoras:**
- Nueva herramienta "Clientes Supabase" que muestra cuántos clientes hay y sus storageKeys
- Eliminado `mode: "no-cors"` del ping y medidor de velocidad
- Timeout de 8s en todas las peticiones
- Catch con logging explícito

---

### ✅ FIX #8 — ESLint: `Date.now()` en render
**Archivo:** `src/app/notifications/page.tsx`

**Problema:** `react-hooks/purity` rechazaba `Date.now()` dentro de la función `timeAgo` llamada durante el render.

**Solución:** `now` se almacena en `useState` y se actualiza cada 60s con `setInterval`. `timeAgo` usa `useCallback` con `now` como dependencia.

---

### ✅ FIX #9 — Validación cruzada confirmPassword con superRefine
**Archivo:** `src/features/auth/validation.ts`

**Problema:** El `.refine()` del schema completo solo se ejecutaba con `form.trigger()` sin argumentos. Si las contraseñas no coincidían, el usuario no veía el error en el paso 3.

**Solución:** Reemplacé `.refine()` por `.superRefine()` con `ctx.addIssue()`. La validación cruzada ahora se ejecuta TAMBIÉN cuando se hace `trigger(["password", "confirmPassword"])` en el paso 3.

---

### ✅ FIX #10 — Service Worker v3 sin skipWaiting agresivo
**Archivo:** `public/sw.js`

**Problema:** `skipWaiting()` en el evento `install` forzaba al nuevo SW a tomar control inmediatamente, cancelando peticiones en vuelo (registro, login).

**Solución:** Eliminado `skipWaiting()` del install. El SW nuevo espera a que el viejo termine. Cache versión bumped de `v2` a `v3`.

---

### ✅ FIX #11 — RPC counter documentado
**Archivo:** `src/features/auth/api.ts`

**Solución:** Documentado que el RPC funciona con anon key (tabla pública). Si falla, no es crítico — el registro se completa.

---

### ✅ FIX EXTRA — Catch vacíos en settings y login
**Archivos:** `src/app/settings/page.tsx`, `src/app/login/page.tsx`

**Solución:** Agregado `console.error` con el mensaje del error.

---

### ✅ FIX EXTRA — CI workflow sin VITE_ obsoletas
**Archivo:** `.github/workflows/ci.yml`

**Solución:** Solo `NEXT_PUBLIC_SUPABASE_*`. Eliminadas VITE_.

---

### ✅ FIX EXTRA — vercel-env.txt sin VITE_
**Archivo:** `vercel-env.txt`

**Solución:** Solo variables NEXT_PUBLIC_ necesarias.

---

### ✅ FIX EXTRA — iOS zoom en inputs de registro
**Archivos:** `RegisterWizardStep*.tsx`

**Problema:** `text-sm` causa zoom automático en iOS al enfocar inputs.

**Solución:** Cambiado a `text-base` en todos los inputs del formulario de registro.

---

## ═══════════════════════════════════════════════════════════
## 📊 ESTADO DE LOS ERRORES DESPUÉS DE LAS CORRECCIONES
## ═══════════════════════════════════════════════════════════

| # | Gravedad | Error | Estado | Fix aplicado |
|---|----------|-------|--------|-------------|
| 1 | 🔴 CRÍTICO | `AuthRetryableFetchError` | ✅ CORREGIDO | clientFactory.ts |
| 2 | 🔴 CRÍTICO | No singleton en createTempClient | ✅ CORREGIDO | roundRobin.ts usa factory |
| 3 | 🔴 CRÍTICO | AuthGate crea clientes antes del registro | ✅ CORREGIDO | Factory garante singleton |
| 4 | 🟡 ALTO | connectivity con `no-cors` | ✅ CORREGIDO | fetch normal + timeout |
| 5 | 🟡 ALTO | Proyecto 2 vacío crashea | ✅ CORREGIDO | Fallback a P1 |
| 6 | 🟡 ALTO | Validación cruzada confirmPassword | ✅ CORREGIDO | superRefine con ctx.addIssue |
| 7 | 🟠 MEDIO | storageKey duplicado | ✅ CORREGIDO | Factory comparte singleton |
| 8 | 🟠 MEDIO | SW skipWaiting cancela peticiones | ✅ CORREGIDO | SW v3 sin skipWaiting agresivo |
| 9 | 🟠 MEDIO | 5 catch vacíos | ✅ CORREGIDO | Logging explícito en TODOS |
| 10 | 🟠 MEDIO | useSupabaseUser en /register | ✅ MITIGADO | Factory evita duplicados |
| 11 | 🟡 BAJO | RPC counter falla sin sesión | ✅ DOCUMENTADO | Funciona con anon key |
| 12 | 🟡 BAJO | Código duplicado | ✅ CORREGIDO | Factory centraliza |
| 13 | 🟡 BAJO | VITE_ en Next.js SSR | ✅ CORREGIDO | NEXT_PUBLIC_ + fallback |
| 14 | 🟢 INFO | Trigger SQL puede no existir | ℹ️ INFO | Ejecutar SQL en Supabase |

**Verificación:**
- ✅ `tsc --noEmit` — 0 errores
- ✅ `eslint src/` — 0 errores, 0 warnings
- ✅ Todos los archivos actualizados compilan correctamente

---

## ═══════════════════════════════════════════════════════════
## 🔴 ERRORES ORIGINALES (conservados como referencia)
## ═══════════════════════════════════════════════════════════

## 🔴 ERROR CRÍTICO #1 — `AuthRetryableFetchError: {}`

**Gravedad:** 🔴 CRÍTICO — Bloquea completamente el registro  
**Archivo:** `src/features/auth/api.ts` línea ~90  
**Causa real:** Se creaban 6-7 instancias de GoTrueClient con storageKeys duplicados.

**Evidencia del log del usuario:**
```
GoTrueClient@sb-rfkpzgdeefswpqyihvof-auth-token:1 (2.110.0) 
Multiple GoTrueClient instances detected in the same browser context.
...
AuthRetryableFetchError: {}
```

**SOLUCIÓN APLICADA:** Fábrica centralizada `clientFactory.ts` — una instancia por storageKey.

---

## 🔴 ERROR CRÍTICO #2 — `createTempClient()` sin singleton

**Gravedad:** 🔴 CRÍTICO  
**Archivo:** `src/services/supabase/roundRobin.ts` líneas 44-51  
**Problema:** Cada llamada creaba instancia nueva de GoTrueClient.

**SOLUCIÓN APLICADA:** Reemplazado por `getOrCreateRegistrationClient()` que usa la fábrica.

---

## 🔴 ERROR CRÍTICO #3 — AuthGate dispara clientes ANTES del registro

**Gravedad:** 🔴 CRÍTICO  
**Archivos:** `AuthGate.tsx` + `connectivity.ts`  
**Problema:** 6 instancias de GoTrueClient en la misma página.

**SOLUCIÓN APLICADA:** La fábrica garantiza que `authBrowserClient.ts` y `createLoginClient()` para P1 obtengan el MISMO singleton. Ya no hay duplicados.

---

## 🟡 ERROR ALTO #4 — `connectivity.ts` con `mode: "no-cors"`

**Gravedad:** 🟡 ALTO  
**Problema:** `no-cors` siempre resuelve como opaque — la verificación nunca fallaba.

**SOLUCIÓN APLICADA:** Reemplazado por fetch normal con `AbortController` timeout de 8s.

---

## 🟡 ERROR ALTO #5 — `determineProjectForRegistration()` falla si P2 vacío

**Gravedad:** 🟡 ALTO  
**Problema:** throw Error sin fallback.

**SOLUCIÓN APLICADA:** Ahora hace fallback a P1 si P2 no está configurado.

---

## 🟡 ERROR ALTO #6 — Validación cruzada confirmPassword

**Gravedad:** 🟡 ALTO  
**Problema:** El `.refine()` del schema completo no se ejecuta en `trigger(["password", "confirmPassword"])`.

**Estado:** Pendiente — no bloquea el registro actual.

---

## 🟠 ERROR MEDIO #7 — storageKey duplicado authBrowserClient + roundRobin

**Gravedad:** 🟠 MEDIO  
**Problema:** Ambos usaban `yole-auth-p1`.

**SOLUCIÓN APLICADA:** Ahora ambos usan `STORAGE_KEYS.AUTH_P1` a través de la fábrica → mismo singleton.

---

## 🟠 ERROR MEDIO #8 — SW skipWaiting cancela peticiones

**Gravedad:** 🟠 MEDIO  
**Problema:** `skipWaiting()` puede cancelar peticiones en vuelo.

**Estado:** Pendiente — bajo impacto en producción.

---

## 🟠 ERROR MEDIO #9 — 5 catch vacíos

**Gravedad:** 🟠 MEDIO  
**Problema:** Errores ocultos.

**SOLUCIÓN APLICADA:** Todos los catch ahora tienen logging explícito.

---

## 🟠 ERROR MEDIO #10 — useSupabaseUser en /register

**Gravedad:** 🟠 MEDIO  
**Problema:** Crea clientes innecesarios en la página de registro.

**SOLUCIÓN APLICADA:** La fábrica elimina el problema de duplicados. El hook ya no causa conflicto.

---

## 🟡 ERROR BAJO #11 — RPC counter falla sin sesión

**Estado:** Pendiente — no crítico, el registro funciona sin el contador.

---

## 🟡 ERROR BAJO #12 — Código duplicado

**SOLUCIÓN APLICADA:** La fábrica centraliza la creación de clientes.

---

## 🟡 ERROR BAJO #13 — VITE_ en Next.js SSR

**SOLUCIÓN APLICADA:** Cambiado a NEXT_PUBLIC_ con fallback a SUPABASE_ (sin prefijo).

---

## 🟢 INFO #14 — Trigger SQL puede no existir

**Estado:** El usuario debe ejecutar el SQL en Supabase. Los archivos están en `sql/`.

---

*Informe actualizado después de aplicar correcciones. TypeScript y ESLint pasan sin errores.*
