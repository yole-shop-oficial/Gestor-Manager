"use client";

import type { RegisterFormValues } from "./validation";
import {
  determineProjectForRegistration,
  createRegistrationClient,
  saveUserProject,
  getProjectConfig,
  type SelectedProject,
} from "@/services/supabase/roundRobin";
import { checkRateLimit } from "@/lib/rate-limiter";

/**
 * Ping a Supabase project usando su propia API REST (con apikey header).
 * Esto evita errores de CORS porque la API REST sí permite cross-origin
 * cuando se envía el header apikey correcto.
 */
async function pingSupabase(
  url: string,
  anonKey: string
): Promise<{ ok: boolean; detail: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Usar /rest/v1/ con apikey header → CORS permitido
    const res = await fetch(`${url}/rest/v1/round_robin_counter?select=id&limit=1`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Cualquier respuesta (incluso error de RLS) = servidor activo
    if (res.status < 500) {
      return { ok: true, detail: `HTTP ${res.status} — servidor activo` };
    }
    return { ok: false, detail: `HTTP ${res.status} — error del servidor` };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { ok: false, detail: "Timeout 10s — no responde" };
    }
    return { ok: false, detail: err?.message || "Error de red" };
  }
}

/**
 * Registra un nuevo gestor usando ROUND-ROBIN.
 *
 * v5: Ping con apikey header (evita CORS), fallback automático
 */
