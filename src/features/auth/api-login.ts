"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  getProjectConfig,
  createLoginClient,
  saveUserProject,
  loadUserProject,
  type SelectedProject,
} from "@/services/supabase/roundRobin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { setSession } from "@/hooks/useSession";

/**
 * Inicia sesión buscando al usuario en ambos proyectos (round-robin).
 *
 * Estrategia:
 * 1. Si ya sabemos en qué proyecto está (localStorage), intentar ahí primero
 * 2. Si no sabemos, intentar Proyecto 1, luego Proyecto 2
 * 3. Guardar el proyecto correcto en localStorage para futuros logins
 * 4. Actualizar el session singleton directamente (sin depender de onAuthStateChange)
 */
export async function loginWithRoundRobin(
  email: string,
  password: string
): Promise<{ error: string | null; project: SelectedProject | null }> {
  // ─── Rate limit: máximo 5 intentos de login por minuto ───
  const rateLimitKey = `login:${email}`;
  if (!checkRateLimit(rateLimitKey, 5, 60_000)) {
    return { error: "Demasiados intentos. Espera un minuto e inténtalo de nuevo.", project: null };
  }

  // ─── Intentar con el proyecto guardado primero ───
  const savedProject = loadUserProject();

  if (savedProject) {
    const result = await tryLogin(savedProject, email, password);
    if (result.success && result.user && result.client) {
      setSession(result.user, result.client, savedProject);
      return { error: null, project: savedProject };
    }
    // Si falla con credenciales incorrectas, NO abortar: el usuario
    // podría tener cuenta en el OTRO proyecto (caso del admin espejo).
    // Solo abortar si es un error de conexión irreversible.
  }

  // ─── Intentar Proyecto 1 ───
  const result1 = await tryLogin(1, email, password);
  if (result1.success && result1.user && result1.client) {
    saveUserProject(1);
    setSession(result1.user, result1.client, 1);
    return { error: null, project: 1 };
  }

  // ─── Intentar Proyecto 2 ───
  const result2 = await tryLogin(2, email, password);
  if (result2.success && result2.user && result2.client) {
    saveUserProject(2);
    setSession(result2.user, result2.client, 2);
    return { error: null, project: 2 };
  }

  // ─── Ambos fallaron — determinar tipo de error ───
  if (result1.isAuthError || result2.isAuthError) {
    return { error: "Correo o contraseña incorrectos.", project: null };
  }

  // ─── Ningún proyecto funcionó ───
  return {
    error: "No se pudo conectar con ningún servidor. Verifica tu conexión a internet.",
    project: null,
  };
}

interface TryLoginResult {
  success: boolean;
  error: string | null;
  isAuthError: boolean;
  isConnectionError: boolean;
  user?: User | null;
  client?: SupabaseClient | null;
}

async function tryLogin(
  projectNumber: SelectedProject,
  email: string,
  password: string
): Promise<TryLoginResult> {
  try {
    const config = getProjectConfig(projectNumber);

    if (!config.url || !config.anonKey) {
      return {
        success: false,
        error: `Proyecto ${projectNumber} no configurado`,
        isAuthError: false,
        isConnectionError: false,
      };
    }

    const client = createLoginClient(config);
    const { data, error: authError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const msg = authError.message.toLowerCase();

      const isCredentialError =
        msg.includes("invalid login credentials") ||
        msg.includes("invalid password") ||
        msg.includes("email not confirmed") ||
        msg.includes("user not found");

      const isConnectionError =
        msg.includes("fetch") ||
        msg.includes("network") ||
        msg.includes("timeout") ||
        msg.includes("failed to fetch");

      let translatedError: string;
      if (msg.includes("invalid login credentials") || msg.includes("invalid password")) {
        translatedError = "Correo o contraseña incorrectos.";
      } else if (msg.includes("email not confirmed")) {
        translatedError = "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";
      } else if (msg.includes("rate limit")) {
        translatedError = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
      } else {
        translatedError = authError.message;
      }

      return {
        success: false,
        error: translatedError,
        isAuthError: isCredentialError,
        isConnectionError,
      };
    }

    // Login exitoso — return user and client so caller can update singleton
    return {
      success: true,
      error: null,
      isAuthError: false,
      isConnectionError: false,
      user: data.user,
      client,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message || "Error de conexión",
      isAuthError: false,
      isConnectionError: true,
    };
  }
}
