"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSupabaseUser } from "@/features/auth/hooks/useSupabaseUser";
import { AppLoader } from "@/components/layout/app-loader";
import {
  checkSupabaseConnectivity,
  getCachedConnectivity,
  setCachedConnectivity,
  type ConnectivityResult,
} from "@/services/supabase/connectivity";

interface Props {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ["/welcome", "/login", "/register"];

export function AuthGate({ children }: Props) {
  const { user, loading: userLoading } = useSupabaseUser();
  const router = useRouter();
  const pathname = usePathname();

  const [connLoading, setConnLoading] = useState(true);
  const [connResult, setConnResult] = useState<ConnectivityResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const performCheck = useCallback(async () => {
    setConnLoading(true);
    setConnResult(null);

    // 1. Intentar leer del cache
    const cached = getCachedConnectivity();
    if (cached && cached.ok) {
      setConnLoading(false);
      setConnResult(cached);
      return;
    }

    // 2. Verificar de verdad
    const result = await checkSupabaseConnectivity();
    setConnResult(result);

    if (result.ok || result.project1) {
      // Al menos P1 funciona — cachear y continuar
      setCachedConnectivity({ ...result, ok: result.project1 });
    }

    setConnLoading(false);
  }, []);

  useEffect(() => {
    performCheck();
  }, [performCheck]);

  const isPublic = PUBLIC_ROUTES.includes(pathname ?? "");

  // ─── Cargando conectividad ───
  if (connLoading) {
    return <AppLoader message="Verificando conexión..." />;
  }

  // ─── Conectividad falló PERO no bloqueamos ───
  // Mostramos advertencia pero dejamos entrar a la app
  if (connResult && !connResult.ok && !connResult.project1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0e27] via-[#1a1040] to-[#0a0e27] text-white p-6">
        <div className="w-20 h-20 rounded-[24px] bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-6">
          <span className="text-3xl">📡</span>
        </div>

        <h2 className="text-xl font-bold text-red-300 mb-2">Problema de conexión</h2>
        <p className="text-sm text-white/60 text-center mb-4">
          No se pudo conectar con la base de datos principal.
        </p>

        {/* Diagnóstico en pantalla */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-white/40 underline mb-3"
        >
          {showDetails ? "Ocultar" : "Ver"} diagnóstico técnico
        </button>

        {showDetails && connResult.details.length > 0 && (
          <div className="w-full max-w-sm p-3 bg-black/50 rounded-xl border border-white/10 mb-4 max-h-48 overflow-y-auto">
            {connResult.details.map((line, i) => (
              <p key={i} className="text-[10px] font-mono text-green-400 whitespace-pre-wrap">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={performCheck}
            className="px-6 py-3 bg-white text-indigo-700 rounded-2xl text-sm font-bold"
          >
            🔄 Reintentar
          </button>
          <button
            onClick={() => setConnResult({ ok: true, project1: true, project2: false, details: [] })}
            className="px-6 py-3 bg-white/10 text-white rounded-2xl text-sm font-bold border border-white/20"
          >
            ⏭️ Continuar igual
          </button>
        </div>
      </div>
    );
  }

  // ─── Advertencia de P2 (no bloquea) ───
  if (connResult && !connResult.project2 && connResult.project1) {
    // P1 funciona, P2 no. Mostramos aviso breve y continuamos.
    // No bloqueamos — solo registramos en consola
    console.warn("[AUTH GATE] P2 no disponible, pero P1 funciona. Continuando...");
  }

  // ─── Cargando sesión ───
  if (userLoading) {
    return <AppLoader message="Comprobando tu sesión..." />;
  }

  // ─── Redirigir usuarios no autenticados ───
  if (!user && !isPublic) {
    router.replace("/welcome");
    return <AppLoader message="Redirigiendo..." />;
  }

  // ─── Redirigir usuarios autenticados de rutas públicas ───
  if (user && isPublic) {
    router.replace("/");
    return <AppLoader message="Redirigiendo..." />;
  }

  return <>{children}</>;
}
