-- ============================================================
-- TRIGGER: Notificar al gestor sobre cambios en su solicitud de retiro
-- ============================================================
-- EJECUTAR EN: SQL Editor de AMBOS proyectos Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_payout_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'approved'::public.payout_status THEN
      v_title := '✅ Retiro aprobado';
      v_body := 'Tu solicitud de retiro por $' || NEW.amount::text || ' ha sido aprobada.';
    WHEN 'paid'::public.payout_status THEN
      v_title := '💰 Retiro pagado';
      v_body := 'Tu retiro por $' || NEW.amount::text || ' ha sido pagado.';
    WHEN 'rejected'::public.payout_status THEN
      v_title := '❌ Retiro rechazado';
      v_body := 'Tu solicitud de retiro por $' || NEW.amount::text || ' fue rechazada.' ||
                CASE WHEN NEW.notes IS NOT NULL AND NEW.notes != '' THEN ' Motivo: ' || NEW.notes ELSE '' END;
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (NEW.manager_id, v_title, v_body);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_payout_status_notification ON public.payout_requests;
CREATE TRIGGER trigger_payout_status_notification
  AFTER UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payout_status_change();
