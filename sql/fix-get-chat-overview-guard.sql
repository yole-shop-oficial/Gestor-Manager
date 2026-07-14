-- ============================================================
-- FIX (parte 2) — Blindar get_chat_overview contra fuga entre usuarios
-- Aplicar a: P1 y P2
-- Antes: SECURITY DEFINER sin verificar p_user_id = auth.uid() =>
--        cualquier usuario logueado podía leer el chat de OTRO pasando su id.
-- Ahora: solo puedes pedir TU overview, salvo admin (moderación).
-- CREATE OR REPLACE es atómico: si falla, queda la función anterior.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_chat_overview(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
BEGIN
  -- GUARD de autorización: solo tu propio overview (o admin)
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'No autorizado: get_chat_overview requiere p_user_id = auth.uid()';
  END IF;

  SELECT json_build_object(
    'conversations', (
      SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json)
      FROM (
        SELECT
          c.id, c.type, c.name, c.last_message_at, c.last_message_preview,
          c.created_at, c.created_by,
          cm.last_read_at,
          (SELECT COUNT(*)::int FROM messages m
           WHERE m.conversation_id = c.id
             AND m.sender_id != p_user_id
             AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
          ) as unread_count,
          p2.id as other_user_id,
          p2.full_name as other_user_name,
          p2.role as other_user_role,
          p2.status as other_user_status
        FROM conversation_members cm
        JOIN conversations c ON c.id = cm.conversation_id
        LEFT JOIN LATERAL (
          SELECT p.id, p.full_name, p.role, p.status
          FROM conversation_members cm2
          JOIN profiles p ON p.id = cm2.user_id
          WHERE cm2.conversation_id = c.id AND cm2.user_id != p_user_id
          LIMIT 1
        ) p2 ON true
        WHERE cm.user_id = p_user_id
        ORDER BY c.last_message_at DESC NULLS LAST
      ) c
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_chat_overview(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_chat_overview(uuid) TO authenticated;
