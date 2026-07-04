"use client";

import { getBrowserAuthClient } from "./authBrowserClient";
import { getBrowserBusinessClient } from "./businessBrowserClient";
import { getProjectConfig } from "./roundRobin";

export interface ConnectivityResult {
  ok: boolean;
  project1: boolean;
  project2: boolean;
  error?: string;
  /** Diagnóstico detallado para mostrar en pantalla */
  details: string[];
}

const STORAGE_KEY = "yole-connectivity-status";
const TTL_MS = 1000 * 60 * 60 * 24; // 24 horas
const FETCH_TIMEOUT_MS = 8000; // 8 segundos

/**
 * Verifica si una URL de Supabase es alcanzable.
 */
async function checkSupabaseUrl(url: string): Promise<{ ok: boolean; detail: string }> {
  if (!url) {
    return { ok: false, detail: "URL vacía — variable de entorno no configurada en Vercel" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return { ok: response.status < 500, detail: `HTTP ${response.status} — servidor responde` };
  } catch (err: any) {
    const reason = err?.name === "AbortError"
      ? `Timeout (>8s) — servidor no responde o está pausado`
      : (err?.message || "Error de red");
    return { ok: false, detail: reason };
  }
}

/**
 * Realiza un diagnóstico completo de conectividad.
 * IMPORTANTE: NUNCA bloquea — siempre retorna un resultado.
 * Si algo falla, lo marca pero la app puede seguir funcionando.
 */
export async function checkSupabaseConnectivity(): Promise<ConnectivityResult> {
  const result: ConnectivityResult = {
    ok: false,
    project1: false,
    project2: false,
    details: [],
  };

  const log = (msg: string) => result.details.push(msg);

  // ─── Verificar variables de entorno ───
  log("=== DIAGNÓSTICO DE CONECTIVIDAD ===");
  log(`Hora: ${new Date().toLocaleString("es-CU", { timeZone: "America/Havana" })}`);
  log(`Online: ${navigator.onLine ? "Sí" : "No"}`);
  log(`URL navegador: ${window.location.href}`);
  log("");

  // Leer env vars directamente para diagnóstico
  const url1 = process.env.NEXT_PUBLIC_SUPABASE_URL_1;
  const key1 = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1;
  const url2 = process.env.NEXT_PUBLIC_SUPABASE_URL_2;
  const key2 = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2;

  log("--- Variables de entorno ---");
  log(`P1 URL: ${url1 ? url1.substring(0, 35) + "..." : "❌ NO CONFIGURADA"}`);
  log(`P1 KEY: ${key1 ? key1.substring(0, 12) + "..." : "❌ NO CONFIGURADA"}`);
  log(`P2 URL: ${url2 ? url2.substring(0, 35) + "..." : "❌ NO CONFIGURADA (opcional)"}`);
  log(`P2 KEY: ${key2 ? key2.substring(0, 12) + "..." : "❌ NO CONFIGURADA (opcional)"}`);
  log("");

  // ─── Proyecto 1 ───
  log("--- Proyecto 1 (Auth) ---");
  try {
    const authClient = getBrowserAuthClient();
    if (authClient) {
      log("✅ Cliente P1 creado");
      const { error: authError } = await authClient.auth.getSession();
      if (!authError) {
        result.project1 = true;
        log("✅ getSession() OK — P1 conectado");
      } else {
        log(`⚠️ getSession() error: ${authError.message}`);
        // Verificar por URL
        const check = await checkSupabaseUrl(url1 || "");
        log(`Fetch P1: ${check.detail}`);
        result.project1 = check.ok;
      }
    } else {
      log("❌ Cliente P1 NO disponible");
      const check = await checkSupabaseUrl(url1 || "");
      log(`Fetch P1: ${check.detail}`);
      result.project1 = check.ok;
    }
  } catch (err: any) {
    log(`❌ Excepción P1: ${err?.message || err}`);
    const check = await checkSupabaseUrl(url1 || "");
    log(`Fetch P1 fallback: ${check.detail}`);
    result.project1 = check.ok;
  }

  // ─── Proyecto 2 ───
  log("");
  log("--- Proyecto 2 (Business) ---");
  try {
    const businessClient = getBrowserBusinessClient();
    if (businessClient) {
      log("✅ Cliente P2 creado");
      const { error: busError } = await businessClient
        .from("round_robin_counter")
        .select("id")
        .limit(1);

      if (busError) {
        const msg = busError.message?.toLowerCase() || "";
        if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed")) {
          result.project2 = false;
          log(`❌ P2 error de red: ${busError.message}`);
        } else {
          // Error de permisos/tabla = servidor responde
          result.project2 = true;
          log(`✅ P2 servidor responde (error esperado: ${busError.message.substring(0, 50)})`);
        }
      } else {
        result.project2 = true;
        log("✅ P2 conectado");
      }
    } else {
      log("⚠️ Cliente P2 NO disponible (puede ser normal si solo usas P1)");
      // Si P2 no está configurado, lo marcamos como OK (no es obligatorio)
      result.project2 = true;
    }
  } catch (err: any) {
    log(`❌ Excepción P2: ${err?.message || err}`);
    result.project2 = true; // No bloquear por P2
  }

  // ─── Resultado ───
  log("");
  log("--- Resultado ---");
  log(`P1: ${result.project1 ? "✅ OK" : "❌ FALLO"}`);
  log(`P2: ${result.project2 ? "✅ OK" : "❌ FALLO"}`);

  // Solo P1 es obligatorio para que la app funcione
  result.ok = result.project1;

  if (!result.ok) {
    result.error = "No se pudo conectar con el Proyecto Auth (1). Revisa las variables de entorno en Vercel.";
    log("❌ APP BLOQUEADA — P1 no disponible");
  } else {
    log("✅ App puede funcionar");
  }

  // Imprimir todo en consola también (para quien tenga acceso)
  result.details.forEach((line) => console.log(`[CONNECTIVITY] ${line}`));

  return result;
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
    console.warn("[CONNECTIVITY] Error leyendo cache:", err?.message || err);
    return null;
  }
}

export function setCachedConnectivity(status: ConnectivityResult) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        status: { ...status, details: [] }, // No cachear details (son del momento)
        timestamp: Date.now(),
      })
    );
  } catch (err: any) {
    console.warn("[CONNECTIVITY] Error guardando cache:", err?.message || err);
  }
}
