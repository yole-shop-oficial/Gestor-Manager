"use client";

import { useSupabaseQuery, invalidate, useRealtime } from "@/hooks";
import { useSession } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "../types";

export interface ConversationWithPreview extends Conversation {
  unread_count?: number;
  other_user_name?: string;
}

/**
 * Hook to get all conversations for the current user.
 * Includes unread count and other user's name for private chats.
 */
export function useConversations() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const { data: conversations = [], isLoading, error } = useSupabaseQuery<ConversationWithPreview[]>({
    key: ["conversations", userId],
    queryFn: async (supabase, uid) => {
      // Get conversations where user is a member
      const { data: memberships, error: mErr } = await supabase
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", uid);

      if (mErr || !memberships || memberships.length === 0) return [];

      const convIds = memberships.map((m) => m.conversation_id);
      const readMap = new Map(memberships.map((m) => [m.conversation_id, m.last_read_at]));

      // Get conversations
      const { data: convs, error: cErr } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (cErr || !convs) return [];

      // For each conversation, get unread count and other user name
      const enriched: ConversationWithPreview[] = [];

      for (const conv of convs) {
        // Count unread messages
        const lastRead = readMap.get(conv.id);
        let unreadQuery = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", uid);

        if (lastRead) {
          unreadQuery = unreadQuery.gt("created_at", lastRead);
        }

        const { count } = await unreadQuery;

        let otherUserName: string | undefined;
        if (conv.type === "private") {
          // Get the other member's name
          const { data: otherMembers } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conv.id)
            .neq("user_id", uid)
            .limit(1);

          if (otherMembers && otherMembers.length > 0) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", otherMembers[0].user_id)
              .single();
            otherUserName = profile?.full_name || profile?.username || "Usuario";
          }
        }

        enriched.push({
          ...conv,
          unread_count: count || 0,
          other_user_name: otherUserName,
        });
      }

      return enriched;
    },
    staleTime: 15_000, // 15s
  });

  // Realtime: listen for new messages to update conversation list
  useRealtime({
    channel: `conv-list-${userId}`,
    table: "messages",
    filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`,
    event: "INSERT",
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
    },
    enabled: !!userId,
  });

  return { conversations, isLoading, error };
}
