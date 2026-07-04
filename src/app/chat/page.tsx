"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSupabaseUser } from "@/features/auth/hooks/useSupabaseUser";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { useState, useEffect, useCallback, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
  const { user, client, project } = useSupabaseUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadChat = useCallback(async () => {
    if (!user || !project) {
      setLoading(false);
      return;
    }

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .limit(1)
        .single();

      if (adminProfile) {
        setAdminId(adminProfile.id);

        const { data, error } = await supabase
          .from("messages")
          .select("id, sender_id, recipient_id, body, read_at, created_at")
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${adminProfile.id}),and(sender_id.eq.${adminProfile.id},recipient_id.eq.${user.id})`)
          .order("created_at", { ascending: true })
          .limit(100);

        if (error) {
          console.error("[CHAT] Error cargando mensajes:", error.message);
        } else if (data) {
          setMessages(data as Message[]);
        }
      }
    } catch (err) {
      console.error("[CHAT] Excepción:", err);
    } finally {
      setLoading(false);
    }
  }, [user, client, project]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  // ─── Real-time subscription para mensajes nuevos ───
  useEffect(() => {
    if (!user || !client || !project) return;

    const config = getProjectConfig(project);
    const supabase = client || createLoginClient(config);

    // Suscribirse a INSERT en messages donde el usuario es remitente o destinatario
    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Evitar duplicados si el mensaje ya fue añadido por handleSend
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        console.log("[CHAT] Realtime status:", status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, client, project]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !adminId || !project) return;

    setSending(true);
    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const { data, error } = await supabase
        .from("messages")
        .insert([{ sender_id: user.id, recipient_id: adminId, body: newMessage.trim() }])
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .single();

      if (error) {
        console.error("[CHAT] Error enviando mensaje:", error.message);
      } else if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data as Message];
        });
        setNewMessage("");
      }
    } catch (err) {
      console.error("[CHAT] Excepción enviando:", err);
    } finally {
      setSending(false);
    }
  };

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
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-semibold mb-1">Sin mensajes</h3>
            <p className="text-sm text-muted-foreground">Escribe un mensaje para iniciar la conversación con administración.</p>
          </motion.div>
        ) : (
          messages.map((msg, i) => {
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
