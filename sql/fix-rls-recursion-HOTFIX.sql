-- ============================================================
-- HOTFIX: RLS Recursion + app_metadata.role — Ambos Proyectos
-- ============================================================
-- PROBLEMA: Todas las queries REST API devuelven HTTP 500
-- CAUSA RAÍZ:
--   1. Políticas RLS en app_logs, conversation_members, message_reactions
--      hacían SELECT FROM profiles WHERE role='admin' → recursión infinita
--      (profiles también tiene RLS que usa current_user_is_admin())
--   2. El usuario admin NO tenía app_metadata.role = 'admin' en su JWT
--      → current_user_is_admin() siempre devolvía false
--   3. profiles_select_all era muy restrictivo (solo admin podia ver todos)
-- SOLUCIÓN:
--   1. Reemplazar SELECT FROM profiles por current_user_is_admin() en RLS
--   2. Setear app_metadata.role = 'admin' para el usuario admin
--   3. profiles_select_all permite todos los usuarios autenticados ver profiles
-- ============================================================
-- EJECUTAR EN AMBOS PROYECTOS (P1: lustmqeqbninkavixttz, P2: lqwyidsixjzjffwtrltw)
-- ============================================================

-- ═══ FIX 1: app_logs — reemplazar SELECT directo por current_user_is_admin() ═══
DROP POLICY IF EXISTS "Admin can read logs" ON public.app_logs;
CREATE POLICY "Admin can read logs" ON public.app_logs
  FOR SELECT TO authenticated
  USING (current_user_is_admin());

-- ═══ FIX 2: conversation_members INSERT — reemplazar SELECT directo por current_user_is_admin() ═══
DROP POLICY IF EXISTS "cm_insert_all" ON public.conversation_members;
CREATE POLICY "cm_insert_all" ON public.conversation_members
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid())
    OR (EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_members.conversation_id
        AND c.created_by = auth.uid()
    ))
    OR current_user_is_admin()
  );

-- ═══ FIX 3: message_reactions SELECT — reemplazar SELECT directo por current_user_is_admin() ═══
DROP POLICY IF EXISTS "reactions_select_participants" ON public.message_reactions;
CREATE POLICY "reactions_select_participants" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM messages
    WHERE messages.id = message_reactions.message_id
      AND (
        messages.sender_id = auth.uid()
        OR messages.recipient_id = auth.uid()
        OR current_user_is_admin()
      )
  ));

-- ═══ FIX 4: profiles SELECT — permitir todos los usuarios autenticados ═══
-- (Necesario para chat, red, admin panel)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ═══ FIX 5: Setear app_metadata.role = 'admin' para el usuario admin ═══
-- (Esto hace que current_user_is_admin() funcione en el JWT)
-- NOTA: Solo ejecutar en P1 (donde está el admin)
-- UPDATE auth.users SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"')
--   WHERE id = '715414ad-5dff-424f-bd57-7c423d1683d1';

-- ═══ FIX 6: El admin DEBE cerrar sesión y volver a entrar ═══
-- El JWT se genera en login. app_metadata.role solo aparece en JWT nuevos.
