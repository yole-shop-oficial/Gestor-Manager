"use client";

import { useSupabaseInfiniteQuery, invalidate, useRealtime } from "@/hooks";
import { useSession } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "../types";

const PAGE_SIZE = 30;

/**
 * Hook to get messages for a specific conversation.
 * Uses cursor-based pagination with infinite query.
 * Messages are ordered ascending (oldest first) so cursor is the
 * oldest message's created_at — we fetch "older" messages when scrolling up.
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

      // We want the LATEST messages first page, then OLDER messages on scroll up.
      // Strategy: 
      // - No cursor: fetch latest PAGE_SIZE messages (descending), then reverse
      // - With cursor: fetch messages OLDER than cursor (descending), then reverse
      let query = supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at, conversation_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE + 1);

      // cursor = the oldest message's created_at from current page
      // We want messages BEFORE (older than) this cursor
      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);

      const items = (data as ChatMessage[]) || [];
      const hasMore = items.length > PAGE_SIZE;
      const pageItems = hasMore ? items.slice(0, PAGE_SIZE) : items;

      // Reverse to chronological order (oldest first)
      pageItems.reverse();

      // nextCursor = the oldest message's created_at (for fetching even older messages)
      const nextCursor = hasMore && pageItems.length > 0
        ? pageItems[0].created_at
        : null;

      return { data: pageItems, nextCursor };
    },
    staleTime: 0, // always fresh for chat
    enabled: !!conversationId && !!userId,
  });

  // Realtime: new messages in this conversation
  useRealtime({
    channel: `msgs-${conversationId ?? "none"}`,
    table: "messages",
    filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
    event: "INSERT",
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId ?? "none"] });
      // Also update conversation list (last_message preview)
      queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
    },
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
