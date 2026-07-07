"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSession, useSupabaseQuery } from "@/hooks";
import { clearUserProject } from "@/services/supabase/roundRobin";
import { clearSession } from "@/hooks/useSession";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { StatusBadge, LoadingSpinner, ErrorPanel, EmptyState } from "@/components/shared";
import Link from "next/link";
import {
  User, Mail, Phone, MapPin, CreditCard, Calendar, Shield, LogOut,
  Server, Hash, BadgeCheck, AlertTriangle, Loader2, Settings, Bell,
  Copy, Check, Link2, Users, TrendingUp, Wallet, Package, Clock,
  FileText, Activity, MessageCircle, ClipboardList, ChevronRight,
  BarChart3, DollarSign, Network, ArrowUp, ArrowDown, Search, X,
} from "lucide-react";

// ═══════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════
const TABS = [
  { id: "info", label: "Info", icon: User },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "orders", label: "Pedidos", icon: Package },
  { id: "network", label: "Mi Red", icon: Network },
  { id: "activity", label: "Actividad", icon: Activity },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ═══════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════
interface WalletSummary { balance: number; total_commissions: number; total_payouts: number; }
interface OrderSummary { id: string; product_name: string; sale_price: number; status: string; created_at: string; }
interface NetworkStats { total_gestores: number; total_managers: number; total_network: number; total_commission: number; }
interface DescendantRow { id: string; full_name: string; username: string; role: string; level: number; status: string; manager_code: string; children_count: number; total_network_size: number; last_seen_at: string; }
interface AuditLog { id: string; action: string; entity_type: string; created_at: string; }

export default function ProfilePage() {
  return (
    <AuthGate>
      <MainLayout>
        <ProfileContent />
      </MainLayout>
    </AuthGate>
  );
}

