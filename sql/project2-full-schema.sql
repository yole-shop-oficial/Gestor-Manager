-- ============================================================
-- PROYECTO SUPABASE 2 — Schema completo con Round-Robin
-- ============================================================
-- EJECUTAR EN: SQL Editor del Proyecto 2 de Supabase
-- EJECUTAR DE UNO EN UNO (cada bloque por separado)
-- La única diferencia con Project 1 es assigned_project DEFAULT 2
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- PASO 1: Crear tipos de dominio
-- ═══════════════════════════════════════════════════════════

DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.wallet_entry_type CASCADE;
DROP TYPE IF EXISTS public.payout_status CASCADE;
DROP TYPE IF EXISTS public.payment_type CASCADE;

CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'moderator');

CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed',
  'denied',
  'sold',
  'cancelled'
);

CREATE TYPE public.wallet_entry_type AS ENUM (
  'commission',
  'adjustment',
  'payout'
);

CREATE TYPE public.payout_status AS ENUM (
  'pending',
  'approved',
  'paid',
  'rejected'
);

CREATE TYPE public.payment_type AS ENUM (
  'transferencia',
  'efectivo',
  'zelle',
  'otro'
);

-- ═══════════════════════════════════════════════════════════
-- PASO 2: Crear tabla round_robin_counter
-- ═══════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.round_robin_counter CASCADE;

CREATE TABLE public.round_robin_counter (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_registrations integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.round_robin_counter (id, total_registrations)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PASO 3: Crear tabla profiles (assigned_project = 2)
-- ═══════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.payout_requests CASCADE;
DROP TABLE IF EXISTS public.wallet_entries CASCADE;
DROP TABLE IF EXISTS public.order_images CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  username text UNIQUE,
  phone text,
  age integer,
  birth_date date,
  gender text CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL),
  id_card text UNIQUE,
  address text,
  bank_card_number text,
  bank_card_holder text,
  transfer_confirmation_number text,
  observations text,
  has_sales_experience boolean NOT NULL DEFAULT false,
  join_date date NOT NULL DEFAULT current_date,
  role public.app_role NOT NULL DEFAULT 'gestor',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'denied', 'blocked')),
  assigned_project integer NOT NULL DEFAULT 2 CHECK (assigned_project IN (1, 2)),
  read_privacy boolean NOT NULL DEFAULT false,
  read_terms boolean NOT NULL DEFAULT false,
  confirm_real_info boolean NOT NULL DEFAULT false,
  understand_payments boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- PASO 4: Crear tabla notifications
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- PASO 5: Crear tabla messages
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- PASO 6: Crear tabla orders
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  base_price numeric(12,2) NOT NULL CHECK (base_price >= 0),
  sale_price numeric(12,2) NOT NULL CHECK (sale_price >= 0),
  size text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  delivery_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (delivery_price >= 0),
  delivery_time text,
  payment_type public.payment_type NOT NULL,
  notes text,
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- PASO 7: Crear tabla order_images
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.order_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  mime_type text,
  width integer,
  height integer,
  size_kb integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- PASO 8: Crear tabla wallet_entries
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.wallet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  entry_type public.wallet_entry_type NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- PASO 9: Crear tabla payout_requests
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status public.payout_status NOT NULL DEFAULT 'pending',
  approved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- ═══════════════════════════════════════════════════════════
-- PASO 10: Crear índices
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications (user_id, created_at desc);

CREATE INDEX IF NOT EXISTS idx_messages_participants_created_at
  ON public.messages (sender_id, recipient_id, created_at desc);

CREATE INDEX IF NOT EXISTS idx_orders_manager_status_created
  ON public.orders (manager_id, status, created_at desc);

CREATE INDEX IF NOT EXISTS idx_wallet_entries_manager_created
  ON public.wallet_entries (manager_id, created_at desc);

CREATE INDEX IF NOT EXISTS idx_payout_requests_manager_status
  ON public.payout_requests (manager_id, status, created_at desc);

CREATE INDEX IF NOT EXISTS idx_order_images_order
  ON public.order_images (order_id, sort_order);

