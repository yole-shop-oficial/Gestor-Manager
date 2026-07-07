-- ============================================================
-- FIX: handle_new_user — casts seguros con NULLIF
-- ============================================================
-- PROBLEMA: El trigger original usaba casts directos:
--   (raw_user_meta_data ->> 'age')::integer
--   (raw_user_meta_data ->> 'birth_date')::date  
--   (raw_user_meta_data ->> 'has_sales_experience')::boolean
-- 
-- Cuando React Hook Form envía campos vacíos como '' en metadata,
-- PostgreSQL lanza: "invalid input syntax for type integer: ''"
-- → HTTP 500 en signUp → AuthRetryableFetchError
--
-- SOLUCIÓN: NULLIF(field, '') → convierte '' en NULL
--           COALESCE(cast, default) → fallback seguro
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid;
  v_parent_id uuid;
  v_level integer := 1;
  v_path ltree;
  v_code text;
  v_referral_code text;
  v_age integer;
  v_birth_date date;
  v_has_exp boolean;
  v_assigned integer;
  v_read_privacy boolean;
  v_read_terms boolean;
  v_confirm_info boolean;
  v_understand boolean;
BEGIN
  v_code := public.generate_manager_code();
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  v_parent_id := v_admin_id;

  v_referral_code := NEW.raw_user_meta_data ->> 'referral_code';
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id, level INTO v_parent_id, v_level FROM public.profiles WHERE manager_code = v_referral_code;
    IF v_parent_id IS NOT NULL THEN v_level := v_level + 1;
    ELSE v_parent_id := v_admin_id; v_level := 1;
    END IF;
  END IF;

  -- Safe casts with NULLIF
  v_age := NULLIF(NEW.raw_user_meta_data ->> 'age', '')::integer;
  v_birth_date := NULLIF(NEW.raw_user_meta_data ->> 'birth_date', '')::date;
  v_has_exp := (NULLIF(NEW.raw_user_meta_data ->> 'has_sales_experience', ''))::boolean;
  v_assigned := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'assigned_project', '')::integer, 1);
  v_read_privacy := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'read_privacy', '')::boolean, false);
  v_read_terms := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'read_terms', '')::boolean, false);
  v_confirm_info := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'confirm_real_info', '')::boolean, false);
  v_understand := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'understand_payments', '')::boolean, false);

  IF v_parent_id IS NOT NULL THEN
    SELECT text2ltree(path::text || '.' || NEW.id::text) INTO v_path FROM public.profiles WHERE id = v_parent_id;
  ELSE
    v_path := text2ltree(NEW.id::text);
    v_level := 0;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, username, phone, age, birth_date, gender,
    id_card, address, bank_card_number, bank_card_holder,
    transfer_confirmation_number, observations, has_sales_experience,
    join_date, role, status, assigned_project,
    read_privacy, read_terms, confirm_real_info, understand_payments,
    manager_code, parent_id, level, path, children_count, total_network_size
  ) VALUES (
    NEW.id, NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.email),
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'phone', v_age, v_birth_date,
    NEW.raw_user_meta_data ->> 'gender',
    NEW.raw_user_meta_data ->> 'id_card',
    NEW.raw_user_meta_data ->> 'address',
    NEW.raw_user_meta_data ->> 'bank_card_number',
    NEW.raw_user_meta_data ->> 'bank_card_holder',
    NEW.raw_user_meta_data ->> 'transfer_confirmation_number',
    NEW.raw_user_meta_data ->> 'observations',
    COALESCE(v_has_exp, false),
    COALESCE(v_birth_date, CURRENT_DATE),
    'gestor', 'pending', v_assigned,
    COALESCE(v_read_privacy, false), COALESCE(v_read_terms, false),
    COALESCE(v_confirm_info, false), COALESCE(v_understand, false),
    v_code, v_parent_id, v_level, v_path, 0, 1
  );

  IF v_parent_id IS NOT NULL THEN
    UPDATE public.profiles SET children_count = children_count + 1,
      total_network_size = total_network_size + 1 WHERE id = v_parent_id;
  END IF;

  UPDATE public.round_robin_counter SET total_registrations = total_registrations + 1, updated_at = now() WHERE id = 1;

  RETURN NEW;
END; $$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
