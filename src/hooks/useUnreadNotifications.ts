"use client";

import { useSupabaseQuery, invalidate, useRealtime } from "@/hooks";
import { useSession } from "./useSession";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Hook to get the unread notification count for the header badge.
 * Uses React Query for caching + a lightweight realtime subscription
 * that invalidates the count when new notifications arrive.
 *
 * This subscription is active ALL THE TIME (not page-specific)
 * because the header badge needs to update even when the user
 * is on a different page.
 */
export function useUnreadNotifications() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  // Lightweight query: just count unread
  const { data: count = 0 } = useSupabaseQuery<number>({
    key: ["unread-count", userId],
    queryFn: async (supabase, uid) => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("is_read", false);

      if (error) return 0;
      return count || 0;
    },
    staleTime: 60_000, // 1 min — not critical if slightly stale
    gcTime: 5 * 60 * 1000, // 5 min
  });

  // Permanent lightweight realtime subscription for unread count
  // Only listens for INSERT (new notification) — that's when count changes up
  // For mark-as-read, the notifications page invalidates this too
  useRealtime({
    channel: `notif-badge-${userId}`,
    table: "notifications",
    filter: `user_id=eq.${userId}`,
    event: "INSERT",
    onEvent: () => {
      // Just invalidate the count query — lightweight
      queryClient.invalidateQueries({ queryKey: ["unread-count", userId] });
      // Also invalidate the full notifications list
      invalidate.notifications(queryClient, userId);
    },
    enabled: !!userId,
  });

  return count;
}