function ProfileContent() {
  const { user, client, project, profile, profileLoading } = useSession();
  const userId = user?.id ?? "";

  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [loggingOut, setLoggingOut] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const isManager = (profile?.children_count || 0) > 0 || (profile?.role === "manager") || (profile?.role === "admin");
  const isAdmin = profile?.role === "admin";
  const managerCode = profile?.manager_code || "";
  const level = profile?.level ?? 0;
  const networkSize = profile?.total_network_size ?? 0;
  const childrenCount = profile?.children_count ?? 0;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (client) await client.auth.signOut();
      clearUserProject();
      clearSession();
      window.location.href = "/welcome";
    } finally { setLoggingOut(false); }
  };

  const copyCode = () => {
    if (!managerCode) return;
    navigator.clipboard.writeText(managerCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const genderLabel = useMemo(() =>
    profile?.gender === "male" ? "Masculino" : profile?.gender === "female" ? "Femenino" : profile?.gender === "other" ? "Otro" : "—",
    [profile?.gender]
  );

  const roleLabel = profile?.role === "admin" ? "Administrador" : profile?.role === "manager" ? "Manager" : "Gestor";

  if (profileLoading) return <LoadingSpinner centered />;

  return (
    <div className="pb-24">
      {/* ─── HEADER CARD ─── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 rounded-[28px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute bottom-6 right-6 w-20 h-20 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[22px] bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
              <User className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{profile?.full_name || user?.email?.split("@")[0] || "Gestor"}</h1>
              <p className="text-sm text-white/70">@{profile?.username || "—"}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <StatusBadge status={(profile?.status || "pending") as any} />
                <span className="text-[11px] text-white/60">{roleLabel} · Nivel {level}</span>
              </div>
            </div>
          </div>

          {/* ─── MANAGER CODE ─── */}
          {managerCode && (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5 flex items-center gap-2 border border-white/10">
                <Link2 className="w-4 h-4 text-white/60 shrink-0" />
                <span className="text-sm font-mono tracking-[0.12em]">{managerCode}</span>
              </div>
              <button onClick={copyCode}
                className="bg-white/20 hover:bg-white/30 rounded-2xl p-2.5 transition shrink-0">
                {codeCopied ? <Check className="w-5 h-5 text-green-300" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          )}

          {/* ─── QUICK STATS ─── */}
          {isManager && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                <p className="text-lg font-extrabold">{networkSize}</p>
                <p className="text-[9px] text-white/60">Mi Red</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                <p className="text-lg font-extrabold">{childrenCount}</p>
                <p className="text-[9px] text-white/60">Directos</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-2.5 text-center">
                <p className="text-lg font-extrabold">{level}</p>
                <p className="text-[9px] text-white/60">Nivel</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── TABS ─── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mx-4 mt-4 flex gap-1 bg-surface/80 backdrop-blur-sm rounded-2xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[64px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* ─── TAB CONTENT ─── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="mx-4 mt-3 space-y-3">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }}>
            {activeTab === "info" && <TabInfo profile={profile} userId={userId} genderLabel={genderLabel} roleLabel={roleLabel} managerCode={managerCode} level={level} isAdmin={isAdmin} />}
            {activeTab === "wallet" && <TabWallet userId={userId} />}
            {activeTab === "orders" && <TabOrders userId={userId} />}
            {activeTab === "network" && <TabNetwork userId={userId} isManager={isManager} />}
            {activeTab === "activity" && <TabActivity userId={userId} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ─── ACTIONS ─── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <Link href="/notifications">
          <div className="card-filled rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform">
            <Bell className="w-6 h-6 text-primary" />
            <span className="text-xs font-bold">Notificaciones</span>
          </div>
        </Link>
        <Link href="/settings">
          <div className="card-filled rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform">
            <Settings className="w-6 h-6 text-primary" />
            <span className="text-xs font-bold">Configuración</span>
          </div>
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mx-4 mt-4">
        <button onClick={handleLogout} disabled={loggingOut}
          className="w-full p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {loggingOut ? <><Loader2 className="w-5 h-5 animate-spin" /> Cerrando...</> : <><LogOut className="w-5 h-5" /> Cerrar sesión</>}
        </button>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB: INFO
// ═══════════════════════════════════════════════
function TabInfo({ profile, userId, genderLabel, roleLabel, managerCode, level, isAdmin }: {
  profile: any; userId: string; genderLabel: string; roleLabel: string; managerCode: string; level: number; isAdmin: boolean;
}) {
  const { user, project } = useSession();
  return (
    <div className="space-y-3">
      {/* Datos personales */}
      <Section title="Datos personales">
        <InfoRow icon={Mail} label="Correo" value={profile?.email || user?.email || "—"} />
        <InfoRow icon={Phone} label="Teléfono" value={profile?.phone ? `+53 ${(profile.phone || "").replace(/^\+53/, "").trim()}` : "—"} />
        <InfoRow icon={Calendar} label="Edad" value={profile?.age ? `${profile.age} años` : "—"} />
        <InfoRow icon={Calendar} label="Nacimiento" value={profile?.birth_date || "—"} />
        <InfoRow icon={User} label="Género" value={genderLabel} />
        <InfoRow icon={Hash} label="Carnet" value={profile?.id_card ? `****${(profile.id_card || "").slice(-4)}` : "—"} />
        <InfoRow icon={MapPin} label="Dirección" value={profile?.address || "—"} />
      </Section>

      {/* Datos bancarios */}
      <Section title="Datos bancarios">
        <InfoRow icon={CreditCard} label="Tarjeta" value={profile?.bank_card_number ? `****${(profile.bank_card_number || "").slice(-4)}` : "—"} />
        <InfoRow icon={User} label="Titular" value={profile?.bank_card_holder || "—"} />
      </Section>

      {/* Sistema */}
      <Section title="Sistema">
        <InfoRow icon={Shield} label="Rol" value={roleLabel} highlight />
        <InfoRow icon={Network} label="Nivel" value={`Nivel ${level}`} />
        {managerCode && <InfoRow icon={Link2} label="Mi Código" value={managerCode} mono highlight />}
        <InfoRow icon={Server} label="Proyecto" value={`Proyecto ${project || profile?.assigned_project || "?"}`} />
        <InfoRow icon={BadgeCheck} label="Experiencia" value={profile?.has_sales_experience ? "Sí" : "No"} />
        <InfoRow icon={Calendar} label="Ingreso" value={profile?.join_date || "—"} />
        <InfoRow icon={Hash} label="User ID" value={userId ? `${userId.slice(0, 8)}...${userId.slice(-4)}` : "—"} mono />
      </Section>

      {/* Status alerts */}
      {profile?.status === "pending" && <AlertBlock icon={AlertTriangle} color="yellow" title="Cuenta pendiente de aprobación" body="Un administrador debe activar tu cuenta." />}
      {profile?.status === "denied" && <AlertBlock icon={AlertTriangle} color="red" title="Cuenta denegada" body="Contacta al soporte a través del chat." />}
      {profile?.status === "blocked" && <AlertBlock icon={AlertTriangle} color="gray" title="Cuenta bloqueada" body="Contacta al soporte para más información." />}
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB: WALLET
// ═══════════════════════════════════════════════
function TabWallet({ userId }: { userId: string }) {
  const { data, isLoading, error } = useSupabaseQuery<WalletSummary>({
    key: ["profile-wallet", userId],
    queryFn: async (client, uid) => {
      const { data } = await client.from("manager_wallet_summary").select("*").eq("manager_id", uid).single();
      return (data as WalletSummary) || { balance: 0, total_commissions: 0, total_payouts: 0 };
    },
    staleTime: 30_000,
  });

  if (isLoading) return <LoadingSpinner variant="muted" />;
  if (error) return <ErrorPanel title="Error" message={error.message} compact />;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
        <p className="text-sm text-white/70">Saldo disponible</p>
        <p className="text-3xl font-extrabold mt-1">${(data?.balance || 0).toFixed(2)}</p>
        <div className="flex gap-4 mt-3">
          <div><p className="text-[10px] text-white/60">Comisiones</p><p className="text-sm font-bold">${(data?.total_commissions || 0).toFixed(2)}</p></div>
          <div><p className="text-[10px] text-white/60">Retiros</p><p className="text-sm font-bold">${(data?.total_payouts || 0).toFixed(2)}</p></div>
        </div>
      </div>
      <Link href="/wallet" className="block card-filled rounded-2xl p-4 flex items-center justify-between">
        <span className="text-sm font-bold">Ver billetera completa</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB: ORDERS
// ═══════════════════════════════════════════════
function TabOrders({ userId }: { userId: string }) {
  const { data: orders, isLoading, error } = useSupabaseQuery<OrderSummary[]>({
    key: ["profile-orders", userId],
    queryFn: async (client, uid) => {
      const { data } = await client.from("orders").select("id, product_name, sale_price, status, created_at")
        .eq("manager_id", uid).order("created_at", { ascending: false }).limit(10);
      return (data as OrderSummary[]) || [];
    },
    staleTime: 30_000,
  });

  if (isLoading) return <LoadingSpinner variant="muted" />;
  if (error) return <ErrorPanel title="Error" message={error.message} compact />;
  if (!orders?.length) return <EmptyState icon={Package} title="Sin pedidos aún" description="Tus pedidos aparecerán aquí" />;

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <Link key={o.id} href={`/orders/${o.id}`}
          className="card-filled rounded-2xl p-4 flex items-center gap-3 hover:scale-[1.01] transition-transform">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            o.status === "sold" ? "bg-green-100 dark:bg-green-500/15" :
            o.status === "pending" ? "bg-yellow-100 dark:bg-yellow-500/15" :
            o.status === "cancelled" ? "bg-red-100 dark:bg-red-500/15" :
            "bg-blue-100 dark:bg-blue-500/15"
          }`}>
            <Package className={`w-4 h-4 ${
              o.status === "sold" ? "text-green-600" : o.status === "pending" ? "text-yellow-600" :
              o.status === "cancelled" ? "text-red-600" : "text-blue-600"
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{o.product_name}</p>
            <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("es-CU")}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">${Number(o.sale_price).toFixed(2)}</p>
            <StatusBadge status={o.status as any} size="sm" />
          </div>
        </Link>
      ))}
      <Link href="/orders" className="block card-filled rounded-2xl p-3 flex items-center justify-between">
        <span className="text-xs font-bold">Ver todos los pedidos</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB: NETWORK (MI RED)
// ═══════════════════════════════════════════════
function TabNetwork({ userId, isManager }: { userId: string; isManager: boolean }) {
  const { data: stats, isLoading: statsLoading } = useSupabaseQuery<NetworkStats>({
    key: ["network-stats", userId],
    queryFn: async (client, uid) => {
      const { data } = await client.rpc("get_network_stats", { p_user_id: uid });
      return (data as NetworkStats) || { total_gestores: 0, total_managers: 0, total_network: 0, total_commission: 0 };
    },
    staleTime: 60_000,
    enabled: isManager,
  });

  const { data: descendants, isLoading: descLoading } = useSupabaseQuery<DescendantRow[]>({
    key: ["network-descendants", userId],
    queryFn: async (client, uid) => {
      const { data } = await client.rpc("get_descendants", { p_user_id: uid });
      return (data as DescendantRow[]) || [];
    },
    staleTime: 60_000,
    enabled: isManager,
  });

  if (!isManager) {
    return <EmptyState icon={Network} title="Sin red aún" description="Cuando invites gestores con tu código, aparecerán aquí. ¡Comparte tu código de afiliación!" />;
  }

  if (statsLoading || descLoading) return <LoadingSpinner variant="muted" />;

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={Users} label="Gestores" value={stats?.total_gestores || 0} color="text-blue-500" />
        <StatCard icon={Shield} label="Managers" value={stats?.total_managers || 0} color="text-purple-500" />
        <StatCard icon={DollarSign} label="Comisión" value={`$${(stats?.total_commission || 0).toFixed(0)}`} color="text-green-500" />
      </div>

      {/* Descendants list */}
      {descendants && descendants.length > 1 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Miembros de tu red ({descendants.length - 1})</h3>
          {descendants.filter(d => d.id !== userId).map((d) => (
            <div key={d.id} className="card-filled rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(d.full_name || "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{d.full_name}</p>
                <p className="text-[10px] text-muted-foreground">@{d.username} · {d.role === "manager" ? "Manager" : "Gestor"} · Nivel {d.level}</p>
              </div>
              <StatusBadge status={d.status as any} size="sm" />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="Sin miembros" description="Comparte tu código de afiliación para construir tu red" />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB: ACTIVITY (AUDITORÍA)
// ═══════════════════════════════════════════════
function TabActivity({ userId }: { userId: string }) {
  const { data: logs, isLoading, error } = useSupabaseQuery<AuditLog[]>({
    key: ["profile-audit", userId],
    queryFn: async (client, uid) => {
      const { data } = await client.from("audit_log").select("id, action, entity_type, created_at")
        .eq("actor_id", uid).order("created_at", { ascending: false }).limit(15);
      return (data as AuditLog[]) || [];
    },
    staleTime: 60_000,
  });

  if (isLoading) return <LoadingSpinner variant="muted" />;
  if (error) return <ErrorPanel title="Error" message={error.message} compact />;
  if (!logs?.length) return <EmptyState icon={Activity} title="Sin actividad reciente" description="Tu historial de acciones aparecerá aquí" />;

  const actionLabel = (a: string) => {
    if (a.includes("order_created")) return "Creó pedido";
    if (a.includes("status_change")) return "Cambió estado";
    if (a.includes("payout")) return "Solicitó retiro";
    if (a.includes("login")) return "Inició sesión";
    return a;
  };

  return (
    <div className="space-y-2">
      {logs.map((l) => (
        <div key={l.id} className="card-filled rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold">{actionLabel(l.action)}</p>
            <p className="text-[10px] text-muted-foreground">{l.entity_type}</p>
          </div>
          <span className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString("es-CU")}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-filled rounded-2xl p-4 space-y-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight, mono }: {
  icon: React.ElementType; label: string; value: string; highlight?: boolean; mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-4 h-4 shrink-0 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={`text-sm truncate ${highlight ? "font-bold text-primary" : "font-medium"} ${mono ? "font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="card-filled rounded-2xl p-3 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function AlertBlock({ icon: Icon, color, title, body }: {
  icon: React.ElementType; color: string; title: string; body: string;
}) {
  const colors: Record<string, string> = {
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    gray: "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800",
  };
  const textColors: Record<string, string> = {
    yellow: "text-yellow-600 dark:text-yellow-400",
    red: "text-red-600 dark:text-red-400",
    gray: "text-gray-600 dark:text-gray-400",
  };
  const titleColors: Record<string, string> = {
    yellow: "text-yellow-800 dark:text-yellow-300",
    red: "text-red-800 dark:text-red-300",
    gray: "text-gray-800 dark:text-gray-300",
  };
  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 ${colors[color] || ""}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${textColors[color] || ""}`} />
      <div>
        <p className={`text-sm font-bold ${titleColors[color] || ""}`}>{title}</p>
        <p className="text-xs opacity-80 mt-1">{body}</p>
      </div>
    </div>
  );
}
