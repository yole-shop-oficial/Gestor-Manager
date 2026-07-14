-- ============================================================
-- FIX A2 — _trigger_log expuesto a public (debug interno)
-- Aplicar a: P1 y P2
-- Antes: _trigger_log_all → USING true, cmd ALL, role public
--        (cualquiera podía leer logs internos del sistema).
-- Ahora: solo admin puede leer. Es una tabla de debug (0 filas).
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS _trigger_log_all ON public._trigger_log;

CREATE POLICY _trigger_log_select_admin ON public._trigger_log
  FOR SELECT TO authenticated
  USING (current_user_is_admin());

COMMIT;
