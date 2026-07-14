"use client";

import { useEffect } from "react";
import { useSupabaseQuery } from "@/hooks";
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
  last_read_at?: string | null;
}

/**
 * Hook to get all conversations AND contacts (network members).
 *
 * v4 OPTIMIZED: Uses get_chat_overview RPC (1 request) instead of
 * N+1 pattern (2 + 3*N requests). Contacts fetched separately.
 * Polling increased from 25s to 45s to reduce Supabase Free tier load.
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
      // 1. Get conversations via RPC (1 request instead of 2 + 3*N)
      const { data: overview, error: rpcErr } = await supabase
        .rpc("get_chat_overview", { p_user_id: uid });

      const conversations: ConversationWithPreview[] = [];

      if (!rpcErr && overview) {
        const ov = overview as Record<string, unknown>;
        const convs = (ov.conversations as ConversationWithPreview[]) || [];
        conversations.push(...convs);
      } else if (rpcErr) {
        console.warn("[useConversations] get_chat_overview RPC failed, using fallback:", rpcErr.message);
        // Fallback: basic query without N+1 detail
        const { data: memberships } = await supabase
          .from("conversation_members")
          .select("conversation_id, last_read_at")
          .eq("user_id", uid);

        if (memberships && memberships.length > 0) {
          const convIds = memberships.map((m) => m.conversation_id);
          const { data: convs } = await supabase
            .from("conversations")
            .select("*")
            .in("id", convIds)
            .order("last_message_at", { ascending: false, nullsFirst: false });

          if (convs) {
            for (const conv of convs) {
              conversations.push({
                ...conv,
                unread_count: 0,
              });
            }
          }
        }
      }

      // 2. Get contacts (separate — lightweight, only runs when data is stale)
      let contacts: ContactRow[] = [];

      if (isAdmin) {
        const { data: allUsers } = await supabase
          .from("profiles")
          .select("id, full_name, username, role, level, status, manager_code, avatar_url")
          .order("role")
          .order("full_name")
          .limit(100);
        contacts = (allUsers as ContactRow[]) || [];
      } else {
        try {
          if (profile?.parent_id) {
            const { data: parentData } = await supabase
              .from("profiles")
              .select("id, full_name, username, role, level, status, manager_code, avatar_url")
              .eq("id", profile.parent_id)
              .single();
            if (parentData) contacts.push(parentData as ContactRow);
          }

          const { data: adminData } = await supabase
            .from("profiles")
            .select("id, full_name, username, role, level, status, manager_code, avatar_url")
            .eq("role", "admin")
            .limit(1);
          if (adminData?.[0]) {
            const admin = adminData[0] as ContactRow;
            if (!contacts.find(c => c.id === admin.id)) contacts.push(admin);
          }

          const { data: descendants } = await supabase.rpc("get_descendants", { p_user_id: uid });
          if (descendants) {
            const desc = (descendants as ContactRow[]).filter(d => d.id !== uid);
            for (const d of desc) {
              if (!contacts.find(c => c.id === d.id)) contacts.push(d);
            }
          }
        } catch {
          const { data: fallback } = await supabase
            .from("profiles")
            .select("id, full_name, username, role, level, status, manager_code, avatar_url")
            .eq("role", "admin")
            .limit(1);
          if (fallback?.[0]) contacts.push(fallback[0] as ContactRow);
        }
      }

      return { conversations, contacts };
    },
    staleTime: 30_000, // Increased from 15s
  });

  // Polling: actualizar conversaciones cada 45s (increased from 25s)
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["conversations-v2", userId] });
    }, 45_000);
    return () => clearInterval(id);
  }, [userId, queryClient]);

  const conversations = data?.conversations || [];
  const contacts = data?.contacts || [];

  return { conversations, contacts, isLoading, error };
}
