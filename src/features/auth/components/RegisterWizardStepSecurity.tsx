"use client";

import React from "react";
import { Lock, ShieldCheck } from "lucide-react";

interface Props {
  form: any;
}

function calculateStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: "Débil", color: "bg-red-500", value: 25 };
  if (score === 3) return { label: "Media", color: "bg-yellow-500", value: 60 };
  if (score >= 4) return { label: "Fuerte", color: "bg-green-500", value: 100 };
  return { label: "", color: "bg-gray-300", value: 0 };
}

export function StepSecurity({ form }: Props) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const password: string = watch("password") || "";
  const strength = calculateStrength(password);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium ml-1">Contraseña</label>
        <div className="relative">
          <Lock className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
          <input
            type="password"
            placeholder="Crea una contraseña segura"
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-12 pr-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
            {...register("password")}
          />
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium ml-1">Confirmar contraseña</label>
        <div className="relative">
          <Lock className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
          <input
            type="password"
            placeholder="Repite tu contraseña"
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-12 pr-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
            {...register("confirmPassword")}
          />
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-500">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span>Seguridad de la contraseña</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> {strength.label}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-accent overflow-hidden">
          <div
            className={`h-full ${strength.color} transition-all`}
            style={{ width: `${strength.value}%` }}
          />
        </div>
        <ul className="text-[11px] text-muted-foreground space-y-1 mt-1">
          <li>• Mínimo 8 caracteres</li>
          <li>• Al menos una mayúscula y una minúscula</li>
          <li>• Al menos un número y un símbolo</li>
        </ul>
      </div>
    </div>
  );
}