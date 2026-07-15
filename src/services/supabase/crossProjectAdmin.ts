"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// CROSS-PROJECT ADMIN — Permite al admin ver/gestionar P1 Y P2
// ============================================================
// PROBLEMA: Cada usuario vive en UN proyecto. El admin (P1) no
// puede ver a los gestores del P2 porque son bases de datos
// separadas.
//
// SOLUCIÓN: El admin tiene una cuenta espejo en P2 (mismo user_id,
// role=admin). Este servicio autentica al admin en P2 de forma
// transparente y devuelve un cliente con sesión activa.
//
// ⚠️ CRÍTICO: Este cliente usa persistSession: FALSE y un
// storageKey SEPARADO ("yole-cross-p2"). Si usara el mismo
// storageKey que el login (AUTH_P2), interferiría con el
// SessionProvider: al recargar, la app pensaría que el usuario
// es de P2 y el login fallaría con 400 (password real ≠ sync).
// ============================================================

const P2_SYNC_PASSWORD = "YoleAdmin2026!Sync";
const CROSS_PROJECT_STORAGE_KEY = "yole-cross-p2";

let p2Client: SupabaseClient | null = null;
let p2AuthInProgress = false;
let p2AuthFailed = false;

/**
 * Devuelve un cliente autenticado para P2 (Proyecto 2).
 * Autentica automáticamente con la cuenta admin espejo.
 * Si la autenticación falla, devuelve null (no rompe la app).
 *
 * Usa persistSession: false + storageKey único → NO interfiere
 * con el SessionProvider ni el login flow principal.
 */
export async function getCrossProjectP2Client(): Promise<SupabaseClient | null> {
  // Si ya tenemos un cliente con sesión activa, reutilizarlo
  if (p2Client) {
    const { data: { session } } = await p2Client.auth.getSession();
    if (session) return p2Client;
    // Sesión expirada — re-autenticar abajo
  }

  if (p2AuthFailed) return null;
  if (p2AuthInProgress) {
    let tries = 0;
    while (p2AuthInProgress && tries < 50) {
      await new Promise((r) => setTimeout(r, 100));
      tries++;
    }
    return p2Client;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_2;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2;
  if (!url || !key) return null;

  p2AuthInProgress = true;
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
      console.warn("[CROSS-PROJECT] No se pudo autenticar admin en P2:", error.message);
      p2AuthFailed = true;
      p2AuthInProgress = false;
      return null;
    }

    console.log("[CROSS-PROJECT] ✅ Admin autenticado en P2");
    p2AuthInProgress = false;
    return p2Client;
  } catch (err) {
    console.warn("[CROSS-PROJECT] Error autenticando P2:", err);
    p2AuthFailed = true;
    p2AuthInProgress = false;
    return null;
  }
}

/**
 * Resetea el estado de autenticación P2 (para reintentar tras un fallo).
 */
export function resetCrossProjectAuth(): void {
  p2Client = null;
  p2AuthFailed = false;
  p2AuthInProgress = false;
}
