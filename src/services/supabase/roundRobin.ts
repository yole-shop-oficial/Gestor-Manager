"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOrCreateClient,
  getExistingClient,
  STORAGE_KEYS,
  type StorageKey,
} from "./clientFactory";

// ============================================================
// ROUND-ROBIN REGISTRATION SERVICE v3
// ============================================================
// FIX v3: Usa clientFactory para garantizar UN solo SupabaseClient
// por storageKey. Elimina completamente "Multiple GoTrueClient
// instances detected" y AuthRetryableFetchError.
//
// Cambios vs v2:
//   - createTempClient → usa factory (singleton por storageKey)
//   - createLoginClient → usa factory (elimina colisión con authBrowserClient)
//   - determineProjectForRegistration → fallback a P1 si P2 no configurado
//   - Logging mejorado para depuración
// ============================================================

interface ProjectConfig {
  url: string;
  anonKey: string;
  projectNumber: 1 | 2;
}

function getProjectConfigs(): { p1: ProjectConfig; p2: ProjectConfig } {
  const p1: ProjectConfig = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_1 || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1 || "",
    projectNumber: 1,
  };

  const p2: ProjectConfig = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_2 || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2 || "",
    projectNumber: 2,
  };

  return { p1, p2 };
}

function isConfigured(config: ProjectConfig): boolean {
  return Boolean(config.url && config.anonKey);
}

// ─── StorageKey para cada tipo de cliente por proyecto ───

function getLoginStorageKey(projectNumber: 1 | 2): StorageKey {
  return projectNumber === 1 ? STORAGE_KEYS.AUTH_P1 : STORAGE_KEYS.AUTH_P2;
}

function getRegisterStorageKey(projectNumber: 1 | 2): StorageKey {
  return projectNumber === 1 ? STORAGE_KEYS.REGISTER_P1 : STORAGE_KEYS.REGISTER_P2;
}

// ─── Clientes con factory — SIEMPRE singleton por storageKey ───

function getOrCreateRegistrationClient(config: ProjectConfig): SupabaseClient {
  const storageKey = getRegisterStorageKey(config.projectNumber);
  return getOrCreateClient(config.url, config.anonKey, {
    storageKey,
    persistSession: false,   // Registro: no persistir sesión
    autoRefreshToken: false,
  });
}

interface CounterResult {
  projectNumber: 1 | 2;
  count: number;
}

async function getRegistrationCount(
  config: ProjectConfig
): Promise<CounterResult> {
  const client = getOrCreateRegistrationClient(config);

  const { data, error } = await client
    .from("round_robin_counter")
    .select("total_registrations")
    .eq("id", 1)
    .single();

  if (error) {
    console.warn(
      `[ROUND-ROBIN] No se pudo leer contador del Proyecto ${config.projectNumber}:`,
      error.message
    );
    return { projectNumber: config.projectNumber, count: 0 };
  }

  return {
    projectNumber: config.projectNumber,
    count: data?.total_registrations ?? 0,
  };
}

export type SelectedProject = 1 | 2;

/**
 * Determina en qué proyecto se debe registrar el siguiente usuario.
 *
 * Estrategia: round-robin → el proyecto con MENOS registros gana.
 *
 * FIX vs v2: Si el Proyecto 2 no tiene env vars configuradas,
 * NO lanza Error — simplemente usa el Proyecto 1 como fallback.
 * Solo lanza Error si NINGÚN proyecto está configurado.
 */
