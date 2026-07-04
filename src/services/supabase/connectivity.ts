"use client";

import { getBrowserAuthClient } from "./authBrowserClient";
import { getBrowserBusinessClient } from "./businessBrowserClient";
import { getProjectConfig } from "./roundRobin";

export interface ConnectivityResult {
  ok: boolean;
  project1: boolean;
  project2: boolean;
  error?: string;
}

const STORAGE_KEY = "yole-connectivity-status";
const TTL_MS = 1000 * 60 * 60 * 24; // 24 horas
const FETCH_TIMEOUT_MS = 8000; // 8 segundos

/**
 * Verifica si una URL de Supabase es alcanzable.
 *
 * FIX vs versión anterior: Ya NO usa `mode: "no-cors"`.
 * El problema era que `no-cors` SIEMPRE resuelve como respuesta opaca
 * (type: "opaque", status: 0), lo que significa que NUNCA falla,
 * incluso si el proyecto está pausado o la URL es incorrecta.
 *
 * Ahora usamos `mode: "cors"` (por defecto) con timeout.
 * Si el proyecto Supabase está activo, responderá con CORS headers
 * (todos los endpoints de Supabase los tienen).
 * Si está caído, pausado, o la URL es incorrecta → fetch lanza error.
 */
async function checkSupabaseUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Cualquier respuesta (200, 401, 404, etc.) significa que el
    // servidor está levantado. Solo los errores 5xx son preocupantes,
    // pero incluso esos indican que el proyecto existe.
    return response.status < 500;
  } catch (err: any) {
    // Network error, timeout, o CORS failure → proyecto no disponible
    const reason = err?.name === "AbortError"
      ? "timeout (>8s)"
      : (err?.message || "network error");
    console.warn(
      `[CONNECTIVITY] Proyecto en ${url.substring(0, 30)}... no disponible:`,
      reason
    );
    return false;
  }
}

/**
 * Realiza un "ping" a ambos proyectos de Supabase.
 *
 * Estrategia mejorada:
 * 1. Si tenemos un cliente Supabase activo, usar getSession() (no requiere red)
 * 2. Si no, verificar la URL directamente con fetch (SIN no-cors)
 * 3. Cada catch tiene logging explícito
 */
export async function checkSupabaseConnectivity(): Promise<ConnectivityResult> {
  const result: ConnectivityResult = {
    ok: false,
    project1: false,
    project2: false,
  };

  try {
    // ─── Proyecto 1 ───
    const authClient = getBrowserAuthClient();
    if (authClient) {
      try {
        // getSession() lee de localStorage — no requiere red,
        // pero confirma que el cliente está funcional
        const { error: authError } = await authClient.auth.getSession();
        if (!authError) {
          result.project1 = true;
        } else {
          console.error(
            "[CONNECTIVITY] Error getSession() Proyecto 1:",
            authError.message
          );
          // El cliente existe pero getSession falló → verificar por URL
          result.project1 = await checkSupabaseUrl(
            process.env.NEXT_PUBLIC_SUPABASE_URL_1 || ""
          );
        }
      } catch (err: any) {
        console.error(
          "[CONNECTIVITY] Excepción verificando Proyecto 1:",
          err?.message || err
        );
        // Fallback a verificación por URL
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL_1 || "";
        if (url) {
          result.project1 = await checkSupabaseUrl(url);
        }
      }
    } else {
      // No hay cliente → verificar la URL directamente
      const config1 = getProjectConfig(1);
      if (config1.url) {
        result.project1 = await checkSupabaseUrl(config1.url);
      } else {
        console.warn(
          "[CONNECTIVITY] Proyecto 1: no hay cliente ni URL configurada"
        );
      }
    }

    // ─── Proyecto 2 ───
    const businessClient = getBrowserBusinessClient();
    if (businessClient) {
      try {
        // Consulta ligera: si responde (error de permisos o no) = hay conexión
        const { error: busError } = await businessClient
          .from("round_robin_counter")
          .select("id")
          .limit(1);

        if (busError) {
          // Si el error es de red (fetch), NO hay conexión
          const msg = busError.message?.toLowerCase() || "";
          if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed")) {
            result.project2 = false;
            console.error(
              "[CONNECTIVITY] Proyecto 2 - error de red:",
              busError.message
            );
          } else {
            // Error de permisos, tabla no existe, etc. → servidor SÍ responde
            result.project2 = true;
          }
        } else {
          result.project2 = true;
        }
      } catch (err: any) {
        console.error(
          "[CONNECTIVITY] Excepción verificando Proyecto 2:",
          err?.message || err
        );
        // Fallback a verificación por URL
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL_2 || "";
        if (url) {
          result.project2 = await checkSupabaseUrl(url);
        }
      }
    } else {
      // No hay cliente → verificar la URL directamente
      const config2 = getProjectConfig(2);
      if (config2.url) {
        result.project2 = await checkSupabaseUrl(config2.url);
      } else {
        console.warn(
          "[CONNECTIVITY] Proyecto 2: no hay cliente ni URL configurada (puede ser normal si solo usas Proyecto 1)"
        );
        // Si P2 no está configurado, no lo marcamos como error
        // Solo P1 es obligatorio
        result.project2 = true;
      }
    }

    // Resultado general: OK si al menos P1 funciona
    // (P2 puede no estar configurado y eso es válido)
    result.ok = result.project1;

    if (!result.ok) {
      result.error = `No se pudo conectar con el Proyecto Auth (1). ` +
        `Verifica que el proyecto de Supabase esté activo y las variables de entorno sean correctas.`;
    }

    return result;
  } catch (err: any) {
    console.error(
      "[CONNECTIVITY] Error inesperado en checkSupabaseConnectivity:",
      err
    );
    result.error = err?.message || "Error desconocido de red";
    return result;
  }
}

export function getCachedConnectivity() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    const now = Date.now();
    if (now - data.timestamp < TTL_MS) {
      return data.status as ConnectivityResult;
    }
    return null;
  } catch (err: any) {
    console.warn(
      "[CONNECTIVITY] Error leyendo cache de conectividad:",
      err?.message || err
    );
    return null;
  }
}

export function setCachedConnectivity(status: ConnectivityResult) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        status,
        timestamp: Date.now(),
      })
    );
  } catch (err: any) {
    console.warn(
      "[CONNECTIVITY] Error guardando cache de conectividad:",
      err?.message || err
    );
  }
}
