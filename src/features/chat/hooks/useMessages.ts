"use client";

import { useSupabaseQuery, invalidate, useRealtime } from "@/hooks";
import { useSession } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "../types";

/**
 * Hook to get messages for a specific conversation.
 * Uses cursor-based pagination.
 */
export function useMessages(conversationId: string | null, pageSize = 30) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const { data: messages = [], isLoading, error } = useSupabaseQuery<ChatMessage[]>({
    key: ["messages", conversationId ?? "none"],
    queryFn: async (supabase) => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at, conversation_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(pageSize);

      if (error) throw new Error(error.message);
      return (data as ChatMessage[]) || [];
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

  return { messages, isLoading, error };
}
