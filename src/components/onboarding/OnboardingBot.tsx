"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Sparkles } from "lucide-react";
import { useSession } from "@/hooks";

// ═══════════════════════════════════════════════════════════
// ONBOARDING BOT — Tutorial interactivo para primera vez
// ═══════════════════════════════════════════════════════════
// Se muestra SOLO la primera vez que un usuario entra a la app.
// Aparece como un "bot" con burbujas de mensaje amigables.
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = "yole-onboarding-done";

interface OnboardingStep {
  id: string;
  message: string;
  emoji: string;
  action?: string; // Label del botón
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    message: "¡Hola! 👋 ¡Bienvenido a YOLE SHOP! Soy tu asistente y te voy a guiar paso a paso.",
    emoji: "🤖",
    action: "¡Vamos!",
  },
  {
    id: "status",
    message: "Primero lo primero: tu cuenta está siendo revisada por el administrador. Cuando la aprueben, tendrás acceso completo. 📋",
    emoji: "⏳",
    action: "Entendido",
  },
  {
    id: "orders",
    message: "Cuando estés activo, podrás crear pedidos desde el botón '+' en Pedidos. ¡Es súper fácil! 📦",
    emoji: "🛒",
    action: "Genial",
  },
  {
    id: "wallet",
    message: "Tus comisiones se acumulan automáticamente en tu Billetera. Podrás ver tu saldo y solicitar retiros. 💰",
    emoji: "💎",
    action: "¡Dale!",
  },
  {
    id: "chat",
    message: "¿Dudas? Usa el Chat para hablar con tu administrador. Siempre están ahí para ayudarte. 💬",
    emoji: "🗣️",
    action: "Perfecto",
  },
  {
    id: "tools",
    message: "Y no olvides el botón flotante 🔧 — tiene herramientas de diagnóstico para cuando tengas problemas de conexión.",
    emoji: "🔧",
    action: "¡Qué útil!",
  },
  {
    id: "ready",
    message: "¡Ya estás listo para empezar! 🎉 Recuerda: si necesitas ayuda, siempre puedes escribirme. ¡Éxito en tus ventas! 🚀",
    emoji: "🏆",
    action: "¡Gracias, vamos!",
  },
];

export function OnboardingBot() {
  const { profile, profileLoading } = useSession();
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (profileLoading || !profile) return;

    // Check if onboarding was already completed
    const done = localStorage.getItem(STORAGE_KEY);
    if (done) return;

    // Show onboarding after a brief delay so the page loads first
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [profile, profileLoading]);

  const nextStep = useCallback(() => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      // Onboarding complete
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setVisible(false);
      setDismissed(true);
    }
  }, [stepIndex]);

  const skip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
    setDismissed(true);
  }, []);

  if (!visible || dismissed || profileLoading) return null;

  const currentStep = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
            onClick={skip}
          />

          {/* Bot bubble */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="fixed bottom-24 left-4 right-4 z-[160] max-w-md mx-auto"
          >
            {/* Skip button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={skip}
                className="text-[10px] text-white/40 hover:text-white/70 transition flex items-center gap-1"
              >
                Saltar tutorial <X className="w-3 h-3" />
              </button>
            </div>

            {/* Message card */}
            <div className="bg-[#1a1f3a]/95 border border-white/10 rounded-[24px] p-5 shadow-2xl space-y-4">
              {/* Bot avatar + message */}
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shrink-0 shadow-lg"
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                    Yole Bot · Paso {stepIndex + 1}/{STEPS.length}
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={currentStep.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm text-white/90 leading-relaxed"
                    >
                      {currentStep.message}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              {/* Action button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={nextStep}
                className="w-full py-3 rounded-[16px] font-bold text-sm text-white bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 shadow-lg flex items-center justify-center gap-2"
              >
                {currentStep.action}
                {!isLast && <ChevronRight className="w-4 h-4" />}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
