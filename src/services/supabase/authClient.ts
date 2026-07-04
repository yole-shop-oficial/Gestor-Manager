import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * authClient — Servidor / SSR
 *
 * Responsable ÚNICO: conectarse al Proyecto Supabase 1
 * para autenticación, perfiles, chat y notificaciones.
 *
 * No debe usarse para pedidos, wallet, comisiones ni estadísticas.
 *
 * FIX: Cambiado de VITE_SUPABASE_* a NEXT_PUBLIC_SUPABASE_*.
 * Las variables VITE_ son de Vite y NO existen en Next.js.
 * En Next.js, las variables de entorno del lado del servidor
 * se acceden sin prefijo, y las del cliente con NEXT_PUBLIC_.
 * Usamos NEXT_PUBLIC_ porque estos valores (URL + anon key)
 * también se usan del lado del cliente.
 *
 * ⚠️ Si las variables no están configuradas, devuelve null en lugar de crashear.
 */

let client: SupabaseClient | null = null;
let initAttempted = false;

export function getAuthClient(): SupabaseClient | null {
  if (client) return client;
  if (initAttempted) return null;

  // Intentar NEXT_PUBLIC_ primero (disponible en servidor Y cliente)
  // Luego intentar sin prefijo (solo servidor)
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL_1 ||
    process.env.SUPABASE_URL_1 ||
    "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1 ||
    process.env.SUPABASE_PUBLISHABLE_KEY_1 ||
    "";

  if (!url || !anonKey) {
    if (process.env.CI !== "true") {
      console.warn(
        "[AUTH CLIENT SSR] Variables de Supabase Proyecto 1 " +
        "no están configuradas. " +
        "Necesitas NEXT_PUBLIC_SUPABASE_URL_1 y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1."
      );
    }
    initAttempted = true;
    return null;
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });

  return client;
}
