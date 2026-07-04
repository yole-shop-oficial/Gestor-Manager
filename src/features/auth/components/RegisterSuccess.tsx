"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface Props {
  message?: string | null;
}

export function RegisterSuccess({ message }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-background pb-6">
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold">Cuenta creada</h1>
        <p className="text-sm text-muted-foreground">
          {message ??
            "Registro completado correctamente. Ahora puedes iniciar sesión como gestor."}
        </p>
        <button
          type="button"
          onClick={() => (window.location.href = "/login")}
          className="mt-4 px-6 py-3 rounded-2xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg"
        >
          Ir a iniciar sesión
        </button>
      </div>
    </div>
  );
}