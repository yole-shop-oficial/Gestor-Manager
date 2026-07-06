"use client";

import { motion } from "framer-motion";
import {
  MessageCircle,
  Globe,
  Headphones,
  Loader2,
  User,
  ChevronRight,
} from "lucide-react";
import type { ConversationWithPreview } from "../hooks/useConversations";

interface ChatSidebarProps {
  conversations: ConversationWithPreview[];
  activeConvId: string | null;
  onSelect: (id: string) => void;
  onOpenAdminChat: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  userId: string;
}

export function ChatSidebar({
  conversations,
  activeConvId,
  onSelect,
  onOpenAdminChat,
  isLoading,
  isAdmin,
  userId,
}: ChatSidebarProps) {
  const globalConv = conversations.find((c) => c.type === "global");
  const privateConvs = conversations.filter((c) => c.type === "private");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Chat</h1>
            <p className="text-xs text-muted-foreground">Conversaciones en tiempo real</p>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 space-y-1">
          {/* Chat Global */}
          {globalConv && (
            <ConvItem
              name="Chat Global"
              preview={globalConv.last_message_preview || "Conversación para todos"}
              icon={<Globe className="w-5 h-5 text-white" />}
              gradient="from-emerald-500 to-teal-600"
              unread={globalConv.unread_count || 0}
              active={activeConvId === globalConv.id}
              onClick={() => onSelect(globalConv.id)}
            />
          )}

          {/* Chat con Admin (for gestores) */}
          {!isAdmin && (
            <ConvItem
              name="Chat con Admin"
              preview={privateConvs.length > 0 ? privateConvs[0].last_message_preview || "Soporte directo" : "Soporte directo"}
              icon={<Headphones className="w-5 h-5 text-white" />}
              gradient="from-pink-500 to-rose-500"
              unread={privateConvs.length > 0 ? privateConvs[0].unread_count || 0 : 0}
              active={activeConvId === privateConvs[0]?.id}
              onClick={onOpenAdminChat}
            />
          )}

          {/* Conversaciones privadas (si hay varias) */}
          {privateConvs.length > 1 && (
            <>
              <div className="px-2 pt-3 pb-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Conversaciones</span>
              </div>
              {privateConvs.map((conv) => (
                <ConvItem
                  key={conv.id}
                  name={conv.other_user_name || "Privado"}
                  preview={conv.last_message_preview || ""}
                  icon={<User className="w-5 h-5 text-white" />}
                  gradient="from-indigo-500 to-purple-600"
                  unread={conv.unread_count || 0}
                  active={activeConvId === conv.id}
                  onClick={() => onSelect(conv.id)}
                />
              ))}
            </>
          )}

          {/* Empty state */}
          {conversations.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-base font-semibold mb-1">Sin conversaciones</h3>
              <p className="text-sm text-muted-foreground">Inicia un chat para comunicarte</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConvItem({
  name,
  preview,
  icon,
  gradient,
  unread,
  active,
  onClick,
}: {
  name: string;
  preview: string;
  icon: React.ReactNode;
  gradient: string;
  unread: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-[18px] transition-colors ${
        active ? "bg-primary/10" : "hover:bg-surface"
      }`}
    >
      <div className={`w-11 h-11 rounded-[14px] bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold truncate">{name}</p>
          {unread > 0 && (
            <span className="ml-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0 px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{preview}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </motion.button>
  );
}
