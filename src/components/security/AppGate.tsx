"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isSetupComplete, getSettings, loadSavedAccent } from "@/features/setup/settings";
import { PinLock } from "@/components/security/PinLock";

// ═══════════════════════════════════════════════════════════
// APP GATE v2 — Sin console.error override ni auto-reload
// ═══════════════════════════════════════════════════════════
// PROBLEMA v1: Reemplazaba console.error global para contar
// errores y disparar clearAllAppCache + reload. Si un error se
// repetía (como React #310), esto creaba un BUCLE de reload
// infinito del que el usuario no podía salir.
//
// SOLUCIÓN v2: Quitar completamente el override. El ErrorBoundary
// ya captura errores de render y ofrece un botón de limpieza.
// ═══════════════════════════════════════════════════════════

const PUBLIC_ROUTES = ["/welcome", "/login", "/register", "/setup"];

export function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);

  // Load saved accent color on mount
  useEffect(() => {
    loadSavedAccent();
  }, []);

  // Check setup + PIN — solo cuando cambia pathname
  useEffect(() => {
    const setupDone = isSetupComplete();

    if (!setupDone && pathname !== "/setup") {
      setNeedsSetup(true);
      setChecking(false);
      router.replace("/setup");
      return;
    }

    const settings = getSettings();
    if (settings.pinCode && !PUBLIC_ROUTES.includes(pathname ?? "")) {
      setNeedsPin(true);
    }

    setChecking(false);
    // router es estable en App Router; no incluirlo para evitar re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Loading
  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Setup not complete
  if (needsSetup && pathname !== "/setup") {
    return null;
  }

  // PIN Lock
  if (needsPin && !unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} />;
  }

  return <>{children}</>;
}
