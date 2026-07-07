"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { useConversations } from "../hooks/useConversations";
import { useMessages } from "../hooks/useMessages";
import { checkSpam, recordMessage } from "../anti-spam";
import { sanitizeMessage, containsDangerousContent } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import type { ChatMessage } from "../types";

const GLOBAL_CONV_ID = "00000000-0000-0000-0000-000000000001";

export function ChatLayout() {
  const { user, client, project, profile, isAdmin } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const userRole = profile?.role || "gestor";
  const userLevel = profile?.level || 0;

  const { conversations, contacts, isLoading: convsLoading } = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { messages, isLoading: msgsLoading, fetchOlder, hasOlder, fetchingOlder } = useMessages(activeConvId);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // ─── Create or find private conversation ───
  const ensurePrivateConv = useCallback(async (otherUserId: string) => {
    if (!client || !project || !user) return null;

    // Special: "__admin__" → find the actual admin
    let targetId = otherUserId;
    if (otherUserId === "__admin__") {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);
      const { data: adminProfile } = await supabase
        .from("profiles").select("id").eq("role", "admin").limit(1).single();
      if (!adminProfile) return null;
      targetId = adminProfile.id;
    }

    // Check existing private conversation
    const supabase = client || createLoginClient(getProjectConfig(project));

    const { data: myMemberships } = await supabase
      .from("conversation_members").select("conversation_id").eq("user_id", userId);

    if (myMemberships) {
      for (const m of myMemberships) {
        const { data: otherMember } = await supabase
          .from("conversation_members")
          .select("conversation_id").eq("conversation_id", m.conversation_id).eq("user_id", targetId).limit(1);
        if (otherMember?.length) {
          const { data: conv } = await supabase
            .from("conversations").select("id, type").eq("id", m.conversation_id).single();
          if (conv?.type === "private") return conv.id;
        }
      }
    }

    // Create new private conversation
    const { data: newConv } = await supabase
      .from("conversations").insert([{ type: "private", created_by: userId }]).select("id").single();
    if (!newConv) return null;

    await supabase.from("conversation_members").insert([
      { conversation_id: newConv.id, user_id: userId },
      { conversation_id: newConv.id, user_id: targetId },
    ]);

    queryClient.invalidateQueries({ queryKey: ["conversations-v2", userId] });
    return newConv.id;
  }, [client, project, user, userId, queryClient]);

  // ─── Open chat with a contact ───
  const startChatWith = useCallback(async (otherUserId: string) => {
    if (otherUserId === GLOBAL_CONV_ID) {
      setActiveConvId(GLOBAL_CONV_ID);
      return;
    }

    // Check if global chat
    const globalConv = conversations.find(c => c.type === "global");
    if (otherUserId === "__global__" && globalConv) {
      setActiveConvId(globalConv.id);
      return;
    }

    const convId = await ensurePrivateConv(otherUserId);
    if (convId) setActiveConvId(convId);
  }, [conversations, ensurePrivateConv]);

  // ─── Auto-ensure global conversation exists ───
  useEffect(() => {
    if (!client || !project || !userId) return;
    if (conversations.find(c => c.type === "global")) return;

    (async () => {
      const supabase = client || createLoginClient(getProjectConfig(project));
      const { data: global } = await supabase
        .from("conversations").select("id").eq("id", GLOBAL_CONV_ID).single();
      if (!global) {
        // Create global chat if doesn't exist
        await supabase.from("conversations").insert([{
          id: GLOBAL_CONV_ID, type: "global", name: "Chat Global", created_by: userId
        }]);
      }
      // Add current user to global chat
      const { data: member } = await supabase
        .from("conversation_members")
        .select("conversation_id").eq("conversation_id", GLOBAL_CONV_ID).eq("user_id", userId).limit(1);
      if (!member?.length) {
        await supabase.from("conversation_members").insert([{
          conversation_id: GLOBAL_CONV_ID, user_id: userId
        }]);
      }
      queryClient.invalidateQueries({ queryKey: ["conversations-v2", userId] });
    })();
  }, [client, project, userId, conversations, queryClient]);

  // ─── Send message ───
  const [sending, setSending] = useState(false);
  const [spamError, setSpamError] = useState<string | null>(null);

  const sendMessage = useCallback(async (body: string) => {
    if (!user || !client || !project || !activeConvId) return;
    if (!body.trim()) return;

    const spamCheck = checkSpam(userId, body.trim());
    if (!spamCheck.allowed) {
      setSpamError(spamCheck.reason || "Espera antes de enviar");
      setTimeout(() => setSpamError(null), 3000);
      return;
    }

    const sanitizedBody = sanitizeMessage(body.trim());
    if (containsDangerousContent(body.trim())) {
      setSpamError("El mensaje contiene contenido no permitido");
      setTimeout(() => setSpamError(null), 3000);
      return;
    }

    setSpamError(null);
    setSending(true);

    try {
      const supabase = client || createLoginClient(getProjectConfig(project));

      const insertData: Record<string, unknown> = {
        sender_id: user.id,
        body: sanitizedBody,
        conversation_id: activeConvId,
      };

      // Find recipient for private conversations
      const conv = conversations.find(c => c.id === activeConvId);
      if (conv?.type === "private") {
        const { data: members } = await supabase
          .from("conversation_members").select("user_id")
          .eq("conversation_id", activeConvId).neq("user_id", user.id).limit(1);
        insertData.recipient_id = members?.[0]?.user_id || user.id;
      } else {
        insertData.recipient_id = user.id;
      }

      const { error } = await supabase.from("messages").insert([insertData]);

      if (!error) {
        recordMessage(userId, sanitizedBody);
        // Update conversation last_message
        await supabase.from("conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: sanitizedBody.slice(0, 100),
        }).eq("id", activeConvId);
        queryClient.invalidateQueries({ queryKey: ["messages", activeConvId] });
        queryClient.invalidateQueries({ queryKey: ["conversations-v2", userId] });
      } else {
        logger.error("chat_send_failed", { conversationId: activeConvId, error: error.message });
      }
    } catch (err: any) {
      logger.error("chat_send_exception", { conversationId: activeConvId, error: err?.message || String(err) });
    } finally {
      setSending(false);
    }
  }, [user, client, project, userId, activeConvId, conversations, queryClient]);

  // Mobile: toggle between sidebar and window
  const showSidebar = !activeConvId;
  const showWindow = !!activeConvId;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <AnimatePresence mode="wait">
        {showSidebar && (
          <motion.div key="sidebar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="h-full">
            <ChatSidebar
              conversations={conversations}
              contacts={contacts}
              activeConvId={activeConvId}
              onSelect={setActiveConvId}
              onStartChat={startChatWith}
              isLoading={convsLoading}
              isAdmin={isAdmin}
              userId={userId}
              userRole={userRole}
              userLevel={userLevel}
            />
          </motion.div>
        )}
        {showWindow && activeConvId && (
          <motion.div key="window" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="h-full">
            <ChatWindow
              conversation={activeConv || null}
              messages={messages}
              onSend={sendMessage}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
