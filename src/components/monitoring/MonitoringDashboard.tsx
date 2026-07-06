"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Filter,
  Activity,
  Users,
  ShoppingCart,
  MessageSquare,
  Bug,
  Calendar,
  Loader2,
  Trash2,
} from "lucide-react";
import { useUsageMetrics, useAppLogs, invalidateMonitoring } from "@/hooks/useMonitoring";
import { useSession } from "@/hooks/useSession";
import { useQueryClient } from "@tanstack/react-query";
import { LoadingSpinner, ErrorPanel, EmptyState } from "@/components/shared";
import type { LogLevelFilter, AppLog, UsageMetrics } from "@/hooks/useMonitoring";

// ═══════════════════════════════════════════════════════════
// METRIC CARD
// ═══════════════════════════════════════════════════════════

const MetricCard = React.memo(function MetricCard({
  icon: Icon,
  label,
  value,
  gradient,
  urgent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  gradient: string;
  urgent?: boolean;
}) {
  return (
    <div className={`rounded-[18px] card-filled p-3.5 space-y-1.5 ${urgent ? "ring-2 ring-red-500/30" : ""}`}>
      <div className={`w-7 h-7 rounded-[10px] bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// LOG ROW
// ═══════════════════════════════════════════════════════════

const LOG_STYLES = {
  error: {
    bg: "bg-red-50 dark:bg-red-500/10",
    border: "border-red-200 dark:border-red-500/20",
    icon: AlertCircle,
    iconColor: "text-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  },
  warn: {
    bg: "bg-yellow-50 dark:bg-yellow-500/10",
    border: "border-yellow-200 dark:border-yellow-500/20",
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/20",
    icon: Info,
    iconColor: "text-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  },
};

const LogRow = React.memo(function LogRow({ log }: { log: AppLog }) {
  const [expanded, setExpanded] = useState(false);
  const style = LOG_STYLES[log.level];
  const IconComp = style.icon;

  const formattedTime = useMemo(() => {
    const d = new Date(log.created_at);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("es-CU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return d.toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }, [log.created_at]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[14px] border ${style.bg} ${style.border} overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-start gap-2.5 text-left"
      >
        <IconComp className={`w-4 h-4 mt-0.5 shrink-0 ${style.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${style.badge}`}>
              {log.level}
            </span>
            <span className="text-xs font-semibold truncate flex-1">{log.event}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">{formattedTime}</span>
          </div>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mt-2 space-y-1.5 text-[11px]"
            >
              {log.data && (
                <div className="bg-black/5 dark:bg-white/5 rounded-lg p-2.5">
                  <p className="font-bold text-muted-foreground mb-1">Data:</p>
                  <pre className="whitespace-pre-wrap break-all font-mono text-[10px]">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </div>
              )}
              {log.user_agent && (
                <p className="text-muted-foreground">
                  <span className="font-bold">UA:</span> {log.user_agent.slice(0, 100)}
                </p>
              )}
              {log.user_id && (
                <p className="text-muted-foreground">
                  <span className="font-bold">User:</span> {log.user_id.slice(0, 8)}...
                </p>
              )}
            </motion.div>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════
// TAB BUTTON
// ═══════════════════════════════════════════════════════════

function TabButton({ active, onClick, children, count }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-[12px] text-xs font-bold transition-colors flex items-center gap-1.5 ${
        active
          ? "bg-primary text-primary-foreground"
          : "card-filled text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
          active ? "bg-white/20" : "bg-red-500/15 text-red-500"
        }`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT: MonitoringDashboard
// ═══════════════════════════════════════════════════════════

export function MonitoringDashboard() {
  const { profile, client, project } = useSession();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === "admin";
  const [activeTab, setActiveTab] = useState<"metrics" | "logs">("metrics");
  const [levelFilter, setLevelFilter] = useState<LogLevelFilter>("all");
  const [cleaning, setCleaning] = useState(false);

  // ─── Usage Metrics ───
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useUsageMetrics(isAdmin);

  // ─── App Logs ───
  const {
    flatData: logs,
    totalLoaded: logsLoaded,
    isLoading: logsLoading,
    fetchNextPage: fetchMoreLogs,
    hasNextPage: hasMoreLogs,
    isFetchingNextPage: fetchingMoreLogs,
    error: logsError,
  } = useAppLogs(isAdmin && activeTab === "logs", levelFilter);

  // ─── Refresh handler ───
  const handleRefresh = useCallback(async () => {
    await invalidateMonitoring.metrics(queryClient);
    await invalidateMonitoring.logs(queryClient);
  }, [queryClient]);

  // ─── Cleanup old logs ───
  const handleCleanup = useCallback(async () => {
    if (!client) return;
    setCleaning(true);
    try {
      const { error } = await client.rpc("cleanup_old_logs");
      if (error) {
        console.error("[Monitoring] Cleanup error:", error.message);
      } else {
        await invalidateMonitoring.logs(queryClient);
        await invalidateMonitoring.metrics(queryClient);
      }
    } catch (err) {
      console.error("[Monitoring] Cleanup exception:", err);
    } finally {
      setCleaning(false);
    }
  }, [client, queryClient]);

  if (!isAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold">Monitoreo &amp; Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className="p-2 rounded-[12px] card-filled text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="Limpiar logs antiguos (>30 días)"
          >
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-[12px] card-filled text-muted-foreground hover:text-foreground"
            title="Refrescar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton active={activeTab === "metrics"} onClick={() => setActiveTab("metrics")}>
          <Activity className="w-3.5 h-3.5" />
          Métricas
        </TabButton>
        <TabButton
          active={activeTab === "logs"}
          onClick={() => setActiveTab("logs")}
          count={metrics?.errors_today}
        >
          <Bug className="w-3.5 h-3.5" />
          Errores
        </TabButton>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "metrics" && (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="space-y-4"
          >
            {metricsLoading ? (
              <LoadingSpinner centered />
            ) : metricsError ? (
              <ErrorPanel title="Error cargando métricas" message={metricsError.message} />
            ) : metrics ? (
              <>
                {/* Usage Metrics Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <MetricCard
                    icon={Users}
                    label="DAU"
                    value={metrics.dau}
                    gradient="from-blue-500 to-cyan-500"
                  />
                  <MetricCard
                    icon={Users}
                    label="Activos"
                    value={metrics.active_users}
                    gradient="from-emerald-500 to-green-500"
                  />
                  <MetricCard
                    icon={ShoppingCart}
                    label="Pedidos hoy"
                    value={metrics.orders_today}
                    gradient="from-purple-500 to-pink-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <MetricCard
                    icon={MessageSquare}
                    label="Mensajes hoy"
                    value={metrics.messages_today}
                    gradient="from-indigo-500 to-blue-500"
                  />
                  <MetricCard
                    icon={AlertCircle}
                    label="Errores hoy"
                    value={metrics.errors_today}
                    gradient="from-red-500 to-rose-500"
                    urgent={metrics.errors_today > 10}
                  />
                  <MetricCard
                    icon={Calendar}
                    label="Errores semana"
                    value={metrics.errors_week}
                    gradient="from-orange-500 to-amber-500"
                    urgent={metrics.errors_week > 50}
                  />
                </div>

                {/* Quick stats text */}
                <div className="card-filled rounded-[16px] p-4 text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-bold text-foreground">{metrics.active_users}</span> gestores activos en el sistema
                  </p>
                  <p>
                    <span className="font-bold text-foreground">{metrics.dau}</span> usuarios activos hoy (según logs)
                  </p>
                  {metrics.errors_today > 0 && (
                    <p className="text-red-500">
                      ⚠️ <span className="font-bold">{metrics.errors_today}</span> errores registrados hoy
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </motion.div>
        )}

        {activeTab === "logs" && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="space-y-3"
          >
            {/* Level Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {(["all", "error", "warn"] as LogLevelFilter[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                    levelFilter === level
                      ? level === "error"
                        ? "bg-red-500 text-white"
                        : level === "warn"
                        ? "bg-yellow-500 text-white"
                        : "bg-primary text-primary-foreground"
                      : "card-filled text-muted-foreground"
                  }`}
                >
                  {level === "all" ? "Todos" : level === "error" ? "Errores" : "Warnings"}
                </button>
              ))}
            </div>

            {/* Logs List */}
            {logsLoading ? (
              <LoadingSpinner centered />
            ) : logsError ? (
              <ErrorPanel title="Error cargando logs" message={logsError.message} />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={Bug}
                title="Sin registros"
                description={levelFilter === "all" ? "No hay logs registrados aún" : `No hay logs de nivel "${levelFilter}"`}
              />
            ) : (
              <>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </div>

                {/* Load more */}
                {hasMoreLogs && (
                  <button
                    onClick={() => fetchMoreLogs()}
                    disabled={fetchingMoreLogs}
                    className="w-full py-3 rounded-[16px] card-filled text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {fetchingMoreLogs ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    {fetchingMoreLogs ? "Cargando..." : `Cargar más logs (${logsLoaded} cargados)`}
                  </button>
                )}

                {!hasMoreLogs && logs.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Todos los logs cargados ({logsLoaded})
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
