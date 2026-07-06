"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import {
  ShoppingCart,
  Wallet,
  Bell,
  MessageCircle,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  Lock,
  Database,
  BarChart3,
  Users,
  ArrowRight,
  UserPlus,
  LogIn,
  Phone,
  CheckCircle2,
  CreditCard,
  Zap,
  Globe,
  Code2,
  Smartphone,
  Server,
  GitBranch,
  Cloud,
  LayoutDashboard,
  ShieldCheck,
  Eye,
  FileText,
  Heart,
  Clock,
  TrendingUp,
  Boxes,
  Cpu,
} from "lucide-react";
import { YoleLogo } from "@/components/ui/YoleLogo";
import { PagePreloader } from "@/components/ui/PagePreloader";
import { IOSInstallBanner } from "@/components/ui/IOSInstallBanner";

// ═══════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const slideLeft = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ═══════════════════════════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════

function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));

  useEffect(() => {
    if (inView) {
      const controls = animate(motionVal, target, {
        duration: 2,
        ease: [0.25, 0.46, 0.45, 0.94],
      });
      return controls.stop;
    }
  }, [inView, target, motionVal]);

  return (
    <span ref={ref}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// RIPPLE BUTTON
// ═══════════════════════════════════════════════════════════

function RippleButton({
  children,
  onClick,
  className = "",
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
    onClick();
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: r.x - 10,
            top: r.y - 10,
            width: 20,
            height: 20,
            animation: "ripple 0.6s ease-out forwards",
          }}
        />
      ))}
      {children}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION HEADER
// ═══════════════════════════════════════════════════════════

