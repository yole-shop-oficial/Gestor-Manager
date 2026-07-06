"use client";

import { useQuery, useQueryClient, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { useSession } from "./useSession";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import type { SupabaseClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface UseSupabaseQueryOptions<T> {
  /** Query key array (e.g. ["gestor-dashboard", userId]) */
  key: string[];
  /** Function that receives the SupabaseClient and userId, returns data */
  queryFn: (client: SupabaseClient, userId: string) => Promise<T>;
  /** Stale time in ms (default: 30s from QueryClient) */
  staleTime?: number;
  /** Whether the query should execute (default: true) */
  enabled?: boolean;
  /** GC time in ms (default: 10min from QueryClient) */
  gcTime?: number;
}

// ═══════════════════════════════════════════════════════════
// HELPER: get resolved client from session or fallback
// ═══════════════════════════════════════════════════════════

function getSupabaseClient(
  sessionClient: SupabaseClient | null,
  project: 1 | 2 | null
): SupabaseClient | null {
  if (sessionClient) return sessionClient;
  if (!project) return null;
  const config = getProjectConfig(project);
  if (!config.url || !config.anonKey) return null;
  return createLoginClient(config);
}

// ═══════════════════════════════════════════════════════════
// HOOK: useSupabaseQuery
// ═══════════════════════════════════════════════════════════

/**
 * Wrapper tipado de useQuery para consultas Supabase.
 *
 * - Obtiene el client y userId de useSession automáticamente
 * - Deshabilita la query si no hay usuario autenticado
 * - Soporta staleTime, enabled, gcTime personalizables
 * - Expone queryClient para invalidaciones manuales
 *
 * @example
 * const { data, isLoading, error } = useSupabaseQuery({
 *   key: ["gestor-dashboard", userId],
 *   queryFn: async (client, userId) => {
 *     const { data } = await client.from("orders").select("*", { count: "exact", head: true }).eq("manager_id", userId);
 *     return { total: data?.count ?? 0 };
 *   },
 *   staleTime: 30_000,
 * });
 */
export function useSupabaseQuery<T>(
  options: UseSupabaseQueryOptions<T>
): UseQueryResult<T, Error> & { queryClient: ReturnType<typeof useQueryClient> } {
  const { user, client, project } = useSession();
  const queryClient = useQueryClient();

  const resolvedClient = getSupabaseClient(client, project);
  const userId = user?.id ?? "";

  const isReady = !!(resolvedClient && userId);

  const queryOptions: UseQueryOptions<T, Error, T> = {
    queryKey: options.key,
    queryFn: async () => {
      if (!resolvedClient || !userId) {
        throw new Error("No hay sesión activa");
      }
      return options.queryFn(resolvedClient, userId);
    },
    enabled: isReady && (options.enabled !== false),
    staleTime: options.staleTime,
    gcTime: options.gcTime,
    retry: 2,
    refetchOnWindowFocus: false,
  };

  const result = useQuery<T, Error, T>(queryOptions);

  return {
    ...result,
    queryClient,
  };
}

// ═══════════════════════════════════════════════════════════
// UTILITY: invalidateQueries helper
// ═══════════════════════════════════════════════════════════

/**
 * Invalidation helpers for common patterns.
 * Usage: import { invalidate } from "@/hooks/useSupabaseQuery";
 */
export const invalidate = {
  gestorDashboard: (qc: ReturnType<typeof useQueryClient>, userId: string) =>
    qc.invalidateQueries({ queryKey: ["gestor-dashboard", userId] }),

  adminDashboard: (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] }),

  adminAnalytics: (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: ["admin-analytics"] }),

  gestorAnalytics: (qc: ReturnType<typeof useQueryClient>, userId: string) =>
    qc.invalidateQueries({ queryKey: ["gestor-analytics", userId] }),

  wallet: (qc: ReturnType<typeof useQueryClient>, userId: string) => {
    qc.invalidateQueries({ queryKey: ["wallet", userId] });
    qc.invalidateQueries({ queryKey: ["wallet-summary", userId] });
    qc.invalidateQueries({ queryKey: ["wallet-entries", userId] });
    qc.invalidateQueries({ queryKey: ["wallet-payouts", userId] });
  },

  orders: (qc: ReturnType<typeof useQueryClient>, userId: string) =>
    qc.invalidateQueries({ queryKey: ["orders", userId] }),

  orderDetail: (qc: ReturnType<typeof useQueryClient>, orderId: string) =>
    qc.invalidateQueries({ queryKey: ["order-detail", orderId] }),

  notifications: (qc: ReturnType<typeof useQueryClient>, userId: string) =>
    qc.invalidateQueries({ queryKey: ["notifications", userId] }),

  chat: (qc: ReturnType<typeof useQueryClient>, userId: string) =>
    qc.invalidateQueries({ queryKey: ["chat", userId] }),

  adminGestores: (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: ["admin-gestores"] }),

  adminPayouts: (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: ["admin-payouts"] }),

  /** Invalidate all queries for a given user */
  allForUser: (qc: ReturnType<typeof useQueryClient>, userId: string) =>
    qc.invalidateQueries({
      predicate: (query) => {
        const keys = query.queryKey as string[];
        return keys.includes(userId);
      },
    }),
};
