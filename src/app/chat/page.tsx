"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSession, useSupabaseQuery, invalidate, useRealtime } from "@/hooks";
import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import {
  MessageCircle,
  Send,
  Loader2,
  User,
  Headphones,
} from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface ChatData {
  messages: Message[];
  adminId: string | null;
}

export default function ChatPage() {
  return (
    <AuthGate>
      <MainLayout>
        <ChatContent />
      </MainLayout>
    </AuthGate>
  );
}

function ChatContent() {
  const { user, client, project } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const { data: chatData, isLoading, error: chatError } = useSupabaseQuery<ChatData>({
    key: ["chat", userId],
    queryFn: async (supabase, uid) => {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .limit(1)
        .single();

      const adminId = adminProfile?.id ?? null;
      let messages: Message[] = [];

      if (adminId) {
        const { data, error } = await supabase
          .from("messages")
          .select("id, sender_id, recipient_id, body, read_at, created_at")
          .or(`and(sender_id.eq.${uid},recipient_id.eq.${adminId}),and(sender_id.eq.${adminId},recipient_id.eq.${uid})`)
          .order("created_at", { ascending: true })
          .limit(100);

        if (!error && data) {
          messages = data as Message[];
        }
      }

      return { messages, adminId };
    },
    staleTime: 0, // siempre fresh
  });

  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Single realtime channel for chat (INSERT only, filtered by user) ───
  useRealtime({
    channel: `chat-msgs-${userId}`,
    table: "messages",
    filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`,
    event: "INSERT",
    onEvent: () => {
      // Invalidate chat cache → React Query refetches
      invalidate.chat(queryClient, userId);
      // Clear optimistic messages since server now has them
      setOptimisticMessages([]);
    },
    enabled: !!userId && !!client, // Only when on this page (component is mounted)
  });

  // Combine server + optimistic messages
  const serverMessages = chatData?.messages || [];
  const adminId = chatData?.adminId ?? null;
  const allMessages = [...serverMessages, ...optimisticMessages.filter(
    (om) => !serverMessages.some((sm) => sm.id === om.id)
  )];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !adminId || !project) return;

    const body = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic message
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      recipient_id: adminId,
      body,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const { error } = await supabase
        .from("messages")
        .insert([{ sender_id: user.id, recipient_id: adminId, body }])
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .single();

      if (error) {
        console.error("[CHAT] Error enviando mensaje:", error.message);
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setNewMessage(body);
      }
    } catch (err) {
      console.error("[CHAT] Excepción enviando:", err);
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setNewMessage(body);
    } finally {
      setSending(false);
    }
  };

  // Error visible en UI
  if (chatError) {
    return (
      <div className="p-6 pb-24">
        <div className="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-6 text-center">
          <p className="text-sm font-bold text-red-700 dark:text-red-400">Error cargando chat</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{chatError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Chat con Admin</h1>
            <p className="text-xs text-muted-foreground">Comunicación directa · Mensajes en tiempo real</p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-6 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : allMessages.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-semibold mb-1">Sin mensajes</h3>
            <p className="text-sm text-muted-foreground">Escribe un mensaje para iniciar la conversación con administración.</p>
          </motion.div>
        ) : (
          allMessages.map((msg, i) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-[18px] px-4 py-2.5 ${isMine ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm" : "card-filled rounded-bl-sm"}`}>
                  {!isMine && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground">Admin</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.body}</p>
                  <p className={`text-[9px] mt-1 ${isMine ? "text-white/50" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("es-CU", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 border-t border-border/40 surface-blur safe-bottom">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escribe un mensaje..."
            className="flex-1 card-filled rounded-2xl px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
