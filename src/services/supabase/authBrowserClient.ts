"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOrCreateClient,
  hasClient,
  STORAGE_KEYS,
} from "./clientFactory";

/**
 * Cliente de Supabase para el navegador (Proyecto 1 - Auth).
 *
 * Usa la fábrica centralizada para garantizar que solo exista
 * UNA instancia con storageKey "yole-auth-p1".
 *
 * Si las env vars no están configuradas, devuelve null.
 */
let initAttempted = false;

export function getBrowserAuthClient(): SupabaseClient | null {
  // Si ya existe en la fábrica, retornarlo directamente
  if (hasClient(STORAGE_KEYS.AUTH_P1)) {
    return getOrCreateClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_1!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1!,
      {
        storageKey: STORAGE_KEYS.AUTH_P1,
        persistSession: true,
        autoRefreshToken: true,
      }
    );
  }

  if (initAttempted) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_1;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1;

  if (!url || !anonKey) {
    console.warn(
      "[AUTH CLIENT] NEXT_PUBLIC_SUPABASE_URL_1 / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1 " +
      "no están configuradas."
    );
    initAttempted = true;
    return null;
  }

  // Crear a través de la fábrica — garantiza singleton
  initAttempted = true;
  return getOrCreateClient(url, anonKey, {
    storageKey: STORAGE_KEYS.AUTH_P1,
    persistSession: true,
    autoRefreshToken: true,
  });
}

export function requireBrowserAuthClient(): SupabaseClient {
  const client = getBrowserAuthClient();
  if (!client) {
    throw new Error(
      "Cliente Auth del navegador no disponible. " +
      "Verifica las variables NEXT_PUBLIC_SUPABASE_URL_1 y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1 en Vercel."
    );
  }
  return client;
}
