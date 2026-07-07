-- FK constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_parent') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_parent FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_wallet_source_user') THEN
    ALTER TABLE public.wallet_entries ADD CONSTRAINT fk_wallet_source_user FOREIGN KEY (source_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_reply_to') THEN
    ALTER TABLE public.messages ADD CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_select_admin ON public.audit_log;
CREATE POLICY audit_log_select_admin ON public.audit_log FOR SELECT USING (current_user_is_admin());
DROP POLICY IF EXISTS audit_log_select_own ON public.audit_log;
CREATE POLICY audit_log_select_own ON public.audit_log FOR SELECT USING (actor_id = auth.uid());
DROP POLICY IF EXISTS audit_log_insert_all ON public.audit_log;
CREATE POLICY audit_log_insert_all ON public.audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- generate_manager_code
CREATE OR REPLACE FUNCTION public.generate_manager_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; exists_flag boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE manager_code = code) INTO exists_flag;
    EXIT WHEN NOT exists_flag;
  END LOOP;
  RETURN code;
END; $$;

-- is_ancestor_of
CREATE OR REPLACE FUNCTION public.is_ancestor_of(p_ancestor_id uuid, p_descendant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_descendant_id
      AND (id = p_ancestor_id OR path <@ (SELECT path FROM public.profiles WHERE id = p_ancestor_id))
  );
$$;

-- get_descendants
CREATE OR REPLACE FUNCTION public.get_descendants(p_user_id uuid)
RETURNS SETOF public.profiles LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM public.profiles
  WHERE id = p_user_id OR path <@ (SELECT path FROM public.profiles WHERE id = p_user_id)
  ORDER BY level, full_name;
$$;

-- get_ancestors
CREATE OR REPLACE FUNCTION public.get_ancestors(p_user_id uuid)
RETURNS SETOF public.profiles LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH RECURSIVE ancestors AS (
    SELECT p.* FROM public.profiles p WHERE p.id = p_user_id
    UNION ALL
    SELECT parent.* FROM public.profiles parent JOIN ancestors a ON parent.id = a.parent_id
  )
  SELECT DISTINCT * FROM ancestors WHERE id != p_user_id ORDER BY level;
$$;

-- calculate_margins
CREATE OR REPLACE FUNCTION public.calculate_margins(p_chain uuid[], p_base_price numeric, p_sale_price numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_margin numeric; v_level_price numeric; v_margins jsonb := '{}';
  v_margin_pct numeric; v_margin_amount numeric; v_level_count integer;
BEGIN
  v_total_margin := p_sale_price - p_base_price;
  v_level_count := array_length(p_chain, 1);
  IF v_total_margin <= 0 OR v_level_count IS NULL OR v_level_count = 0 THEN RETURN '{}'::jsonb; END IF;
  v_level_price := p_base_price;
  FOR i IN 1..v_level_count LOOP
    v_margin_pct := CASE WHEN i = v_level_count THEN 1.0 ELSE 0.2 * (1.0 - 0.2)^(i-1) END;
    v_margin_amount := ROUND(v_total_margin * v_margin_pct, 2);
    v_level_price := v_level_price + v_margin_amount;
    v_margins := v_margins || jsonb_build_object(i::text, jsonb_build_object('user_id', p_chain[i], 'margin', v_margin_amount, 'price', v_level_price));
  END LOOP;
  RETURN v_margins;
END; $$;

-- distribute_commissions
CREATE OR REPLACE FUNCTION public.distribute_commissions(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order record; v_k text;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF v_order IS NULL OR v_order.status != 'sold' THEN RETURN; END IF;
  FOR v_k IN SELECT jsonb_object_keys(v_order.margins) LOOP
    INSERT INTO public.wallet_entries (manager_id, order_id, amount, entry_type, source_level, source_user_id, description)
    VALUES (
      (v_order.margins -> v_k -> 'user_id')::uuid, p_order_id,
      (v_order.margins -> v_k ->> 'margin')::numeric, 'commission'::public.wallet_entry_type,
      v_k::integer, v_order.manager_id, 'Comision pedido ' || v_order.product_name
    );
  END LOOP;
END; $$;

-- get_network_stats
CREATE OR REPLACE FUNCTION public.get_network_stats(p_user_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE v_g integer; v_m integer; v_c numeric;
BEGIN
  SELECT COUNT(*) INTO v_g FROM public.profiles WHERE path <@ (SELECT path FROM public.profiles WHERE id = p_user_id) AND role = 'gestor';
  SELECT COUNT(*) INTO v_m FROM public.profiles WHERE path <@ (SELECT path FROM public.profiles WHERE id = p_user_id) AND role = 'manager';
  SELECT COALESCE(SUM(amount),0) INTO v_c FROM public.wallet_entries WHERE manager_id = p_user_id AND entry_type = 'commission';
  RETURN json_build_object('total_gestores',v_g,'total_managers',v_m,'total_network',v_g+v_m,'total_commission',v_c);
END; $$;

-- update_network_counts
CREATE OR REPLACE FUNCTION public.update_network_counts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user record;
BEGIN
  FOR v_user IN SELECT id FROM public.profiles LOOP
    UPDATE public.profiles SET children_count = (SELECT COUNT(*) FROM public.profiles WHERE parent_id = v_user.id),
      total_network_size = (SELECT COUNT(*) FROM public.profiles WHERE path <@ (SELECT path FROM public.profiles WHERE id = v_user.id))
    WHERE id = v_user.id;
  END LOOP;
END; $$;

-- Grants
GRANT EXECUTE ON FUNCTION public.generate_manager_code() TO authenticated, anon, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.is_ancestor_of(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_descendants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ancestors(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_margins(uuid[],numeric,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.distribute_commissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_network_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_network_counts() TO authenticated;
