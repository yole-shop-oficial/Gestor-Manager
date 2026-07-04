import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * businessClient — Servidor / SSR
 *
 * Responsable ÚNICO: conectarse al Proyecto Supabase 2
 * para pedidos, wallet, comisiones, payouts, imágenes y estadísticas.
 *
 * No debe usarse para autenticación, perfiles, chat ni notificaciones.
 *
 * FIX: Cambiado de VITE_SUPABASE_* a NEXT_PUBLIC_SUPABASE_*.
 * Las variables VITE_ son de Vite y NO existen en Next.js.
 *
 * ⚠️ Si las variables no están configuradas, devuelve null en lugar de crashear.
 */

let client: SupabaseClient | null = null;
let initAttempted = false;

export function getBusinessClient(): SupabaseClient | null {
  if (client) return client;
  if (initAttempted) return null;

  // Intentar NEXT_PUBLIC_ primero (disponible en servidor Y cliente)
  // Luego intentar sin prefijo (solo servidor)
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL_2 ||
    process.env.SUPABASE_URL_2 ||
    "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2 ||
    process.env.SUPABASE_PUBLISHABLE_KEY_2 ||
    "";

  if (!url || !anonKey) {
    if (process.env.CI !== "true") {
      console.warn(
        "[BUSINESS CLIENT SSR] Variables de Supabase Proyecto 2 " +
        "no están configuradas. " +
        "Necesitas NEXT_PUBLIC_SUPABASE_URL_2 y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2."
      );
    }
    initAttempted = true;
    return null;
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}
