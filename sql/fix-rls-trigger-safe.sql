CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project integer;
BEGIN
  -- Determinar proyecto
  v_project := COALESCE((NEW.raw_user_meta_data->>'assigned_project')::integer, 1);

  INSERT INTO public.profiles (
    id, email, full_name, username,
    phone, age, birth_date, gender, id_card, address,
    bank_card_number, bank_card_holder,
    transfer_confirmation_number, observations,
    has_sales_experience, join_date,
    role, status, assigned_project,
    read_privacy, read_terms, confirm_real_info, understand_payments
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    CASE WHEN NEW.raw_user_meta_data->>'age' IS NOT NULL AND NEW.raw_user_meta_data->>'age' != ''
      THEN (NEW.raw_user_meta_data->>'age')::integer ELSE NULL END,
    CASE WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL AND NEW.raw_user_meta_data->>'birth_date' != ''
      THEN (NEW.raw_user_meta_data->>'birth_date')::date ELSE NULL END,
    NULLIF(NEW.raw_user_meta_data->>'gender', ''),
    NULLIF(NEW.raw_user_meta_data->>'id_card', ''),
    NULLIF(NEW.raw_user_meta_data->>'address', ''),
    NULLIF(NEW.raw_user_meta_data->>'bank_card_number', ''),
    NULLIF(NEW.raw_user_meta_data->>'bank_card_holder', ''),
    NULLIF(NEW.raw_user_meta_data->>'transfer_confirmation_number', ''),
    NULLIF(NEW.raw_user_meta_data->>'observations', ''),
    COALESCE((NEW.raw_user_meta_data->>'has_sales_experience')::boolean, false),
    CASE WHEN NEW.raw_user_meta_data->>'join_date' IS NOT NULL AND NEW.raw_user_meta_data->>'join_date' != ''
      THEN (NEW.raw_user_meta_data->>'join_date')::date ELSE current_date END,
    'gestor'::public.app_role,
    'pending',
    v_project,
    COALESCE((NEW.raw_user_meta_data->>'read_privacy')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'read_terms')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'confirm_real_info')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'understand_payments')::boolean, false)
  );

  RETURN NEW;

EXCEPTION
  WHEN others THEN
    -- Fallback: insert minimal profile
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, username, role, status, assigned_project)
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        'gestor'::public.app_role,
        'pending',
        v_project
      );
      RETURN NEW;
    EXCEPTION
      WHEN others THEN
        -- If even the minimal insert fails, don't block signup
        RETURN NEW;
    END;
END;
$$;
