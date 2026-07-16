"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSession, useSupabaseQuery, invalidate } from "@/hooks";
import { getCrossProjectP2Client } from "@/services/supabase/crossProjectAdmin";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge, EmptyState, LoadingSpinner, ErrorPanel } from "@/components/shared";
import type { StatusType } from "@/components/shared";
import {
  ShoppingCart, Clock, CheckCircle2, XCircle, Package,
  Filter, Globe, User,
} from "lucide-react";

interface Order {
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
  assigned_project?: number;
}

type StatusFilter = "all" | "pending" | "confirmed" | "sold" | "cancelled";
type TabType = "all" | "mine";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  pending: { label: "Pendiente", icon: Clock },
  confirmed: { label: "Confirmado", icon: Package },
  sold: { label: "Vendido", icon: CheckCircle2 },
  denied: { label: "Denegado", icon: XCircle },
  cancelled: { label: "Cancelado", icon: XCircle },
};

export default function OrdersPage() {
  return (
    <AuthGate>
      <MainLayout>
        <OrdersContent />
      </MainLayout>
    </AuthGate>
  );
}

function OrdersContent() {
  const { user, isAdmin } = useSession();
  const userId = user?.id ?? "";
  const [activeTab, setActiveTab] = useState<TabType>("mine");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // ─── Query: Mis pedidos + Todos los pedidos (P1+P2) ───
  const { data: orders = [], isLoading, error: ordersError } = useSupabaseQuery<Order[]>({
    key: ["orders-unified", userId, activeTab],
    queryFn: async (supabase, uid) => {
      // Construir query base
      let baseQuery = supabase
        .from("orders")
        .select("id, product_name, base_price, sale_price, size, customer_name, customer_phone, status, payment_type, created_at, manager_id")
        .order("created_at", { ascending: false })
        .limit(activeTab === "mine" ? 100 : 200);

      if (activeTab === "mine") {
        baseQuery = baseQuery.eq("manager_id", uid);
      }

      const { data: p1data, error } = await baseQuery;
      if (error) throw new Error(error.message);

      let allOrders: Order[] = (p1data as Order[]) || [];

      // Si es admin, cargar también P2
      if (isAdmin) {
        try {
          const p2 = await getCrossProjectP2Client();
          if (p2) {
            let p2Query = p2
              .from("orders")
              .select("id, product_name, base_price, sale_price, size, customer_name, customer_phone, status, payment_type, created_at, manager_id")
              .order("created_at", { ascending: false })
              .limit(200);

            if (activeTab === "mine") {
              p2Query = p2Query.eq("manager_id", uid);
            }
            const { data: p2data } = await p2Query;
            if (p2data) allOrders = [...allOrders, ...(p2data as Order[])];
          }
        } catch { /* P2 */ }

        // Para "Generales": añadir nombres de gestores
        if (activeTab === "all" && allOrders.length > 0) {
          const managerIds = [...new Set(allOrders.map(o => o.manager_id))];
          // P1 names
          const { data: p1names } = await supabase.from("profiles").select("id, full_name").in("id", managerIds);
          const nameMap = new Map((p1names || []).map((n: any) => [n.id, n.full_name]));
          try {
            const p2 = await getCrossProjectP2Client();
            if (p2) {
              const { data: p2names } = await p2.from("profiles").select("id, full_name").in("id", managerIds);
              for (const n of (p2names || [])) nameMap.set((n as any).id, (n as any).full_name);
            }
          } catch { /* P2 */ }
          allOrders = allOrders.map(o => ({ ...o, manager_name: nameMap.get(o.manager_id) || "Desconocido" }));
        }
      }

      return allOrders;
    },
    staleTime: 30_000,
  });

  const filteredOrders = useMemo(
    () => statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter]
  );

  const statusCounts = useMemo(
    () => orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    [orders]
  );

  if (ordersError) {
    return (
      <div className="p-6 pb-24">
        <ErrorPanel title="Error cargando pedidos" message={ordersError.message} />
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Gestión de pedidos de productos y clientes.</p>
      </motion.div>

      {/* Tabs: Generales / Míos */}
      <div className="flex gap-2 p-1 card-filled rounded-2xl">
        <TabButton
          active={activeTab === "all"}
          onClick={() => setActiveTab("all")}
          icon={Globe}
          label="Generales"
          count={orders.length}
        />
        <TabButton
          active={activeTab === "mine"}
          onClick={() => setActiveTab("mine")}
          icon={User}
          label="Míos"
          count={orders.filter(o => o.manager_id === userId).length}
        />
      </div>

      {/* Filtros de estado */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={`Todos (${orders.length})`} />
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = statusCounts[key] || 0;
          if (count === 0) return null;
          return <FilterChip key={key} active={statusFilter === key} onClick={() => setStatusFilter(key as StatusFilter)} label={`${config.label} (${count})`} />;
        })}
      </motion.div>

      {/* Lista de pedidos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><LoadingSpinner variant="muted" /></div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={orders.length === 0 ? "Sin pedidos aún" : "Sin resultados"}
          description={orders.length === 0
            ? activeTab === "mine"
              ? "Los pedidos que crees aparecerán aquí."
              : "Aún no hay pedidos en el sistema."
            : "No hay pedidos con este filtro."}
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, index) => (
            <OrderCard key={order.id + index} order={order} index={index} showManager={activeTab === "all"} currentUserId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Components ───

function TabButton({ active, onClick, icon: Icon, label, count }: {
  active: boolean; onClick: () => void; icon: any; label: string; count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-accent"}`}>{count}</span>}
    </button>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        active ? "bg-indigo-600 text-white" : "bg-accent text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function OrderCard({ order, index, showManager, currentUserId }: {
  order: Order; index: number; showManager: boolean; currentUserId: string;
}) {
  const router = useRouter();
  const dateStr = useMemo(() => {
    const date = new Date(order.created_at);
    return date.toLocaleDateString("es-CU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }, [order.created_at]);

  const profit = order.sale_price - order.base_price;
  const isMine = order.manager_id === currentUserId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onClick={() => router.push(`/orders/${order.id}`)}
      className="rounded-[20px] card-filled p-4 space-y-3 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold truncate">{order.product_name}</h4>
          <p className="text-xs text-muted-foreground">{order.customer_name}</p>
          {showManager && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              👤 {order.manager_name || "Desconocido"}
              {isMine && <span className="ml-1 text-primary font-bold">(tú)</span>}
            </p>
          )}
        </div>
        <StatusBadge status={order.status as StatusType} icon={STATUS_CONFIG[order.status]?.icon} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">${order.sale_price.toFixed(2)}</span>
          {profit > 0 && <span className="text-green-600 dark:text-green-400 font-semibold">+${profit.toFixed(2)}</span>}
          {order.size && <span className="px-1.5 py-0.5 bg-accent rounded text-[10px] font-semibold">{order.size}</span>}
        </div>
        <span className="text-muted-foreground text-[10px]">{dateStr}</span>
      </div>
    </motion.div>
  );
}
