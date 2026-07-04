"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// CENTRALIZED SUPABASE CLIENT FACTORY v1
// ============================================================
// FIX: Garantiza UN solo SupabaseClient por storageKey.
//
// PROBLEMA RAÍZ (AuthRetryableFetchError):
//   Antes existían 6-7 instancias de GoTrueClient con el mismo
//   storageKey, lo que causaba conflictos en localStorage y
//   el error "Multiple GoTrueClient instances detected".
//
// SOLUCIÓN:
//   Esta fábrica centraliza TODA la creación de clientes.
//   Cada storageKey produce exactamente UN singleton.
//   Todos los demás archivos DEBEN usar esta fábrica.
// ============================================================

interface ClientOptions {
  storageKey: string;
  persistSession: boolean;
  autoRefreshToken: boolean;
}

// Cache global: storageKey → SupabaseClient singleton
const clientCache = new Map<string, SupabaseClient>();

/**
 * Obtiene o crea un SupabaseClient singleton por storageKey.
 *
 * Si ya existe un cliente con el mismo storageKey, lo retorna
 * sin importar si los parámetros (url, anonKey) coinciden.
 * Esto es INTENCIONAL: en la app, cada storageKey mapea a
 * exactamente un proyecto, así que no debería haber conflicto.
 */
export function getOrCreateClient(
  url: string,
  anonKey: string,
  options: ClientOptions
): SupabaseClient {
  const existing = clientCache.get(options.storageKey);
  if (existing) {
    return existing;
  }

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: options.persistSession,
      autoRefreshToken: options.autoRefreshToken,
      storageKey: options.storageKey,
    },
  });

  clientCache.set(options.storageKey, client);
  return client;
}

/**
 * Verifica si ya existe un cliente con el storageKey dado.
 */
export function hasClient(storageKey: string): boolean {
  return clientCache.has(storageKey);
}

/**
 * Obtiene un cliente existente por storageKey, o null si no existe.
 */
export function getExistingClient(storageKey: string): SupabaseClient | null {
  return clientCache.get(storageKey) ?? null;
}

/**
 * Elimina un cliente del cache (para pruebas o logout completo).
 */
export function removeClient(storageKey: string): void {
  clientCache.delete(storageKey);
}

/**
 * Limpia todo el cache de clientes.
 * Útil para logout completo o pruebas.
 */
export function clearAllClients(): void {
  clientCache.clear();
}

/**
 * Devuelve información de diagnóstico sobre los clientes activos.
 * Usado por FloatingToolKit para depuración.
 */
export function getClientDiagnostics(): {
  totalClients: number;
  storageKeys: string[];
} {
  return {
    totalClients: clientCache.size,
    storageKeys: Array.from(clientCache.keys()),
  };
}

// ─── StorageKeys oficiales de la app ───
// Centralizados aquí para evitar duplicados o typos
export const STORAGE_KEYS = {
  /** Cliente auth persistente del Proyecto 1 (login + sesión) */
  AUTH_P1: "yole-auth-p1",
  /** Cliente auth persistente del Proyecto 2 (login + sesión) */
  AUTH_P2: "yole-auth-p2",
  /** Cliente business no-persistente del Proyecto 2 */
  BUSINESS_P2: "yole-business-p2",
  /** Cliente temporal de registro del Proyecto 1 */
  REGISTER_P1: "yole-register-p1",
  /** Cliente temporal de registro del Proyecto 2 */
  REGISTER_P2: "yole-register-p2",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
