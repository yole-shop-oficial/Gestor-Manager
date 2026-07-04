"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSupabaseUser } from "@/features/auth/hooks/useSupabaseUser";
import { AppLoader } from "@/components/layout/app-loader";
import {
  checkSupabaseConnectivity,
  getCachedConnectivity,
  setCachedConnectivity,
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
  const [connError, setConnError] = useState<string | null>(null);

  const performCheck = useCallback(async () => {
    setConnLoading(true);
    setConnError(null);

    // 1. Intentar leer del cache
    const cached = getCachedConnectivity();
    if (cached && cached.ok) {
      setConnLoading(false);
      return;
    }

    // 2. Si no hay cache, verificar de verdad
    const result = await checkSupabaseConnectivity();

    if (result.ok) {
      setCachedConnectivity({ ok: true, project1: result.project1, project2: result.project2 });
      setConnLoading(false);
    } else if (result.project1 || result.project2) {
      // Al menos un proyecto funciona — permitimos continuar
      setCachedConnectivity({ ok: true, project1: result.project1, project2: result.project2 });
      setConnLoading(false);
    } else {
      setConnError(result.error || "No se pudo establecer conexión con ningún servidor de Supabase.");
      setConnLoading(false);
    }
  }, []);

  useEffect(() => {
    performCheck();
  }, [performCheck]);

  const isPublic = PUBLIC_ROUTES.includes(pathname ?? "");

  if (connLoading) {
    return <AppLoader message="Verificando conexión con bases de datos..." />;
  }

  if (connError) {
    return <AppLoader error={connError} onRetry={performCheck} />;
  }

  if (userLoading) {
    return <AppLoader message="Comprobando tu sesión..." />;
  }

  if (!user && !isPublic) {
    router.replace("/welcome");
    return <AppLoader message="Redirigiendo..." />;
  }

  if (user && isPublic) {
    router.replace("/");
    return <AppLoader message="Redirigiendo..." />;
  }

  return <>{children}</>;
}
