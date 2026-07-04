-- ============================================================
-- HABILITAR REALTIME en Supabase
-- ============================================================
-- EJECUTAR EN: SQL Editor de AMBOS proyectos de Supabase
-- 
-- Esto permite que las suscripciones en tiempo real funcionen
-- para mensajes y notificaciones.
-- ============================================================

-- Habilitar Realtime para las tablas que lo necesitan
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Verificar
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
