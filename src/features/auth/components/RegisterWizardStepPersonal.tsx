"use client";

import React from "react";
import { Phone, Calendar, MapPin, CreditCard, FileText, Hash } from "lucide-react";

interface Props {
  form: any;
}

export function StepPersonal({ form }: Props) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const hasSalesExperience = watch("hasSalesExperience");

  return (
    <div className="space-y-4">
      {/* Teléfono cubano */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium pl-1">Teléfono móvil (Cuba)</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <div className="w-10 h-10 rounded-[14px] bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex items-center">
            <span className="absolute left-16 top-1/2 -translate-y-1/2 text-base font-bold text-muted-foreground select-none">
              +53
            </span>
            <input
              type="tel"
              placeholder="5 1234567"
              className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-24 pr-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
              {...register("phone")}
            />
          </div>
        </div>
        {errors.phone ? (
          <p className="text-xs text-red-500 pl-2">{errors.phone.message}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground pl-2">Ejemplo: 5 1234567 o +53 5 1234567</p>
        )}
      </div>

      {/* Edad + Fecha nacimiento */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium pl-1">Edad</label>
          <input
            type="number"
            min={18}
            max={100}
            inputMode="numeric"
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 px-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
            {...register("age")}
          />
          {errors.age && (
            <p className="text-xs text-red-500 pl-2">{errors.age.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium pl-1">Fecha nacimiento</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="date"
              className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-11 pr-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
              {...register("birthDate")}
            />
          </div>
          {errors.birthDate && (
            <p className="text-xs text-red-500 pl-2">{errors.birthDate.message}</p>
          )}
        </div>
      </div>

      {/* Género */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium pl-1">Género</label>
        <select
          className="w-full rounded-2xl border border-border/60 card-filled py-3.5 px-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
          {...register("gender")}
        >
          <option value="">Selecciona...</option>
          <option value="male">Masculino</option>
          <option value="female">Femenino</option>
          <option value="other">Otro</option>
        </select>
        {errors.gender && (
          <p className="text-xs text-red-500 pl-2">{errors.gender.message}</p>
        )}
      </div>

      {/* Carnet de identidad */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium pl-1">Carnet de identidad</label>
        <div className="relative">
          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="01020304056"
            maxLength={11}
            inputMode="numeric"
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-11 pr-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition tracking-wider"
            {...register("idCard")}
          />
        </div>
        {errors.idCard ? (
          <p className="text-xs text-red-500 pl-2">{errors.idCard.message}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground pl-2">11 dígitos del carnet cubano</p>
        )}
      </div>

      {/* Dirección */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium pl-1">Dirección completa</label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-4 w-5 h-5 text-muted-foreground" />
          <textarea
            rows={2}
            placeholder="Calle, número, entre calles, municipio, provincia"
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-11 pr-4 text-base outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
            {...register("address")}
          />
        </div>
        {errors.address && (
          <p className="text-xs text-red-500 pl-2">{errors.address.message}</p>
        )}
      </div>

      {/* Tarjeta bancaria */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium pl-1">Datos bancarios</label>
        <div className="space-y-2">
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Número de tarjeta (16 dígitos)"
              maxLength={19}
              inputMode="numeric"
              className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-11 pr-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition tracking-wider"
              {...register("bankCardNumber")}
            />
          </div>
          {errors.bankCardNumber && (
            <p className="text-xs text-red-500 pl-2">{errors.bankCardNumber.message}</p>
          )}
          <input
            type="text"
            placeholder="Nombre del titular de la tarjeta"
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 px-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
            {...register("bankCardHolder")}
          />
          {errors.bankCardHolder && (
            <p className="text-xs text-red-500 pl-2">{errors.bankCardHolder.message}</p>
          )}
        </div>
      </div>

      {/* Número de confirmación */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium pl-1">Número de confirmación de transferencia</label>
        <input
          type="text"
          placeholder="Código o referencia de la transferencia"
          className="w-full rounded-2xl border border-border/60 card-filled py-3.5 px-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
          {...register("transferConfirmationNumber")}
        />
        {errors.transferConfirmationNumber && (
          <p className="text-xs text-red-500 pl-2">{errors.transferConfirmationNumber.message}</p>
        )}
      </div>

      {/* Observaciones */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium pl-1">Observaciones (opcional)</label>
        <div className="relative">
          <FileText className="absolute left-3.5 top-3.5 w-5 h-5 text-muted-foreground" />
          <textarea
            rows={2}
            placeholder="Algo que quieras agregar..."
            maxLength={500}
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-11 pr-4 text-base outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
            {...register("observations")}
          />
        </div>
      </div>

      {/* Experiencia en ventas */}
      <div className="flex items-center justify-between text-sm p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-border/30">
        <span className="font-medium">¿Tienes experiencia en ventas?</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setValue("hasSalesExperience", true, { shouldDirty: true })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              hasSalesExperience
                ? "bg-green-500 text-white shadow-lg"
                : "bg-accent text-muted-foreground border border-border"
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => setValue("hasSalesExperience", false, { shouldDirty: true })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              hasSalesExperience === false
                ? "bg-red-500 text-white shadow-lg"
                : "bg-accent text-muted-foreground border border-border"
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Fecha de ingreso */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium pl-1">Fecha de ingreso</label>
        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="date"
            className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-11 pr-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
            {...register("joinDate")}
          />
        </div>
        {errors.joinDate && (
          <p className="text-xs text-red-500 pl-2">{errors.joinDate.message}</p>
        )}
        <p className="text-[10px] text-muted-foreground pl-2">
          Puede ser hoy u otra fecha acordada con administración.
        </p>
      </div>
    </div>
  );
}
