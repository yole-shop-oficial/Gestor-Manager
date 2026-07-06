"use client";

import { useSupabaseQuery, useSupabaseInfiniteQuery, invalidate } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface AppLog {
  id: string;
  user_id: string | null;
  level: "info" | "warn" | "error";
  event: string;
  data: Record<string, unknown> | null;
  user_agent: string | null;
  created_at: string;
}

export interface UsageMetrics {
  dau: number;
  active_users: number;
  orders_today: number;
  messages_today: number;
  errors_today: number;
  errors_week: number;
}

export type LogLevelFilter = "all" | "error" | "warn";

// ═══════════════════════════════════════════════════════════
// HOOK: Usage Metrics
// ═══════════════════════════════════════════════════════════

export function useUsageMetrics(enabled: boolean) {
  return useSupabaseQuery<UsageMetrics>({
    key: ["usage-metrics"],
    queryFn: async (client) => {
      const { data, error } = await client.rpc("get_usage_metrics");
      if (error) throw new Error(error.message);
      return (data as UsageMetrics) || {
        dau: 0, active_users: 0, orders_today: 0,
        messages_today: 0, errors_today: 0, errors_week: 0,
      };
    },
    staleTime: 60_000, // 60s
    enabled,
  });
}

// ═══════════════════════════════════════════════════════════
// HOOK: App Logs (infinite query with level filter)
// ═══════════════════════════════════════════════════════════

export function useAppLogs(enabled: boolean, levelFilter: LogLevelFilter = "all") {
  return useSupabaseInfiniteQuery<AppLog>({
    key: ["app-logs", levelFilter],
    queryFn: async (client, _userId, cursor) => {
      let query = client
        .from("app_logs")
        .select("id, user_id, level, event, data, user_agent, created_at")
        .order("created_at", { ascending: false })
        .limit(51);

      // Filter by level
      if (levelFilter !== "all") {
        query = query.eq("level", levelFilter);
      }

      // Cursor pagination
      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const items = (data as AppLog[]) || [];
      const hasMore = items.length > 50;
      const pageItems = hasMore ? items.slice(0, 50) : items;
      const nextCursor = hasMore && pageItems.length > 0
        ? pageItems[pageItems.length - 1].created_at
        : null;

      return { data: pageItems, nextCursor };
    },
    staleTime: 30_000, // 30s
    enabled,
  });
}

// ═══════════════════════════════════════════════════════════
// INVALIDATE HELPERS
// ═══════════════════════════════════════════════════════════

export const invalidateMonitoring = {
  metrics: (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: ["usage-metrics"] }),

  logs: (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: ["app-logs"] }),
};
