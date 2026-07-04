"use client";

import type { RegisterFormValues } from "./validation";
import {
  determineProjectForRegistration,
  createRegistrationClient,
  saveUserProject,
  getProjectConfig,
  type SelectedProject,
} from "@/services/supabase/roundRobin";
import { getOrCreateClient, STORAGE_KEYS } from "@/services/supabase/clientFactory";

/**
 * Registra un nuevo gestor usando ROUND-ROBIN entre Proyecto 1 y Proyecto 2.
 *
 * ⚠️ IMPORTANTE: El flujo correcto es:
 * 1. Leer contadores de ambos proyectos → elegir el de menos registros
 * 2. Crear usuario en Auth con TODOS los datos en metadata
 * 3. El trigger handle_new_user() (SECURITY DEFINER) crea la fila COMPLETA en profiles
 * 4. NO se necesita UPDATE separado (eso causaba que los campos quedaran NULL)
 *
 * ¿Por qué no funciona el UPDATE después de signUp?
 *   Cuando "Confirm email" está activado en Supabase, signUp() devuelve
 *   session: null. Sin sesión activa, auth.uid() es null en RLS, y el
 *   UPDATE de profiles es bloqueado silenciosamente (0 filas afectadas).
 *   El trigger con SECURITY DEFINER salta RLS y crea todo en un solo paso.
 */
export async function registerGestor(
  values: RegisterFormValues,
  onProgress: (status: string) => void
) {
  const log = (msg: string, data?: any) => {
    console.log(`[REGISTER DEBUG] ${msg}`, data || "");
  };

  log("INICIANDO REGISTRO CON ROUND-ROBIN", { email: values.email });

  // ─── PASO 1: Determinar proyecto ───
  onProgress("Determinando proyecto óptimo...");

  const { project, config, counts } =
    await determineProjectForRegistration();

  log(
    `PROYECTO SELECCIONADO: ${project}`,
    { counts, url: config.url.substring(0, 30) + "..." }
  );

  // ─── PASO 2: Crear cliente temporal para registro ───
  const supabase = createRegistrationClient(config);

  // ─── PASO 3: Registro en Supabase Auth con TODOS los datos ───
  // El trigger handle_new_user() leerá estos metadatos y creará
  // la fila COMPLETA en profiles. No necesitamos UPDATE después.
  onProgress(`Creando usuario en Proyecto ${project}...`);
  log("Ejecutando auth.signUp con metadatos completos...");

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: {
        // ── Identidad ──
        full_name: values.fullName,
        display_name: values.username,
        phone: values.phone,

        // ── Información personal (ANTES no se pasaban → quedaban NULL) ──
        age: String(values.age),
        birth_date: values.birthDate,
        gender: values.gender,
        id_card: values.idCard,
        address: values.address,
        bank_card_number: values.bankCardNumber,
        bank_card_holder: values.bankCardHolder,
        transfer_confirmation_number: values.transferConfirmationNumber,
        observations: values.observations || "",

        // ── Experiencia ──
        has_sales_experience: String(Boolean(values.hasSalesExperience)),
        join_date: values.joinDate,

        // ── Sistema ──
        assigned_project: String(project),
        read_privacy: String(Boolean(values.readPrivacy)),
        read_terms: String(Boolean(values.readTerms)),
        confirm_real_info: String(Boolean(values.confirmRealInfo)),
        understand_payments: String(Boolean(values.understandPayments)),
      },
    },
  });

  if (authError) {
    log("ERROR EN AUTH.SIGNUP", authError);

    const message = authError.message?.toLowerCase() || "";
    const errorName = (authError as any)?.name?.toLowerCase() || "";

    // Error de red (no se puede conectar con Supabase)
    if (
      errorName.includes("retryable") ||
      errorName.includes("fetch") ||
      message.includes("failed to fetch") ||
      message.includes("network") ||
      message.includes("fetch")
    ) {
      throw new Error(
        "No se pudo conectar con el servidor de Supabase. " +
        "Posibles causas:\n" +
        "1. El proyecto de Supabase está pausado (ve a supabase.com y despiértalo)\n" +
        "2. Las variables de entorno en Vercel están incorrectas\n" +
        "3. Tu conexión a internet es inestable\n" +
        "Intenta de nuevo en unos segundos."
      );
    }

    if (message.includes("rate limit") || message.includes("email rate limit exceeded")) {
      throw new Error(
        "Has intentado registrarte demasiadas veces con este correo. " +
        "Supabase bloquea el registro temporalmente por seguridad. " +
        "Espera unos minutos (hasta 1 hora) e inténtalo de nuevo, o usa otro correo Gmail."
      );
    }
    if (message.includes("already registered") || message.includes("user already exists")) {
      throw new Error(
        "Este correo ya está registrado en el sistema. " +
        "Intenta iniciar sesión en vez de crear una cuenta nueva."
      );
    }
    if (message.includes("invalid email")) {
      throw new Error("El correo electrónico no es válido.");
    }
    if (message.includes("password")) {
      throw new Error("La contraseña no cumple los requisitos de seguridad de Supabase.");
    }

    throw new Error(
      "Error al crear la cuenta: " + (authError.message || "Error desconocido")
    );
  }

  const user = authData.user;
  if (!user) {
    log("ERROR: signUp no devolvió usuario");
    throw new Error("No se pudo crear el usuario en el sistema de autenticación.");
  }

  log("USUARIO CREADO EXITOSAMENTE — El trigger creó el perfil completo", {
    userId: user.id,
    project,
  });

  // ─── PASO 4: Incrementar contador round-robin ───
  // FIX #11: Usamos un cliente con el ANON KEY del proyecto
  // (sin sesión de usuario) para llamar al RPC. Esto funciona
  // porque el RPC increment_registration_counter() se ejecuta
  // con SECURITY DEFINER o la tabla round_robin_counter permite
  // escritura al rol anon (como debe ser para un contador público).
  try {
    // Usamos el mismo cliente de registro (no requiere sesión)
    const { error: counterError } = await supabase.rpc(
      "increment_registration_counter"
    );
    if (counterError) {
      log("AVISO: No se pudo incrementar el contador (no crítico)", counterError.message);
    } else {
      log("Contador incrementado exitosamente");
    }
  } catch (e: any) {
    log("AVISO: Excepción incrementando contador (no crítico)", e?.message || e);
  }

  // ─── PASO 5: Guardar proyecto del usuario en localStorage ───
  saveUserProject(project);
  log("PROYECTO GUARDADO EN LOCAL STORAGE", { project });

  onProgress("Finalizando registro...");
  log("REGISTRO COMPLETADO TOTALMENTE — No se necesita UPDATE", { project });

  return { user, project };
}
