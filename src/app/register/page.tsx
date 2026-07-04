"use client";

import { RegisterWizard } from "@/features/auth/components/RegisterWizard";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="relative">
      {/* Botón volver flotante */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-0 left-0 z-30 pt-6 pl-4"
      >
        <button
          type="button"
          onClick={() => router.push("/welcome")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-2xl active:bg-accent/50"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </button>
      </motion.div>
      <RegisterWizard />
    </div>
  );
}
