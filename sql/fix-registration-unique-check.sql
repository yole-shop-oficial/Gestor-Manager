-- ============================================================
-- FIX: Registro opaque 500 — chequeo de unicidad antes de signUp
-- Aplicar a: P1 y P2
-- PROBLEMA: si un nuevo usuario se registra con un carnet (id_card)
--   o nombre de usuario (username) que YA existe, el trigger
--   handle_new_user lanza una violación de UNIQUE constraint
--   (23505) → el signup entero hace rollback → GoTrue devuelve 500.
--   El cliente (supabase-js) solo ve "AuthRetryableFetchError 500"
--   y lo muestra como "Error de conexión" (engañoso).
-- SOLUCIÓN: RPC SECURITY DEFINER que permite al flujo de registro
--   (que corre como anónimo, sin acceso a profiles por RLS)
--   comprobar disponibilidad ANTES de signUp y mostrar un mensaje claro.
-- Seguridad: solo revela "existe/no existe", no datos sensibles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_registration_available(
  p_id_card text,
  p_username text
) RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'id_card_taken',
      p_id_card IS NOT NULL
      AND p_id_card <> ''
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id_card = p_id_card),
    'username_taken',
      p_username IS NOT NULL
      AND p_username <> ''
      AND EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username)
  );
$$;

REVOKE ALL ON FUNCTION public.check_registration_available(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_registration_available(text, text) TO anon, authenticated;
