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
 * v4: Si el proyecto seleccionado no responde (pausado),
 * intenta con el OTRO proyecto automáticamente.
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

  // ─── PASO 1: Hacer ping a ambos proyectos ───
  onProgress("Verificando conexión a bases de datos...");
  log("PASO 1: Haciendo ping a ambos proyectos...");

  const p1Config = getProjectConfig(1);
  const p2Config = getProjectConfig(2);

  let p1Alive = false;
  let p2Alive = false;

  // Ping P1
  if (p1Config.url && p1Config.anonKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(p1Config.url, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutId);
      p1Alive = res.status < 500;
      log(`Ping P1: ✅ HTTP ${res.status}`);
    } catch (err: any) {
      p1Alive = false;
      log(`Ping P1: ❌ ${err?.name === "AbortError" ? "Timeout 10s" : err?.message}`);
      log(`⚠️ Proyecto 1 PAUSADO o inaccesible`);
    }
  } else {
    log("Ping P1: ⏭️ No configurado");
  }

  // Ping P2
  if (p2Config.url && p2Config.anonKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(p2Config.url, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutId);
      p2Alive = res.status < 500;
      log(`Ping P2: ✅ HTTP ${res.status}`);
    } catch (err: any) {
      p2Alive = false;
      log(`Ping P2: ❌ ${err?.name === "AbortError" ? "Timeout 10s" : err?.message}`);
      log(`⚠️ Proyecto 2 PAUSADO o inaccesible`);
    }
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
    log("");
    log("SOLUCIÓN:");
    log("1. Ve a https://supabase.com/dashboard");
    log("2. Abre CADA proyecto");
    log("3. Si dice 'Paused' → clic en 'Restore project'");
    log("4. Espera 2 minutos y vuelve a intentar");

    throw Object.assign(
      new Error(
        "Ambos proyectos de Supabase están pausados o inaccesibles.\n\n" +
        "SOLUCIÓN:\n" +
        "1. Ve a supabase.com/dashboard\n" +
        "2. Abre cada proyecto\n" +
        "3. Si dice 'Paused' → clic en 'Restore project'\n" +
        "4. Espera 2 minutos y vuelve a intentar"
      ),
      { diag }
    );
  }

  // Elegir el que esté vivo, preferir round-robin
  if (p1Alive && p2Alive) {
    // Ambos funcionan — usar round-robin normal
    try {
      const result = await determineProjectForRegistration();
      project = result.project;
      config = result.config;
      log(`✅ Round-robin seleccionó: P${project}`);
    } catch {
      // Fallback si el contador falla
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
        `El proyecto puede haberse pausado durante el registro. ` +
        `Intenta de nuevo en unos segundos.`
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
          `El Proyecto ${project} no responde (pausado).\n\n` +
          "SOLUCIÓN:\n" +
          "1. Ve a supabase.com/dashboard\n" +
          "2. Abre el proyecto\n" +
          "3. Si dice 'Paused' → clic en 'Restore project'\n" +
          "4. Espera 2 minutos y vuelve a intentar"
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
      throw Object.assign(new Error("La contraseña no cumple los requisitos."), { diag });
    }

    throw Object.assign(
      new Error("Error: " + (authError.message || `AuthError status=${authError.status}`)),
      { diag }
    );
  }

  const user = authData?.user;
  if (!user) {
    log("❌ signUp devolvió user=null");
    throw Object.assign(
      new Error("No se pudo crear el usuario. Verifica que el proyecto de Supabase esté activo."),
      { diag }
    );
  }

  log(`✅ USUARIO CREADO: ${user.id}`);
  log(`Email confirmado: ${user.email_confirmed_at || "Pendiente (revisa tu correo)"}`);

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
