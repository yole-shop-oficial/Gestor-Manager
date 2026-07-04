import { z } from "zod";

// ─── Helpers ───

/**
 * Teléfono cubano: +53 seguido de 5, 6, 7, 8 (móvil) o 7 (fijo La Habana)
 * Acepta: +5351234567, 5351234567, 5 1234567, +53 5 1234567
 * Normaliza a: +5351234567
 */
const cubaPhoneRegex = /^(\+53|53)?\s*[5-8]\s?\d{7}$/;

function normalizeCubaPhone(phone: string): string {
  const digits = phone.replace(/\s+/g, "");
  if (digits.startsWith("+53")) return digits;
  if (digits.startsWith("53")) return "+" + digits;
  return "+53" + digits;
}

/**
 * Carnet de identidad cubano: 11 dígitos
 * Formato: YYMMDD####N (fecha nacimiento + secuencial + dígito)
 */
const cubaIdCardRegex = /^\d{11}$/;

/**
 * Número de tarjeta bancaria: 13-19 dígitos
 */
const bankCardRegex = /^\d{13,19}$/;

// ─── Login Schema ───

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Correo inválido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// ─── Register Schema ───
//
// FIX #6: La validación cruzada password === confirmPassword
// se movió a confirmPassword con .refine() que accede al
// campo password vía superRefine, para que la validación
// se ejecute TAMBIÉN cuando se hace trigger(["password", "confirmPassword"])
// en el paso 3 del wizard.

export const registerSchema = z
  .object({
    // ── Paso 1: Identidad ──
    fullName: z
      .string()
      .min(3, "Nombre demasiado corto")
      .max(80, "Nombre demasiado largo")
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s']+$/, "Solo letras y espacios"),

    username: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(32, "Máximo 32 caracteres")
      .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, puntos, guiones y guiones bajos"),

    email: z
      .string()
      .min(1, "El correo es obligatorio")
      .email("Correo inválido")
      .refine((val) => val.toLowerCase().endsWith("@gmail.com"), {
        message: "Solo se aceptan cuentas Gmail (@gmail.com)",
      }),

    // ── Paso 2: Información personal ──
    phone: z
      .string()
      .min(1, "El teléfono es obligatorio")
      .refine((val) => cubaPhoneRegex.test(val), {
        message: "Teléfono cubano inválido. Formato: +53 5 1234567",
      })
      .transform(normalizeCubaPhone),

    age: z.coerce
      .number({
        message: "La edad debe ser un número",
      })
      .int("La edad debe ser entera")
      .min(18, "Debes ser mayor de 18 años")
      .max(100, "Edad no válida"),

    birthDate: z
      .string()
      .min(1, "La fecha de nacimiento es obligatoria")
      .refine((val) => {
        const d = new Date(val);
        return !isNaN(d.getTime()) && d < new Date();
      }, "Fecha inválida"),

    gender: z.enum(["male", "female", "other"], {
      message: "Selecciona un género",
    }),

    idCard: z
      .string()
      .min(1, "El carnet es obligatorio")
      .refine((val) => cubaIdCardRegex.test(val.replace(/\s/g, "")), {
        message: "Carnet cubano: 11 dígitos (ej: 01020304056)",
      })
      .transform((val) => val.replace(/\s/g, "")),

    address: z
      .string()
      .min(10, "Dirección demasiado corta (mínimo 10 caracteres)")
      .max(200, "Dirección demasiado larga"),

    bankCardNumber: z
      .string()
      .min(1, "Número de tarjeta obligatorio")
      .refine((val) => bankCardRegex.test(val.replace(/\s|-/g, "")), {
        message: "Número de tarjeta inválido (13-19 dígitos)",
      })
      .transform((val) => val.replace(/\s|-/g, "")),

    bankCardHolder: z
      .string()
      .min(3, "Nombre del titular demasiado corto")
      .max(80, "Nombre del titular demasiado largo"),

    transferConfirmationNumber: z
      .string()
      .min(1, "Número de confirmación obligatorio")
      .max(50, "Número demasiado largo"),

    observations: z.string().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),

    hasSalesExperience: z.boolean(),

    joinDate: z
      .string()
      .min(1, "La fecha de ingreso es obligatoria"),

    // ── Paso 3: Seguridad ──
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(64, "Máximo 64 caracteres")
      .refine((val) => /[A-Z]/.test(val), { message: "Debe incluir al menos una mayúscula" })
      .refine((val) => /[a-z]/.test(val), { message: "Debe incluir al menos una minúscula" })
      .refine((val) => /[0-9]/.test(val), { message: "Debe incluir al menos un número" })
      .refine((val) => /[^A-Za-z0-9]/.test(val), { message: "Debe incluir al menos un símbolo" }),

    confirmPassword: z.string().min(1, "Confirma tu contraseña"),

    // ── Paso 4: Políticas ──
    readPrivacy: z.boolean(),
    readTerms: z.boolean(),
    acceptTerms: z.boolean().refine((v) => v, { message: "Debes aceptar las políticas" }),
    acceptPrivacy: z.boolean().refine((v) => v, { message: "Debes aceptar la política de privacidad" }),
    confirmRealInfo: z.boolean().refine((v) => v, { message: "Debes confirmar que la información es real" }),
    understandPayments: z.boolean().refine((v) => v, { message: "Debes confirmar que entiendes las condiciones de pago" }),
  })
  // FIX #6: superRefine ejecuta la validación cruzada INCLUSO cuando
  // trigger() se llama solo con ["password", "confirmPassword"].
  // El .refine() anterior solo se ejecutaba en trigger() sin argumentos.
  .superRefine((data, ctx) => {
    // Validación cruzada: contraseñas deben coincidir
    if (data.confirmPassword && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden",
      });
    }

    // Validación cruzada: políticas deben haberse leído
    if (!data.readPrivacy || !data.readTerms) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["readPrivacy"],
        message: "Debes leer la Política de Privacidad y las Condiciones de Uso",
      });
    }
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
