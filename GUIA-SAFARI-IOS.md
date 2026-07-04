# 📱 Guía: Problemas con Safari/iOS y PWA

## Problema 1: "Safari no puede abrir la página porque no encuentra el servidor"

### Causas más probables (por orden de frecuencia):

#### A) DNS/IPv6 — LA CAUSA #1 EN CUBA 🇨🇺
iOS intenta conectarse por **IPv6 primero**. Si el DNS tiene registro AAAA (IPv6) pero el servidor no responde por IPv6, iOS muestra "no encuentra el servidor" mientras Android (que cae más rápido a IPv4) sí funciona.

**Cómo verificar:**
1. En el iPhone, ve a **Ajustes → Wi-Fi**
2. Toca el **(i)** de la red conectada
3. Busca **"Configurar DNS"**
4. Si dice "Automático", cámbialo a **"Manual"**
5. Agrega estos DNS:
   - `8.8.8.8` (Google)
   - `8.8.4.4` (Google)
   - `1.1.1.1` (Cloudflare)
6. Guarda y recarga la página

**¿Por qué funciona esto?** Los DNS de ETECSA en Cuba a veces tienen problemas resolviendo dominios de Vercel, especialmente el registro AAAA (IPv6).

#### B) iCloud Private Relay (iOS 15+)
Si tienen activado **"Relay privado"** (iCloud+), puede bloquear ciertos dominios.

**Cómo desactivar:**
1. **Ajustes → [tu nombre] → iCloud → Relay privado**
2. Desactivar temporalmente
3. Recargar la página

#### C) Cookies/Sitios rastreados bloqueados
Safari bloquea trackers por defecto, lo que a veces afecta dominios nuevos.

**Cómo verificar:**
1. **Ajustes → Safari → Privacidad y seguridad**
2. Desactivar "Prevenir rastreo entre sitios"
3. Recargar

---

## Problema 2: No aparece el cartel para instalar como App

### En iPhone NO existe el prompt automático de "Instalar App"
Android Chrome muestra un banner automático "¿Agregar a pantalla de inicio?". **iOS Safari NUNCA hace esto.** Es una limitación de Apple, no un bug de la app.

### Cómo instalar en iPhone (manualmente):
1. Abre la app en **Safari** (no en Chrome ni Firefox del iPhone)
2. Toca el botón **Compartir** (cuadrado con flecha arriba, abajo en la barra de Safari)
3. Baja en el menú hasta encontrar **"Agregar a pantalla de inicio"**
4. Toca **"Agregar"**
5. ¡Listo! YOLE SHOP aparece como una app en tu pantalla de inicio

### ¿Qué hizo la app para ayudar?
- ✅ Se agregó un **banner de instalación** que aparece automáticamente en iOS después de 3 segundos
- ✅ El banner muestra instrucciones paso a paso con iconos
- ✅ Se puede descartar si el usuario no quiere instalar

---

## Lo que cambiamos en el código para arreglar iOS

### 1. ✅ Iconos PNG con tamaño correcto
**Antes:** Los archivos PNG eran 1024x1024 pero decían 192x192 → Safari rechazaba
**Ahora:** Cada PNG tiene su tamaño real correcto (180x180, 192x192, 512x512)

### 2. ✅ Apple Touch Icon de 180x180
**Antes:** Solo existía icon-192x192.png declarado como apple
**Ahora:** Icono dedicado de 180x180 (tamaño exacto que iOS espera)

### 3. ✅ Viewport sin maximumScale=1
**Antes:** `maximumScale: 1, userScalable: false` → iOS Safari 16+ lo bloquea
**Ahora:** Sin maximumScale — iOS permite zoom normal

### 4. ✅ Service Worker compatible con Safari
**Antes:** Cacheaba TODO (incluyendo HTML navigation) → Safari colgaba
**Ahora:**
- Navegación HTML = **Network Only** (Safari carga la página siempre fresca)
- Assets estáticos (CSS, JS, imágenes) = **Cache First**
- API/Supabase = **Network Only** (nunca cachear)

### 5. ✅ Headers correctos para manifest.json y sw.js
**Antes:** `next.config.ts` vacío
**Ahora:** Headers con Content-Type correcto, Cache-Control apropiado

### 6. ✅ Meta tags Apple completos
**Antes:** Solo appleWebApp básico
**Ahora:**
- `apple-mobile-web-app-capable: yes`
- `apple-mobile-web-app-status-bar-style: black-translucent`
- `apple-touch-icon` de 180x180
- `format-detection: telephone=no`

### 7. ✅ Página /auth/callback para confirmación de email
**Antes:** No existía → Safari no sabía dónde ir tras confirmar email
**Ahora:** Página que verifica el hash token y redirige al login

### 8. ✅ Banner iOS de instalación
**Antes:** No existía
**Ahora:** Componente IOSInstallBanner que detecta iOS y muestra pasos

---

## Pasos para verificar en el iPhone

1. **Verificar DNS:** Ajustes → Wi-Fi → (i) → Configurar DNS → Manual → 8.8.8.8 / 1.1.1.1
2. **Abrir en Safari** (no Chrome del iPhone)
3. **Esperar 3 segundos** → debe aparecer el banner de "Instalar YOLE SHOP"
4. **Tocar Compartir** → "Agregar a pantalla de inicio"
5. Si no carga, probar con datos móviles (a veces la Wi-Fi de ETECSA bloquea)

---

## Configuración en Supabase para que el callback funcione

1. Ir a **Authentication → URL Configuration**
2. En **Redirect URLs**, agregar:
   - `https://tu-dominio.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (para desarrollo)
3. En **Site URL**, poner:
   - `https://tu-dominio.vercel.app`
4. Esto hace que cuando el usuario confirma su email, Supabase lo redirija a `/auth/callback`