function SectionHeader({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) {
  return (
    <motion.div variants={fadeUp} className="text-center mb-8">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20 mb-3">
        <Zap className="w-3 h-3" />
        {badge}
      </span>
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{subtitle}</p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════

const BENEFITS = [
  { icon: ShoppingCart, title: "Pedidos en tiempo real", desc: "Crea, rastrea y gestiona pedidos al instante", gradient: "from-blue-500 to-cyan-400" },
  { icon: Wallet, title: "Wallet automática", desc: "Saldo y comisiones calculadas sin intervención", gradient: "from-violet-500 to-purple-400" },
  { icon: CreditCard, title: "Comisiones automáticas", desc: "Cálculo instantáneo al vender un pedido", gradient: "from-emerald-500 to-green-400" },
  { icon: Bell, title: "Notificaciones push", desc: "Alertas en tiempo real de cada cambio", gradient: "from-amber-500 to-orange-400" },
  { icon: MessageCircle, title: "Chat directo", desc: "Comunicación inmediata con administración", gradient: "from-pink-500 to-rose-400" },
  { icon: WifiOff, title: "Modo offline", desc: "Funciona sin internet y sincroniza después", gradient: "from-slate-500 to-gray-400" },
  { icon: RefreshCw, title: "Sincronización", desc: "Datos siempre actualizados entre dispositivos", gradient: "from-indigo-500 to-blue-400" },
  { icon: Shield, title: "Seguridad empresarial", desc: "JWT, RLS, cifrado y protección avanzada", gradient: "from-red-500 to-rose-400" },
  { icon: Database, title: "Supabase", desc: "Infraestructura de nivel empresarial", gradient: "from-teal-500 to-emerald-400" },
  { icon: BarChart3, title: "Dashboard analítico", desc: "KPIs, métricas y reportes en vivo", gradient: "from-fuchsia-500 to-pink-400" },
  { icon: Users, title: "Gestión de gestores", desc: "Administra tu equipo desde un solo lugar", gradient: "from-sky-500 to-blue-400" },
  { icon: LayoutDashboard, title: "Panel admin", desc: "Control total de la plataforma", gradient: "from-orange-500 to-amber-400" },
];

const STATS = [
  { icon: ShoppingCart, label: "Pedidos gestionados", value: 2, suffix: "4/7", prefix: "" },
  { icon: Users, label: "Gestores activos", value: 99, suffix: "%", prefix: "" },
  { icon: RefreshCw, label: "Sincronización", value: 100, suffix: "%", prefix: "" },
  { icon: Clock, label: "Disponibilidad", value: 99, suffix: ".9%", prefix: "" },
];

const SECURITY_ITEMS = [
  { icon: Lock, label: "JWT Auth" },
  { icon: ShieldCheck, label: "Row Level Security" },
  { icon: Globe, label: "HTTPS / TLS" },
  { icon: Database, label: "Supabase" },
  { icon: Eye, label: "Cifrado E2E" },
  { icon: Shield, label: "Anti SQL Injection" },
  { icon: Code2, label: "Anti XSS" },
  { icon: FileText, label: "Anti CSRF" },
  { icon: Cpu, label: "Rate Limiting" },
  { icon: Lock, label: "Anti Brute Force" },
  { icon: WifiOff, label: "Offline Sync" },
  { icon: Boxes, label: "Cache Inteligente" },
];

const FLOW_STEPS = [
  { icon: Phone, label: "Cliente escribe por WhatsApp", color: "from-green-500 to-emerald-400" },
  { icon: MessageCircle, label: "Gestor recibe el pedido", color: "from-blue-500 to-cyan-400" },
  { icon: ShoppingCart, label: "Registra pedido en la app", color: "from-indigo-500 to-violet-400" },
  { icon: CheckCircle2, label: "Administrador revisa y aprueba", color: "from-amber-500 to-orange-400" },
  { icon: CreditCard, label: "Comisión calculada automáticamente", color: "from-emerald-500 to-green-400" },
  { icon: Wallet, label: "Wallet actualizada al instante", color: "from-purple-500 to-fuchsia-400" },
  { icon: TrendingUp, label: "Pago disponible para retiro", color: "from-pink-500 to-rose-400" },
];

const TECH_STACK = [
  { name: "Next.js", color: "#000000" },
  { name: "React 19", color: "#61DAFB" },
  { name: "TypeScript", color: "#3178C6" },
  { name: "Tailwind CSS", color: "#06B6D4" },
  { name: "Supabase", color: "#3ECF8E" },
  { name: "PostgreSQL", color: "#4169E1" },
  { name: "PWA", color: "#6366F1" },
  { name: "Offline First", color: "#8B5CF6" },
  { name: "Framer Motion", color: "#FF0055" },
  { name: "GitHub", color: "#6E7681" },
  { name: "Vercel", color: "#000000" },
  { name: "Zod", color: "#3068B7" },
];

// ═══════════════════════════════════════════════════════════
// HERO ILLUSTRATION SVG
// ═══════════════════════════════════════════════════════════

function HeroIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto"
    >
      {/* Glow rings */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 blur-2xl animate-pulse-glow" />
      <div className="absolute inset-4 rounded-full border border-white/5 dark:border-white/10" />
      <div className="absolute inset-10 rounded-full border border-white/5 dark:border-white/10" />

      {/* Central logo with float */}
      <div className="absolute inset-0 flex items-center justify-center animate-float">
        <div className="relative">
          <div className="absolute inset-0 blur-xl opacity-50 rounded-[32px] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500" />
          <YoleLogo size={120} />
        </div>
      </div>

      {/* Orbiting icons */}
      {[
        { Icon: ShoppingCart, angle: 0, color: "from-blue-500 to-cyan-400" },
        { Icon: Wallet, angle: 51, color: "from-violet-500 to-purple-400" },
        { Icon: Bell, angle: 103, color: "from-amber-500 to-orange-400" },
        { Icon: Shield, angle: 154, color: "from-emerald-500 to-green-400" },
        { Icon: MessageCircle, angle: 206, color: "from-pink-500 to-rose-400" },
        { Icon: RefreshCw, angle: 257, color: "from-indigo-500 to-blue-400" },
        { Icon: CreditCard, angle: 309, color: "from-fuchsia-500 to-pink-400" },
      ].map(({ Icon, angle, color }, i) => {
        const rad = (angle * Math.PI) / 180;
        const radius = 115;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
          >
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-[14px] bg-gradient-to-br ${color} flex items-center justify-center shadow-xl`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN WELCOME CONTENT
// ═══════════════════════════════════════════════════════════

function WelcomeContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Gradient mesh */}
        <div className="absolute -top-48 -right-48 w-[800px] h-[800px] bg-indigo-500/[0.07] dark:bg-indigo-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute -bottom-48 -left-48 w-[800px] h-[800px] bg-purple-500/[0.07] dark:bg-purple-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-pink-500/[0.05] rounded-full blur-[100px]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="flex-1 relative z-10">

        {/* ════════════════════════════════════════
           SECTION 1: HERO
           ════════════════════════════════════════ */}
        <section className="pt-10 sm:pt-16 pb-6 px-6">
          <motion.div variants={stagger} initial="hidden" animate="show" className="text-center">
            {/* Badge */}
            <motion.div variants={fadeUp} className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 text-primary border border-primary/20 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                v2.0 — Plataforma Empresarial
              </span>
            </motion.div>

            {/* Illustration */}
            <motion.div variants={scaleIn} className="mb-6">
              <HeroIllustration />
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-black tracking-tight mb-3"
            >
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                YOLE SHOP
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              className="text-base sm:text-lg font-semibold text-foreground/90 mb-2 max-w-lg mx-auto"
            >
              La plataforma profesional para la gestión de pedidos, gestores y comisiones en tiempo real.
            </motion.p>
            <motion.p
              variants={fadeUp}
              className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed"
            >
              Gestiona pedidos, controla comisiones automatizadas, recibe pagos y comunícate con tu equipo — todo desde tu teléfono, seguro y sin conexión.
            </motion.p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-8 px-0 max-w-sm mx-auto space-y-3"
          >
            <RippleButton
              onClick={() => router.push("/register")}
              className="w-full rounded-[16px] py-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white font-bold text-base shadow-2xl shadow-indigo-500/25 flex items-center justify-center gap-2.5 group"
              variant="primary"
            >
              <UserPlus className="w-5 h-5" />
              <span>Crear mi cuenta</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              {/* Shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            </RippleButton>

            <RippleButton
              onClick={() => router.push("/login")}
              className="w-full rounded-[16px] py-3.5 bg-white/60 dark:bg-white/[0.06] backdrop-blur-xl border border-border/50 font-bold text-base flex items-center justify-center gap-2.5 text-foreground hover:bg-white/80 dark:hover:bg-white/[0.1] transition-colors"
              variant="secondary"
            >
              <LogIn className="w-5 h-5 text-muted-foreground" />
              <span>Ya tengo cuenta</span>
            </RippleButton>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════
           SECTION 2: BENEFITS
           ════════════════════════════════════════ */}
        <section className="py-12 px-5">
          <SectionHeader
            badge="Características"
            title="Todo lo que necesitas"
            subtitle="Herramientas profesionales para gestionar pedidos, comisiones y pagos desde cualquier lugar."
          />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto"
          >
            {BENEFITS.map((feat) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  variants={fadeUp}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="group relative p-4 rounded-[20px] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.08] shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-default"
                >
                  {/* Hover glow */}
                  <div className={`absolute inset-0 rounded-[20px] bg-gradient-to-br ${feat.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`} />
                  <div className="relative z-10">
                    <div className={`w-10 h-10 rounded-[14px] bg-gradient-to-br ${feat.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-[13px] font-bold mb-1 leading-tight">{feat.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ════════════════════════════════════════
           SECTION 3: STATISTICS
           ════════════════════════════════════════ */}
        <section className="py-12 px-5">
          <SectionHeader
            badge="Rendimiento"
            title="Cifras que hablan"
            subtitle="Una plataforma confiable, rápida y siempre disponible."
          />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto"
          >
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  variants={scaleIn}
                  whileHover={{ y: -2 }}
                  className="relative p-5 rounded-[20px] bg-gradient-to-br from-white/70 to-white/30 dark:from-white/[0.06] dark:to-white/[0.02] backdrop-blur-xl border border-white/40 dark:border-white/[0.08] text-center"
                >
                  <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl sm:text-3xl font-black tracking-tight">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-1">{stat.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ════════════════════════════════════════
           SECTION 4: SECURITY
           ════════════════════════════════════════ */}
        <section className="py-12 px-5">
          <SectionHeader
            badge="Seguridad"
            title="Seguridad de nivel empresarial"
            subtitle="Protección multicapa para tus datos y los de tus clientes."
          />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 max-w-3xl mx-auto"
          >
            {SECURITY_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  variants={fadeUp}
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-[16px] bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm border border-white/30 dark:border-white/[0.06] hover:border-primary/30 transition-colors"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight">{item.label}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ════════════════════════════════════════
           SECTION 5: FLOW TIMELINE
           ════════════════════════════════════════ */}
        <section className="py-12 px-5">
          <SectionHeader
            badge="Cómo funciona"
            title="Del WhatsApp al pago"
            subtitle="Un flujo diseñado para la velocidad y la confianza."
          />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="max-w-sm mx-auto"
          >
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === FLOW_STEPS.length - 1;
              return (
                <motion.div key={step.label} variants={slideLeft} className="flex gap-4">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-[14px] bg-gradient-to-br ${step.color} flex items-center justify-center shrink-0 shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-gradient-to-b from-primary/30 to-primary/5 dark:from-primary/20 dark:to-transparent my-1" />
                    )}
                  </div>
                  {/* Content */}
                  <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                    <p className="text-sm font-bold mt-1.5 leading-tight">{step.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Paso {i + 1} de {FLOW_STEPS.length}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ════════════════════════════════════════
           SECTION 6: TECH STACK
           ════════════════════════════════════════ */}
        <section className="py-12 px-5">
          <SectionHeader
            badge="Tecnología"
            title="Stack moderno y confiable"
            subtitle="Construida con las herramientas más avanzadas de la industria."
          />
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto"
          >
            {TECH_STACK.map((tech) => (
              <motion.span
                key={tech.name}
                variants={scaleIn}
                whileHover={{ scale: 1.08, y: -2 }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs font-semibold bg-white/60 dark:bg-white/[0.06] backdrop-blur-sm border border-white/40 dark:border-white/[0.08] hover:border-primary/30 transition-all cursor-default"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tech.color }} />
                {tech.name}
              </motion.span>
            ))}
          </motion.div>
        </section>

        {/* ════════════════════════════════════════
           SECTION 7: INFO
           ════════════════════════════════════════ */}
        <section className="py-12 px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  q: "¿Qué hace la aplicación?",
                  a: "Gestiona el ciclo completo de pedidos: desde que un cliente contacta por WhatsApp hasta que el gestor recibe su pago. Incluye comisiones automáticas, wallet, notificaciones y chat.",
                },
                {
                  q: "¿Quién la usa?",
                  a: "Gestores comerciales que venden productos por encargo y necesitan un sistema profesional para organizar pedidos, cobros y comisiones.",
                },
                {
                  q: "¿Cómo funciona?",
                  a: "El gestor registra pedidos, la app calcula comisiones automáticamente, el admin aprueba, y el pago queda disponible en la wallet del gestor para retiro.",
                },
                {
                  q: "¿Por qué usarla?",
                  a: "Elimina el caos de gestionar pedidos por WhatsApp. Todo queda registrado, organizado y con trazabilidad. Cero errores manuales en comisiones.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="p-4 rounded-[18px] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.08]"
                >
                  <h4 className="text-[13px] font-bold mb-1.5 text-foreground">{item.q}</h4>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════
           SECTION 8: BOTTOM CTA
           ════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="py-12 px-5"
        >
          <div className="max-w-sm mx-auto text-center">
            <div className="p-8 rounded-[24px] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-primary/20 backdrop-blur-xl">
              <h3 className="text-xl font-black mb-2">¿Listo para empezar?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Únete a la plataforma que transforma la gestión de pedidos.
              </p>
              <div className="space-y-3">
                <RippleButton
                  onClick={() => router.push("/register")}
                  className="w-full rounded-[14px] py-3.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 group"
                  variant="primary"
                >
                  <UserPlus className="w-4 h-4" />
                  Crear cuenta gratis
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </RippleButton>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full rounded-[14px] py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ya tengo cuenta →
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ════════════════════════════════════════
           FOOTER
           ════════════════════════════════════════ */}
        <footer className="py-8 px-5 border-t border-border/30">
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-4">
              {/* Logo + version */}
              <div className="flex items-center gap-2">
                <YoleLogo size={28} />
                <span className="text-sm font-bold">YOLE SHOP</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">v2.0</span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Sistema operativo
                </span>
                <span>•</span>
                <span>La Habana, Cuba</span>
              </div>

              {/* Links */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px]">
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Política de Privacidad</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Términos de Uso</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Contacto</span>
                <span className="text-muted-foreground">•</span>
                <a
                  href="https://github.com/yole-shop-oficial/Gestor-Manager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  GitHub
                </a>
              </div>

              {/* Copyright */}
              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                Hecho con <Heart className="w-3 h-3 text-red-500 fill-red-500" /> en Cuba — © {new Date().getFullYear()} YOLE SHOP
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGE EXPORT
// ═══════════════════════════════════════════════════════════

export default function WelcomePage() {
  return (
    <PagePreloader>
      <WelcomeContent />
      <IOSInstallBanner />
    </PagePreloader>
  );
}
