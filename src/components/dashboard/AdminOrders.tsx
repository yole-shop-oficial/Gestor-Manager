"use client";

import { useSession, useSupabaseQuery, invalidate } from "@/hooks";
import { getCrossProjectP2Client } from "@/services/supabase/crossProjectAdmin";
import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge, LoadingSpinner, ErrorPanel } from "@/components/shared";
import {
  ShoppingCart, CheckCircle2, XCircle, Package, Loader2,
} from "lucide-react";

interface AdminOrder {
  id: string;
  product_name: string;
  base_price: number;
  sale_price: number;
  size: string | null;
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_type: string;
  created_at: string;
  manager_id: string;
  manager_name?: string;
  currency: string;
  notes?: string;
  source_project: number; // 1 = P1, 2 = P2
}

type OrderFilter = "all" | "pending" | "confirmed" | "sold" | "cancelled";

const FILTERS: { key: OrderFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "confirmed", label: "Confirmados" },
  { key: "sold", label: "Vendidos" },
  { key: "cancelled", label: "Cancelados" },
];

const ORDER_FIELDS = "id, product_name, base_price, sale_price, size, customer_name, customer_phone, status, payment_type, created_at, manager_id, currency, notes";

export function AdminOrders() {
  const { client, isAdmin } = useSession();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const { data: orders = [], isLoading, error } = useSupabaseQuery<AdminOrder[]>({
    key: ["admin-orders"],
    queryFn: async (supabase) => {
      const { data: p1orders } = await supabase.from("orders").select(ORDER_FIELDS).order("created_at", { ascending: false }).limit(200);
      let all: AdminOrder[] = ((p1orders as AdminOrder[]) || []).map(o => ({ ...o, source_project: 1 }));

      try {
        const p2 = await getCrossProjectP2Client();
        if (p2) {
          const { data: p2orders } = await p2.from("orders").select(ORDER_FIELDS).order("created_at", { ascending: false }).limit(200);
          if (p2orders) all = [...all, ...(p2orders as AdminOrder[]).map(o => ({ ...o, source_project: 2 }))];
        }
      } catch { /* P2 */ }

      if (all.length > 0) {
        const managerIds = [...new Set(all.map(o => o.manager_id))];
        const { data: p1names } = await supabase.from("profiles").select("id, full_name").in("id", managerIds);
        const nameMap = new Map((p1names || []).map((n: any) => [n.id, n.full_name]));
        try {
          const p2 = await getCrossProjectP2Client();
          if (p2) {
            const { data: p2names } = await p2.from("profiles").select("id, full_name").in("id", managerIds);
            for (const n of (p2names || [])) nameMap.set((n as any).id, (n as any).full_name);
          }
        } catch { /* P2 */ }
        all = all.map(o => ({ ...o, manager_name: nameMap.get(o.manager_id) || "Desconocido" }));
      }
      return all;
    },
    staleTime: 30_000,
    enabled: isAdmin,
  });

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const changeOrderStatus = useCallback(async (orderId: string, newStatus: string, sourceProject: number) => {
    if (!client) return;
    const loadingKey = orderId + newStatus;
    if (actionLoading === loadingKey) return; // prevenir doble click
    setActionLoading(loadingKey);
    setFeedback(null);

    try {
      let targetClient = client;
      if (sourceProject === 2) {
        const p2 = await getCrossProjectP2Client();
        if (!p2) throw new Error("No se pudo conectar al Proyecto 2");
        targetClient = p2;
      }

      const { error: updateError } = await targetClient.from("orders").update({ status: newStatus }).eq("id", orderId);
      if (updateError) throw new Error(updateError.message);

      setFeedback({ type: "ok", msg: `Pedido ${newStatus === "sold" ? "marcado como vendido" : newStatus === "confirmed" ? "confirmado" : newStatus === "cancelled" ? "cancelado" : "actualizado"} ✓` });
      invalidate.adminDashboard(queryClient);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err: any) {
      setFeedback({ type: "err", msg: err?.message || "Error al actualizar el pedido" });
    } finally {
      setActionLoading(null);
    }
  }, [client, actionLoading, queryClient]);

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  if (error) return <ErrorPanel title="Error" message={error.message} compact />;

  const pendingCount = orders.filter(o => o.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-500" />
          Gestión de Pedidos
        </h2>
        {pendingCount > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 text-xs font-bold">
            {pendingCount} pendiente(s)
          </span>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-xl p-3 text-xs font-bold ${feedback.type === "ok" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
          {feedback.msg}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {FILTERS.map(f => {
          const count = f.key === "all" ? orders.length : orders.filter(o => o.status === f.key).length;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === f.key ? "bg-primary text-primary-foreground" : "card-filled text-muted-foreground"}`}>
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="card-filled rounded-2xl p-8 text-center">
          <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay pedidos en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, i) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="card-filled rounded-[18px] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate">{order.product_name}</h4>
                  <p className="text-[11px] text-muted-foreground truncate">👤 {order.manager_name || "Desconocido"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">📦 {order.customer_name} · 📞 {order.customer_phone}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={order.status as any} />
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${order.source_project === 2 ? "bg-purple-500/15 text-purple-600 dark:text-purple-400" : "bg-blue-500/15 text-blue-600 dark:text-blue-400"}`}>P{order.source_project}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold">{order.currency?.toUpperCase() || "$"} {order.sale_price}</span>
                  {order.base_price > 0 && <span className="text-muted-foreground">costo: {order.base_price}</span>}
                  {order.size && <span className="px-1.5 py-0.5 bg-accent rounded text-[10px]">{order.size}</span>}
                </div>
                <span className="text-muted-foreground text-[10px]">{new Date(order.created_at).toLocaleDateString("es-CU", { day: "2-digit", month: "short" })}</span>
              </div>

              {order.notes && <p className="text-[10px] text-muted-foreground bg-surface/50 rounded-lg p-2">📝 {order.notes}</p>}

              {order.status === "pending" && (
                <div className="grid grid-cols-3 gap-2">
                  <ActionBtn label="Confirmar" icon={Package} color="blue" loading={actionLoading === order.id + "confirmed"} onClick={() => changeOrderStatus(order.id, "confirmed", order.source_project)} />
                  <ActionBtn label="Vendido" icon={CheckCircle2} color="green" loading={actionLoading === order.id + "sold"} onClick={() => changeOrderStatus(order.id, "sold", order.source_project)} />
                  <ActionBtn label="Cancelar" icon={XCircle} color="red" loading={actionLoading === order.id + "cancelled"} onClick={() => changeOrderStatus(order.id, "cancelled", order.source_project)} />
                </div>
              )}
              {order.status === "confirmed" && (
                <div className="grid grid-cols-2 gap-2">
                  <ActionBtn label="Marcar Vendido" icon={CheckCircle2} color="green" loading={actionLoading === order.id + "sold"} onClick={() => changeOrderStatus(order.id, "sold", order.source_project)} />
                  <ActionBtn label="Cancelar" icon={XCircle} color="red" loading={actionLoading === order.id + "cancelled"} onClick={() => changeOrderStatus(order.id, "cancelled", order.source_project)} />
                </div>
              )}
              {(order.status === "sold" || order.status === "cancelled" || order.status === "denied") && (
                <button onClick={() => changeOrderStatus(order.id, "pending", order.source_project)} disabled={actionLoading === order.id + "pending"}
                  className="w-full py-2 rounded-[12px] card-filled text-[10px] font-bold text-muted-foreground disabled:opacity-50">↩ Volver a pendiente</button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, icon: Icon, color, loading, onClick }: { label: string; icon: any; color: string; loading: boolean; onClick: () => void }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500 hover:bg-blue-600",
    green: "bg-green-500 hover:bg-green-600",
    red: "bg-red-500 hover:bg-red-600",
  };
  return (
    <button onClick={onClick} disabled={loading}
      className={`py-2 rounded-[12px] ${colors[color]} text-white text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50`}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
