"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSupabaseUser } from "@/features/auth/hooks/useSupabaseUser";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Loader2,
  Filter,
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
}

type StatusFilter = "all" | "pending" | "confirmed" | "sold" | "cancelled";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400", icon: Clock },
  confirmed: { label: "Confirmado", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400", icon: Package },
  sold: { label: "Vendido", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400", icon: CheckCircle2 },
  denied: { label: "Denegado", color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400", icon: XCircle },
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
  const { user, client, project } = useSupabaseUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadOrders = useCallback(async () => {
    if (!user || !project) {
      setLoading(false);
      return;
    }

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const { data, error } = await supabase
        .from("orders")
        .select("id, product_name, base_price, sale_price, size, customer_name, customer_phone, status, payment_type, created_at")
        .eq("manager_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[ORDERS] Error cargando pedidos:", error.message);
      } else if (data) {
        setOrders(data as Order[]);
      }
    } catch (err) {
      console.error("[ORDERS] Excepción:", err);
    } finally {
      setLoading(false);
    }
  }, [user, client, project]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 pb-24 space-y-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Gestión de pedidos reales de gestores y clientes.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={`Todos (${orders.length})`} />
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = statusCounts[key] || 0;
          if (count === 0) return null;
          return <FilterChip key={key} active={statusFilter === key} onClick={() => setStatusFilter(key as StatusFilter)} label={`${config.label} (${count})`} />;
        })}
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : filteredOrders.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] card-filled border-dashed border-border/70 p-8 text-center">
          <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-1">{orders.length === 0 ? "Sin pedidos aún" : "Sin resultados"}</h3>
          <p className="text-sm text-muted-foreground">{orders.length === 0 ? "Los pedidos que crees aparecerán aquí." : "No hay pedidos con este filtro."}</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filteredOrders.map((order, index) => (
              <OrderCard key={order.id} order={order} index={index} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${active ? "bg-indigo-600 text-white" : "bg-accent text-muted-foreground"}`}>
      {label}
    </button>
  );
}

function OrderCard({ order, index }: { order: Order; index: number }) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const date = new Date(order.created_at);
  const dateStr = date.toLocaleDateString("es-CU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const profit = order.sale_price - order.base_price;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ delay: index * 0.03 }} className="rounded-[20px] card-filled p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold truncate">{order.product_name}</h4>
          <p className="text-xs text-muted-foreground">{order.customer_name}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${config.color}`}>
          <StatusIcon className="w-3 h-3" />{config.label}
        </span>
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
