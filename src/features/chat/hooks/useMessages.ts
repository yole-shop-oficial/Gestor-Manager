"use client";

import { useSupabaseInfiniteQuery, invalidate } from "@/hooks";
import { useSession } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "../types";

const PAGE_SIZE = 30;

/**
 * Hook to get messages for a specific conversation.
 * Uses cursor-based pagination with infinite query.
 * v4: Removed dead useRealtime call (was no-op).
 */
export function useMessages(conversationId: string | null) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const {
    flatData: messages,
    totalLoaded,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSupabaseInfiniteQuery<ChatMessage>({
    key: ["messages", conversationId ?? "none"],
    queryFn: async (supabase, _uid, cursor) => {
      if (!conversationId) return { data: [], nextCursor: null };

      let query = supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at, conversation_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);

      const items = (data as ChatMessage[]) || [];
      const hasMore = items.length > PAGE_SIZE;
      const pageItems = hasMore ? items.slice(0, PAGE_SIZE) : items;

      pageItems.reverse();

      const nextCursor = hasMore && pageItems.length > 0
        ? pageItems[0].created_at
        : null;

      return { data: pageItems, nextCursor };
    },
    staleTime: 0,
    enabled: !!conversationId && !!userId,
  });

  return {
    messages,
    totalLoaded,
    isLoading,
    error,
    fetchOlder: fetchNextPage,
    hasOlder: hasNextPage,
    fetchingOlder: isFetchingNextPage,
  };
}
