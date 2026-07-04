"use client";

import React from "react";
import { motion } from "framer-motion";

interface Props {
  step: number;
  totalSteps: number;
}

export function RegisterWizardHeader({ step, totalSteps }: Props) {
  const titles: Record<number, string> = {
    1: "Identidad básica",
    2: "Información personal",
    3: "Seguridad",
    4: "Políticas y confirmación",
  };

  const progress = (step / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-2">
        Paso {step} de {totalSteps}
      </p>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">{titles[step]}</h1>
      </div>
      <div className="w-full h-2 rounded-full bg-accent overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}