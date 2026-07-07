"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSession, useSupabaseQuery, invalidate } from "@/hooks";
import React, { useState, useMemo } from "react";
import { StatusBadge, DetailRow, LoadingSpinner, ErrorPanel } from "@/components/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import {
  ArrowLeft, Package, DollarSign, User, Phone, MapPin,
  Truck, Clock, FileText, Loader2, CheckCircle2, XCircle,
  Image as ImageIcon, AlertTriangle, Network, Layers, TrendingUp, ArrowDown,
} from "lucide-react";

interface OrderImage {
  id: string;
  storage_path: string;
  sort_order: number;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_kb: number | null;
}

interface Order {
  id: string;
  product_name: string;
  base_price: number;
  provider_price: number | null;
  sale_price: number;
  size: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_price: number;
  delivery_time: string | null;
  payment_type: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  manager_id: string;
  chain: string[] | null;
  margins: Record<string, { user_id: string; margin: number; price: number }> | null;
  order_images: OrderImage[];
}

interface OrderDetailData {
  order: Order;
  imageUrls: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300", icon: Clock },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300", icon: CheckCircle2 },
  sold: { label: "Vendido", color: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300", icon: DollarSign },
  denied: { label: "Denegado", color: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300", icon: XCircle },
};

export default function OrderDetailPage() {
  return (
    <AuthGate>
      <MainLayout>
        <OrderDetailContent />
      </MainLayout>
    </AuthGate>
  );
}

function OrderDetailContent() {
  const { user, client, project, profile } = useSession();
  const queryClient = useQueryClient();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const isAdmin = profile?.role === "admin";

  const { data, isLoading, error: queryError } = useSupabaseQuery<OrderDetailData>({
    key: ["order-detail", orderId],
    queryFn: async (supabase, uid) => {
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*, order_images(*)")
        .eq("id", orderId)
        .maybeSingle();

      if (fetchError) throw new Error("Pedido no encontrado");
      if (!data) throw new Error("Pedido no encontrado");

      // Solo el dueño o admin puede ver
      if (data.manager_id !== uid && !isAdmin) {
        throw new Error("No tienes permiso para ver este pedido");
      }

      // Cargar URLs de imágenes
      let imageUrls: string[] = [];
      if (data.order_images && data.order_images.length > 0) {
        imageUrls = (data.order_images as OrderImage[])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((img) => {
            const { data: urlData } = supabase.storage.from("order-images").getPublicUrl(img.storage_path);
            return urlData.publicUrl;
          });
      }

      return { order: data as Order, imageUrls };
    },
    staleTime: 30_000, // 30s
  });

  const [changingStatus, setChangingStatus] = useState(false);

  const order = data?.order ?? null;
  const imageUrls = data?.imageUrls ?? [];

  const changeStatus = async (newStatus: string) => {
    if (!order || !client || !project) return;
    setChangingStatus(true);
    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);

      if (updateError) {
        alert("Error: " + updateError.message);
      } else {
        // Invalidar queries afectadas
        invalidate.orderDetail(queryClient, orderId);
        invalidate.orders(queryClient, order.manager_id);
        invalidate.gestorDashboard(queryClient, order.manager_id);
        if (isAdmin) {
          invalidate.adminDashboard(queryClient);
          invalidate.adminAnalytics(queryClient);
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setChangingStatus(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner centered />;
  }

  if (queryError || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">{queryError?.message || "Pedido no encontrado"}</h2>
        <button onClick={() => router.back()} className="mt-4 text-primary font-bold text-sm">Volver</button>
      </div>
    );
  }

  const statusConfig = useMemo(() => STATUS_CONFIG[order.status] || STATUS_CONFIG.pending, [order?.status]);
  const commission = useMemo(() => order ? order.sale_price - order.base_price - order.delivery_price : 0, [order?.sale_price, order?.base_price, order?.delivery_price]);

  return (
    <div className="p-6 pb-24 space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-2xl card-filled"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold truncate">{order.product_name}</h1>
          <p className="text-xs text-muted-foreground">Pedido #{order.id.slice(0, 8)}</p>
        </div>
        <StatusBadge status={order.status as any} size="md" />
      </motion.div>

      {/* Imágenes */}
      {imageUrls.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="grid grid-cols-2 gap-2">
            {imageUrls.map((url, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-accent">
                <img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Detalles del producto */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-filled rounded-[20px] p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Producto</h3>
        <DetailRow label="Nombre" value={order.product_name} />
        <DetailRow label="Precio base" value={`$${order.base_price.toFixed(2)}`} />
        <DetailRow label="Precio de venta" value={`$${order.sale_price.toFixed(2)}`} />
        <DetailRow label="Comisión estimada" value={`$${Math.max(0, commission).toFixed(2)}`} highlight />
        {order.size && <DetailRow label="Talla" value={order.size} />}
        <DetailRow label="Método de pago" value={order.payment_type} />
        {order.notes && <DetailRow label="Notas" value={order.notes} />}
      </motion.div>

      {/* Cliente */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-filled rounded-[20px] p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Cliente</h3>
        <DetailRow label="Nombre" value={order.customer_name} />
        <DetailRow label="Teléfono" value={order.customer_phone} />
        <DetailRow label="Dirección" value={order.customer_address} />
      </motion.div>

      {/* Entrega */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-filled rounded-[20px] p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Entrega</h3>
        <DetailRow label="Precio de entrega" value={`$${order.delivery_price.toFixed(2)}`} />
        {order.delivery_time && <DetailRow label="Tiempo estimado" value={order.delivery_time} />}
      </motion.div>

      {/* Fechas */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card-filled rounded-[20px] p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Timeline</h3>
        <DetailRow label="Creado" value={new Date(order.created_at).toLocaleString("es-CU")} />
        <DetailRow label="Última actualización" value={new Date(order.updated_at).toLocaleString("es-CU")} />
      </motion.div>

      {/* Acciones admin */}
      {isAdmin && order.status === "pending" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
          <h3 className="text-sm font-semibold text-center">Acciones de Admin</h3>
          <div className="grid grid-cols-2 gap-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => changeStatus("confirmed")} disabled={changingStatus}
              className="py-3 rounded-2xl font-bold text-sm bg-blue-500 text-white disabled:opacity-60 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Confirmar
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => changeStatus("sold")} disabled={changingStatus}
              className="py-3 rounded-2xl font-bold text-sm bg-green-500 text-white disabled:opacity-60 flex items-center justify-center gap-1">
              <DollarSign className="w-4 h-4" /> Vendido
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => changeStatus("denied")} disabled={changingStatus}
              className="py-3 rounded-2xl font-bold text-sm bg-red-500 text-white disabled:opacity-60 flex items-center justify-center gap-1">
              <XCircle className="w-4 h-4" /> Denegar
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => changeStatus("cancelled")} disabled={changingStatus}
              className="py-3 rounded-2xl font-bold text-sm bg-gray-500 text-white disabled:opacity-60 flex items-center justify-center gap-1">
              <XCircle className="w-4 h-4" /> Cancelar
            </motion.button>
          </div>
        </motion.div>
      )}

      {isAdmin && order.status === "confirmed" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => changeStatus("sold")} disabled={changingStatus}
            className="py-3 rounded-2xl font-bold text-sm bg-green-500 text-white disabled:opacity-60 flex items-center justify-center gap-1">
            <DollarSign className="w-4 h-4" /> Marcar vendido
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => changeStatus("cancelled")} disabled={changingStatus}
            className="py-3 rounded-2xl font-bold text-sm bg-gray-500 text-white disabled:opacity-60 flex items-center justify-center gap-1">
            <XCircle className="w-4 h-4" /> Cancelar
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}

// DetailRow is now imported from @/components/shared
