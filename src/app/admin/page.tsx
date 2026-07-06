"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSession, useSupabaseQuery, invalidate } from "@/hooks";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import {
  Users,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  UserCheck,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Package,
  Eye,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const AdminAnalytics = dynamic(
  () => import("@/components/dashboard/AdminAnalytics").then((m) => ({ default: m.AdminAnalytics })),
  {
    loading: () => (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    ),
  }
);

interface GestorRow {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  join_date: string;
  has_sales_experience: boolean;
  assigned_project: number;
}

interface PayoutRow {
  id: string;
  manager_id: string;
  amount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  notes: string | null;
  created_at: string;
  manager_name?: string;
}

interface AdminKPIs {
  totalUsers: number;
  pendingUsers: number;
  activeUsers: number;
  totalOrders: number;
  pendingOrders: number;
  pendingPayouts: number;
}

export default function AdminPage() {
  return (
    <AuthGate>
      <MainLayout>
        <AdminContent />
      </MainLayout>
    </AuthGate>
  );
}

function AdminContent() {
  const { user, client, project, profile, profileLoading } = useSession();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";
  const userId = user?.id ?? "";

  // ─── Query 1: KPIs (counts) ───
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useSupabaseQuery<AdminKPIs>({
    key: ["admin-dashboard"],
    queryFn: async (supabase) => {
      const [usersRes, pendingRes, activeRes, ordersRes, pendingOrdersRes, payoutsRes] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("orders").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("payout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ]);

      return {
        totalUsers: usersRes.count || 0,
        pendingUsers: pendingRes.count || 0,
        activeUsers: activeRes.count || 0,
        totalOrders: ordersRes.count || 0,
        pendingOrders: pendingOrdersRes.count || 0,
        pendingPayouts: payoutsRes.count || 0,
      };
    },
    staleTime: 60_000, // 60s
    enabled: isAdmin,
  });

  // ─── Query 2: Gestores list ───
  const { data: gestores = [], isLoading: gestoresLoading } = useSupabaseQuery<GestorRow[]>({
    key: ["admin-gestores"],
    queryFn: async (supabase) => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, email, phone, role, status, join_date, has_sales_experience, assigned_project")
        .neq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as GestorRow[]) || [];
    },
    staleTime: 60_000, // 60s
    enabled: isAdmin,
  });

  // ─── Query 3: Payouts ───
  const { data: payouts = [], isLoading: payoutsLoading } = useSupabaseQuery<PayoutRow[]>({
    key: ["admin-payouts"],
    queryFn: async (supabase) => {
      const { data } = await supabase
        .from("payout_requests")
        .select("id, manager_id, amount, status, notes, created_at")
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(20);

      let payoutsWithNames: PayoutRow[] = (data as PayoutRow[]) || [];
      if (payoutsWithNames.length > 0) {
        const managerIds = [...new Set(payoutsWithNames.map((p) => p.manager_id))];
        const { data: managers } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", managerIds);

        const nameMap = new Map((managers || []).map((m: any) => [m.id, m.full_name]));
        payoutsWithNames = payoutsWithNames.map((p) => ({
          ...p,
          manager_name: nameMap.get(p.manager_id) || "Desconocido",
        }));
      }
      return payoutsWithNames;
    },
    staleTime: 30_000, // 30s
    enabled: isAdmin,
  });

  // ─── Mutations (manual, invalidates cache) ───
  const changeUserStatus = async (targetUserId: string, newStatus: string) => {
    if (!client || !project) return;
    setActionLoading(targetUserId + newStatus);

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", targetUserId);

      if (error) {
        alert("Error: " + error.message);
      } else {
        // Crear notificación para el usuario
        if (newStatus === "active") {
          await supabase.from("notifications").insert([{
            user_id: targetUserId,
            title: "¡Cuenta activada!",
            body: "Tu cuenta ha sido aprobada por el administrador. Ya puedes crear pedidos y ver tu billetera.",
          }]);
        } else if (newStatus === "denied") {
          await supabase.from("notifications").insert([{
            user_id: targetUserId,
            title: "Cuenta denegada",
            body: "Tu solicitud de registro fue denegada. Contacta al soporte si crees que es un error.",
          }]);
        } else if (newStatus === "blocked") {
          await supabase.from("notifications").insert([{
            user_id: targetUserId,
            title: "Cuenta bloqueada",
            body: "Tu cuenta ha sido bloqueada por un administrador.",
          }]);
        }
        // Invalidar queries afectadas
        invalidate.adminDashboard(queryClient);
        invalidate.adminGestores(queryClient);
      }
    } catch (err) {
      console.error("[ADMIN] Error cambiando status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const changePayoutStatus = async (payoutId: string, managerId: string, newStatus: "approved" | "paid" | "rejected", amount: number) => {
    if (!client || !project) return;
    setActionLoading(payoutId + newStatus);

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const updateData: any = {
        status: newStatus,
        approved_by: user?.id,
      };
      if (newStatus === "paid" || newStatus === "rejected") {
        updateData.processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("payout_requests")
        .update(updateData)
        .eq("id", payoutId);

      if (error) {
        alert("Error: " + error.message);
      } else {
        if (newStatus === "approved") {
          await supabase.from("wallet_entries").insert([{
            manager_id: managerId,
            amount: -amount,
            entry_type: "payout" as any,
            description: `Retiro aprobado #${payoutId.slice(0, 8)}`,
          }]);
        }
        // Invalidar queries afectadas
        invalidate.adminDashboard(queryClient);
        invalidate.adminPayouts(queryClient);
        invalidate.wallet(queryClient, managerId);
      }
    } catch (err) {
      console.error("[ADMIN] Error cambiando payout status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Si no es admin, no mostrar
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Acceso restringido</h2>
        <p className="text-sm text-muted-foreground">
          Solo los administradores pueden ver esta página.
        </p>
        <Link href="/" className="mt-4 text-primary font-bold text-sm">
          Volver al inicio
        </Link>
      </div>
    );
  }

  // Error visible en UI
  if (kpisError) {
    return (
      <div className="p-6 pb-24">
        <div className="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-6 text-center">
          <p className="text-sm font-bold text-red-700 dark:text-red-400">Error cargando panel admin</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{kpisError.message}</p>
        </div>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendiente", className: "badge-yellow bg-yellow-100 text-yellow-700 dark:bg-transparent" },
      active: { label: "Activa", className: "badge-green bg-green-100 text-green-700 dark:bg-transparent" },
      denied: { label: "Denegada", className: "badge-red bg-red-100 text-red-700 dark:bg-transparent" },
      blocked: { label: "Bloqueada", className: "badge-gray bg-gray-100 text-gray-700 dark:bg-transparent" },
    };
    const s = map[status] || map.pending;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.className}`}>{s.label}</span>;
  };

  return (
    <div className="p-6 pb-24 space-y-5">
      {/* Header Admin */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Panel Admin</h1>
          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">ADMIN</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Gestiona usuarios, pedidos y la plataforma.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3">
        <AdminStat icon={Users} label="Usuarios" value={kpis?.totalUsers ?? 0} gradient="from-indigo-500 to-purple-600" loading={kpisLoading} />
        <AdminStat icon={UserCheck} label="Pendientes" value={kpis?.pendingUsers ?? 0} gradient="from-yellow-500 to-orange-500" urgent={kpis?.pendingUsers ? kpis.pendingUsers > 0 : false} loading={kpisLoading} />
        <AdminStat icon={ShoppingCart} label="Pedidos" value={kpis?.totalOrders ?? 0} gradient="from-blue-500 to-cyan-500" loading={kpisLoading} />
        <AdminStat icon={Wallet} label="Retiros pend." value={kpis?.pendingPayouts ?? 0} gradient="from-emerald-500 to-teal-500" urgent={kpis?.pendingPayouts ? kpis.pendingPayouts > 0 : false} loading={kpisLoading} />
      </motion.div>

      {/* Alerta de pendientes */}
      {kpis && kpis.pendingUsers > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[20px] bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">
              {kpis.pendingUsers} usuario(s) esperando aprobación
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              Revisa sus datos y aprueba o deniega sus cuentas abajo.
            </p>
          </div>
        </motion.div>
      )}

      {/* Solicitudes de retiro */}
      {payouts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Solicitudes de retiro</h2>
            <span className="text-xs text-muted-foreground">{kpis?.pendingPayouts ?? 0} pendiente(s)</span>
          </div>

          {payouts.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-filled rounded-[18px] p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">${p.amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{p.manager_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("es-CU")}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  p.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {p.status === "pending" ? "Pendiente" : "Aprobada"}
                </span>
              </div>

              {p.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => changePayoutStatus(p.id, p.manager_id, "approved", p.amount)}
                    disabled={actionLoading === p.id + "approved"}
                    className="flex-1 py-2.5 rounded-[14px] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => changePayoutStatus(p.id, p.manager_id, "rejected", p.amount)}
                    disabled={actionLoading === p.id + "rejected"}
                    className="flex-1 py-2.5 rounded-[14px] bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              )}

              {p.status === "approved" && (
                <button
                  onClick={() => changePayoutStatus(p.id, p.manager_id, "paid", p.amount)}
                  disabled={actionLoading === p.id + "paid"}
                  className="w-full py-2.5 rounded-[14px] bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Marcar como pagado
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Lista de Gestores */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Gestores registrados</h2>
          <span className="text-xs text-muted-foreground">{gestores.length} total</span>
        </div>

        {gestoresLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : gestores.length === 0 ? (
          <div className="card-filled rounded-[20px] p-8 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay gestores registrados aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {gestores.map((g) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="card-filled rounded-[18px] p-4 space-y-3"
              >
                {/* Info del gestor */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm">
                      {(g.full_name || g.username || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{g.full_name || g.username}</p>
                      {statusBadge(g.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{g.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      {g.phone && <span>📞 +53 {g.phone.replace(/^\+53/, "").trim()}</span>}
                      <span>🏷️ Proyecto {g.assigned_project}</span>
                      <span>📅 {g.join_date}</span>
                    </div>
                  </div>
                </div>

                {/* Acciones de status */}
                {g.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => changeUserStatus(g.id, "active")}
                      disabled={actionLoading === g.id + "active"}
                      className="flex-1 py-2.5 rounded-[14px] bg-green-500 hover:bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => changeUserStatus(g.id, "denied")}
                      disabled={actionLoading === g.id + "denied"}
                      className="flex-1 py-2.5 rounded-[14px] bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Denegar
                    </button>
                  </div>
                )}

                {g.status === "active" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => changeUserStatus(g.id, "blocked")}
                      disabled={actionLoading === g.id + "blocked"}
                      className="flex-1 py-2.5 rounded-[14px] bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Ban className="w-4 h-4" />
                      Bloquear
                    </button>
                  </div>
                )}

                {(g.status === "denied" || g.status === "blocked") && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => changeUserStatus(g.id, "active")}
                      disabled={actionLoading === g.id + "active"}
                      className="flex-1 py-2.5 rounded-[14px] bg-green-500 hover:bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Reactivar
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Analytics */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <AdminAnalytics />
      </motion.div>
    </div>
  );
}

function AdminStat({ icon: Icon, label, value, gradient, urgent, loading }: {
  icon: React.ElementType;
  label: string;
  value: number;
  gradient: string;
  urgent?: boolean;
  loading?: boolean;
}) {
  return (
    <div className={`rounded-[20px] card-filled p-4 space-y-2 ${urgent ? "ring-2 ring-yellow-500/30" : ""}`}>
      <div className={`w-8 h-8 rounded-[12px] bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : (
        <p className="text-xl font-bold leading-none">{value}</p>
      )}
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
}
