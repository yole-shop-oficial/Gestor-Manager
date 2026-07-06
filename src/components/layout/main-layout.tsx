"use client";

import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { FloatingToolKit } from "@/components/floating/FloatingToolKit";
import { PagePreloader } from "@/components/ui/PagePreloader";
import { IOSInstallBanner } from "@/components/ui/IOSInstallBanner";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);

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

        {/* Banner offline */}
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
