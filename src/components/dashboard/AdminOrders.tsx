"use client";

import { useSession, useSupabaseQuery, invalidate } from "@/hooks";
import { getCrossProjectP2Client } from "@/services/supabase/crossProjectAdmin";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge, LoadingSpinner, ErrorPanel } from "@/components/shared";
import {
  ShoppingCart, CheckCircle2, XCircle, Package, Truck, Loader2, Clock,
} from "lucide-react";

// ============================================================
// ADMIN ORDERS — Gestión de pedidos del admin
// ============================================================
// Muestra TODOS los pedidos de TODOS los gestores (P1 + P2).
// Permite cambiar el estado: confirmar, denegar, marcar vendido.
// ============================================================

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
}

type OrderFilter = "all" | "pending" | "confirmed" | "sold" | "denied" | "cancelled";

const FILTERS: { key: OrderFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "confirmed", label: "Confirmados" },
  { key: "sold", label: "Vendidos" },
  { key: "cancelled", label: "Cancelados" },
];

export function AdminOrders() {
  const { client, project, isAdmin } = useSession();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");

  const { data: orders = [], isLoading, error } = useSupabaseQuery<AdminOrder[]>({
    key: ["admin-orders"],
    queryFn: async (supabase) => {
      // P1 orders with manager name
      const { data: p1orders } = await supabase
        .from("orders")
        .select("id, product_name, base_price, sale_price, size, customer_name, customer_phone, status, payment_type, created_at, manager_id, currency, notes")
        .order("created_at", { ascending: false })
        .limit(200);

      let all: AdminOrder[] = (p1orders as AdminOrder[]) || [];

      // P2 orders
      try {
        const p2 = await getCrossProjectP2Client();
        if (p2) {
          const { data: p2orders } = await p2
            .from("orders")
            .select("id, product_name, base_price, sale_price, size, customer_name, customer_phone, status, payment_type, created_at, manager_id, currency, notes")
            .order("created_at", { ascending: false })
            .limit(200);
          if (p2orders) all = [...all, ...(p2orders as AdminOrder[])];
        }
      } catch { /* P2 */ }

      // Resolver nombres de gestores
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

  const changeOrderStatus = async (orderId: string, newStatus: string) => {
    if (!client) return;
    setActionLoading(orderId + newStatus);

    try {
      // Determinar si el pedido es de P2 (no hay flag directo, intentar P1 primero)
      let supabase = client;
      let { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);

      // Si no afectó fillas en P1, intentar P2
      if (error) {
        const p2 = await getCrossProjectP2Client();
        if (p2) {
          const p2res = await p2.from("orders").update({ status: newStatus }).eq("id", orderId);
          if (p2res.error) alert("Error: " + p2res.error.message);
        }
      }

      invalidate.adminDashboard(queryClient);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err) {
      console.error("[ADMIN] Error cambiando order status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  if (error) return <ErrorPanel title="Error" message={error.message} compact />;

  const pendingCount = orders.filter(o => o.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {FILTERS.map(f => {
          const count = f.key === "all" ? orders.length : orders.filter(o => o.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                filter === f.key ? "bg-primary text-primary-foreground" : "card-filled text-muted-foreground"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista de pedidos */}
      {filteredOrders.length === 0 ? (
        <div className="card-filled rounded-2xl p-8 text-center">
          <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay pedidos en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, i) => (
            <motion.div
              key={order.id + i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="card-filled rounded-[18px] p-4 space-y-3"
            >
              {/* Header del pedido */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate">{order.product_name}</h4>
                  <p className="text-[11px] text-muted-foreground truncate">
                    👤 {order.manager_name || "Desconocido"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    📦 {order.customer_name} · 📞 {order.customer_phone}
                  </p>
                </div>
                <StatusBadge status={order.status as any} />
              </div>

              {/* Detalles */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold">{order.currency?.toUpperCase() || "$"} {order.sale_price}</span>
                  {order.base_price > 0 && (
                    <span className="text-muted-foreground">costo: {order.base_price}</span>
                  )}
                  {order.size && <span className="px-1.5 py-0.5 bg-accent rounded text-[10px]">Talla: {order.size}</span>}
                </div>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(order.created_at).toLocaleDateString("es-CU", { day: "2-digit", month: "short" })}
                </span>
              </div>

              {/* Notas */}
              {order.notes && (
                <p className="text-[10px] text-muted-foreground bg-surface/50 rounded-lg p-2">📝 {order.notes}</p>
              )}

              {/* Acciones según estado */}
              {order.status === "pending" && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => changeOrderStatus(order.id, "confirmed")}
                    disabled={actionLoading === order.id + "confirmed"}
                    className="py-2 rounded-[12px] bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Package className="w-3.5 h-3.5" /> Confirmar
                  </button>
                  <button
                    onClick={() => changeOrderStatus(order.id, "sold")}
                    disabled={actionLoading === order.id + "sold"}
                    className="py-2 rounded-[12px] bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Vendido
                  </button>
                  <button
                    onClick={() => changeOrderStatus(order.id, "cancelled")}
                    disabled={actionLoading === order.id + "cancelled"}
                    className="py-2 rounded-[12px] bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              )}

              {order.status === "confirmed" && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => changeOrderStatus(order.id, "sold")}
                    disabled={actionLoading === order.id + "sold"}
                    className="py-2 rounded-[12px] bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Vendido
                  </button>
                  <button
                    onClick={() => changeOrderStatus(order.id, "cancelled")}
                    disabled={actionLoading === order.id + "cancelled"}
                    className="py-2 rounded-[12px] bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              )}

              {(order.status === "sold" || order.status === "cancelled" || order.status === "denied") && (
                <button
                  onClick={() => changeOrderStatus(order.id, "pending")}
                  disabled={actionLoading === order.id + "pending"}
                  className="w-full py-2 rounded-[12px] card-filled text-[10px] font-bold text-muted-foreground disabled:opacity-50"
                >
                  ↩ Volver a pendiente
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
