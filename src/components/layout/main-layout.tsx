"use client";

import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { FloatingToolKit } from "@/components/floating/FloatingToolKit";
import { PagePreloader } from "@/components/ui/PagePreloader";
import { IOSInstallBanner } from "@/components/ui/IOSInstallBanner";
import { useEffect, useState, useCallback } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSyncEngine } from "@/hooks";

/**
 * v4 FIX: useSyncEngine no lee IndexedDB en cada mount.
 * Solo muestra el indicador de sync cuando hay pendientes,
 * y solo refresca el conteo al conectarse o al hacer click manual.
 */
export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [hasPendingState, setHasPendingState] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("idle");
  const { hasPending, syncNow, state, refreshState } = useSyncEngine();

  // Only update pending state when value changes (avoid re-renders from useSyncEngine mount)
  useEffect(() => {
    setHasPendingState(hasPending);
    setSyncStatus(state.status);
  }, [hasPending, state.status]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Refresh sync state when coming back online
      refreshState();
    };
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshState]);

  return (
    <PagePreloader>
      <div className="flex flex-col min-h-dvh bg-background">
        <Header />

        {/* Banner offline + pending sync */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-yellow-500/15 border-b border-yellow-500/20 overflow-hidden"
            >
              <div className="flex items-center justify-center gap-2 py-2 px-4">
                <WifiOff className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                  Sin conexión — los cambios se guardarán localmente
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending sync indicator (when online but has pending ops) */}
        <AnimatePresence>
          {!isOffline && hasPendingState && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-orange-500/10 border-b border-orange-500/20 overflow-hidden"
            >
              <div className="flex items-center justify-center gap-2 py-2 px-4">
                <RefreshCw className={`w-3.5 h-3.5 text-orange-600 dark:text-orange-400 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                  {syncStatus === "syncing"
                    ? "Sincronizando cambios..."
                    : "Hay cambios pendientes de sincronizar"}
                </span>
                {syncStatus !== "syncing" && (
                  <button
                    onClick={() => syncNow()}
                    className="text-[10px] font-bold text-orange-600 dark:text-orange-400 underline"
                  >
                    Sincronizar ahora
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 pb-20">
          {children}
        </main>
        <BottomNav />
        <FloatingToolKit />
        <IOSInstallBanner />
      </div>
    </PagePreloader>
  );
}
