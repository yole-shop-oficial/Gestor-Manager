# 🎨 Guía: Configurar Plantillas de Correo en Supabase

## ¿Dónde se configuran los correos?

1. Ve a tu **Supabase Dashboard**
2. Selecciona tu proyecto (Proyecto 1 o Proyecto 2)
3. En el menú lateral izquierdo, ve a **Authentication** → **Email Templates**
4. Verás una lista de plantillas que puedes editar

---

## 📋 Plantillas disponibles en Supabase

| Plantilla | Cuándo se envía | Archivo HTML |
|-----------|----------------|--------------|
| **Confirm signup** | Cuando un usuario se registra | `confirm-signup.html` |
| **Reset password** | Cuando el usuario olvida su contraseña | `reset-password.html` |
| **Magic link** | Login sin contraseña | `magic-link.html` |
| **Invite user** | Cuando un admin invita a alguien | `invite-user.html` |
| **Change email address** | Cuando el usuario cambia su correo | `change-email.html` |

---

## 🔧 Cómo configurar cada plantilla

### Paso 1: Abrir la plantilla en Supabase

1. En **Authentication** → **Email Templates**
2. Haz clic en la plantilla que quieras editar (ej: "Confirm signup")
3. Verás un editor de texto con el HTML actual

### Paso 2: Reemplazar el contenido

1. Abre el archivo HTML correspondiente de la carpeta `email-templates/`
2. **Copia TODO el contenido** del archivo
3. **Pégalo** en el editor de Supabase, reemplazando todo lo que había

### Paso 3: Variables de Supabase

Las plantillas usan variables especiales que Supabase reemplaza automáticamente:

| Variable | Qué hace |
|----------|----------|
| `{{ .ConfirmationURL }}` | URL de confirmación (clic del botón) |
| `{{ .Token }}` | Token numérico (si prefieres mostrar código) |
| `{{ .Email }}` | Correo del destinatario |
| `{{ .SiteURL }}` | URL de tu sitio |

**NO cambies estas variables** — Supabase las reemplaza con datos reales al enviar el correo.

### Paso 4: Guardar

1. Haz clic en **Save** al final de la página
2. Repite para cada plantilla

---

## ⚙️ Configuración del remitente (opcional pero recomendado)

### Opción A: Usar el remitente por defecto de Supabase
Supabase envía los correos desde `noreply@supabase.io`. Funciona sin configuración adicional.

### Opción B: Usar tu propio dominio (más profesional)

1. Ve a **Project Settings** → **Authentication**
2. En **SMTP Settings**, desactiva "Enable Custom SMTP" o configúralo
3. Para usar Gmail como remitente:
   - **Host**: smtp.gmail.com
   - **Port**: 587
   - **User**: tu-correo@gmail.com
   - **Pass**: [contraseña de aplicación de Google](https://support.google.com/accounts/answer/185833)
   - **Sender email**: tu-correo@gmail.com
   - **Sender name**: YOLE SHOP

> ⚠️ **NO uses tu contraseña normal de Gmail**. Necesitas crear una "Contraseña de aplicación" en tu cuenta de Google.

### Opción C: Usar un servicio profesional (RECOMENDADO)

Los mejores servicios gratuitos/baratos:
- **Resend** (https://resend.com) — 100 correos/día gratis, setup fácil
- **SendGrid** — 100 correos/día gratis
- **Mailgun** — 5000 correos/mes gratis

Para configurar Resend:
1. Crea cuenta en resend.com
2. Verifica tu dominio (o usa el dominio de prueba)
3. Obtén tu API key
4. En Supabase → Project Settings → Authentication → SMTP:
   - **Host**: smtp.resend.com
   - **Port**: 465
   - **User**: resend
   - **Pass**: tu-api-key-de-resend
   - **Sender email**: onboarding@resend.dev (o tu dominio verificado)
   - **Sender name**: YOLE SHOP

---

## 🔐 Configurar "Confirm Email" (muy importante)

1. Ve a **Authentication** → **Providers** → **Email**
2. Activa **Confirm email** = ON (recomendado)
3. Esto hace que los usuarios deban confirmar su correo antes de acceder
4. **Si Confirm Email está OFF**: los usuarios pueden hacer login inmediatamente sin confirmar

### ¿Por qué "Confirm Email" = ON es importante?

- Evita registros con correos falsos
- El trigger `handle_new_user()` funciona correctamente (SECURITY DEFINER)
- Los datos del formulario se guardan completos en el INSERT del trigger
- No se necesita UPDATE después del signUp (esto solucionaba el bug de campos NULL)

---

## 🎯 Resumen de pasos

1. ✅ Ejecutar `sql/fix-rls-trigger-v2.sql` en **AMBOS** proyectos
2. ✅ Ejecutar `sql/migration-gestor-status.sql` en **AMBOS** proyectos (si ya tenías datos)
3. ✅ Configurar plantillas de correo en **AMBOS** proyectos:
   - Confirm signup → `confirm-signup.html`
   - Reset password → `reset-password.html`
   - Magic link → `magic-link.html`
   - Invite user → `invite-user.html`
   - Change email → `change-email.html`
4. ✅ Configurar SMTP (opcional) para remitente personalizado
5. ✅ Activar "Confirm Email" en Authentication → Providers → Email
6. ✅ Subir el nuevo `api.ts` a GitHub (pasa todos los datos en metadata)
