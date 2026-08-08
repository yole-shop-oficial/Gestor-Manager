"use client";

import { useSession, useSupabaseQuery } from "@/hooks";
import { getCrossProjectP2Client } from "@/services/supabase/crossProjectAdmin";
import { fmt } from "@/lib/utils";
import React, { useMemo } from "react";
import {
  TrendingUp, Users, ShoppingCart, DollarSign,
} from "lucide-react";
import { LoadingSpinner, ErrorPanel, EmptyState } from "@/components/shared";

interface AnalyticsData {
  totals: {
    totalOrders: number;
    totalRevenue: { cup: number; usd: number };
    totalCommission: { cup: number; usd: number; cup_transf: number };
    activeGestores: number;
    pendingPayouts: number;
  };
  ordersByStatus: { name: string; value: number }[];
  topGestores: { name: string; pedidos: number; commissions: { cup: number; usd: number; cup_transf: number } }[];
}

export function AdminAnalytics() {
  const { user, profile } = useSession();
  const userId = user?.id ?? "";
  const isAdmin = profile?.role === "admin";

  const { data, isLoading, error } = useSupabaseQuery<AnalyticsData>({
    key: ["admin-analytics"],
    queryFn: async (supabase) => {
      const [ordersRes, gestoresRes, walletRes, payoutsRes] = await Promise.all([
        supabase.from("orders").select("status, sale_price, base_price, delivery_price, manager_id, created_at, currency").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id, full_name, status, role").neq("role", "admin"),
        supabase.from("wallet_entries").select("amount, entry_type, created_at, manager_id, currency").order("created_at", { ascending: false }).limit(500),
        supabase.from("payout_requests").select("status"),
      ]);

      let orders = ordersRes.data || [];
      let gestores = gestoresRes.data || [];
      let wallets = walletRes.data || [];
      let payouts = payoutsRes.data || [];

      try {
        const p2 = await getCrossProjectP2Client();
        if (p2) {
          const [p2o, p2g, p2w, p2p] = await Promise.all([
            p2.from("orders").select("status, sale_price, base_price, delivery_price, manager_id, created_at, currency").order("created_at", { ascending: false }).limit(500),
            p2.from("profiles").select("id, full_name, status, role").neq("role", "admin"),
            p2.from("wallet_entries").select("amount, entry_type, created_at, manager_id, currency").order("created_at", { ascending: false }).limit(500),
            p2.from("payout_requests").select("status"),
          ]);
          orders = [...orders, ...(p2o.data || [])];
          gestores = [...gestores, ...(p2g.data || [])];
          wallets = [...wallets, ...(p2w.data || [])];
          payouts = [...payouts, ...(p2p.data || [])];
        }
      } catch { /* P2 */ }

      const totalRevenue = { cup: 0, usd: 0 };
      orders.forEach(o => {
        const cur = (o.currency || "cup") as "cup" | "usd";
        if (totalRevenue[cur] !== undefined) {
          totalRevenue[cur] += Number(o.sale_price);
        }
      });

      const totalCommission = { cup: 0, usd: 0, cup_transf: 0 };
      wallets.filter(w => w.entry_type === "commission").forEach(w => {
        const cur = (w.currency || "cup") as "cup" | "usd" | "cup_transf";
        if (totalCommission[cur] !== undefined) {
          totalCommission[cur] += Number(w.amount);
        }
      });

      const totals = {
        totalOrders: orders.length,
        totalRevenue,
        totalCommission,
        activeGestores: gestores.filter(g => g.status === "active").length,
        pendingPayouts: payouts.filter(p => p.status === "pending").length,
      };

      const statusCounts: Record<string, number> = {};
      orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
      const statusLabels: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmado", sold: "Vendido", denied: "Denegado", cancelled: "Cancelado" };
      const ordersByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name: statusLabels[name] || name, value }));

      const gestorData: Record<string, { pedidos: number; commissions: { cup: number; usd: number; cup_transf: number } }> = {};
      orders.forEach(o => {
        const g = gestores.find(g => g.id === o.manager_id);
        const name = g?.full_name?.split(" ")[0] || "?";
        if (!gestorData[name]) gestorData[name] = { pedidos: 0, commissions: { cup: 0, usd: 0, cup_transf: 0 } };
        gestorData[name].pedidos++;
      });
      wallets.filter(w => w.entry_type === "commission").forEach(w => {
        const g = gestores.find(g => g.id === w.manager_id);
        const name = g?.full_name?.split(" ")[0] || "?";
        if (!gestorData[name]) gestorData[name] = { pedidos: 0, commissions: { cup: 0, usd: 0, cup_transf: 0 } };
        const cur = (w.currency || "cup") as "cup" | "usd" | "cup_transf";
        if (gestorData[name].commissions[cur] !== undefined) {
          gestorData[name].commissions[cur] += Number(w.amount);
        }
      });

      const getWeightedValue = (c: { cup: number; usd: number; cup_transf: number }) => {
        return c.cup + c.cup_transf + (c.usd * 350); // weighted CUP value for ranking
      };

      const topGestores = Object.entries(gestorData)
        .sort(([, a], [, b]) => getWeightedValue(b.commissions) - getWeightedValue(a.commissions))
        .slice(0, 5)
        .map(([name, d]) => ({ name, ...d }));

      return { totals, ordersByStatus, topGestores };
    },
    staleTime: 120_000, // 120s
    enabled: isAdmin,
  });

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  if (error) return <ErrorPanel title="Error" message={`Error cargando analytics: ${error.message}`} compact />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">📊 Analytics</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KPI icon={ShoppingCart} label="Pedidos" value={data.totals.totalOrders} gradient="from-blue-500 to-cyan-500" />
        <KPI icon={DollarSign} label="Ingresos" value={
          <div className="text-xs space-y-0.5 leading-tight py-0.5 font-bold">
            <p>${fmt(data.totals.totalRevenue.cup, 0)} CUP</p>
            <p>${fmt(data.totals.totalRevenue.usd, 0)} USD</p>
          </div>
        } gradient="from-emerald-500 to-green-500" />
        <KPI icon={TrendingUp} label="Comisiones" value={
          <div className="text-xs space-y-0.5 leading-tight py-0.5 font-bold">
            <p>${fmt(data.totals.totalCommission.cup, 0)} CUP</p>
            <p>${fmt(data.totals.totalCommission.usd, 0)} USD</p>
            <p>${fmt(data.totals.totalCommission.cup_transf, 0)} TR</p>
          </div>
        } gradient="from-violet-500 to-purple-500" />
        <KPI icon={Users} label="Gestores activos" value={data.totals.activeGestores} gradient="from-orange-500 to-red-500" />
      </div>

      {/* Pedidos por estado */}
      <div className="card-filled rounded-[24px] p-5">
        <h3 className="text-sm font-bold mb-4">Pedidos por estado</h3>
        <div className="space-y-2">
          <StatusBars items={data.ordersByStatus} />
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
              <div className="text-right text-xs font-bold text-green-600 dark:text-green-400">
                {g.commissions.cup > 0 && <p>${fmt(g.commissions.cup, 0)} CUP</p>}
                {g.commissions.usd > 0 && <p>${fmt(g.commissions.usd, 0)} USD</p>}
                {g.commissions.cup_transf > 0 && <p>${fmt(g.commissions.cup_transf, 0)} TR</p>}
                {g.commissions.cup === 0 && g.commissions.usd === 0 && g.commissions.cup_transf === 0 && <p>$0</p>}
              </div>
            </div>
          ))}
          {data.topGestores.length === 0 && <EmptyState icon={Users} title="Sin datos aún" className="!p-4 !rounded-2xl border-0" />}
        </div>
      </div>
    </div>
  );
}

const KPI = React.memo(function KPI({ icon: Icon, label, value, gradient }: {
  icon: React.ElementType; label: string; value: React.ReactNode; gradient: string;
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
});

const STATUS_BAR_COLORS = ["bg-yellow-500", "bg-blue-500", "bg-green-500", "bg-red-500", "bg-gray-500"];

const StatusBars = React.memo(function StatusBars({ items }: { items: { name: string; value: number }[] }) {
  const total = useMemo(() => items.reduce((s, x) => s + x.value, 0), [items]);
  return (
    <>
      {items.map((item, i) => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground">{item.value} ({pct}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-accent overflow-hidden">
              <div className={`h-full rounded-full ${STATUS_BAR_COLORS[i % STATUS_BAR_COLORS.length]}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </>
  );
});
