"use client";

import React, { Component, type ReactNode } from "react";
import { clearAllAppCache } from "@/features/setup/settings";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  clearing: boolean;
}

/**
 * React Error Boundary that catches render errors (including #310).
 * Shows a friendly UI instead of a blank screen.
 * Offers a "Limpiar y recargar" button that clears all cache and reloads.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, clearing: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, clearing: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging — visible in console
    console.error("[ErrorBoundary] Caught:", error.message);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  handleReload = async () => {
    this.setState({ clearing: true });
    try {
      await clearAllAppCache();
    } catch {
      // Ignore cache clear errors
    }
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || "";
      const isRenderError = errMsg.includes("310") ||
        errMsg.includes("render") ||
        errMsg.includes("Maximum update") ||
        errMsg.includes("Too many re-renders");

      return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6 text-center">
          <div className="w-20 h-20 rounded-[24px] bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-6">
            <span className="text-3xl">⚠️</span>
          </div>

          <h1 className="text-xl font-bold mb-2">
            {isRenderError ? "Error de renderizado" : "Algo salió mal"}
          </h1>

          <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
            {isRenderError
              ? "La aplicación encontró un problema al renderizar. Esto puede solucionarse limpiando la caché y recargando."
              : "Ocurrió un error inesperado. Intenta recargar la aplicación."}
          </p>

          {/* Show error details for debugging (user is on Android, no DevTools) */}
          {errMsg && (
            <div className="mb-4 p-3 rounded-xl bg-surface border border-border/30 max-w-sm w-full overflow-hidden">
              <p className="text-[10px] font-mono text-muted-foreground break-all">
                {errMsg.slice(0, 200)}
              </p>
            </div>
          )}

          <button
            onClick={this.handleReload}
            disabled={this.state.clearing}
            className="px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl text-sm font-bold shadow-lg active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {this.state.clearing ? "Limpiando..." : "Limpiar caché y recargar"}
          </button>

          <p className="text-[10px] text-muted-foreground/40 mt-6">
            YOLE SHOP APP v2.0
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
