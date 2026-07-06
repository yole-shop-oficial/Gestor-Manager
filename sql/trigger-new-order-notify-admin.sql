-- ============================================================
-- TRIGGER: Notificar a TODOS los admins cuando se crea un pedido nuevo
-- ============================================================
-- EJECUTAR EN: SQL Editor de AMBOS proyectos Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_admins_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manager_name text;
  admin_record record;
BEGIN
  SELECT full_name INTO v_manager_name
  FROM public.profiles
  WHERE id = NEW.manager_id;

  FOR admin_record IN
    SELECT id FROM public.profiles WHERE role = 'admin'::public.app_role
  LOOP
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      admin_record.id,
      '📦 Nuevo pedido',
      COALESCE(v_manager_name, 'Un gestor') || ' creó un pedido de "' || NEW.product_name || '" para ' || NEW.customer_name
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_new_order_notify_admin ON public.orders;
CREATE TRIGGER trigger_new_order_notify_admin
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_order();
