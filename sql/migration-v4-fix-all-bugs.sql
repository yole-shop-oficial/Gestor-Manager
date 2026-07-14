-- ============================================================
-- MIGRACIÓN v4: Fix ALL audit bugs (CRITICAL → LOW)
-- ============================================================
-- EJECUTAR EN: Proyecto 1 de Supabase (lustmqeqbninkavixttz)
-- Ejecutar cada bloque por separado en el SQL Editor
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- ERROR 1 (CRITICAL): Fix children_count desincronizado
-- ═══════════════════════════════════════════════════════════
-- CAUSA RAÍZ: handle_new_user incrementa children_count pero
-- NUNCA decrementa al eliminar un usuario. Además update_network_counts()
-- nunca se llama automáticamente.
-- SOLUCIÓN: 1) Corregir datos actuales 2) Trigger de decremento

-- 1a: Corregir children_count y total_network_size para TODOS los perfiles
UPDATE profiles p SET
  children_count = (SELECT COUNT(*) FROM profiles c WHERE c.parent_id = p.id),
  total_network_size = (SELECT COUNT(*) FROM profiles d WHERE d.path <@ p.path);

-- 1b: Trigger que decrementa children_count al eliminar un usuario
CREATE OR REPLACE FUNCTION public.decrement_parent_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.parent_id IS NOT NULL THEN
    UPDATE profiles
    SET children_count = GREATEST(children_count - 1, 0),
        total_network_size = GREATEST(total_network_size - 1, 0)
    WHERE id = OLD.parent_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_delete ON public.profiles;
CREATE TRIGGER on_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_parent_counts();

GRANT EXECUTE ON FUNCTION public.decrement_parent_counts() TO authenticated, supabase_auth_admin;

-- ═══════════════════════════════════════════════════════════
-- ERROR 2 (CRITICAL): Limpiar conversaciones duplicadas y huérfanas
-- ═══════════════════════════════════════════════════════════
-- CAUSA RAÍZ: ensurePrivateConv tiene race condition, no hay
-- restricción UNIQUE que prevenga duplicados.

-- 2a: Eliminar mensajes de conversaciones duplicadas
DELETE FROM messages WHERE conversation_id IN (
  SELECT cp.conv_id FROM (
    SELECT
      c.id as conv_id,
      c.created_at,
      MIN(cm.user_id) FILTER (WHERE cm.user_id IS NOT NULL) as user1,
      MAX(cm.user_id) FILTER (WHERE cm.user_id IS NOT NULL) as user2
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE c.type = 'private'
    GROUP BY c.id, c.created_at
    HAVING COUNT(cm.user_id) = 2
  ) cp
  JOIN (
    SELECT
      MIN(c2.id) as keep_id,
      MIN(cm1.user_id) FILTER (WHERE cm1.user_id IS NOT NULL) as user1,
      MAX(cm1.user_id) FILTER (WHERE cm1.user_id IS NOT NULL) as user2
    FROM conversations c2
    JOIN conversation_members cm1 ON cm1.conversation_id = c2.id
    WHERE c2.type = 'private'
    GROUP BY c2.type, LEAST(cm1.user_id, cm1.user_id), GREATEST(cm1.user_id, cm1.user_id)
    HAVING COUNT(c2.id) > 1
  ) dupes ON cp.user1 = dupes.user1 AND cp.user2 = dupes.user2 AND cp.conv_id != dupes.keep_id
);

-- 2b: Eliminar members de conversaciones duplicadas
DELETE FROM conversation_members WHERE conversation_id IN (
  SELECT id FROM conversations WHERE type = 'private' AND id IN (
    SELECT conv_id FROM (
      SELECT
        c.id as conv_id,
        c.created_at,
        (SELECT MIN(user_id) FROM conversation_members WHERE conversation_id = c.id) as user1,
        (SELECT MAX(user_id) FROM conversation_members WHERE conversation_id = c.id) as user2,
        ROW_NUMBER() OVER (
          PARTITION BY
            (SELECT MIN(user_id) FROM conversation_members WHERE conversation_id = c.id),
            (SELECT MAX(user_id) FROM conversation_members WHERE conversation_id = c.id)
          ORDER BY c.created_at ASC
        ) as rn
      FROM conversations c
      WHERE c.type = 'private'
        AND (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) = 2
    ) ranked WHERE rn > 1
  )
);

