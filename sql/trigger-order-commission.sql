-- ============================================================
-- TRIGGER: Generar comisión al marcar pedido como 'sold'
-- ============================================================
-- EJECUTAR EN: SQL Editor de AMBOS proyectos Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_order_sold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission numeric(12,2);
BEGIN
  IF NEW.status = 'sold' AND (OLD.status IS DISTINCT FROM 'sold') THEN
    v_commission := NEW.sale_price - NEW.base_price - NEW.delivery_price;

    IF v_commission < 0 THEN
      v_commission := 0;
    END IF;

    INSERT INTO public.wallet_entries (
      manager_id,
      order_id,
      amount,
      entry_type,
      description
    ) VALUES (
      NEW.manager_id,
      NEW.id,
      v_commission,
      'commission'::public.wallet_entry_type,
      'Comisión por pedido #' || LEFT(NEW.id::text, 8) || ' - ' || NEW.product_name
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_order_sold ON public.orders;
CREATE TRIGGER trigger_order_sold
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_sold();

-- Permisos para supabase_auth_admin
GRANT ALL ON public.wallet_entries TO supabase_auth_admin;
