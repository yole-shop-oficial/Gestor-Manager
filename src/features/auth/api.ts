"use client";

import type { RegisterFormValues } from "./validation";
import {
  determineProjectForRegistration,
  createRegistrationClient,
  saveUserProject,
  getProjectConfig,
  type SelectedProject,
} from "@/services/supabase/roundRobin";

/**
 * Registra un nuevo gestor usando ROUND-ROBIN.
 * 
 * v3: Logging EXTREMO para diagnosticar el error de red.
 * Cada paso se registra en un array que se expone al usuario
 * en pantalla (sin necesidad de consola).
 */
export async function registerGestor(
  values: RegisterFormValues,
  onProgress: (status: string) => void
) {
  // Diagnóstico acumulado — se devuelve en el error si falla
  const diag: string[] = [];
  const log = (msg: string, data?: any) => {
    const line = data ? `${msg} ${typeof data === "string" ? data : JSON.stringify(data)}` : msg;
    diag.push(line);
    console.log(`[REGISTER] ${line}`);
  };

  log("=== INICIO REGISTRO ===");
  log(`Hora: ${new Date().toLocaleString("es-CU", { timeZone: "America/Havana" })}`);
  log(`Email: ${values.email}`);
  log(`Online: ${navigator.onLine}`);
  log(`URL P1: ${process.env.NEXT_PUBLIC_SUPABASE_URL_1 || "NO CONFIG"}`);
  log(`KEY P1: ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1 ? "✅ Configurada" : "❌ NO CONFIG"}`);
  log(`URL P2: ${process.env.NEXT_PUBLIC_SUPABASE_URL_2 || "NO CONFIG"}`);
  log(`KEY P2: ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2 ? "✅ Configurada" : "❌ NO CONFIG"}`);
  log("");

  // ─── PASO 1: Determinar proyecto ───
  onProgress("Determinando proyecto óptimo...");
  log("PASO 1: Determinando proyecto con round-robin...");

  let project: SelectedProject;
  let config: ReturnType<typeof getProjectConfig>;

  try {
    const result = await determineProjectForRegistration();
    project = result.project;
    config = result.config;
    log(`✅ Proyecto seleccionado: ${project}`);
    log(`URL: ${config.url}`);
    log(`Contadores: P1=${result.counts.p1}, P2=${result.counts.p2}`);
  } catch (err: any) {
    log(`❌ ERROR en determineProjectForRegistration()`);
    log(`Tipo: ${err?.name || "Error"}`);
    log(`Mensaje: ${err?.message || "Sin mensaje"}`);
    log(`Stack: ${err?.stack?.substring(0, 200) || "N/A"}`);

    // Intentar con P1 directamente como fallback
    log("Intentando fallback directo a Proyecto 1...");
    const p1Config = getProjectConfig(1);
    if (!p1Config.url || !p1Config.anonKey) {
      throw Object.assign(
        new Error("No se pudo determinar el proyecto y P1 no está configurado. Verifica las variables en Vercel."),
        { diag }
      );
    }
    project = 1;
    config = p1Config;
    log(`Fallback: usando P1 directamente`);
  }

  log("");

  // ─── PASO 2: Crear cliente temporal ───
  log("PASO 2: Creando cliente de registro...");
  let supabase;
  try {
    supabase = createRegistrationClient(config);
    log(`✅ Cliente creado para P${project}`);
  } catch (err: any) {
    log(`❌ ERROR creando cliente: ${err?.message}`);
    throw Object.assign(
      new Error("Error creando cliente Supabase: " + err?.message),
      { diag }
    );
  }

  log("");

  // ─── PASO 3: Intentar ping al proyecto ───
  log("PASO 3: Verificando conexión al proyecto antes de signUp...");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const pingResponse = await fetch(config.url, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    log(`✅ Ping OK: HTTP ${pingResponse.status} ${pingResponse.statusText}`);
  } catch (pingErr: any) {
    log(`❌ PING FALLÓ: ${pingErr?.name === "AbortError" ? "Timeout 10s" : pingErr?.message}`);
    log(`⚠️ El proyecto ${project} NO responde. Posiblemente está PAUSADO.`);
    log(`Ve a https://supabase.com/dashboard y verifica que el proyecto esté activo.`);
  }

  log("");

  // ─── PASO 4: signUp ───
  onProgress(`Creando usuario en Proyecto ${project}...`);
  log("PASO 4: Ejecutando auth.signUp()...");
  log(`Enviando signUp con email: ${values.email}`);
  log(`Metadata: full_name=${values.fullName}, assigned_project=${project}`);

  let authData: any;
  let authError: any;

  try {
    const result = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          display_name: values.username,
          phone: values.phone,
          age: String(values.age),
          birth_date: values.birthDate,
          gender: values.gender,
          id_card: values.idCard,
          address: values.address,
          bank_card_number: values.bankCardNumber,
          bank_card_holder: values.bankCardHolder,
          transfer_confirmation_number: values.transferConfirmationNumber,
          observations: values.observations || "",
          has_sales_experience: String(Boolean(values.hasSalesExperience)),
          join_date: values.joinDate,
          assigned_project: String(project),
          read_privacy: String(Boolean(values.readPrivacy)),
          read_terms: String(Boolean(values.readTerms)),
          confirm_real_info: String(Boolean(values.confirmRealInfo)),
          understand_payments: String(Boolean(values.understandPayments)),
        },
      },
    });
    authData = result.data;
    authError = result.error;
  } catch (fetchErr: any) {
    log(`❌ EXCEPCIÓN en signUp (no es error Supabase, es error de RED):`);
    log(`Tipo: ${fetchErr?.name || "Error"}`);
    log(`Mensaje: ${fetchErr?.message || "Sin mensaje"}`);
    log(`Stack: ${fetchErr?.stack?.substring(0, 300) || "N/A"}`);

    // Este es el error real — probablemente el proyecto está pausado
    const isRetryable = fetchErr?.name?.includes("Retryable") || 
                        fetchErr?.message?.includes("fetch") ||
                        fetchErr?.message?.includes("network") ||
                        fetchErr?.name?.includes("AuthRetryableFetchError");

    let userMessage: string;
    if (isRetryable) {
      userMessage = 
        "No se pudo conectar con Supabase. " +
        "El proyecto probablemente está PAUSADO.\n\n" +
        "SOLUCIÓN:\n" +
        "1. Ve a https://supabase.com/dashboard\n" +
        "2. Abre el proyecto " + (project === 1 ? "rfkpzgdeefswpqyihvof" : "blbhhezrqmpxxhliinpt") + "\n" +
        "3. Si dice 'Paused', haz clic en 'Restore project'\n" +
        "4. Espera 2 minutos y vuelve a intentar";
    } else {
      userMessage = "Error inesperado de red: " + (fetchErr?.message || "Desconocido");
    }

    throw Object.assign(new Error(userMessage), { diag });
  }

  if (authError) {
    log(`❌ SUPABASE AUTH ERROR:`);
    log(`Nombre: ${authError.name || "N/A"}`);
    log(`Mensaje: ${authError.message || "N/A"}`);
    log(`Status: ${authError.status || "N/A"}`);
    log(`Código: ${authError.code || "N/A"}`);

    const message = (authError.message || "").toLowerCase();
    const errorName = (authError.name || "").toLowerCase();

    // Error de red
    if (
      errorName.includes("retryable") ||
      errorName.includes("fetch") ||
      message.includes("failed to fetch") ||
      message.includes("network") ||
      message.includes("fetch")
    ) {
      throw Object.assign(
        new Error(
          "El servidor de Supabase no responde. " +
          "El proyecto probablemente está PAUSADO.\n\n" +
          "SOLUCIÓN:\n" +
          "1. Ve a https://supabase.com/dashboard\n" +
          "2. Abre el proyecto\n" +
          "3. Si dice 'Paused', haz clic en 'Restore project'\n" +
          "4. Espera 2 minutos y vuelve a intentar"
        ),
        { diag }
      );
    }

    if (message.includes("rate limit")) {
      throw Object.assign(
        new Error("Demasiados intentos. Espera unos minutos e inténtalo de nuevo."),
        { diag }
      );
    }
    if (message.includes("already registered") || message.includes("user already exists")) {
      throw Object.assign(
        new Error("Este correo ya está registrado. Intenta iniciar sesión."),
        { diag }
      );
    }
    if (message.includes("invalid email")) {
      throw Object.assign(new Error("El correo electrónico no es válido."), { diag });
    }
    if (message.includes("password")) {
      throw Object.assign(new Error("La contraseña no cumple los requisitos de seguridad."), { diag });
    }

    throw Object.assign(
      new Error("Error Supabase: " + (authError.message || "Desconocido")),
      { diag }
    );
  }

  const user = authData?.user;
  if (!user) {
    log("❌ signUp no devolvió usuario (session null = confirmar email requerido)");
    log(`authData: ${JSON.stringify({ user: authData?.user ? "presente" : "null", session: authData?.session ? "presente" : "null" })}`);

    // Si no hay user PERO no hay error, puede ser que Supabase requiera confirmar email
    // y signUp devuelve session: null. Esto es normal.
    // Verificar si hay algo en authData
    if (authData?.user === null && authData?.session === null) {
      log("⚠️ user=null y session=null — probablemente requiere confirmar email PERO el usuario SÍ se creó");
    }

    throw Object.assign(
      new Error("signUp no devolvió usuario. Puede que el proyecto esté pausado o la key sea incorrecta."),
      { diag }
    );
  }

  log(`✅ USUARIO CREADO: ${user.id}`);
  log(`Email confirmado: ${user.email_confirmed_at || "Pendiente"}`);

  // ─── PASO 5: Incrementar contador ───
  log("PASO 5: Incrementando contador round-robin...");
  try {
    const { error: counterError } = await supabase.rpc("increment_registration_counter");
    if (counterError) {
      log(`⚠️ Contador: ${counterError.message} (no crítico)`);
    } else {
      log("✅ Contador incrementado");
    }
  } catch (e: any) {
    log(`⚠️ Contador excepción: ${e?.message} (no crítico)`);
  }

  // ─── PASO 6: Guardar proyecto ───
  saveUserProject(project);
  log(`✅ Proyecto ${project} guardado en localStorage`);

  onProgress("Finalizando registro...");
  log("=== REGISTRO COMPLETADO ===");

  return { user, project };
}
