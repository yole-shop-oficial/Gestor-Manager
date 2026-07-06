"use client";

import { useAppUser } from "@/features/auth/hooks/useAppUser";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, Users, ShoppingCart, DollarSign, Loader2,
} from "lucide-react";

interface AnalyticsData {
  totals: {
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    activeGestores: number;
    pendingPayouts: number;
  };
  ordersByStatus: { name: string; value: number }[];
  topGestores: { name: string; pedidos: number; comision: number }[];
}

export function AdminAnalytics() {
  const { user, client, project, profile } = useAppUser();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (!user || !project || profile?.role !== "admin") return;
    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const [ordersRes, gestoresRes, walletRes, payoutsRes] = await Promise.all([
        supabase.from("orders").select("status, sale_price, base_price, delivery_price, manager_id, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id, full_name, status, role").neq("role", "admin"),
        supabase.from("wallet_entries").select("amount, entry_type, created_at, manager_id").order("created_at", { ascending: false }).limit(500),
        supabase.from("payout_requests").select("status"),
      ]);

      const orders = ordersRes.data || [];
      const gestores = gestoresRes.data || [];
      const wallets = walletRes.data || [];
      const payouts = payoutsRes.data || [];

      const totals = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((s, o) => s + Number(o.sale_price), 0),
        totalCommission: wallets.filter(w => w.entry_type === "commission").reduce((s, w) => s + Number(w.amount), 0),
        activeGestores: gestores.filter(g => g.status === "active").length,
        pendingPayouts: payouts.filter(p => p.status === "pending").length,
      };

      const statusCounts: Record<string, number> = {};
      orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
      const statusLabels: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmado", sold: "Vendido", denied: "Denegado", cancelled: "Cancelado" };
      const ordersByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name: statusLabels[name] || name, value }));

      const gestorData: Record<string, { pedidos: number; comision: number }> = {};
      orders.forEach(o => {
        const g = gestores.find(g => g.id === o.manager_id);
        const name = g?.full_name?.split(" ")[0] || "?";
        if (!gestorData[name]) gestorData[name] = { pedidos: 0, comision: 0 };
        gestorData[name].pedidos++;
      });
      wallets.filter(w => w.entry_type === "commission").forEach(w => {
        const g = gestores.find(g => g.id === w.manager_id);
        const name = g?.full_name?.split(" ")[0] || "?";
        if (!gestorData[name]) gestorData[name] = { pedidos: 0, comision: 0 };
        gestorData[name].comision += Number(w.amount);
      });
      const topGestores = Object.entries(gestorData).sort(([, a], [, b]) => b.comision - a.comision).slice(0, 5).map(([name, d]) => ({ name, ...d }));

      setData({ totals, ordersByStatus, topGestores });
    } catch (err) {
      console.error("[ANALYTICS] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, client, project, profile]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">📊 Analytics</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KPI icon={ShoppingCart} label="Pedidos" value={data.totals.totalOrders} gradient="from-blue-500 to-cyan-500" />
        <KPI icon={DollarSign} label="Ingresos" value={`$${data.totals.totalRevenue.toFixed(0)}`} gradient="from-emerald-500 to-green-500" />
        <KPI icon={TrendingUp} label="Comisiones" value={`$${data.totals.totalCommission.toFixed(0)}`} gradient="from-violet-500 to-purple-500" />
        <KPI icon={Users} label="Gestores activos" value={data.totals.activeGestores} gradient="from-orange-500 to-red-500" />
      </div>

      {/* Pedidos por estado */}
      <div className="card-filled rounded-[24px] p-5">
        <h3 className="text-sm font-bold mb-4">Pedidos por estado</h3>
        <div className="space-y-2">
          {data.ordersByStatus.map((item, i) => {
            const total = data.ordersByStatus.reduce((s, x) => s + x.value, 0);
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            const colors = ["bg-yellow-500", "bg-blue-500", "bg-green-500", "bg-red-500", "bg-gray-500"];
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">{item.value} ({pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-accent overflow-hidden">
                  <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top gestores */}
      <div className="card-filled rounded-[24px] p-5">
        <h3 className="text-sm font-bold mb-4">Top Gestores</h3>
        <div className="space-y-3">
          {data.topGestores.map((g, i) => (
            <div key={g.name} className="flex items-center gap-3">
              <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{g.name}</p>
                <p className="text-[10px] text-muted-foreground">{g.pedidos} pedidos</p>
              </div>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">${g.comision.toFixed(0)}</span>
            </div>
          ))}
          {data.topGestores.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin datos aún</p>}
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, gradient }: {
  icon: React.ElementType; label: string; value: number | string; gradient: string;
}) {
  return (
    <div className="card-filled rounded-[20px] p-4 space-y-2">
      <div className={`w-8 h-8 rounded-[12px] bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
}
