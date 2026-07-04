"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOrCreateClient,
  hasClient,
  STORAGE_KEYS,
} from "./clientFactory";

/**
 * Cliente de Supabase para el navegador (Proyecto 2 - Operación Comercial).
 *
 * Usa la fábrica centralizada para garantizar que solo exista
 * UNA instancia con storageKey "yole-business-p2".
 *
 * Si las env vars no están configuradas, devuelve null.
 */
let initAttempted = false;

export function getBrowserBusinessClient(): SupabaseClient | null {
  // Si ya existe en la fábrica, retornarlo directamente
  if (hasClient(STORAGE_KEYS.BUSINESS_P2)) {
    return getOrCreateClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_2!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2!,
      {
        storageKey: STORAGE_KEYS.BUSINESS_P2,
        persistSession: false,
        autoRefreshToken: false,
      }
    );
  }

  if (initAttempted) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_2;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2;

  if (!url || !anonKey) {
    console.warn(
      "[BUSINESS CLIENT] NEXT_PUBLIC_SUPABASE_URL_2 / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2 " +
      "no están configuradas."
    );
    initAttempted = true;
    return null;
  }

  // Crear a través de la fábrica — garantiza singleton
  initAttempted = true;
  return getOrCreateClient(url, anonKey, {
    storageKey: STORAGE_KEYS.BUSINESS_P2,
    persistSession: false,
    autoRefreshToken: false,
  });
}

export function requireBrowserBusinessClient(): SupabaseClient {
  const client = getBrowserBusinessClient();
  if (!client) {
    throw new Error(
      "Cliente Business del navegador no disponible. " +
      "Verifica las variables NEXT_PUBLIC_SUPABASE_URL_2 y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2 en Vercel."
    );
  }
  return client;
}