export async function determineProjectForRegistration(): Promise<{
  project: SelectedProject;
  config: ProjectConfig;
  counts: { p1: number; p2: number };
}> {
  const { p1, p2 } = getProjectConfigs();

  const p1Ready = isConfigured(p1);
  const p2Ready = isConfigured(p2);

  // Si NINGÚN proyecto está configurado → error fatal
  if (!p1Ready && !p2Ready) {
    throw new Error(
      "Ningún proyecto de Supabase está configurado. " +
      "Verifica las variables NEXT_PUBLIC_SUPABASE_URL_1 y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1 en Vercel."
    );
  }

  // Si solo P1 está configurado → usar P1 directamente
  if (p1Ready && !p2Ready) {
    console.warn(
      "[ROUND-ROBIN] Proyecto 2 no configurado. Usando Proyecto 1 como fallback."
    );
    return {
      project: 1,
      config: p1,
      counts: { p1: 0, p2: 0 },
    };
  }

  // Si solo P2 está configurado → usar P2 (caso raro)
  if (!p1Ready && p2Ready) {
    console.warn(
      "[ROUND-ROBIN] Proyecto 1 no configurado. Usando Proyecto 2 como fallback."
    );
    return {
      project: 2,
      config: p2,
      counts: { p1: 0, p2: 0 },
    };
  }

  // Ambos proyectos configurados → leer contadores en paralelo
  const [result1, result2] = await Promise.all([
    getRegistrationCount(p1),
    getRegistrationCount(p2),
  ]);

  console.log(
    `[ROUND-ROBIN] Proyecto 1: ${result1.count} registros | Proyecto 2: ${result2.count} registros`
  );

  // El proyecto con menos registros recibe al nuevo usuario
  let selectedProject: SelectedProject;
  let selectedConfig: ProjectConfig;

  if (result1.count <= result2.count) {
    selectedProject = 1;
    selectedConfig = p1;
  } else {
    selectedProject = 2;
    selectedConfig = p2;
  }

  console.log(
    `[ROUND-ROBIN] ➡️ Usuario asignado al Proyecto ${selectedProject}`
  );

  return {
    project: selectedProject,
    config: selectedConfig,
    counts: { p1: result1.count, p2: result2.count },
  };
}

/**
 * Crea (o reutiliza) un cliente Supabase para REGISTRO.
 * No persiste sesión — es solo para el signUp.
 *
 * FIX: Ahora usa factory → garantiza singleton por storageKey.
 * Antes creaba una NUEVA instancia cada llamada → GoTrueClient duplicates.
 */
export function createRegistrationClient(
  config: ProjectConfig
): SupabaseClient {
  return getOrCreateRegistrationClient(config);
}

/**
 * Crea (o reutiliza) un cliente Supabase para LOGIN.
 * Este cliente SÍ persiste sesión para el navegador.
 *
 * FIX CRÍTICO: Ahora usa factory con storageKey oficial.
 * Antes usaba `yole-auth-p1` para Proyecto 1, lo cual
 * colisionaba con authBrowserClient.ts que también usaba
 * `yole-auth-p1` → "Multiple GoTrueClient instances detected".
 *
 * Ahora AMBOS comparten el MISMO singleton a través de la fábrica.
 */
export function createLoginClient(config: ProjectConfig): SupabaseClient {
  const storageKey = getLoginStorageKey(config.projectNumber);
  return getOrCreateClient(config.url, config.anonKey, {
    storageKey,
    persistSession: true,
    autoRefreshToken: true,
  });
}

/**
 * Obtiene la configuración de un proyecto específico por número.
 */
export function getProjectConfig(number: 1 | 2): ProjectConfig {
  const { p1, p2 } = getProjectConfigs();
  return number === 1 ? p1 : p2;
}

/**
 * Guarda en localStorage en qué proyecto está el usuario actual.
 */
export function saveUserProject(project: SelectedProject): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("yole_user_project", String(project));
}

/**
 * Lee de localStorage en qué proyecto está el usuario actual.
 * Retorna null si no hay información guardada.
 */
export function loadUserProject(): SelectedProject | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("yole_user_project");
  if (raw === "1" || raw === "2") return Number(raw) as SelectedProject;
  return null;
}

/**
 * Elimina la información del proyecto del usuario (logout).
 */
export function clearUserProject(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("yole_user_project");
}
