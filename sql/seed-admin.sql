-- ============================================================
-- SEED: Crear usuario administrador
-- ============================================================
-- EJECUTAR EN: SQL Editor del Proyecto 1 de Supabase
-- 
-- IMPORTANTE: Cambia el correo y contraseña antes de ejecutar.
-- Después de ejecutar esto, ve a Authentication > Users
-- en Supabase y verifica que el usuario se creó.
--
-- NOTA: Este SQL crea el usuario en Auth y el perfil.
-- La contraseña se establece directamente en auth.users.
-- ============================================================

-- Paso 1: Insertar usuario admin en auth.users
-- Cambia el email y la contraseña (password_hash)
-- La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo

-- OPCIÓN A: Si quieres que el admin se registre normalmente y luego cambies su rol:
--   1. Regístrate normalmente desde la app con el correo admin
--   2. Ejecuta solo el PASO 2 de este archivo para cambiar el rol

-- OPCIÓN B: Crear el admin directamente desde SQL:
--   Descomenta y ejecuta el siguiente bloque:

/*
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'ADMIN@GMAIL.COM',  -- ← CAMBIA ESTO
  crypt('TuPassword123!', gen_salt('bf')),  -- ← CAMBIA ESTO
  now(),
  '',
  '',
  '',
  '',
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Administrador YOLE", "display_name": "admin", "role": "admin", "assigned_project": "1"}'
);
*/

-- Paso 2: Actualizar el perfil del admin a rol 'admin'
-- Si usaste la OPCIÓN A (registro normal), ejecuta esto:
-- Cambia el email por el que usaste al registrarte

UPDATE public.profiles
SET 
  role = 'admin',
  status = 'active'
WHERE email = 'ADMIN@GMAIL.COM'  -- ← CAMBIA ESTO por tu correo real
;

-- Verificar
SELECT id, email, full_name, role, status, assigned_project
FROM public.profiles
WHERE role = 'admin';

-- ============================================================
-- NOTA: Si prefieres la OPCIÓN A (más fácil y segura):
--   1. Regístrate desde la app con tu correo Gmail
--   2. Ejecuta solo el PASO 2 cambiando el email
--   3. Tu cuenta será admin y estará activa inmediatamente
-- ============================================================
