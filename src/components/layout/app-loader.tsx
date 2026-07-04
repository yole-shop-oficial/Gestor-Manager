"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { YoleLogoAnimated } from "@/components/ui/YoleLogo";
import { AlertTriangle, RefreshCw, Wifi, WifiOff, ChevronDown, ChevronUp } from "lucide-react";
import { getClientDiagnostics } from "@/services/supabase/clientFactory";

interface Props {
  error?: string | null;
  onRetry?: () => void;
  message?: string;
  /** Diagnóstico técnico opcional para mostrar en pantalla */
  details?: string[];
}

export function AppLoader({ error, onRetry, message, details }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  // Obtener diagnóstico de clientes Supabase activos
  const clientDiag = typeof window !== "undefined" ? getClientDiagnostics() : { totalClients: 0, storageKeys: [] };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0e27] via-[#1a1040] to-[#0a0e27] text-white relative overflow-hidden">
      {/* Partículas de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-2 h-2 bg-indigo-400/40 rounded-full animate-pulse" style={{ animationDelay: "0s" }} />
        <div className="absolute top-[25%] right-[20%] w-1.5 h-1.5 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute bottom-[30%] left-[25%] w-1 h-1 bg-pink-400/30 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-[60%] right-[10%] w-2 h-2 bg-indigo-300/20 rounded-full animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center gap-4 px-6 max-w-sm text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-20 h-20 rounded-[24px] bg-red-500/15 border border-red-500/30 flex items-center justify-center"
            >
              <WifiOff className="w-10 h-10 text-red-400" />
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-red-300">Error de conexión</h2>
              <p className="text-sm text-white/60 leading-relaxed">{error}</p>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onRetry}
              className="flex items-center gap-2 px-8 py-3.5 bg-white text-indigo-700 rounded-2xl text-sm font-bold shadow-2xl"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </motion.button>

            {/* Diagnóstico expandible */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[10px] text-white/30 uppercase font-bold mt-2"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Diagnóstico técnico
            </button>

            {showDetails && (
              <div className="relative w-full p-3 bg-black/60 rounded-xl border border-white/10 max-h-48 overflow-y-auto text-left">
                <button
                  onClick={() => {
                    const lines = [
                      `Clientes Supabase: ${clientDiag.totalClients} (${clientDiag.storageKeys.join(", ") || "ninguno"})`,
                      `Online: ${typeof navigator !== "undefined" ? (navigator.onLine ? "Sí" : "No") : "?"}`,
                      `URL P1: ${typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL_1 ? process.env.NEXT_PUBLIC_SUPABASE_URL_1.substring(0, 35) + "..." : "❌ NO CONFIGURADA"}`,
                      `KEY P1: ${typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1 ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1.substring(0, 12) + "..." : "❌ NO CONFIGURADA"}`,
                      `URL P2: ${typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL_2 ? process.env.NEXT_PUBLIC_SUPABASE_URL_2.substring(0, 35) + "..." : "No configurada (opcional)"}`,
                      ...(details || []),
                    ];
                    const text = lines.join("\n");
                    navigator.clipboard.writeText(text).then(() => {
                      const btn = document.getElementById("copy-btn-loader");
                      if (btn) btn.textContent = "✅ Copiado!";
                      setTimeout(() => { if (btn) btn.textContent = "📋 Copiar"; }, 2000);
                    }).catch(() => {
                      const ta = document.createElement("textarea");
                      ta.value = text;
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand("copy");
                      document.body.removeChild(ta);
                      const btn = document.getElementById("copy-btn-loader");
                      if (btn) btn.textContent = "✅ Copiado!";
                      setTimeout(() => { if (btn) btn.textContent = "📋 Copiar"; }, 2000);
                    });
                  }}
                  id="copy-btn-loader"
                  className="absolute top-2 right-2 text-[9px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg font-bold z-10"
                >
                  📋 Copiar
                </button>
                <p className="text-[10px] font-mono text-green-400 mb-1">
                  Clientes Supabase: {clientDiag.totalClients} ({clientDiag.storageKeys.join(", ") || "ninguno"})
                </p>
                <p className="text-[10px] font-mono text-blue-400 mb-1">
                  Online: {typeof navigator !== "undefined" ? (navigator.onLine ? "Sí" : "No") : "?"}
                </p>
                <p className="text-[10px] font-mono text-yellow-400 mb-1">
                  URL P1: {typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL_1
                    ? process.env.NEXT_PUBLIC_SUPABASE_URL_1.substring(0, 35) + "..."
                    : "❌ NO CONFIGURADA"}
                </p>
                <p className="text-[10px] font-mono text-yellow-400 mb-1">
                  KEY P1: {typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1
                    ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1.substring(0, 12) + "..."
                    : "❌ NO CONFIGURADA"}
                </p>
                <p className="text-[10px] font-mono text-purple-400 mb-1">
                  URL P2: {typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL_2
                    ? process.env.NEXT_PUBLIC_SUPABASE_URL_2.substring(0, 35) + "..."
                    : "No configurada (opcional)"}
                </p>
                {details && details.map((line, i) => (
                  <p key={i} className="text-[10px] font-mono text-green-400 whitespace-pre-wrap">{line}</p>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            <YoleLogoAnimated size={100} />

            <div className="text-center space-y-2">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-bold">
                YOLE SHOP APP
              </p>
              <p className="text-sm text-white/70">
                {message || "Preparando tu espacio..."}
              </p>
            </div>

            {/* Barra de progreso animada */}
            <motion.div
              className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full"
                animate={{ x: ["-100%", "150%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: "60%" }}
              />
            </motion.div>

            {/* Info de conexión */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-1.5 text-white/30"
            >
              <Wifi className="w-3 h-3" />
              <span className="text-[10px]">Conectando...</span>
            </motion.div>

            {/* Mini diagnóstico siempre visible */}
            <div className="text-[9px] text-white/15 font-mono text-center">
              <p>Clientes: {clientDiag.totalClients} | Online: {typeof navigator !== "undefined" ? (navigator.onLine ? "✓" : "✗") : "?"}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
