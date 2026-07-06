"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import {
  Wrench,
  X,
  Wifi,
  Gauge,
  Activity,
  Shield,
  Database,
  ChevronRight,
  Server,
  Clock,
  Signal,
} from "lucide-react";
import { getClientDiagnostics } from "@/services/supabase/clientFactory";

interface ToolItem {
  id: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  action: () => void;
}

export function FloatingToolKit() {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const [toolResults, setToolResults] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // useMotionValue avoids re-renders during drag — only updates visual position
  const posX = useMotionValue(16);
  const posY = useMotionValue(16);

  // Track if a real drag happened (vs simple click) using ref to avoid re-renders
  const didDrag = useRef(false);

  // ─── Herramientas ───

  /**
   * Ping a Supabase usando REST API con apikey header.
   * La raíz del proyecto Supabase no tiene CORS headers, así que
   * fetch(url1) falla con error de CORS. Usamos /rest/v1/ con apikey.
   */
  const pingSupabase = async () => {
    const start = performance.now();
    try {
      const url1 = process.env.NEXT_PUBLIC_SUPABASE_URL_1;
      const key1 = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1;
      if (url1 && key1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        await fetch(`${url1}/rest/v1/round_robin_counter?select=id&limit=1`, {
          method: "GET",
          headers: { apikey: key1, Authorization: `Bearer ${key1}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      }
      const ms = Math.round(performance.now() - start);
      setToolResults((r) => ({ ...r, ping: `${ms}ms` }));
    } catch (err: any) {
      const reason = err?.name === "AbortError" ? "Timeout (>8s)" : "Error de red";
      setToolResults((r) => ({ ...r, ping: `❌ ${reason}` }));
    }
  };

  const checkOnline = () => {
    const online = navigator.onLine;
    setToolResults((r) => ({
      ...r,
      online: online ? "✅ En línea" : "❌ Sin conexión",
    }));
  };

  /**
   * Medidor de velocidad usando REST API con apikey header (evita CORS).
   */
  const measureSpeed = async () => {
    setToolResults((r) => ({ ...r, speed: "Midiendo..." }));
    const start = performance.now();
    try {
      const url1 = process.env.NEXT_PUBLIC_SUPABASE_URL_1;
      const key1 = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1;
      if (url1 && key1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        await fetch(`${url1}/rest/v1/round_robin_counter?select=id&limit=1`, {
          method: "GET",
          headers: { apikey: key1, Authorization: `Bearer ${key1}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      }
      const ms = performance.now() - start;
      const speed =
        ms < 100 ? "🟢 Excelente"
        : ms < 300 ? "🟡 Buena"
        : ms < 800 ? "🟠 Lenta"
        : "🔴 Muy lenta";
      setToolResults((r) => ({ ...r, speed: `${speed} (${Math.round(ms)}ms)` }));
    } catch (err: any) {
      const reason = err?.name === "AbortError" ? "Timeout" : "Sin conexión";
      setToolResults((r) => ({ ...r, speed: `❌ No se pudo medir (${reason})` }));
    }
  };

  const checkStorage = () => {
    const used = JSON.stringify(localStorage).length;
    const kb = (used / 1024).toFixed(1);
    setToolResults((r) => ({ ...r, storage: `${kb} KB usados` }));
  };

  const checkSession = () => {
    const project = localStorage.getItem("yole_user_project") || "No definido";
    const hasSession = !!localStorage.getItem(
      "sb-" + process.env.NEXT_PUBLIC_SUPABASE_URL_1?.split("//")[1]?.split(".")[0] + "-auth-token"
    );
    setToolResults((r) => ({
      ...r,
      session: `Proyecto: ${project} | Sesión: ${hasSession ? "✅ Activa" : "❌ Inactiva"}`,
    }));
  };

  /**
   * NUEVO: Diagnóstico de clientes Supabase (usando clientFactory).
   * Muestra cuántos clientes hay y sus storageKeys — clave para
   * detectar duplicados que causan AuthRetryableFetchError.
   */
  const checkClients = () => {
    const diag = getClientDiagnostics();
    const keysList = diag.storageKeys.length > 0
      ? diag.storageKeys.join(", ")
      : "Ninguno";
    setToolResults((r) => ({
      ...r,
      clients: `${diag.totalClients} cliente(s): ${keysList}`,
    }));
  };

  const getTimestamp = () => {
    const now = new Date();
    setToolResults((r) => ({
      ...r,
      timestamp: now.toLocaleString("es-CU", { timeZone: "America/Havana" }),
    }));
  };

  const tools: ToolItem[] = [
    {
      id: "online",
      icon: Wifi,
      label: "Estado de red",
      desc: "Verifica si hay conexión a internet",
      color: "from-green-500 to-emerald-600",
      action: checkOnline,
    },
    {
      id: "ping",
      icon: Server,
      label: "Ping a Supabase",
      desc: "Mide la latencia al servidor",
      color: "from-blue-500 to-cyan-600",
      action: pingSupabase,
    },
    {
      id: "speed",
      icon: Gauge,
      label: "Medidor de velocidad",
      desc: "Evalúa la calidad de conexión",
      color: "from-violet-500 to-purple-600",
      action: measureSpeed,
    },
    {
      id: "clients",
      icon: Database,
      label: "Clientes Supabase",
      desc: "Verifica instancias activas",
      color: "from-amber-500 to-orange-600",
      action: checkClients,
    },
    {
      id: "storage",
      icon: Shield,
      label: "Almacenamiento local",
      desc: "Espacio usado por la app",
      color: "from-pink-500 to-rose-600",
      action: checkStorage,
    },
    {
      id: "session",
      icon: Activity,
      label: "Sesión y proyecto",
      desc: "Estado de autenticación",
      color: "from-teal-500 to-cyan-600",
      action: checkSession,
    },
    {
      id: "timestamp",
      icon: Clock,
      label: "Hora Cuba",
      desc: "Fecha y hora actual (CST)",
      color: "from-indigo-500 to-blue-600",
      action: getTimestamp,
    },
  ];

  // ─── Drag (optimized with useMotionValue — no re-renders on pointermove) ───
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (open) return;
      setDragging(true);
      didDrag.current = false;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        px: posX.get(),
        py: posY.get(),
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [open, posX, posY]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      // Mark as real drag if moved more than 3px
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didDrag.current = true;
      }

      const newX = Math.max(8, Math.min(window.innerWidth - 60, dragStart.current.px + dx));
      const newY = Math.max(8, Math.min(window.innerHeight - 60, dragStart.current.py - dy));
      // Directly set motion values — NO re-render!
      posX.set(newX);
      posY.set(newY);
    },
    [dragging, posX, posY]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <>
      {/* Panel de herramientas */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Panel principal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="fixed bottom-24 right-4 left-4 max-w-sm mx-auto z-[100] bg-[#0f1629]/95 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[12px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Herramientas</h3>
                    <p className="text-[10px] text-white/40">Kit de diagnóstico</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Lista de herramientas */}
              <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  const result = toolResults[tool.id];
                  return (
                    <motion.button
                      key={tool.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={tool.action}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-left"
                    >
                      <div
                        className={`w-10 h-10 rounded-[14px] bg-gradient-to-br ${tool.color} flex items-center justify-center shrink-0 shadow-lg`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{tool.label}</p>
                        {result ? (
                          <p className="text-[11px] text-indigo-300 truncate">{result}</p>
                        ) : (
                          <p className="text-[11px] text-white/30">{tool.desc}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer info */}
              <div className="px-4 py-3 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] text-white/30">
                  <span>YOLE SHOP v2.0</span>
                  <div className="flex items-center gap-1">
                    <Signal className="w-3 h-3" />
                    <span>{navigator.onLine ? "Online" : "Offline"}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Botón flotante arrastrable — position via useMotionValue (no re-renders) */}
      <motion.div
        ref={containerRef}
        className="fixed z-[80]"
        style={{ bottom: posY, right: posX }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => {
            // Only toggle if it wasn't a drag gesture
            if (!didDrag.current) setOpen(!open);
          }}
          className={`w-14 h-14 rounded-[20px] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-2xl flex items-center justify-center touch-none ${
            open ? "rotate-45" : ""
          } transition-transform`}
        >
          {open ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Activity className="w-6 h-6 text-white" />
          )}
        </motion.button>
      </motion.div>
    </>
  );
}
