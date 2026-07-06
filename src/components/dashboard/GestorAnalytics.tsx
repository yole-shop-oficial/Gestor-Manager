"use client";

import { useSession, useSupabaseQuery } from "@/hooks";
import React, { useMemo } from "react";
import { ShoppingCart, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { LoadingSpinner, ErrorPanel } from "@/components/shared";

interface GestorAnalyticsData {
  totalOrders: number;
  soldOrders: number;
  cancelledOrders: number;
  totalCommission: number;
  conversionRate: number;
  recentOrders: { month: string; count: number }[];
}

export function GestorAnalytics() {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const { data, isLoading, error } = useSupabaseQuery<GestorAnalyticsData>({
    key: ["gestor-analytics", userId],
    queryFn: async (client, uid) => {
      const [ordersRes, walletRes] = await Promise.all([
        client.from("orders").select("status, created_at").eq("manager_id", uid).order("created_at", { ascending: false }).limit(200),
        client.from("wallet_entries").select("amount, entry_type, created_at").eq("manager_id", uid).order("created_at", { ascending: false }).limit(200),
      ]);

      const orders = ordersRes.data || [];
      const wallets = walletRes.data || [];

      const totalOrders = orders.length;
      const soldOrders = orders.filter(o => o.status === "sold").length;
      const cancelledOrders = orders.filter(o => o.status === "cancelled" || o.status === "denied").length;
      const totalCommission = wallets.filter(w => w.entry_type === "commission").reduce((s, w) => s + Number(w.amount), 0);
      const conversionRate = totalOrders > 0 ? Math.round((soldOrders / totalOrders) * 100) : 0;

      // Pedidos por mes (últimos 6)
      const recentOrders: { month: string; count: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString("es-CU", { month: "short" });
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const count = orders.filter(o => o.created_at >= monthStart && o.created_at <= monthEnd).length;
        recentOrders.push({ month: key, count });
      }

      return { totalOrders, soldOrders, cancelledOrders, totalCommission, conversionRate, recentOrders };
    },
    staleTime: 60_000, // 60s
  });

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner size="sm" /></div>;
  if (error) return <ErrorPanel title="Error" message={`Error cargando estadísticas: ${error.message}`} compact />;
  if (!data) return null;

  const maxCount = useMemo(() => Math.max(...data.recentOrders.map(m => m.count), 1), [data.recentOrders]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">📊 Mis estadísticas</h2>
      <div className="grid grid-cols-2 gap-3">
        <MiniKPI icon={ShoppingCart} label="Pedidos" value={data.totalOrders} color="text-blue-500" />
        <MiniKPI icon={TrendingUp} label="Conversión" value={`${data.conversionRate}%`} color="text-green-500" />
        <MiniKPI icon={DollarSign} label="Comisiones" value={`$${data.totalCommission.toFixed(0)}`} color="text-purple-500" />
        <MiniKPI icon={BarChart3} label="Vendidos" value={data.soldOrders} color="text-emerald-500" />
      </div>

      {/* Mini bar chart */}
      <div className="card-filled rounded-[20px] p-5">
        <h3 className="text-sm font-bold mb-3">Pedidos por mes</h3>
        <div className="flex items-end gap-2 h-24">
          {data.recentOrders.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-purple-500 transition-all"
                style={{ height: `${Math.max((m.count / maxCount) * 100, 4)}%` }} />
              <span className="text-[9px] text-muted-foreground font-semibold">{m.month}</span>
              <span className="text-[9px] font-bold">{m.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MiniKPI = React.memo(function MiniKPI({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="card-filled rounded-[16px] p-3 space-y-1">
      <Icon className={`w-5 h-5 ${color}`} />
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
});
