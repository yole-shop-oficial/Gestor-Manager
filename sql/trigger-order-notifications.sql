-- ============================================================
-- TRIGGER: Notificar al gestor cuando cambia el estado de su pedido
-- ============================================================
-- EJECUTAR EN: SQL Editor de AMBOS proyectos Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
  v_emoji text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'confirmed' THEN
      v_emoji := '✅';
      v_title := 'Pedido confirmado';
      v_body := 'Tu pedido "' || NEW.product_name || '" para ' || NEW.customer_name || ' ha sido confirmado.';
    WHEN 'sold' THEN
      v_emoji := '💰';
      v_title := '¡Pedido vendido!';
      v_body := 'Tu pedido "' || NEW.product_name || '" fue marcado como vendido. ¡La comisión se acreditó a tu billetera!';
    WHEN 'denied' THEN
      v_emoji := '❌';
      v_title := 'Pedido denegado';
      v_body := 'Tu pedido "' || NEW.product_name || '" para ' || NEW.customer_name || ' fue denegado.';
    WHEN 'cancelled' THEN
      v_emoji := '🗑️';
      v_title := 'Pedido cancelado';
      v_body := 'Tu pedido "' || NEW.product_name || '" ha sido cancelado.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (NEW.manager_id, v_emoji || ' ' || v_title, v_body);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_order_status_notification ON public.orders;
CREATE TRIGGER trigger_order_status_notification
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();
