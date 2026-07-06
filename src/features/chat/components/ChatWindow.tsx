"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Loader2,
  User,
  ArrowLeft,
  Globe,
  Headphones,
  MessageCircle,
  ChevronUp,
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
  /** Fetch older messages (cursor pagination) */
  fetchOlder: () => void;
  /** Whether there are older messages to load */
  hasOlder: boolean;
  /** Whether older messages are currently loading */
  fetchingOlder: boolean;
}

export function ChatWindow({
  conversation,
  messages,
  onSend,
  onBack,
  sending,
  spamError,
  isLoading,
  userId,
  profile,
  fetchOlder,
  hasOlder,
  fetchingOlder,
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // Auto-scroll to bottom only when NEW messages arrive (not when loading older)
  useEffect(() => {
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    // Only auto-scroll if messages were added at the END (new message, not older loaded)
    if (currentCount > prevCount && !fetchingOlder) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    prevMessageCountRef.current = currentCount;
  }, [messages.length, fetchingOlder]);

  // Detect scroll to top → load older messages
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !hasOlder || fetchingOlder) return;

    // If scrolled near the top (within 100px)
    if (el.scrollTop < 100) {
      fetchOlder();
    }
  }, [hasOlder, fetchingOlder, fetchOlder]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSend(newMessage.trim());
    setNewMessage("");
  };

  // Determine conversation display info
  const isGlobal = conversation?.type === "global";
  const convName = isGlobal
    ? "Chat Global"
    : conversation?.other_user_name || "Chat privado";
  const convIcon = isGlobal ? (
    <Globe className="w-5 h-5 text-white" />
  ) : (
    <Headphones className="w-5 h-5 text-white" />
  );
  const convGradient = isGlobal
    ? "from-emerald-500 to-teal-600"
    : "from-pink-500 to-rose-500";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-2 rounded-2xl card-filled"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div className={`w-9 h-9 rounded-[12px] bg-gradient-to-br ${convGradient} flex items-center justify-center shadow-lg`}>
          {convIcon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold truncate">{convName}</h2>
          <p className="text-[10px] text-muted-foreground">
            {isGlobal ? "Todos los gestores y admin" : "Comunicación directa"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {/* Load older button at top */}
        {hasOlder && (
          <div className="flex justify-center py-2">
            <button
              onClick={fetchOlder}
              disabled={fetchingOlder}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-muted-foreground card-filled disabled:opacity-50"
            >
              {fetchingOlder ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
              {fetchingOlder ? "Cargando..." : "Cargar mensajes anteriores"}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-semibold mb-1">Sin mensajes</h3>
            <p className="text-sm text-muted-foreground">
              {isGlobal
                ? "Sé el primero en escribir en el chat global"
                : "Escribe un mensaje para iniciar la conversación"}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === userId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-[18px] px-4 py-2.5 ${
                    isMine
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm"
                      : "card-filled rounded-bl-sm"
                  }`}
                >
                  {!isMine && isGlobal && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground">Gestor</span>
                    </div>
                  )}
                  {!isMine && !isGlobal && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground">Admin</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.body}</p>
                  <p
                    className={`text-[9px] mt-1 ${
                      isMine ? "text-white/50" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("es-CU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Spam error toast */}
      {spamError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-2 p-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-center"
        >
          <p className="text-xs font-medium text-red-700 dark:text-red-400">{spamError}</p>
        </motion.div>
      )}

      {/* Composer */}
      <div className="px-4 py-3 border-t border-border/40 surface-blur safe-bottom">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              if (e.target.value.length <= 300) {
                setNewMessage(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isGlobal ? "Escribe en el chat global..." : "Escribe un mensaje..."}
            maxLength={300}
            className="flex-1 card-filled rounded-2xl px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
        {newMessage.length > 250 && (
          <p className="text-[10px] text-muted-foreground text-right mt-1">
            {newMessage.length}/300
          </p>
        )}
      </div>
    </div>
  );
}
