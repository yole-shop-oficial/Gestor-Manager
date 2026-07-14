"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useEffect, useState } from "react";

export function AppUpdateOverlay() {
  const { step, stepInfo, showOverlay, applyUpdate, dismiss } = useAppUpdate();
  const [progress, setProgress] = useState(0);

  // Simulate progress bar based on step
  useEffect(() => {
    if (!showOverlay) { setProgress(0); return; }
    setProgress(stepInfo.progress);
  }, [step, showOverlay, stepInfo.progress]);

  // Auto-apply when ready (with 1.5s delay to show the "ready" state)
  useEffect(() => {
    if (step === "ready") {
      const timer = setTimeout(applyUpdate, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, applyUpdate]);

  return (
    <AnimatePresence>
      {showOverlay && step !== "idle" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-[#0a0e27]/95 backdrop-blur-xl flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="max-w-xs w-full mx-4 text-center space-y-6"
          >
            {/* Icon */}
            <motion.div
              animate={step === "downloading" || step === "installing" ? { rotate: 360 } : {}}
              transition={step === "downloading" || step === "installing" ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
              className="text-5xl"
            >
              {stepInfo.icon}
            </motion.div>

            {/* Title */}
            <div>
              <h2 className="text-lg font-bold text-white">Actualizando YOLE SHOP</h2>
              <p className="text-sm text-white/60 mt-1">{stepInfo.label}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>

            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-white/30">
              <span className={step === "checking" ? "text-white font-bold" : ""}>Verificar</span>
              <span>→</span>
              <span className={step === "downloading" ? "text-white font-bold" : ""}>Descargar</span>
              <span>→</span>
              <span className={step === "installing" || step === "ready" ? "text-white font-bold" : ""}>Instalar</span>
              <span>→</span>
              <span className={step === "ready" ? "text-white font-bold" : ""}>Entrar</span>
            </div>

            {/* Error state */}
            {step === "error" && (
              <button
                onClick={dismiss}
                className="text-xs text-white/50 hover:text-white/80 transition"
              >
                Continuar sin actualizar
              </button>
            )}

            {/* YOLE branding */}
            <p className="text-[9px] text-white/20">YOLE SHOP v2.0</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
