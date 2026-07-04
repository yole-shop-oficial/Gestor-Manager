-- ============================================================
-- FIX: Políticas RLS adicionales para payouts y notificaciones
-- ============================================================
-- EJECUTAR EN: SQL Editor de AMBOS proyectos de Supabase
-- 
-- Agrega políticas para que:
-- 1. Admin pueda actualizar payout_requests (aprobar/rechazar/pagar)
-- 2. Admin pueda insertar notificaciones (ya existía pero lo reforzamos)
-- 3. Gestor pueda insertar notificaciones propias (para testing)
-- ============================================================

-- Payouts: admin puede actualizar
DROP POLICY IF EXISTS "payout_requests_update_admin" ON public.payout_requests;
CREATE POLICY "payout_requests_update_admin"
  ON public.payout_requests
  FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Payouts: gestor solo puede actualizar los suyos (cancelar)
DROP POLICY IF EXISTS "payout_requests_update_own" ON public.payout_requests;
CREATE POLICY "payout_requests_update_own"
  ON public.payout_requests
  FOR UPDATE
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

-- Wallet: admin puede insertar (para registrar retiros)
DROP POLICY IF EXISTS "wallet_entries_insert_admin" ON public.wallet_entries;
CREATE POLICY "wallet_entries_insert_admin"
  ON public.wallet_entries
  FOR INSERT
  WITH CHECK (public.current_user_is_admin());

-- Notificaciones: también permitir que gestores reciban notificaciones
-- (la política actual solo permite admin insertar, eso está bien)
-- Pero agregamos una para que el sistema pueda insertar por trigger
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;
CREATE POLICY "notifications_insert_system"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);  -- Cualquiera autenticado puede crear notificaciones (para triggers)
