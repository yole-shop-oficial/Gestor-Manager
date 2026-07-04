"use client";

import React, { useEffect, useState } from "react";
import { AppLoader } from "@/components/layout/app-loader";

interface Props {
  children: React.ReactNode;
}

/**
 * Envuelve una página y NO la muestra hasta que todos los
 * componentes hijos estén montados y listos.
 * Muestra un splash screen profesional mientras carga.
 */
export function PagePreloader({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Esperar al menos 1 render completo + un frame para que
    // los componentes hijos se hidraten completamente
    const frame = requestAnimationFrame(() => {
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!ready) {
    return <AppLoader message="Cargando componentes..." />;
  }

  return <>{children}</>;
}
