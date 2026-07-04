# YOLE SHOP APP — Guía de Configuración

## Requisitos
- Node.js 22+
- npm 10+
- Dos proyectos de Supabase (cuentas gratuitas en supabase.com)

## Pasos

### 1. Clonar e instalar
```bash
git clone https://github.com/yole-shop-oficial/Gestor-Manager.git
cd Gestor-Manager
npm install
```

### 2. Configurar Supabase

#### Proyecto 1
1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a SQL Editor y ejecutar `sql/project1-full-schema.sql`
3. Copiar la URL del proyecto y la anon/public key

#### Proyecto 2
1. Crear otro proyecto en Supabase
2. Ir a SQL Editor y ejecutar `sql/project2-full-schema.sql`
3. Copiar la URL del proyecto y la anon/public key

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con las URLs y keys de tus proyectos Supabase
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

### 5. Construir para producción
```bash
npm run build
npm start
```

## Estructura del Proyecto

```
src/
  app/                     # Rutas de la app
    welcome/               # Landing page
    login/                 # Inicio de sesión
    register/              # Registro de gestor (wizard 4 pasos)
    /                      # Dashboard principal
    orders/                # Gestión de pedidos
    wallet/                # Billetera y comisiones
    chat/                  # Chat con administración
    profile/               # Perfil del gestor
  components/
    layout/                # Header, BottomNav, AppLoader
    floating/              # FloatingToolKit (diagnósticos)
    ui/                    # YoleLogo, PagePreloader
    providers/             # ThemeProvider, QueryProvider
  features/
    auth/                  # Login, registro, validación Cuba
  services/
    supabase/              # Clientes, round-robin, conectividad
    sync/                  # Motor offline (placeholder)
  db/                      # Drizzle (solo para healthcheck local)
  lib/                     # Utilidades generales
sql/                       # Schemas SQL para Supabase
public/                    # Icons, manifest, SW
```

## Sistema Round-Robin

Los usuarios se distribuyen automáticamente entre los 2 proyectos de Supabase:
- Al registrarse: el sistema compara los contadores de ambos proyectos y asigna al usuario al que tenga menos registros
- Al iniciar sesión: busca primero en el proyecto guardado en localStorage, luego en P1, luego en P2
- Cada usuario vive completamente en UN solo proyecto (auth + perfil + pedidos + wallet + chat)

## Validaciones Cuba

- **Teléfono**: formato +53 (5-8 como primer dígito), normalizado automáticamente a +5351234567
- **Carnet de identidad**: 11 dígitos
- **Tarjeta bancaria**: 13-19 dígitos
- **Correo**: solo Gmail (@gmail.com)
- **Nombre**: solo letras, acentos, ñ, espacios

## FloatingToolKit

Botón flotante arrastrable con herramientas de diagnóstico:
- Estado de red
- Ping a Supabase
- Medidor de velocidad
- Almacenamiento local
- Sesión y proyecto
- Hora Cuba

## PWA

La app funciona como PWA:
- Service Worker con estrategia Network First
- Manifest.json configurado
- Iconos 192x192 y 512x512
- Instalable en Android/iOS/Windows
