"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, User, ArrowLeft, Globe, Headphones, MessageCircle, ChevronUp, Shield, Users,
} from "lucide-react";
import type { ConversationWithPreview } from "../hooks/useConversations";
import type { ChatMessage } from "../types";
import type { UserProfile } from "@/hooks";

interface ChatWindowProps {
  conversation: ConversationWithPreview | null;
  messages: ChatMessage[];
  onSend: (body: string) => void;
  onBack: () => void;
  sending: boolean;
  spamError: string | null;
  isLoading: boolean;
  userId: string;
  profile: UserProfile | null;
  fetchOlder: () => void;
  hasOlder: boolean;
  fetchingOlder: boolean;
}

export function ChatWindow({
  conversation, messages, onSend, onBack, sending, spamError, isLoading,
  userId, profile, fetchOlder, hasOlder, fetchingOlder,
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);

  // Auto-scroll only when new messages arrive (not when loading older)
  useEffect(() => {
    const currentCount = messages.length;
    if (currentCount > prevCountRef.current && shouldAutoScrollRef.current && !fetchingOlder) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    prevCountRef.current = currentCount;
    shouldAutoScrollRef.current = true;
  }, [messages.length, fetchingOlder]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !hasOlder || fetchingOlder) return;
    if (el.scrollTop < 80) {
      shouldAutoScrollRef.current = false;
      fetchOlder();
    }
  }, [hasOlder, fetchingOlder, fetchOlder]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSend(newMessage.trim());
    setNewMessage("");
    shouldAutoScrollRef.current = true;
  };

  const isGlobal = conversation?.type === "global";
  const convName = isGlobal ? "Chat Global" : conversation?.other_user_name || conversation?.name || "Chat";
  const otherRole = conversation?.other_user_role;
  const gradient = isGlobal
    ? "from-emerald-500 to-teal-600"
    : otherRole === "admin"
    ? "from-rose-500 to-pink-600"
    : otherRole === "manager"
    ? "from-purple-500 to-indigo-600"
    : "from-blue-500 to-cyan-600";
  const Icon = isGlobal ? Globe : otherRole === "admin" ? Shield : otherRole === "manager" ? Users : User;

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: ChatMessage[] }[] = [];
    let currentDate = "";
    for (const msg of messages) {
      const d = new Date(msg.created_at).toLocaleDateString("es-CU", { weekday: "long", day: "numeric", month: "long" });
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, msgs: [] });
      }
      groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 shrink-0">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
          className="p-2 rounded-2xl card-filled">
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div className={`w-9 h-9 rounded-[12px] bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold truncate">{convName}</h2>
            {otherRole && !isGlobal && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                otherRole === "admin" ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                : otherRole === "manager" ? "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
              }`}>
                {otherRole === "admin" ? "Admin" : otherRole === "manager" ? "Manager" : "Gestor"}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isGlobal ? "Todos los miembros · Comunidad YOLE SHOP" : "Chat privado · Mensajes directos"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        
        {hasOlder && (
          <div className="flex justify-center py-1">
            <button onClick={fetchOlder} disabled={fetchingOlder}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-muted-foreground card-filled disabled:opacity-50">
              {fetchingOlder ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronUp className="w-3 h-3" />}
              {fetchingOlder ? "Cargando..." : "Ver anteriores"}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <h3 className="text-base font-semibold mb-1">Sin mensajes aún</h3>
            <p className="text-sm text-muted-foreground">
              {isGlobal ? "Sé el primero en escribir" : "Envía un mensaje para comenzar"}
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date} className="space-y-2">
              {/* Date separator */}
              <div className="flex justify-center">
                <span className="text-[10px] text-muted-foreground/60 bg-surface/50 px-3 py-1 rounded-full font-medium">
                  {group.date}
                </span>
              </div>
              {/* Messages */}
              {group.msgs.map((msg, i) => {
                const isMine = msg.sender_id === userId;
                const showAvatar = !isMine && (i === 0 || group.msgs[i - 1].sender_id !== msg.sender_id);
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                    className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    {/* Avatar for other person */}
                    {showAvatar && (
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${isMine ? "" : otherRole === "admin" ? "from-rose-500 to-pink-600" : otherRole === "manager" ? "from-purple-500 to-indigo-600" : "from-blue-500 to-cyan-600"} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                        {(convName || "?")[0]}
                      </div>
                    )}
                    {!showAvatar && !isMine && <div className="w-7 shrink-0" />}
                    
                    <div className={`max-w-[75%] space-y-0.5 ${isMine ? "items-end" : "items-start"}`}>
                      {showAvatar && (
                        <span className="text-[10px] text-muted-foreground px-1 font-semibold">
                          {convName}
                        </span>
                      )}
                      <div className={`rounded-[18px] px-4 py-2.5 ${
                        isMine
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm"
                          : "card-filled rounded-bl-sm"
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                      </div>
                      <span className={`text-[9px] ${isMine ? "text-muted-foreground/50 text-right" : "text-muted-foreground/50"} block px-1`}>
                        {new Date(msg.created_at).toLocaleTimeString("es-CU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Spam error */}
      <AnimatePresence>
        {spamError && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="mx-4 mb-1 p-2.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-center">
            <p className="text-xs font-medium text-red-700 dark:text-red-400">{spamError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="px-3 py-2 border-t border-border/40 surface-blur safe-bottom shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => { if (e.target.value.length <= 300) setNewMessage(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
            placeholder={isGlobal ? "Mensaje al chat global..." : "Escribe un mensaje..."}
            maxLength={300}
            className="flex-1 card-filled rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
          />
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md disabled:opacity-40 shrink-0">
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </motion.button>
        </div>
        {newMessage.length > 240 && (
          <p className={`text-[10px] text-right mt-1 ${newMessage.length >= 290 ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
            {newMessage.length}/300
          </p>
        )}
      </div>
    </div>
  );
}
