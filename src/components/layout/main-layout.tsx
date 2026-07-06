"use client";

import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { FloatingToolKit } from "@/components/floating/FloatingToolKit";
import { PagePreloader } from "@/components/ui/PagePreloader";
import { IOSInstallBanner } from "@/components/ui/IOSInstallBanner";
import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSyncEngine } from "@/hooks";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const { hasPending, syncNow, state } = useSyncEngine();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Estado inicial
    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <PagePreloader>
      <div className="flex flex-col min-h-screen bg-background">
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
          {!isOffline && hasPending && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-orange-500/10 border-b border-orange-500/20 overflow-hidden"
            >
              <div className="flex items-center justify-center gap-2 py-2 px-4">
                <RefreshCw className={`w-3.5 h-3.5 text-orange-600 dark:text-orange-400 ${state.status === "syncing" ? "animate-spin" : ""}`} />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                  {state.status === "syncing"
                    ? "Sincronizando cambios..."
                    : "Hay cambios pendientes de sincronizar"}
                </span>
                {state.status !== "syncing" && (
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
