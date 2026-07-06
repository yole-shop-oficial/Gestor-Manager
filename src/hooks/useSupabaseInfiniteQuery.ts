"use client";

import {
  useInfiniteQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useSession } from "./useSession";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import type { SupabaseClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface CursorPage<T> {
  /** Items in this page */
  data: T[];
  /** Cursor for the next page (null if no more pages) */
  nextCursor: string | null;
}

export interface UseSupabaseInfiniteQueryOptions<T> {
  /** Query key array (e.g. ["orders", userId]) */
  key: string[];
  /**
   * Function that receives (client, userId, cursor) and returns a page.
   * cursor is null for the first page, otherwise the nextCursor from the previous page.
   */
  queryFn: (client: SupabaseClient, userId: string, cursor: string | null) => Promise<CursorPage<T>>;
  /** Stale time in ms (default: 30s from QueryClient) */
  staleTime?: number;
  /** Whether the query should execute (default: true) */
  enabled?: boolean;
  /** GC time in ms (default: 10min from QueryClient) */
  gcTime?: number;
  /** Number of pages to keep in memory (default: 5) */
  maxPages?: number;
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
// HOOK: useSupabaseInfiniteQuery
// ═══════════════════════════════════════════════════════════

/**
 * Wrapper tipado de useInfiniteQuery para consultas Supabase paginadas.
 *
 * - Usa cursor-based pagination (created_at) para estable ordering
 * - Obtiene el client y userId de useSession automáticamente
 * - Deshabilita la query si no hay usuario autenticado
 * - Expone flatData helper que aplana todas las páginas
 *
 * @example
 * const { data, fetchNextPage, hasNextPage, flatData } = useSupabaseInfiniteQuery<Order>({
 *   key: ["orders", userId],
 *   queryFn: async (client, uid, cursor) => {
 *     let query = client.from("orders").select("*").eq("manager_id", uid).order("created_at", { ascending: false }).limit(21);
 *     if (cursor) query = query.lt("created_at", cursor);
 *     const { data } = await query;
 *     const items = (data || []).slice(0, 20);
 *     const hasMore = (data || []).length > 20;
 *     return { data: items, nextCursor: hasMore ? items[items.length - 1].created_at : null };
 *   },
 *   staleTime: 120_000,
 * });
 */
export function useSupabaseInfiniteQuery<T>(
  options: UseSupabaseInfiniteQueryOptions<T>
) {
  const { user, client, project } = useSession();
  const queryClient = useQueryClient();

  const resolvedClient = getSupabaseClient(client, project);
  const userId = user?.id ?? "";

  const isReady = !!(resolvedClient && userId);

  const result = useInfiniteQuery({
    queryKey: options.key,
    queryFn: async ({ pageParam }) => {
      if (!resolvedClient || !userId) {
        throw new Error("No hay sesión activa");
      }
      return options.queryFn(resolvedClient, userId, (pageParam as string | null) ?? null);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: CursorPage<T>) => lastPage.nextCursor,
    enabled: isReady && (options.enabled !== false),
    staleTime: options.staleTime,
    gcTime: options.gcTime,
    retry: 2,
    refetchOnWindowFocus: false,
    maxPages: options.maxPages ?? 5,
  });

  // Flatten all pages into a single array
  const flatData: T[] = result.data?.pages.flatMap((page: CursorPage<T>) => page.data) ?? [];
  const totalLoaded = flatData.length;

  return {
    ...result,
    queryClient,
    flatData,
    totalLoaded,
  };
}
