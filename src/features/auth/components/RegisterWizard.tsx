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

const TOTAL_STEPS = 4;

const STEP_FIELDS: Record<number, (keyof RegisterFormValues)[]> = {
  1: ["fullName", "username", "email"],
  2: [
    "phone",
    "age",
    "birthDate",
    "gender",
    "idCard",
    "address",
    "bankCardNumber",
    "bankCardHolder",
    "transferConfirmationNumber",
    "observations",
    "hasSalesExperience",
    "joinDate",
  ],
  3: ["password", "confirmPassword"],
  4: [
    "readPrivacy",
    "readTerms",
    "acceptTerms",
    "acceptPrivacy",
    "confirmRealInfo",
    "understandPayments",
  ],
};

const STEP_ORDER = [1, 2, 3, 4];

interface StepProps {
  // Simplificamos el tipo para evitar incompatibilidades de versiones
  form: any;
}

import { AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

export function RegisterWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [technicalDetails, setTechnicalDetails] = useState<any>(null);
  const [showTech, setShowTech] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // 🔒 Guarda con ref para evitar doble envío (race condition)
  const isSubmitting = useRef(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema) as any,
    mode: "all",
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      phone: "",
      age: 18,
      birthDate: "",
      gender: "male",
      idCard: "",
      address: "",
      bankCardNumber: "",
      bankCardHolder: "",
      transferConfirmationNumber: "",
      observations: "",
      hasSalesExperience: false,
      joinDate: new Date().toISOString().slice(0, 10),
      password: "",
      confirmPassword: "",
      readPrivacy: false,
      readTerms: false,
      acceptTerms: false,
      acceptPrivacy: false,
      confirmRealInfo: false,
      understandPayments: false,
    },
  });

  const goNext = async () => {
    if (isSubmitting.current || loading) return;
    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields, { shouldFocus: true });
    if (!valid) {
      console.log("Paso inválido. Errores:", form.formState.errors);
      return;
    }
    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  };

  const goBack = () => setStep((prev) => Math.max(1, prev - 1));

  const onSubmit = async (values: RegisterFormValues) => {
    // 🔒 Doble guard: ref + state
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setError(null);
    setTechnicalDetails(null);
    setLoading(true);
    setLoadingStatus("Creando cuenta...");

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
      setError(e?.message || "No fue posible crear la cuenta.");
      setTechnicalDetails(e);
    } finally {
      setLoading(false);
      setLoadingStatus("");
      // ⚠️ Liberar el ref DESPUÉS de que todo terminó
      isSubmitting.current = false;
    }
  };

  const handleFinalSubmit = async () => {
    // 🔒 Bloquear inmediatamente antes de CUALQUIER operación async
    if (isSubmitting.current || loading) return;

    setError(null);
    setSuccess(null);
    console.log("Validando formulario final...");
    
    const valid = await form.trigger();
    
    if (!valid) {
      const errors = form.formState.errors as any;
      console.error("Fallo de validación Zod:", errors);
      
      // Auditoría detallada de errores para el usuario
      const errorCount = Object.keys(errors).length;
      setError(`El formulario tiene ${errorCount} error(es). Por favor revisa los campos marcados en rojo.`);

      // Si el error es de lectura de políticas (root refinement)
      if (errors.readPrivacy || errors.readTerms) {
        setError("IMPORTANTE: Debes entrar a VER la Política de Privacidad y las Condiciones (botón 'Ver') para marcarlas como leídas.");
        setStep(4);
        return;
      }

      for (const stepNumber of STEP_ORDER) {
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
    const stepProps: StepProps = { form };
    switch (step) {
      case 1:
        return <StepIdentity {...stepProps} />;
      case 2:
        return <StepPersonal {...stepProps} />;
      case 3:
        return <StepSecurity {...stepProps} />;
      case 4:
      default:
        return <StepPolicies {...stepProps} />;
    }
  };

  if (completed) return <RegisterSuccess message={success} />;

  return (
    <div className="min-h-screen flex flex-col bg-background pb-6 relative">
      {/* Visual Overlay Loading Passo a Paso */}
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

          {/* Errores con Detalles Técnicos */}
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
                  
                  {technicalDetails && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowTech(!showTech)}
                        className="text-[10px] uppercase font-bold flex items-center gap-1 text-red-600 dark:text-red-500 underline"
                      >
                        {showTech ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Ver detalles técnicos
                      </button>
                      
                      {showTech && (
                        <pre className="mt-2 p-2 bg-black text-green-400 text-[10px] rounded-lg overflow-x-auto whitespace-pre-wrap max-h-32">
                          {JSON.stringify(technicalDetails, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="mt-4 w-full py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
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
            className="px-4 py-3 rounded-2xl text-sm font-semibold bg-accent text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Atrás
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              disabled={loading}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={loading}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Finalizar registro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}