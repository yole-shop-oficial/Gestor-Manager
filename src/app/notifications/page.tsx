"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSession } from "@/hooks";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { useState, useEffect, useCallback, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Package,
  Wallet,
  UserCheck,
  Ban,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  return (
    <AuthGate>
      <MainLayout>
        <NotificationsContent />
      </MainLayout>
    </AuthGate>
  );
}

function NotificationsContent() {
  const { user, client, project } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user || !project) { setLoading(false); return; }

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[NOTIFICATIONS] Error:", error.message);
      } else if (data) {
        setNotifications(data as Notification[]);
      }
    } catch (err) {
      console.error("[NOTIFICATIONS] Excepción:", err);
    } finally {
      setLoading(false);
    }
  }, [user, client, project]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ─── Real-time subscription para notificaciones nuevas ───
  useEffect(() => {
    if (!user || !client || !project) return;

    const config = getProjectConfig(project);
    const supabase = client || createLoginClient(config);

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => {
            // Evitar duplicados
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
          );
        }
      )
      .subscribe((status) => {
        console.log("[NOTIFICATIONS] Realtime status:", status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, client, project]);

  const markAllRead = async () => {
    if (!user || !client || !project) return;
    const config = getProjectConfig(project);
    const supabase = client || createLoginClient(config);

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getIcon = (title: string) => {
    if (title.includes("pedido") || title.includes("Pedido")) return Package;
    if (title.includes("activada") || title.includes("aprobada")) return CheckCircle2;
    if (title.includes("denegada")) return XCircle;
    if (title.includes("bloqueada")) return Ban;
    if (title.includes("wallet") || title.includes("pago") || title.includes("retiro")) return Wallet;
    return Bell;
  };

  const getIconColor = (title: string) => {
    if (title.includes("activada") || title.includes("aprobada")) return "text-green-500";
    if (title.includes("denegada")) return "text-red-500";
    if (title.includes("bloqueada")) return "text-gray-500";
    if (title.includes("pedido") || title.includes("Pedido")) return "text-blue-500";
    return "text-primary";
  };

  // Guardar timestamp actual en estado para no llamar Date.now() en render
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = useCallback((dateStr: string) => {
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Ahora";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }, [now]);

  return (
    <div className="p-6 pb-24 space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs font-bold text-primary px-3 py-1.5 rounded-full bg-primary/10">
            Marcar leídas
          </button>
        )}
      </motion.div>

      {/* Indicador en tiempo real */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Notificaciones en tiempo real activas
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-filled rounded-[24px] p-12 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">Sin notificaciones</p>
          <p className="text-xs text-muted-foreground mt-1">Te avisaremos cuando haya novedades</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = getIcon(n.title);
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.5) }}
                className={`card-filled rounded-[18px] p-4 flex items-start gap-3 ${!n.is_read ? "border-l-4 border-l-primary" : ""}`}
              >
                <div className={`w-10 h-10 rounded-[14px] ${!n.is_read ? "bg-primary/15" : "bg-surface"} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${getIconColor(n.title)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? "font-bold" : "font-medium"}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1" />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