export async function registerGestor(
  values: RegisterFormValues,
  onProgress: (status: string) => void
) {
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

  // ─── Rate limit: máximo 3 intentos de registro cada 2 minutos ───
  const rateLimitKey = `register:${values.email}`;
  if (!checkRateLimit(rateLimitKey, 3, 120_000)) {
    throw Object.assign(
      new Error("Demasiados intentos de registro. Espera 2 minutos."),
      { diag: ["Rate limit alcanzado para " + values.email] }
    );
  }

  // ─── PASO 1: Hacer ping a ambos proyectos (con apikey) ───
  onProgress("Verificando conexión a bases de datos...");
  log("PASO 1: Haciendo ping a ambos proyectos (con apikey)...");

  const p1Config = getProjectConfig(1);
  const p2Config = getProjectConfig(2);

  let p1Alive = false;
  let p2Alive = false;

  // Ping P1 — usando REST API con apikey (evita CORS)
  if (p1Config.url && p1Config.anonKey) {
    const result = await pingSupabase(p1Config.url, p1Config.anonKey);
    p1Alive = result.ok;
    log(`Ping P1: ${result.ok ? "✅" : "❌"} ${result.detail}`);
  } else {
    log("Ping P1: ⏭️ No configurado");
  }

  // Ping P2 — usando REST API con apikey (evita CORS)
  if (p2Config.url && p2Config.anonKey) {
    const result = await pingSupabase(p2Config.url, p2Config.anonKey);
    p2Alive = result.ok;
    log(`Ping P2: ${result.ok ? "✅" : "❌"} ${result.detail}`);
  } else {
    log("Ping P2: ⏭️ No configurado");
  }

  log("");

  // ─── PASO 2: Elegir proyecto que FUNCIONA ───
  log("PASO 2: Seleccionando proyecto activo...");

  let project: SelectedProject;
  let config: ReturnType<typeof getProjectConfig>;

  if (!p1Alive && !p2Alive) {
    log("❌ NINGÚN proyecto responde");

    throw Object.assign(
      new Error(
        "No se pudo conectar con los proyectos de Supabase.\n\n" +
        "Posibles causas:\n" +
        "1. Proyectos pausados → Ve a supabase.com/dashboard y restaura\n" +
        "2. Variables de entorno incorrectas → Revisa Vercel\n" +
        "3. Sin conexión a internet"
      ),
      { diag }
    );
  }

  // Elegir el que esté vivo, preferir round-robin
  if (p1Alive && p2Alive) {
    try {
      const result = await determineProjectForRegistration();
      project = result.project;
      config = result.config;
      log(`✅ Round-robin seleccionó: P${project}`);
    } catch {
      project = 1;
      config = p1Config;
      log(`⚠️ Round-robin falló, usando P1 directamente`);
    }
  } else if (p1Alive) {
    project = 1;
    config = p1Config;
    log(`⚠️ Solo P1 responde — usando P1`);
  } else {
    project = 2;
    config = p2Config;
    log(`⚠️ Solo P2 responde — usando P2`);
  }

  log("");

  // ─── PASO 3: Crear cliente y registrar ───
  onProgress(`Creando usuario en Proyecto ${project}...`);
  log(`PASO 3: Creando cliente para P${project}...`);

  const supabase = createRegistrationClient(config);
  log(`✅ Cliente creado`);

  log(`PASO 4: Ejecutando auth.signUp() en P${project}...`);
  log(`Email: ${values.email}`);

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
    log(`❌ EXCEPCIÓN en signUp:`);
    log(`Tipo: ${fetchErr?.name}`);
    log(`Mensaje: ${fetchErr?.message}`);

    throw Object.assign(
      new Error(
        `Error de red al crear cuenta en P${project}. ` +
        `Verifica tu conexión e intenta de nuevo.`
      ),
      { diag }
    );
  }

  if (authError) {
    log(`❌ SUPABASE AUTH ERROR:`);
    log(`Nombre: ${authError.name || "N/A"}`);
    log(`Mensaje: ${authError.message || "(vacío)"}`);
    log(`Status: ${authError.status || "N/A"}`);
    log(`Código: ${authError.code || "N/A"}`);

    const message = (authError.message || "").toLowerCase();
    const errorName = (authError.name || "").toLowerCase();

    if (
      errorName.includes("retryable") ||
      errorName.includes("fetch") ||
      message.includes("failed to fetch") ||
      message.includes("network")
    ) {
      throw Object.assign(
        new Error(
          `Error de conexión con Proyecto ${project}.\n\n` +
          "Posibles causas:\n" +
          "1. Proyecto pausado → supabase.com/dashboard → Restore\n" +
          "2. Sin conexión a internet"
        ),
        { diag }
      );
    }

    if (message.includes("rate limit")) {
      throw Object.assign(new Error("Demasiados intentos. Espera unos minutos."), { diag });
    }
    if (message.includes("already registered") || message.includes("user already exists")) {
      throw Object.assign(new Error("Este correo ya está registrado. Intenta iniciar sesión."), { diag });
    }
    if (message.includes("invalid email")) {
      throw Object.assign(new Error("Correo electrónico inválido."), { diag });
    }
    if (message.includes("password")) {
      throw Object.assign(new Error("La contraseña no cumple los requisitos (mínimo 6 caracteres)."), { diag });
    }

    throw Object.assign(
      new Error("Error: " + (authError.message || `AuthError status=${authError.status}`)),
      { diag }
    );
  }

  const user = authData?.user;
  if (!user) {
    log("❌ signUp devolvió user=null — se envió email de confirmación");
    // Con autoconfirm activo, user siempre debería volver
    // Pero si no está autoconfirmado, user=null hasta que confirme email
    throw Object.assign(
      new Error(
        "Se envió un correo de confirmación. Revisa tu email y haz clic en el enlace para activar tu cuenta."
      ),
      { diag }
    );
  }

  log(`✅ USUARIO CREADO: ${user.id}`);
  log(`Email: ${user.email}`);
  log(`Confirmado: ${user.email_confirmed_at ? "Sí" : "Pendiente (revisa tu correo)"}`);

  // ─── PASO 5: Incrementar contador ───
  try {
    const { error: counterError } = await supabase.rpc("increment_registration_counter");
    log(counterError ? `⚠️ Contador: ${counterError.message}` : "✅ Contador OK");
  } catch (e: any) {
    log(`⚠️ Contador: ${e?.message}`);
  }

  saveUserProject(project);
  log(`✅ Proyecto ${project} guardado`);
  log("=== REGISTRO COMPLETADO ===");

  onProgress("Registro completado...");
  return { user, project };
}
