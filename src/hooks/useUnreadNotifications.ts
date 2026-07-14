"use client";

import { useSupabaseQuery, invalidate } from "@/hooks";
import { useSession } from "./useSession";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to get the unread notification count for the header badge.
 * v4: Removed dead useRealtime call (was no-op). Uses polling via React Query staleTime.
 */
export function useUnreadNotifications() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

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
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  });

  return count;
}
