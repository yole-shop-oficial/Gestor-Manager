-- ============================================================
-- TRIGGER SEGURO — Funciona con 'manager' O 'gestor' en el enum
-- ============================================================
-- EJECUTAR EN: SQL Editor de AMBOS proyectos de Supabase
-- Este trigger es SEGURO: detecta qué valores tiene el enum
-- y usa el que exista ('gestor' o 'manager')
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- PASO 1: Eliminar trigger y función anteriores
-- ═══════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- PASO 2: Asegurar que el enum app_role tenga 'gestor'
-- ═══════════════════════════════════════════════════════════
-- Si el enum todavía tiene 'manager', lo cambiamos a 'gestor'
-- Si ya tiene 'gestor', no hace nada

DO $$
BEGIN
  -- Verificar si 'gestor' ya existe en el enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'gestor'
  ) THEN
    -- Agregar 'gestor' al enum
    ALTER TYPE public.app_role ADD VALUE 'gestor';
    
    -- Actualizar filas existentes de 'manager' a 'gestor'
    UPDATE public.profiles SET role = 'gestor' WHERE role = 'manager';
    
    -- Eliminar 'manager' del enum (solo si ya no hay filas usándolo)
    ALTER TYPE public.app_role RENAME VALUE 'manager' TO 'gestor_old';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- PASO 3: Asegurar que status incluya 'denied'
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'denied', 'blocked'));

-- ═══════════════════════════════════════════════════════════
-- PASO 4: Crear la función del trigger (SEGURO)
-- ═══════════════════════════════════════════════════════════
-- Esta función:
-- - Lee TODOS los campos del formulario desde metadata
-- - Usa COALESCE seguro para cada campo
-- - Maneja correctamente los campos NULL
-- - Inserta 'gestor' como rol (o 'manager' si gestor no existe en el enum)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_project integer;
BEGIN
  -- Determinar el rol: intentar 'gestor', si falla usar 'manager'
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'gestor'
  ) THEN
    v_role := 'gestor';
  ELSE
    v_role := 'manager';
  END IF;

  -- Determinar proyecto
  v_project := COALESCE((NEW.raw_user_meta_data->>'assigned_project')::integer, 1);

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    username,
    phone,
    age,
    birth_date,
    gender,
    id_card,
    address,
    bank_card_number,
    bank_card_holder,
    transfer_confirmation_number,
    observations,
    has_sales_experience,
    join_date,
    role,
    status,
    assigned_project,
    read_privacy,
    read_terms,
    confirm_real_info,
    understand_payments
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    CASE 
      WHEN NEW.raw_user_meta_data->>'age' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'age' != ''
      THEN (NEW.raw_user_meta_data->>'age')::integer
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'birth_date' != ''
      THEN (NEW.raw_user_meta_data->>'birth_date')::date
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'gender' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'gender' != ''
      THEN NEW.raw_user_meta_data->>'gender'
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'id_card' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'id_card' != ''
      THEN NEW.raw_user_meta_data->>'id_card'
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'address' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'address' != ''
      THEN NEW.raw_user_meta_data->>'address'
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'bank_card_number' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'bank_card_number' != ''
      THEN NEW.raw_user_meta_data->>'bank_card_number'
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'bank_card_holder' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'bank_card_holder' != ''
      THEN NEW.raw_user_meta_data->>'bank_card_holder'
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'transfer_confirmation_number' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'transfer_confirmation_number' != ''
      THEN NEW.raw_user_meta_data->>'transfer_confirmation_number'
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'observations' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'observations' != ''
      THEN NEW.raw_user_meta_data->>'observations'
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'has_sales_experience' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'has_sales_experience')::boolean
      ELSE false
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'join_date' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'join_date' != ''
      THEN (NEW.raw_user_meta_data->>'join_date')::date
      ELSE current_date
    END,
    v_role,
    'pending',
    v_project,
    CASE WHEN NEW.raw_user_meta_data->>'read_privacy' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'read_privacy')::boolean ELSE false END,
    CASE WHEN NEW.raw_user_meta_data->>'read_terms' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'read_terms')::boolean ELSE false END,
    CASE WHEN NEW.raw_user_meta_data->>'confirm_real_info' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'confirm_real_info')::boolean ELSE false END,
    CASE WHEN NEW.raw_user_meta_data->>'understand_payments' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'understand_payments')::boolean ELSE false END
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Si falla el INSERT completo, intentar con campos mínimos
    -- (el perfil se puede completar después)
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, username, role, status, assigned_project)
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        v_role,
        'pending',
        v_project
      );
      RETURN NEW;
    EXCEPTION
      WHEN others THEN
        -- Si TAMBIÉN falla el mínimo, al menos no bloquear el registro
        -- El usuario se creó en auth.users, el perfil se crea manualmente después
        RAISE WARNING 'No se pudo crear perfil para usuario %: %', NEW.id, SQLERRM;
        RETURN NEW;
    END;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- PASO 5: Crear el trigger
-- ═══════════════════════════════════════════════════════════

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- PASO 6: Actualizar la default del rol
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'gestor';

-- ═══════════════════════════════════════════════════════════
-- VERIFICAR: Ejecutar esto para comprobar
-- ═══════════════════════════════════════════════════════════
-- SELECT enumlabel FROM pg_enum e
-- JOIN pg_type t ON t.oid = e.enumtypid
-- WHERE t.typname = 'app_role'
-- ORDER BY enumsortorder;
-- Debería mostrar: admin, gestor, moderator (o gestor_old en vez de manager)
