"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Scale, ShieldCheck } from "lucide-react";

interface Props {
  form: any;
}

export function StepPolicies({ form }: Props) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const [view, setView] = useState<"none" | "privacy" | "terms">("none");
  const readPrivacy = watch("readPrivacy");
  const readTerms = watch("readTerms");

  if (view === "privacy") {
    return (
      <PolicyScreen
        title="Política de Privacidad"
        icon={ShieldCheck}
        onBack={() => {
          setValue("readPrivacy", true, { shouldDirty: true });
          setView("none");
        }}
      >
        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <h4 className="text-sm font-bold text-foreground">1. Responsable del tratamiento</h4>
          <p>YOLE SHOP APP, operada por YOLE SHOP, es responsable del tratamiento de tus datos personales conforme a la legislación vigente.</p>

          <h4 className="text-sm font-bold text-foreground">2. Datos que recopilamos</h4>
          <ul className="list-disc pl-4 space-y-1">
            <li>Nombre completo, correo electrónico Gmail y nombre de usuario.</li>
            <li>Teléfono móvil (+53), fecha de nacimiento, género, carnet de identidad y dirección.</li>
            <li>Datos bancarios: número de tarjeta y titular para pagos de comisiones.</li>
            <li>Número de confirmación de transferencia inicial.</li>
            <li>Información de experiencia en ventas y fecha de ingreso.</li>
          </ul>

          <h4 className="text-sm font-bold text-foreground">3. Finalidad del tratamiento</h4>
          <ul className="list-disc pl-4 space-y-1">
            <li>Gestionar tu cuenta de gestor y autenticación.</li>
            <li>Registrar y dar seguimiento a pedidos de clientes.</li>
            <li>Calcular y pagar comisiones automáticamente.</li>
            <li>Comunicar cambios importantes sobre tu cuenta, pedidos y pagos.</li>
            <li>Enviar notificaciones operativas dentro de la app.</li>
          </ul>

          <h4 className="text-sm font-bold text-foreground">4. No compartimos tus datos</h4>
          <p>Tus datos personales NO se venden, alquilan ni comparten con terceros para fines publicitarios. Solo se utilizan para la operación interna de YOLE SHOP APP.</p>

          <h4 className="text-sm font-bold text-foreground">5. Seguridad</h4>
          <p>Utilizamos Supabase con Row Level Security (RLS), cifrado en tránsito (HTTPS) y autenticación JWT. Tus contraseñas están hasheadas y nunca se almacenan en texto plano.</p>

          <h4 className="text-sm font-bold text-foreground">6. Tus derechos</h4>
          <p>Puedes solicitar acceso, rectificación o eliminación de tus datos contactando al administrador a través del chat de la app.</p>

          <h4 className="text-sm font-bold text-foreground">7. Cambios</h4>
          <p>Esta política puede actualizarse. Te notificaremos dentro de la app si hay cambios significativos.</p>
        </div>
      </PolicyScreen>
    );
  }

  if (view === "terms") {
    return (
      <PolicyScreen
        title="Condiciones de Uso"
        icon={Scale}
        onBack={() => {
          setValue("readTerms", true, { shouldDirty: true });
          setView("none");
        }}
      >
        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <h4 className="text-sm font-bold text-foreground">1. Objeto</h4>
          <p>Estas condiciones regulan el uso de YOLE SHOP APP por parte de gestores registrados, para la gestión de pedidos, comisiones, wallet y comunicación con la administración.</p>

          <h4 className="text-sm font-bold text-foreground">2. Requisitos para ser gestor</h4>
          <ul className="list-disc pl-4 space-y-1">
            <li>Ser mayor de 18 años.</li>
            <li>Proporcionar datos reales y verificables (nombre, teléfono cubano +53, carnet de identidad, dirección).</li>
            <li>Disponer de una cuenta bancaria para recibir comisiones.</li>
            <li>Realizar la transferencia de confirmación inicial.</li>
          </ul>

          <h4 className="text-sm font-bold text-foreground">3. Comisiones y pagos</h4>
          <ul className="list-disc pl-4 space-y-1">
            <li>Las comisiones se calculan automáticamente a partir de pedidos con estado &ldquo;Vendido&rdquo;.</li>
            <li>El saldo disponible se refleja en la wallet de la app.</li>
            <li>Los pagos se solicitan desde la app y son procesados por administración.</li>
            <li>No se realizan pagos manuales ni fuera de la plataforma.</li>
          </ul>

          <h4 className="text-sm font-bold text-foreground">4. Obligaciones del gestor</h4>
          <ul className="list-disc pl-4 space-y-1">
            <li>Registrar únicamente pedidos reales y veraces.</li>
            <li>No utilizar la app para fines fraudulentos o ilegales.</li>
            <li>Mantener actualizada la información personal.</li>
            <li>Proteger las credenciales de acceso (no compartir contraseña).</li>
          </ul>

          <h4 className="text-sm font-bold text-foreground">5. Sanciones</h4>
          <p>El incumplimiento de estas condiciones puede resultar en el bloqueo temporal o permanente de la cuenta, sin derecho a compensación.</p>

          <h4 className="text-sm font-bold text-foreground">6. Responsabilidad</h4>
          <p>YOLE SHOP APP es una herramienta de gestión. Los pedidos, productos y relaciones con clientes son responsabilidad exclusiva del gestor. La app no garantiza ventas ni ingresos mínimos.</p>

          <h4 className="text-sm font-bold text-foreground">7. Modificaciones</h4>
          <p>Las condiciones pueden actualizarse. Los cambios se notificarán dentro de la app y entrarán en vigor tras la aceptación del gestor.</p>
        </div>
      </PolicyScreen>
    );
  }

  return (
    <div className="space-y-5">
      {/* Documentos a leer */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Documentos obligatorios</h2>

        {/* Política de privacidad */}
        <button
          type="button"
          onClick={() => setView("privacy")}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-border/40 active:scale-[0.98] transition-transform text-left"
        >
          <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500/15 to-purple-500/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Política de Privacidad</p>
            <p className="text-[11px] text-muted-foreground">Datos que recopilamos, cómo los usamos y tus derechos.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <StatusPill active={readPrivacy} />
          </div>
        </button>

        {/* Condiciones de uso */}
        <button
          type="button"
          onClick={() => setView("terms")}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-border/40 active:scale-[0.98] transition-transform text-left"
        >
          <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-purple-500/15 to-pink-500/15 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Condiciones de Uso</p>
            <p className="text-[11px] text-muted-foreground">Requisitos, comisiones, obligaciones y sanciones.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <StatusPill active={readTerms} />
          </div>
        </button>
      </div>

      {/* Separador */}
      <div className="border-t border-border/40" />

      {/* Checks de confirmación */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Confirma lo siguiente:</h3>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-5 h-5 rounded-md border-2 border-border text-indigo-600 focus:ring-indigo-500 focus:ring-2"
            {...register("acceptTerms")}
          />
          <div>
            <span className={`text-sm ${errors.acceptTerms ? "text-red-500 font-bold" : ""}`}>
              Acepto las Condiciones de Uso de YOLE SHOP APP.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-5 h-5 rounded-md border-2 border-border text-indigo-600 focus:ring-indigo-500 focus:ring-2"
            {...register("acceptPrivacy")}
          />
          <div>
            <span className={`text-sm ${errors.acceptPrivacy ? "text-red-500 font-bold" : ""}`}>
              Acepto la Política de Privacidad y el tratamiento de mis datos.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-5 h-5 rounded-md border-2 border-border text-indigo-600 focus:ring-indigo-500 focus:ring-2"
            {...register("confirmRealInfo")}
          />
          <div>
            <span className={`text-sm ${errors.confirmRealInfo ? "text-red-500 font-bold" : ""}`}>
              Confirmo que toda la información proporcionada es real y verificable.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-5 h-5 rounded-md border-2 border-border text-indigo-600 focus:ring-indigo-500 focus:ring-2"
            {...register("understandPayments")}
          />
          <div>
            <span className={`text-sm ${errors.understandPayments ? "text-red-500 font-bold" : ""}`}>
              Entiendo que las comisiones se calculan automáticamente desde pedidos vendidos y los pagos se solicitan desde la app.
            </span>
          </div>
        </label>

        {(errors.acceptTerms || errors.acceptPrivacy || errors.confirmRealInfo || errors.understandPayments) && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Debes marcar todas las casillas para continuar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-1 text-[10px]">
      <CheckCircle2
        className={`w-3 h-3 ${active ? "text-green-500" : "text-muted-foreground/40"}`}
      />
      <span className={active ? "text-green-600 font-semibold" : "text-muted-foreground/50"}>
        {active ? "Leído" : "Pendiente"}
      </span>
    </div>
  );
}

interface PolicyScreenProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onBack: () => void;
}

function PolicyScreen({ title, icon: Icon, children, onBack }: PolicyScreenProps) {
  return (
    <div className="min-h-[65vh] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full"
        >
          ✓ Marcar como leído
        </button>
      </div>
      <div className="bg-white/40 dark:bg-white/3 rounded-2xl p-4 text-sm space-y-2 max-h-[55vh] overflow-y-auto border border-border/30">
        {children}
      </div>
    </div>
  );
}
