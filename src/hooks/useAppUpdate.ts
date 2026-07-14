"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// UPDATE STATES — Flujo visual de actualización
// ═══════════════════════════════════════════════════════════

type UpdateStep =
  | "idle"
  | "checking"
  | "found"
  | "downloading"
  | "installing"
  | "ready"
  | "error";

interface StepInfo {
  label: string;
  icon: string;
  progress: number; // 0-100
}

const STEPS: Record<UpdateStep, StepInfo> = {
  idle: { label: "", icon: "", progress: 0 },
  checking: { label: "Verificando archivos...", icon: "🔍", progress: 10 },
  found: { label: "Actualización detectada", icon: "📦", progress: 25 },
  downloading: { label: "Descargando actualización...", icon: "⬇️", progress: 50 },
  installing: { label: "Actualizando aplicación...", icon: "⚙️", progress: 75 },
  ready: { label: "¡Actualización lista!", icon: "✅", progress: 95 },
  error: { label: "Error al actualizar", icon: "❌", progress: 0 },
};

export function useAppUpdate() {
  const [step, setStep] = useState<UpdateStep>("idle");
  const [showOverlay, setShowOverlay] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let mounted = true;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        registrationRef.current = reg;

        // Check for updates immediately
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (!mounted) return;

            if (newWorker.state === "installing") {
              setStep("downloading");
              setShowOverlay(true);
            } else if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // New version installed and waiting
                setStep("ready");
              }
            }
          });
        });

        // Also check if there's already a waiting worker
        if (reg.waiting) {
          setStep("ready");
          setShowOverlay(true);
        }

        // Check if controller changed (new SW took over)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!mounted) return;
          // New SW activated — reload to use fresh code
          setStep("ready");
          setTimeout(() => {
            window.location.reload();
          }, 800);
        });

        // Periodic check every 5 minutes
        const interval = setInterval(() => {
          reg.update().catch(() => {});
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
      } catch (err) {
        console.warn("[useAppUpdate] SW registration failed:", err);
      }
    };

    registerSW();

    return () => { mounted = false; };
  }, []);

  // Manual check for updates
  const checkForUpdates = useCallback(async () => {
    if (!registrationRef.current) return;
    setStep("checking");
    setShowOverlay(true);

    try {
      await registrationRef.current.update();

      // If no update found after 3s, dismiss
      setTimeout(() => {
        setStep((prev) => {
          if (prev === "checking") {
            setShowOverlay(false);
            return "idle";
          }
          return prev;
        });
      }, 3000);
    } catch {
      setStep("error");
      setTimeout(() => {
        setShowOverlay(false);
        setStep("idle");
      }, 2000);
    }
  }, []);

  // Apply update — tell waiting SW to activate
  const applyUpdate = useCallback(() => {
    setStep("installing");
    if (registrationRef.current?.waiting) {
      // Send skipWaiting message to the new SW
      registrationRef.current.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      // Fallback: just reload
      window.location.reload();
    }
  }, []);

  return {
    step,
    stepInfo: STEPS[step],
    showOverlay,
    checkForUpdates,
    applyUpdate,
    dismiss: () => { setShowOverlay(false); setStep("idle"); },
  };
}
