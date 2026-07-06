"use client";

import { useState, useCallback } from "react";
import { useSession } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { useConversations } from "../hooks/useConversations";
import { useMessages } from "../hooks/useMessages";
import { checkSpam, recordMessage } from "../anti-spam";
import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import type { ChatMessage } from "../types";

export function ChatLayout() {
  const { user, client, project, profile, isAdmin } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const { conversations, isLoading: convsLoading } = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { messages, isLoading: msgsLoading, fetchOlder, hasOlder, fetchingOlder } = useMessages(activeConvId);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // ─── Find or create private conversation with admin ───
  const findOrCreatePrivateConv = useCallback(async (otherUserId: string) => {
    if (!client || !project || !user) return null;

    const config = getProjectConfig(project);
    const supabase = client || createLoginClient(config);

    // Check if conversation already exists
    const { data: existingMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId);

    if (existingMemberships && existingMemberships.length > 0) {
      const convIds = existingMemberships.map((m) => m.conversation_id);

      // Check which conversation also has the other user
      for (const convId of convIds) {
        const { data: otherMember } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("conversation_id", convId)
          .eq("user_id", otherUserId)
          .limit(1);

        if (otherMember && otherMember.length > 0) {
          // Check it's a private conversation
          const { data: conv } = await supabase
            .from("conversations")
            .select("id, type")
            .eq("id", convId)
            .single();

          if (conv && conv.type === "private") {
            return conv.id;
          }
        }
      }
    }

    // Create new conversation
    const { data: newConv, error: convErr } = await supabase
      .from("conversations")
      .insert([{ type: "private", created_by: userId }])
      .select("id")
      .single();

    if (convErr || !newConv) return null;

    // Add both members
    await supabase.from("conversation_members").insert([
      { conversation_id: newConv.id, user_id: userId },
      { conversation_id: newConv.id, user_id: otherUserId },
    ]);

    // Invalidate conversations cache
    queryClient.invalidateQueries({ queryKey: ["conversations", userId] });

    return newConv.id;
  }, [client, project, user, userId, queryClient]);

  // ─── Send message ───
  const [sending, setSending] = useState(false);
  const [spamError, setSpamError] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

  const sendMessage = useCallback(async (body: string, conversationId: string) => {
    if (!user || !client || !project) return;
    if (!body.trim()) return;

    // Anti-spam check (stricter for global chat)
    const conv = conversations.find((c) => c.id === conversationId);
    const spamCheck = checkSpam(userId, body.trim());
    if (!spamCheck.allowed) {
      setSpamError(spamCheck.reason || "Espera antes de enviar");
      setTimeout(() => setSpamError(null), 3000);
      return;
    }

    setSpamError(null);
    setSending(true);

    // Optimistic message
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      recipient_id: "", // Will be filled by server
      body: body.trim(),
      read_at: null,
      created_at: new Date().toISOString(),
      conversation_id: conversationId,
    };
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      // For private chats without conversation_id on messages, use old format
      // For conversations, use conversation_id
      const insertData: Record<string, unknown> = {
        sender_id: user.id,
        body: body.trim(),
        conversation_id: conversationId,
      };

      // If private conv without recipient_id, find it
      if (conv?.type === "private") {
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", user.id)
          .limit(1);

        if (members && members.length > 0) {
          insertData.recipient_id = members[0].user_id;
        }
      } else {
        // For global/group, recipient_id = sender_id (self, since it's a group)
        insertData.recipient_id = user.id;
      }

      const { error } = await supabase
        .from("messages")
        .insert([insertData]);

      if (error) {
        console.error("[CHAT] Error sending:", error.message);
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      } else {
        recordMessage(userId, body.trim());
        setOptimisticMessages([]);
      }
    } catch (err) {
      console.error("[CHAT] Exception:", err);
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  }, [user, client, project, userId, conversations]);

  // ─── Auto-open admin chat for gestors ───
  const openAdminChat = useCallback(async () => {
    if (!profile) return;

    // Find existing private conv with admin
    const adminConv = conversations.find((c) => c.type === "private");
    if (adminConv) {
      setActiveConvId(adminConv.id);
      return;
    }

    // Need to find admin ID and create conversation
    if (!client || !project) return;
    const config = getProjectConfig(project);
    const supabase = client || createLoginClient(config);

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (adminProfile) {
      const convId = await findOrCreatePrivateConv(adminProfile.id);
      if (convId) setActiveConvId(convId);
    }
  }, [profile, conversations, client, project, findOrCreatePrivateConv]);

  // Combine server + optimistic messages
  const allMessages = [
    ...messages,
    ...optimisticMessages.filter(
      (om) => !messages.some((sm) => sm.id === om.id)
    ),
  ];

  // Mobile: show sidebar when no conversation, window when active
  // Desktop: show both
  const showSidebar = !activeConvId;
  const showWindow = !!activeConvId;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {showSidebar && (
        <ChatSidebar
          conversations={conversations}
          activeConvId={activeConvId}
          onSelect={setActiveConvId}
          onOpenAdminChat={openAdminChat}
          isLoading={convsLoading}
          isAdmin={isAdmin}
          userId={userId}
        />
      )}
      {showWindow && activeConvId && (
        <ChatWindow
          conversation={activeConv || null}
          messages={allMessages}
          onSend={(body) => sendMessage(body, activeConvId)}
          onBack={() => setActiveConvId(null)}
          sending={sending}
          spamError={spamError}
          isLoading={msgsLoading}
          userId={userId}
          profile={profile}
          fetchOlder={fetchOlder}
          hasOlder={hasOlder}
          fetchingOlder={fetchingOlder}
        />
      )}
    </div>
  );
}
