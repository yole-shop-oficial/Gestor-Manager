"use client";

import React from "react";
import { User, AtSign, Mail } from "lucide-react";

interface Props {
  form: any;
}

export function StepIdentity({ form }: Props) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4">
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
        {errors.fullName && (
          <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
        )}
      </div>

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
        {errors.username && (
          <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Se usará para identificarte dentro del sistema.
        </p>
      </div>

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
        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Solo se aceptan cuentas Gmail. Recibirás notificaciones y
          confirmaciones en este correo.
        </p>
      </div>
    </div>
  );
}