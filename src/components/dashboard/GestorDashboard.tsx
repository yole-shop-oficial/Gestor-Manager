"use client";

import { useAppUser } from "@/features/auth/hooks/useAppUser";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Wallet,
  TrendingUp,
  Clock,
  Package,
  CheckCircle2,
  ArrowRight,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { GestorAnalytics } from "./GestorAnalytics";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  soldOrders: number;
  balance: number;
  profileLoading: boolean;
}

export function GestorDashboard() {
  const { user, client, project, profile, isActive, isPending } = useAppUser();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    soldOrders: 0,
    balance: 0,
    profileLoading: true,
  });

  const loadData = useCallback(async () => {
    if (!user || !project) {
      setStats((s) => ({ ...s, profileLoading: false }));
      return;
    }

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const [totalRes, pendingRes, soldRes, walletRes] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("manager_id", user.id),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("manager_id", user.id).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("manager_id", user.id).eq("status", "sold"),
        supabase.from("wallet_entries").select("amount").eq("manager_id", user.id),
      ]);

      const balance = walletRes.data?.reduce((sum: number, entry: any) => sum + Number(entry.amount), 0) || 0;

      setStats({
        totalOrders: totalRes.count || 0,
        pendingOrders: pendingRes.count || 0,
        soldOrders: soldRes.count || 0,
        balance,
        profileLoading: false,
      });
    } catch (err) {
      console.error("[GESTOR DASHBOARD] Error:", err);
      setStats((s) => ({ ...s, profileLoading: false }));
    }
  }, [user, client, project]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const displayName = profile?.full_name || profile?.username || user?.email?.split("@")[0] || "Gestor";

  return (
    <div className="p-6 pb-24 space-y-5">
      {/* Saludo */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">¡Hola, {displayName}!</h1>
          {isActive && (
            <span className="px-2 py-0.5 rounded-full badge-green bg-green-100 text-green-700 dark:bg-transparent text-[10px] font-bold">
              Activo
            </span>
          )}
          {isPending && (
            <span className="px-2 py-0.5 rounded-full badge-yellow bg-yellow-100 text-yellow-700 dark:bg-transparent text-[10px] font-bold">
              Pendiente
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {isActive
            ? "Todo listo para gestionar tus pedidos y comisiones."
            : isPending
            ? "Tu cuenta está en revisión. Pronto será activada."
            : "Panel principal de tu actividad como gestor."}
        </p>
      </motion.div>

      {/* Botón crear pedido (solo si activo) */}
      {isActive && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Link href="/orders/new">
            <motion.div
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-[20px] font-bold text-base text-white bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 shadow-glow flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo pedido
            </motion.div>
          </Link>
        </motion.div>
      )}

      {/* Tarjeta de saldo */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-[24px] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-white/70" />
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Saldo disponible</span>
          </div>
          <p className="text-3xl font-black tracking-tight mb-3">${stats.balance.toFixed(2)}</p>
          <div className="flex items-center gap-4 text-xs text-white/70">
            <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {stats.soldOrders} vendidos</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {stats.pendingOrders} pendientes</span>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-3 gap-3">
        <StatCard icon={ShoppingCart} label="Pedidos" value={stats.totalOrders} gradient="from-blue-500 to-cyan-500" />
        <StatCard icon={CheckCircle2} label="Vendidos" value={stats.soldOrders} gradient="from-emerald-500 to-green-500" />
        <StatCard icon={TrendingUp} label="Comisión" value={`$${stats.balance.toFixed(0)}`} gradient="from-violet-500 to-purple-500" />
      </motion.div>

      {/* Acciones rápidas */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
        <h2 className="text-sm font-semibold pl-1">Acciones rápidas</h2>
        <QuickAction icon={ShoppingCart} label="Ver mis pedidos" desc={`${stats.totalOrders} pedidos registrados`} href="/orders" gradient="from-blue-500 to-cyan-500" />
        <QuickAction icon={Wallet} label="Mi billetera" desc={`Saldo: $${stats.balance.toFixed(2)}`} href="/wallet" gradient="from-violet-500 to-purple-500" />
      </motion.div>

      {/* Analytics del gestor */}
      <GestorAnalytics />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, gradient }: { icon: React.ElementType; label: string; value: number | string; gradient: string }) {
  return (
    <div className="rounded-[20px] card-filled p-3 space-y-2">
      <div className={`w-8 h-8 rounded-[12px] bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, href, gradient }: { icon: React.ElementType; label: string; desc: string; href: string; gradient: string }) {
  return (
    <Link href={href}>
      <motion.div whileTap={{ scale: 0.98 }} className="flex items-center gap-3 p-4 rounded-[20px] card-filled">
        <div className={`w-10 h-10 rounded-[14px] bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </motion.div>
    </Link>
  );
}
