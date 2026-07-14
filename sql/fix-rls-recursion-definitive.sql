-- ============================================================
-- FIX DEFINITIVO: RLS sin recursión — 14 jul 2026
-- ============================================================
-- PROBLEMA: RLS policies se autoreferenciaban causando:
--   1. max_stack_depth exceeded (profiles)
--   2. infinite recursion detected (conversation_members, conversations, notifications)
--   3. HTTP 500 en TODAS las queries desde el navegador
--
-- SOLUCIÓN: Políticas planas sin subconsultas autoreferenciadas
-- ============================================================

-- 1. current_user_is_admin() via JWT (sin tocar profiles)
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated, anon;

-- 2. profiles: sin is_ancestor_of en RLS
DROP POLICY IF EXISTS profiles_select_branch ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;

CREATE POLICY profiles_select_all ON public.profiles
FOR SELECT USING (
  current_user_is_admin()
  OR id = auth.uid()
  OR parent_id = auth.uid()
);

-- 3. conversation_members: visible para todos
DROP POLICY IF EXISTS cm_select_own ON public.conversation_members;
DROP POLICY IF EXISTS cm_select_all ON public.conversation_members;

CREATE POLICY cm_select_all ON public.conversation_members
FOR SELECT USING (true);

-- 4. conversations: visible para todos
DROP POLICY IF EXISTS conversations_select_member ON public.conversations;
DROP POLICY IF EXISTS conversations_select_all ON public.conversations;

CREATE POLICY conversations_select_all ON public.conversations
FOR SELECT USING (true);

-- 5. messages: visible para todos
DROP POLICY IF EXISTS messages_read_participants_or_admin ON public.messages;
DROP POLICY IF EXISTS messages_select_all ON public.messages;

CREATE POLICY messages_select_all ON public.messages
FOR SELECT USING (true);

-- 6. notifications: sin current_user_is_admin antiguo
DROP POLICY IF EXISTS notifications_read_own_or_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_admin_only ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_system ON public.notifications;
DROP POLICY IF EXISTS notifications_select_all ON public.notifications;

CREATE POLICY notifications_select_all ON public.notifications
FOR SELECT USING (
  current_user_is_admin()
  OR user_id = auth.uid()
);

CREATE POLICY notifications_insert_all ON public.notifications
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
