-- ============================================================
-- FIX C1 + A1 + M2 — Cerrar fuga de datos del chat (YOLE SHOP)
-- Aplicar a: P1 (lustmqeqbninkavixttz) y P2 (lqwyidsixjzjffwtrltw)
-- Transaccional: si algo falla, hace ROLLBACK automático.
-- ============================================================

BEGIN;

-- 0) Helper SECURITY DEFINER para evitar recursión de RLS.
--    Responde: ¿el usuario actual (auth.uid()) es miembro de p_conv?
--    SECURITY DEFINER => corre como owner y BYPASSA RLS (sin recursión).
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conv uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = p_conv
      AND cm.user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.is_conversation_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid) TO authenticated, anon;

-- 1) PRECONDITION (M2): todo perfil debe ser miembro de la conversación
--    global ANTES de restringir la lectura, para no romper el chat global.
INSERT INTO public.conversation_members (conversation_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001', p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_members cm
  WHERE cm.conversation_id = '00000000-0000-0000-0000-000000000001'
    AND cm.user_id = p.id
)
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- 2) === C1 — CERRAR FUGA DE LECTURA ===

-- messages: leer solo si eres miembro de la conversación (admin = todo)
DROP POLICY IF EXISTS messages_select_all ON public.messages;
CREATE POLICY messages_select_member ON public.messages
  FOR SELECT TO authenticated
  USING (
    current_user_is_admin()
    OR is_conversation_member(conversation_id)
  );

-- conversations: leer solo conversaciones propias (admin = todas)
DROP POLICY IF EXISTS conversations_select_all ON public.conversations;
CREATE POLICY conversations_select_member ON public.conversations
  FOR SELECT TO authenticated
  USING (
    current_user_is_admin()
    OR is_conversation_member(id)
  );

-- conversation_members: tus filas o miembros de tus conversaciones (admin = todas)
DROP POLICY IF EXISTS cm_select_all ON public.conversation_members;
CREATE POLICY cm_select_member ON public.conversation_members
  FOR SELECT TO authenticated
  USING (
    current_user_is_admin()
    OR user_id = auth.uid()
    OR is_conversation_member(conversation_id)
  );

-- 3) === A1 — CERRAR BYPASS DE INSERCIÓN DE MENSAJES ===
--    Antes había 2 policies INSERT PERMISSIVE que se combinaban con OR;
--    la débil (solo sender_id) permitía escribir en conversaciones ajenas.
--    Queda SOLO la estricta: messages_insert_sender_member (sender + miembro).
DROP POLICY IF EXISTS messages_insert_all ON public.messages;

COMMIT;
