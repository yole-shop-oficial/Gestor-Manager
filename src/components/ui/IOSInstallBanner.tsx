"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, PlusSquare } from "lucide-react";

/**
 * Banner de instalación PWA para iOS.
 *
 * iOS Safari NO muestra un prompt automático como Android.
 * En vez de eso, el usuario debe:
 * 1. Tocar el botón Compartir (↑)
 * 2. Tocar "Agregar a pantalla de inicio"
 *
 * Este banner guía al usuario paso a paso.
 * Solo se muestra en Safari/iOS y si la app NO está ya instalada.
 */
export function IOSInstallBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    // No mostrar si ya se descartó esta sesión
    const wasDismissed = sessionStorage.getItem("yole_ios_banner_dismissed");
    if (wasDismissed) return;

    // Detectar si es iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    // Solo mostrar si: iOS + Safari + NO instalada
    if (isIOS && !isStandalone) {
      // Esperar un poco para no interrumpir la carga
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("yole_ios_banner_dismissed", "true");
  };

  if (!show || dismissed) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pb-safe"
        >
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-[24px] p-5 shadow-2xl text-white relative max-w-md mx-auto">
            {/* Botón cerrar */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Contenido principal */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-[14px] bg-white/20 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Instalar YOLE SHOP</h3>
                <p className="text-xs text-white/70 mt-0.5">
                  Accede más rápido desde tu pantalla de inicio
                </p>
              </div>
            </div>

            {!showSteps ? (
              <button
                onClick={() => setShowSteps(true)}
                className="w-full py-3 bg-white text-indigo-700 rounded-2xl font-bold text-sm shadow-lg active:scale-[0.97] transition-transform"
              >
                Cómo instalar 📲
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3"
              >
                <div className="bg-white/10 rounded-2xl p-4 space-y-3">
                  {/* Paso 1 */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-bold text-sm">1</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Toca el botón Compartir</p>
                      <p className="text-xs text-white/60">Es el ícono de compartir abajo en Safari</p>
                    </div>
                    <Share className="w-6 h-6 text-white/70 shrink-0" style={{ transform: "rotate(90deg)" }} />
                  </div>

                  {/* Paso 2 */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-bold text-sm">2</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Selecciona &quot;Agregar a pantalla de inicio&quot;</p>
                      <p className="text-xs text-white/60">Baja en el menú hasta ver el ícono ➕</p>
                    </div>
                    <PlusSquare className="w-6 h-6 text-white/70 shrink-0" />
                  </div>

                  {/* Paso 3 */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-bold text-sm">3</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Toca &quot;Agregar&quot;</p>
                      <p className="text-xs text-white/60">YoleShop aparecerá en tu pantalla de inicio</p>
                    </div>
                    <span className="text-2xl shrink-0">✅</span>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className="w-full py-2.5 bg-white/20 rounded-2xl font-semibold text-sm active:scale-[0.97] transition-transform"
                >
                  ¡Entendido!
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook para detectar si es iOS Safari y no está instalada como PWA.
 */
export function useIsIOSPWA() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsIOS(iOS);
    setIsStandalone(standalone);
  }, []);

  return { isIOS, isStandalone };
}