-- ═══════════════════════════════════════════════════════════
-- PASO 11: Crear funciones auxiliares
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER payout_requests_set_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- PASO 12: Función incrementar contador round-robin
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_registration_counter()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.round_robin_counter
  SET total_registrations = total_registrations + 1,
      updated_at = now()
  WHERE id = 1
  RETURNING total_registrations INTO new_count;

  RETURN new_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- PASO 13: Vista resumen wallet
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.manager_wallet_summary AS
SELECT
  manager_id,
  COALESCE(SUM(amount), 0) AS balance,
  COALESCE(SUM(CASE WHEN entry_type = 'commission' THEN amount ELSE 0 END), 0) AS total_commissions,
  COALESCE(SUM(CASE WHEN entry_type = 'payout' THEN amount ELSE 0 END), 0) AS total_payouts
FROM public.wallet_entries
GROUP BY manager_id;

-- ═══════════════════════════════════════════════════════════
-- PASO 14: Activar Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.round_robin_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- PASO 15: Políticas RLS
-- ═══════════════════════════════════════════════════════════

-- Round-robin counter: cualquiera puede leer
DROP POLICY IF EXISTS "rr_counter_read_all" ON public.round_robin_counter;
CREATE POLICY "rr_counter_read_all"
  ON public.round_robin_counter
  FOR SELECT
  USING (true);

-- Perfiles: solo el dueño o admin
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.current_user_is_admin());

DROP POLICY IF EXISTS "profiles_insert_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_insert_self_or_admin"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id OR public.current_user_is_admin());

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.current_user_is_admin())
  WITH CHECK (auth.uid() = id OR public.current_user_is_admin());

-- Notificaciones
DROP POLICY IF EXISTS "notifications_read_own_or_admin" ON public.notifications;
CREATE POLICY "notifications_read_own_or_admin"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS "notifications_insert_admin_only" ON public.notifications;
CREATE POLICY "notifications_insert_admin_only"
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.current_user_is_admin());

-- Mensajes
DROP POLICY IF EXISTS "messages_read_participants_or_admin" ON public.messages;
CREATE POLICY "messages_read_participants_or_admin"
  ON public.messages
  FOR SELECT
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR public.current_user_is_admin()
  );

DROP POLICY IF EXISTS "messages_insert_sender_only" ON public.messages;
CREATE POLICY "messages_insert_sender_only"
  ON public.messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Pedidos
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own"
  ON public.orders
  FOR SELECT
  USING (manager_id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own"
  ON public.orders
  FOR INSERT
  WITH CHECK (manager_id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own"
  ON public.orders
  FOR UPDATE
  USING (manager_id = auth.uid() OR public.current_user_is_admin())
  WITH CHECK (manager_id = auth.uid() OR public.current_user_is_admin());

-- Imágenes
DROP POLICY IF EXISTS "order_images_select_own" ON public.order_images;
CREATE POLICY "order_images_select_own"
  ON public.order_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.manager_id = auth.uid() OR public.current_user_is_admin())
    )
  );

DROP POLICY IF EXISTS "order_images_insert_own" ON public.order_images;
CREATE POLICY "order_images_insert_own"
  ON public.order_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.manager_id = auth.uid() OR public.current_user_is_admin())
    )
  );

-- Wallet
DROP POLICY IF EXISTS "wallet_entries_select_own" ON public.wallet_entries;
CREATE POLICY "wallet_entries_select_own"
  ON public.wallet_entries
  FOR SELECT
  USING (manager_id = auth.uid() OR public.current_user_is_admin());

-- Payouts
DROP POLICY IF EXISTS "payout_requests_select_own" ON public.payout_requests;
CREATE POLICY "payout_requests_select_own"
  ON public.payout_requests
  FOR SELECT
  USING (manager_id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS "payout_requests_insert_own" ON public.payout_requests;
CREATE POLICY "payout_requests_insert_own"
  ON public.payout_requests
  FOR INSERT
  WITH CHECK (manager_id = auth.uid() OR public.current_user_is_admin());

-- ═══════════════════════════════════════════════════════════
-- PASO 16: Storage bucket para imágenes
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-images', 'order-images', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "order_images_storage_read" ON storage.objects;
CREATE POLICY "order_images_storage_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'order-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "order_images_storage_insert" ON storage.objects;
CREATE POLICY "order_images_storage_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'order-images' AND auth.uid() IS NOT NULL);
