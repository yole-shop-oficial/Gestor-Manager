"use client";

import { useEffect } from "react";
import { useSupabaseQuery, useRealtime } from "@/hooks";
import { useSession } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "../types";

export interface ContactRow {
  id: string;
  full_name: string;
  username: string;
  role: string;
  level: number;
  status: string;
  manager_code: string;
  avatar_url: string | null;
}

export interface ConversationWithPreview extends Conversation {
  unread_count?: number;
  other_user_name?: string;
  other_user_id?: string;
  other_user_role?: string;
  other_user_status?: string;
}

/**
 * Hook to get all conversations AND contacts (network members).
 * Contacts = users in the current user's branch (for managers/admins) 
 * or just admin (for gestores).
 */
export function useConversations() {
  const { user, profile } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const isAdmin = profile?.role === "admin";

  const { data = { conversations: [], contacts: [] }, isLoading, error } = useSupabaseQuery<{
    conversations: ConversationWithPreview[];
    contacts: ContactRow[];
  }>({
    key: ["conversations-v2", userId],
    queryFn: async (supabase, uid) => {
      // 1. Get contacts (users I can chat with)
      let contacts: ContactRow[] = [];

      if (isAdmin) {
        // Admin sees ALL active users
        const { data: allUsers } = await supabase
          .from("profiles")
          .select("id, full_name, username, role, level, status, manager_code, avatar_url")
          .order("role")
          .order("full_name")
          .limit(100);
        contacts = (allUsers as ContactRow[]) || [];
      } else {
        // Non-admin: get my ancestors + descendants + self
        try {
          // Get my manager (parent)
          if (profile?.parent_id) {
            const { data: parentData } = await supabase
              .from("profiles")
              .select("id, full_name, username, role, level, status, manager_code, avatar_url")
              .eq("id", profile.parent_id)
              .single();
            if (parentData) contacts.push(parentData as ContactRow);
          }

          // Get my admin
          const { data: adminData } = await supabase
            .from("profiles")
            .select("id, full_name, username, role, level, status, manager_code, avatar_url")
            .eq("role", "admin")
            .limit(1);
          if (adminData?.[0]) {
            const admin = adminData[0] as ContactRow;
            if (!contacts.find(c => c.id === admin.id)) contacts.push(admin);
          }

          // Get my descendants (if I'm a manager)
          const { data: descendants } = await supabase.rpc("get_descendants", { p_user_id: uid });
          if (descendants) {
            const desc = (descendants as ContactRow[]).filter(d => d.id !== uid);
            for (const d of desc) {
              if (!contacts.find(c => c.id === d.id)) contacts.push(d);
            }
          }
        } catch {
          // Fallback: just show admin
          const { data: fallback } = await supabase
            .from("profiles")
            .select("id, full_name, username, role, level, status, manager_code, avatar_url")
            .eq("role", "admin")
            .limit(1);
          if (fallback?.[0]) contacts.push(fallback[0] as ContactRow);
        }
      }

      // 2. Get conversations
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", uid);

      const conversations: ConversationWithPreview[] = [];

      if (memberships && memberships.length > 0) {
        const convIds = memberships.map((m) => m.conversation_id);
        const readMap = new Map(memberships.map((m) => [m.conversation_id, m.last_read_at]));

        const { data: convs } = await supabase
          .from("conversations")
          .select("*")
          .in("id", convIds)
          .order("last_message_at", { ascending: false, nullsFirst: false });

        if (convs) {
          for (const conv of convs) {
            const lastRead = readMap.get(conv.id);
            let unreadQuery = supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .neq("sender_id", uid);
            if (lastRead) unreadQuery = unreadQuery.gt("created_at", lastRead);
            const { count } = await unreadQuery;

            let otherUserName: string | undefined;
            let otherUserId: string | undefined;
            let otherUserRole: string | undefined;
            let otherUserStatus: string | undefined;

            if (conv.type === "private") {
              const { data: otherMembers } = await supabase
                .from("conversation_members")
                .select("user_id")
                .eq("conversation_id", conv.id)
                .neq("user_id", uid)
                .limit(1);

              if (otherMembers?.[0]) {
                otherUserId = otherMembers[0].user_id;
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name, username, role, status")
                  .eq("id", otherUserId)
                  .single();
                otherUserName = profile?.full_name || profile?.username || "Usuario";
                otherUserRole = profile?.role;
                otherUserStatus = profile?.status;
              }
            }

            conversations.push({
              ...conv,
              unread_count: count || 0,
              other_user_name: otherUserName,
              other_user_id: otherUserId,
              other_user_role: otherUserRole,
              other_user_status: otherUserStatus,
            });
          }
        }
      }

      return { conversations, contacts };
    },
    staleTime: 15_000,
  });

  // Realtime: listen for new messages
  useRealtime({
    channel: `conv-list-v2-${userId}`,
    table: "messages",
    filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`,
    event: "INSERT",
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations-v2", userId] });
    },
    enabled: !!userId,
  });

  // Polling: actualizar conversaciones cada 25s (badges, últimos mensajes)
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["conversations-v2", userId] });
    }, 25_000);
    return () => clearInterval(id);
  }, [userId, queryClient]);

  const conversations = data?.conversations || [];
  const contacts = data?.contacts || [];

  return { conversations, contacts, isLoading, error };
}
