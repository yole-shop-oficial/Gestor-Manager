"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Wallet,
  MessageCircle,
  Shield,
  Sparkles,
  ArrowRight,
  UserPlus,
  LogIn,
} from "lucide-react";
import { YoleLogo } from "@/components/ui/YoleLogo";
import { PagePreloader } from "@/components/ui/PagePreloader";
import { IOSInstallBanner } from "@/components/ui/IOSInstallBanner";

const FEATURES = [
  {
    icon: ShoppingCart,
    title: "Gestiona pedidos",
    desc: "Crea y controla cada pedido en tiempo real.",
    gradient: "from-blue-500 to-cyan-500",
    bg: "from-blue-500/10 to-cyan-500/10",
  },
  {
    icon: Wallet,
    title: "Wallet y comisiones",
    desc: "Ve tu saldo y solicita pagos al instante.",
    gradient: "from-violet-500 to-purple-500",
    bg: "from-violet-500/10 to-purple-500/10",
  },
  {
    icon: MessageCircle,
    title: "Chat directo",
    desc: "Comunícate con administración al momento.",
    gradient: "from-pink-500 to-rose-500",
    bg: "from-pink-500/10 to-rose-500/10",
  },
  {
    icon: Shield,
    title: "Datos seguros",
    desc: "Protegidos con estándares profesionales.",
    gradient: "from-emerald-500 to-green-500",
    bg: "from-emerald-500/10 to-green-500/10",
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function WelcomeContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -right-48 w-[600px] h-[600px] bg-indigo-500/6 dark:bg-indigo-500/3 rounded-full blur-[100px]" />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] bg-purple-500/6 dark:bg-purple-500/3 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-500/4 rounded-full blur-[80px]" />
        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="flex-1 flex flex-col relative z-10">
        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="pt-12 pb-4 px-8 text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.4, delay: 0.15 }}
            className="flex justify-center mb-5"
          >
            <div className="relative">
              {/* Glow detrás del logo */}
              <div className="absolute inset-0 blur-2xl opacity-30 rounded-[32px] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500" />
              <YoleLogo size={88} />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-black tracking-tight"
          >
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              YOLE SHOP
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-muted-foreground mt-2 font-medium"
          >
            Gestión profesional para gestores
          </motion.p>
        </motion.div>

        {/* ── Tarjeta descriptiva ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mx-6 p-5 rounded-[24px] bg-gradient-to-br from-white/70 to-white/30 dark:from-white/5 dark:to-white/[0.02] backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold mb-1">¿Qué es YOLE SHOP APP?</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                La plataforma donde gestionas tus <span className="font-semibold text-indigo-600 dark:text-indigo-400">pedidos reales</span>,
                controlas tus <span className="font-semibold text-purple-600 dark:text-purple-400">comisiones y pagos</span>,
                y te comunicas directamente con administración. Todo desde tu teléfono, seguro y rápido.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Features ── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="px-6 pt-5 pb-3 grid grid-cols-2 gap-3"
        >
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                variants={fadeUp}
                className="relative p-4 rounded-[20px] bg-white/50 dark:bg-white/[0.03] backdrop-blur-sm border border-border/30 overflow-hidden group"
              >
                {/* Gradient decorativo al hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feat.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className={`w-10 h-10 rounded-[14px] bg-gradient-to-br ${feat.gradient} flex items-center justify-center mb-2.5 shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xs font-bold mb-0.5">{feat.title}</h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Espaciador flexible */}
        <div className="flex-1 min-h-4" />

        {/* ── Botones de acción ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="px-6 pt-2 pb-10 space-y-3 safe-bottom"
        >
          {/* Botón PRINCIPAL: Crear cuenta */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/register")}
            className="w-full relative overflow-hidden rounded-[22px] py-[18px] bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white font-bold text-[15px] shadow-2xl flex items-center justify-center gap-2.5 group"
          >
            {/* Brillo animado */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <UserPlus className="w-5 h-5" />
            <span>Crear mi cuenta</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>

          {/* Botón SECUNDARIO: Ya tengo cuenta */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/login")}
            className="w-full rounded-[22px] py-[16px] card-filled border-2 border-border/50 font-bold text-[15px] flex items-center justify-center gap-2.5 text-foreground"
          >
            <LogIn className="w-5 h-5 text-muted-foreground" />
            <span>Ya tengo cuenta</span>
          </motion.button>

          {/* Texto legal */}
          <p className="text-center text-[10px] text-muted-foreground/50 pt-1 leading-relaxed px-4">
            Al continuar, aceptas nuestras Condiciones de Uso y Política de Privacidad.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <PagePreloader>
      <WelcomeContent />
      <IOSInstallBanner />
    </PagePreloader>
  );
}
