"use client";

import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/validation";
import { registerGestor } from "@/features/auth/api";
import { StepIdentity } from "./RegisterWizardStepIdentity";
import { StepPersonal } from "./RegisterWizardStepPersonal";
import { StepSecurity } from "./RegisterWizardStepSecurity";
import { StepPolicies } from "./RegisterWizardStepPolicies";
import { RegisterWizardHeader } from "./RegisterWizardHeader";
import { RegisterSuccess } from "./RegisterSuccess";
import { getClientDiagnostics } from "@/services/supabase/clientFactory";

const TOTAL_STEPS = 4;

const STEP_FIELDS: Record<number, (keyof RegisterFormValues)[]> = {
  1: ["fullName", "username", "email"],
  2: [
    "phone", "age", "birthDate", "gender", "idCard", "address",
    "bankCardNumber", "bankCardHolder", "transferConfirmationNumber",
    "observations", "hasSalesExperience", "joinDate",
  ],
  3: ["password", "confirmPassword"],
  4: [
    "readPrivacy", "readTerms", "acceptTerms", "acceptPrivacy",
    "confirmRealInfo", "understandPayments",
  ],
};

import { AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

export function RegisterWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [technicalDetails, setTechnicalDetails] = useState<string[]>([]);
  const [showTech, setShowTech] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // 🔒 Guarda con ref para evitar doble envío
  const isSubmitting = useRef(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema) as any,
    mode: "all",
    defaultValues: {
      fullName: "", username: "", email: "", phone: "",
      age: 18, birthDate: "", gender: "male", idCard: "", address: "",
      bankCardNumber: "", bankCardHolder: "", transferConfirmationNumber: "",
      observations: "", hasSalesExperience: false,
      joinDate: new Date().toISOString().slice(0, 10),
      password: "", confirmPassword: "",
      readPrivacy: false, readTerms: false, acceptTerms: false,
      acceptPrivacy: false, confirmRealInfo: false, understandPayments: false,
    },
  });

  const goNext = async () => {
    if (isSubmitting.current || loading) return;
    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields, { shouldFocus: true });
    if (!valid) return;
    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  };

  const goBack = () => setStep((prev) => Math.max(1, prev - 1));

  const onSubmit = async (values: RegisterFormValues) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setError(null);
    setTechnicalDetails([]);
    setLoading(true);
    setLoadingStatus("Creando cuenta...");

    // Capturar diagnóstico ANTES del registro
    const diag = getClientDiagnostics();
    const preDiag = [
      `=== DIAGNÓSTICO PRE-REGISTRO ===`,
      `Hora: ${new Date().toLocaleString("es-CU", { timeZone: "America/Havana" })}`,
      `Online: ${navigator.onLine ? "Sí" : "No"}`,
      `Clientes activos: ${diag.totalClients} (${diag.storageKeys.join(", ") || "ninguno"})`,
      `URL P1: ${process.env.NEXT_PUBLIC_SUPABASE_URL_1 || "❌ NO CONFIGURADA"}`,
      `KEY P1: ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1 ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1.substring(0, 12) + "..." : "❌ NO CONFIGURADA"}`,
      `URL P2: ${process.env.NEXT_PUBLIC_SUPABASE_URL_2 || "No configurada"}`,
      `KEY P2: ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2 ? "Configurada" : "No configurada"}`,
      `Email: ${values.email}`,
    ];

    try {
      await registerGestor(values, (status) => {
        setLoadingStatus(status);
      });
      setCompleted(true);
      setSuccess(
        "Registro completado. Revisa tu correo para confirmar la cuenta antes de iniciar sesión."
      );
    } catch (e: any) {
      console.error("Error capturado en Wizard:", e);

      const errLines = [...preDiag];
      errLines.push("");
      errLines.push("=== ERROR EN REGISTRO ===");
      errLines.push(`Tipo: ${e?.name || "Error"}`);
      errLines.push(`Mensaje: ${e?.message || "Sin mensaje"}`);

      // Capturar POST-REGISTRO diagnóstico
      const postDiag = getClientDiagnostics();
      errLines.push("");
      errLines.push("=== DIAGNÓSTICO POST-ERROR ===");
      errLines.push(`Clientes activos: ${postDiag.totalClients} (${postDiag.storageKeys.join(", ") || "ninguno"})`);

      // Verificar localStorage
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith("yole") || k.startsWith("sb-"));
        errLines.push(`LocalStorage keys: ${keys.join(", ") || "ninguna"}`);
      } catch {
        errLines.push("LocalStorage: no accesible");
      }

      setError(e?.message || "No fue posible crear la cuenta.");
      setTechnicalDetails(errLines);
      setShowTech(true); // Mostrar automáticamente en error
    } finally {
      setLoading(false);
      setLoadingStatus("");
      isSubmitting.current = false;
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting.current || loading) return;

    setError(null);
    setSuccess(null);

    const valid = await form.trigger();

    if (!valid) {
      const errors = form.formState.errors as any;
      const errorCount = Object.keys(errors).length;
      setError(`El formulario tiene ${errorCount} error(es). Revisa los campos marcados en rojo.`);

      if (errors.readPrivacy || errors.readTerms) {
        setError("Debes entrar a VER la Política de Privacidad y las Condiciones para marcarlas como leídas.");
        setStep(4);
        return;
      }

      for (const stepNumber of [1, 2, 3, 4]) {
        const fields = STEP_FIELDS[stepNumber];
        if (fields.some((field) => errors[field])) {
          setStep(stepNumber);
          break;
        }
      }
      return;
    }

    await onSubmit(form.getValues());
  };

  const renderStep = () => {
    const stepProps = { form };
    switch (step) {
      case 1: return <StepIdentity {...stepProps} />;
      case 2: return <StepPersonal {...stepProps} />;
      case 3: return <StepSecurity {...stepProps} />;
      case 4: default: return <StepPolicies {...stepProps} />;
    }
  };

  if (completed) return <RegisterSuccess message={success} />;

  return (
    <div className="min-h-screen flex flex-col bg-background pb-6 relative">
      {loading && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold mb-2">{loadingStatus}</h2>
          <p className="text-sm text-muted-foreground">Por favor, no cierres la aplicación</p>
        </div>
      )}

      <div className="flex-1 flex flex-col p-6 pt-10 max-w-md mx-auto w-full">
        <RegisterWizardHeader step={step} totalSteps={TOTAL_STEPS} />

        <div className="flex-1 overflow-y-auto">
          {renderStep()}

          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-800 dark:text-red-300">
                    ❌ No fue posible crear la cuenta.
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                    Motivo: {error}
                  </p>

                  {technicalDetails.length > 0 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowTech(!showTech)}
                        className="text-[10px] uppercase font-bold flex items-center gap-1 text-red-600 dark:text-red-500 underline"
                      >
                        {showTech ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {showTech ? "Ocultar" : "Ver"} diagnóstico ({technicalDetails.length} líneas)
                      </button>

                      {showTech && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              const text = technicalDetails.join("\n");
                              navigator.clipboard.writeText(text).then(() => {
                                const btn = document.getElementById("copy-btn-reg");
                                if (btn) btn.textContent = "✅ Copiado!";
                                setTimeout(() => { if (btn) btn.textContent = "📋 Copiar"; }, 2000);
                              }).catch(() => {
                                // Fallback para navegadores sin clipboard API
                                const ta = document.createElement("textarea");
                                ta.value = text;
                                document.body.appendChild(ta);
                                ta.select();
                                document.execCommand("copy");
                                document.body.removeChild(ta);
                                const btn = document.getElementById("copy-btn-reg");
                                if (btn) btn.textContent = "✅ Copiado!";
                                setTimeout(() => { if (btn) btn.textContent = "📋 Copiar"; }, 2000);
                              });
                            }}
                            id="copy-btn-reg"
                            className="absolute top-2 right-2 text-[9px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg font-bold z-10"
                          >
                            📋 Copiar
                          </button>
                          <pre className="mt-2 p-2 bg-black text-green-400 text-[10px] rounded-lg overflow-x-auto whitespace-pre-wrap max-h-40">
                            {technicalDetails.join("\n")}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="mt-4 w-full py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg disabled:opacity-60"
                  >
                    Reintentar registro
                  </button>
                </div>
              </div>
            </div>
          )}

          {success && (
            <p className="mt-3 text-xs text-green-600 text-center font-medium bg-green-50 p-3 rounded-xl border border-green-100">
              {success}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || loading}
            className="px-4 py-3 rounded-2xl text-sm font-semibold bg-accent text-muted-foreground disabled:opacity-50"
          >
            Atrás
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              disabled={loading}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg disabled:opacity-60"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={loading}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg disabled:opacity-60"
            >
              Finalizar registro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
