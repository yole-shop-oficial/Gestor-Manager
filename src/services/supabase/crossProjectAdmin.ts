"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// CROSS-PROJECT ADMIN v2 — Acceso P2 sin re-auth paralela
// ============================================================
// PROBLEMA v1: getCrossProjectP2Client() se llamaba 7+ veces en
// paralelo desde /admin. Cada llamada intentaba signInWithPassword.
// Esto causaba cascadas de errores y React #310.
//
// SOLUCIÓN v2: Una sola promesa cacheada (authPromise). La primera
// llamada autentica; las demás esperan la MISMA promesa. Resultado:
// 1 solo signIn, sin importar cuántos componentes lo llamen.
// ============================================================

const P2_SYNC_PASSWORD = "YoleAdmin2026!Sync";
const CROSS_PROJECT_STORAGE_KEY = "yole-cross-p2";

let p2Client: SupabaseClient | null = null;
let authPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Devuelve un cliente autenticado para P2 (Proyecto 2).
 *
 * v2: Usa una promesa cacheada. La PRIMERA llamada autentica; todas
 * las demás (paralelas o posteriores) reutilizan el MISMO cliente
 * autenticado. Solo se hace 1 signInWithPassword por sesión.
 *
 * Si la sesión expira (1h), se re-autentica automáticamente.
 */
export function getCrossProjectP2Client(): Promise<SupabaseClient | null> {
  // Fast path: cliente ya autenticado con sesión activa
  if (p2Client) {
    return p2Client.auth.getSession().then(({ data: { session } }) => {
      if (session) return p2Client!;
      // Sesión expirada — limpiar y re-autenticar
      p2Client = null;
      authPromise = null;
      return doAuth();
    });
  }

  // Si ya hay una autenticación en curso, esperarla (no duplicar)
  if (authPromise) return authPromise;

  return doAuth();
}

/** Autenticación real — solo se ejecuta una vez por sesión. */
function doAuth(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_2;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2;
  if (!url || !key) return Promise.resolve(null);

  authPromise = (async () => {
    try {
      p2Client = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storageKey: CROSS_PROJECT_STORAGE_KEY,
        },
      });

      const { error } = await p2Client.auth.signInWithPassword({
        email: "junmoxia41@gmail.com",
        password: P2_SYNC_PASSWORD,
      });

      if (error) {
        console.warn("[CROSS-PROJECT] P2 auth falló:", error.message);
        p2Client = null;
        authPromise = null;
        return null;
      }

      console.log("[CROSS-PROJECT] ✅ Admin autenticado en P2 (1 sola vez)");
      return p2Client;
    } catch (err) {
      console.warn("[CROSS-PROJECT] Error:", err);
      p2Client = null;
      authPromise = null;
      return null;
    }
  })();

  return authPromise;
}

/**
 * Resetea el estado de autenticación P2.
 */
export function resetCrossProjectAuth(): void {
  p2Client = null;
  authPromise = null;
}