-- 2c: Eliminar las conversaciones duplicadas
DELETE FROM conversations WHERE type = 'private' AND id IN (
  SELECT conv_id FROM (
    SELECT
      c.id as conv_id,
      c.created_at,
      (SELECT MIN(user_id) FROM conversation_members WHERE conversation_id = c.id) as user1,
      (SELECT MAX(user_id) FROM conversation_members WHERE conversation_id = c.id) as user2,
      ROW_NUMBER() OVER (
        PARTITION BY
          (SELECT MIN(user_id) FROM conversation_members WHERE conversation_id = c.id),
          (SELECT MAX(user_id) FROM conversation_members WHERE conversation_id = c.id)
        ORDER BY c.created_at ASC
      ) as rn
    FROM conversations c
    WHERE c.type = 'private'
      AND (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) = 2
  ) ranked WHERE rn > 1
);

-- 2d: Eliminar conversaciones huérfanas (solo 1 miembro en conv privada)
DELETE FROM messages WHERE conversation_id IN (
  SELECT c.id FROM conversations c
  WHERE c.type = 'private'
    AND (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) < 2
);
DELETE FROM conversation_members WHERE conversation_id IN (
  SELECT c.id FROM conversations c
  WHERE c.type = 'private'
    AND (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) < 2
);
DELETE FROM conversations WHERE type = 'private'
  AND (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = conversations.id) < 2;

-- ═══════════════════════════════════════════════════════════
-- ERROR 3 (CRITICAL): RPC get_or_create_private_conv
-- ═══════════════════════════════════════════════════════════
-- CAUSA RAÍZ: ensurePrivateConv en cliente tiene race condition
-- SOLUCIÓN: RPC atómica con pg_advisory_xact_lock

CREATE OR REPLACE FUNCTION public.get_or_create_private_conv(p_user1 uuid, p_user2 uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
  v_lock_key bigint;
BEGIN
  -- Advisory lock para prevenir race condition
  v_lock_key := ('x' || md5(least(p_user1::text, p_user2::text) || greatest(p_user1::text, p_user2::text)))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Buscar conversación privada existente entre los dos usuarios
  SELECT cm1.conversation_id INTO v_conv_id
  FROM conversation_members cm1
  JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
  JOIN conversations c ON c.id = cm1.conversation_id
  WHERE cm1.user_id = p_user1
    AND cm2.user_id = p_user2
    AND c.type = 'private'
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- Crear nueva conversación privada
  INSERT INTO conversations (type, created_by)
  VALUES ('private', p_user1)
  RETURNING id INTO v_conv_id;

  -- Agregar ambos miembros
  INSERT INTO conversation_members (conversation_id, user_id)
  VALUES (v_conv_id, p_user1), (v_conv_id, p_user2);

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_private_conv(uuid, uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- ERROR 6 (HIGH): RPC get_chat_overview — eliminar N+1
-- ═══════════════════════════════════════════════════════════
-- CAUSA RAÍZ: useConversations hace 3 queries por conversación
-- SOLUCIÓN: Una sola RPC con LATERAL joins

CREATE OR REPLACE FUNCTION public.get_chat_overview(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
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
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_overview(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- ERROR 10 (HIGH): Índices faltantes
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user_conv
  ON public.conversation_members (user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_profiles_parent_id
  ON public.profiles (parent_id);

-- ═══════════════════════════════════════════════════════════
-- ERROR 10 (HIGH): Messages INSERT RLS — verificar membresía
-- ═══════════════════════════════════════════════════════════
-- Antes: solo verificaba sender_id = auth.uid()
-- Ahora: también verifica que el sender sea miembro de la conversación

DROP POLICY IF EXISTS messages_insert_sender_only ON public.messages;
DROP POLICY IF EXISTS messages_insert_sender_member ON public.messages;
CREATE POLICY messages_insert_sender_member ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════
-- BONUS: Optimizar update_network_counts con batch
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_network_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles p SET
    children_count = sub.cc,
    total_network_size = sub.tns
  FROM (
    SELECT
      p2.id,
      (SELECT COUNT(*) FROM profiles c WHERE c.parent_id = p2.id) as cc,
      (SELECT COUNT(*) FROM profiles d WHERE d.path <@ p2.path) as tns
    FROM profiles p2
  ) sub
  WHERE p.id = sub.id AND (p.children_count != sub.cc OR p.total_network_size != sub.tns);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_network_counts() TO authenticated;
