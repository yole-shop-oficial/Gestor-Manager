"use client";

import React, { useState, useCallback } from "react";
import { User, AtSign, Mail, Link2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  form: any;
}

interface ReferralResult {
  found: boolean;
  full_name?: string;
  username?: string;
  role?: string;
  message?: string;
}

export function StepIdentity({ form }: Props) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;

  const referralCode = watch("referralCode") || "";
  const [lookupResult, setLookupResult] = useState<ReferralResult | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const lookupCode = useCallback(async (code: string) => {
    const clean = (code || "").toUpperCase().trim();
    if (clean.length < 3) {
      setLookupResult(null);
      return;
    }
    if (clean.length > 8) return;

    setLookingUp(true);
    try {
      const url1 = process.env.NEXT_PUBLIC_SUPABASE_URL_1;
      const key1 = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_1;
      if (!url1 || !key1) { setLookingUp(false); return; }

      const r = await fetch(`${url1}/rest/v1/rpc/lookup_manager_code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key1,
          Authorization: `Bearer ${key1}`,
        },
        body: JSON.stringify({ p_code: clean }),
      });

      if (r.ok) {
        const data = await r.json();
        if (data && data.found === false) {
          setLookupResult({ found: false, message: data.message || "Código no encontrado" });
        } else if (data && data.found === true) {
          setLookupResult({
            found: true,
            full_name: data.full_name,
            username: data.username,
            role: data.role,
          });
        } else {
          setLookupResult({ found: false, message: "Código no encontrado" });
        }
      } else {
        // Try P2 as fallback
        const url2 = process.env.NEXT_PUBLIC_SUPABASE_URL_2;
        const key2 = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2;
        if (url2 && key2) {
          const r2 = await fetch(`${url2}/rest/v1/rpc/lookup_manager_code`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: key2,
              Authorization: `Bearer ${key2}`,
            },
            body: JSON.stringify({ p_code: clean }),
          });
          if (r2.ok) {
            const data = await r2.json();
            if (data && data.found === true) {
              setLookupResult({ found: true, full_name: data.full_name, username: data.username, role: data.role });
            } else {
              setLookupResult({ found: false, message: "Código no encontrado" });
            }
          }
        }
      }
    } catch {
      // Silently fail — lookup is best-effort
    } finally {
      setLookingUp(false);
    }
  }, []);

  const handleReferralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 8);
    setValue("referralCode", raw, { shouldValidate: true });
    if (raw.length >= 3 && raw.length <= 8) {
      lookupCode(raw);
    } else {
      setLookupResult(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Nombre completo */}
      <div className="space-y-2">
        <label className="text-sm font-medium ml-1">Nombre completo</label>
        <div className="relative">
          <User className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Nombre y apellidos"
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-12 pr-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
            {...register("fullName")}
          />
        </div>
        {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
      </div>

      {/* Username */}
      <div className="space-y-2">
        <label className="text-sm font-medium ml-1">Nombre de usuario</label>
        <div className="relative">
          <AtSign className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="usuario.gestor"
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-12 pr-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
            {...register("username")}
          />
        </div>
        {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
        <p className="text-[11px] text-muted-foreground">Se usará para identificarte dentro del sistema.</p>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label className="text-sm font-medium ml-1">Correo Gmail</label>
        <div className="relative">
          <Mail className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
          <input
            type="email"
            placeholder="tuusuario@gmail.com"
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-12 pr-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
            {...register("email")}
          />
        </div>
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        <p className="text-[11px] text-muted-foreground">
          Solo se aceptan cuentas Gmail. Recibirás notificaciones y confirmaciones en este correo.
        </p>
      </div>

      {/* ─── CÓDIGO DEL GESTOR (NUEVO v3.0 — Árbol Comercial) ─── */}
      <div className="space-y-2 pt-3 border-t border-border/40">
        <label className="text-sm font-medium ml-1 flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-indigo-500" />
          Código del Gestor
          <span className="text-[10px] text-muted-foreground font-normal">(opcional)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            placeholder="Ej: 2KPNUZJG"
            maxLength={8}
            value={referralCode}
            onChange={handleReferralChange}
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 px-4 text-base tracking-[0.15em] font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition uppercase placeholder:tracking-normal placeholder:font-normal"
          />
          {lookingUp && <Loader2 className="absolute right-4 top-3.5 w-5 h-5 animate-spin text-indigo-500" />}
          {!lookingUp && lookupResult?.found && <CheckCircle2 className="absolute right-4 top-3.5 w-5 h-5 text-green-500" />}
          {!lookingUp && lookupResult?.found === false && referralCode.length >= 3 && (
            <AlertCircle className="absolute right-4 top-3.5 w-5 h-5 text-amber-500" />
          )}
        </div>

        {/* Resultado lookup positivo */}
        {lookupResult?.found && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {(lookupResult.full_name || "?")[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-green-800 dark:text-green-300">{lookupResult.full_name}</p>
              <p className="text-[10px] text-green-700 dark:text-green-400">
                @{lookupResult.username} · {lookupResult.role === "admin" ? "Administrador" : lookupResult.role === "manager" ? "Manager" : "Gestor"}
              </p>
            </div>
          </div>
        )}

        {/* Lookup negativo */}
        {lookupResult?.found === false && referralCode.length >= 3 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 pl-1">
            <AlertCircle className="w-3 h-3" />
            {lookupResult.message || "Código no encontrado"}
          </p>
        )}

        {errors.referralCode && <p className="mt-1 text-xs text-red-500">{errors.referralCode.message}</p>}

        <p className="text-[11px] text-muted-foreground">
          Código de 8 caracteres del gestor o manager que te invitó. Si no tienes uno, déjalo vacío
          y quedarás directamente bajo el Administrador de YOLE SHOP.
        </p>
      </div>
    </div>
  );
}
