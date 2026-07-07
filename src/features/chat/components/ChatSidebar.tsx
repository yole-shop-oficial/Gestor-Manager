"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Globe, User, Users, Shield, Search, X, Loader2,
  Headphones, ChevronRight, Network, Star,
} from "lucide-react";
import type { ConversationWithPreview, ContactRow } from "../hooks/useConversations";

interface ChatSidebarProps {
  conversations: ConversationWithPreview[];
  contacts: ContactRow[];
  activeConvId: string | null;
  onSelect: (id: string) => void;
  onStartChat: (userId: string) => void;
  isLoading: boolean;
  isAdmin: boolean;
  userId: string;
  userRole: string;
  userLevel: number;
}

export function ChatSidebar({
  conversations, contacts, activeConvId, onSelect, onStartChat,
  isLoading, isAdmin, userId, userRole, userLevel,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [showAllContacts, setShowAllContacts] = useState(false);

  const globalConv = conversations.find((c) => c.type === "global");
  const adminConvs = conversations.filter((c) => c.type === "private" && c.other_user_role === "admin");
  const managerConvs = conversations.filter((c) => c.type === "private" && c.other_user_role === "manager");
  const gestorConvs = conversations.filter((c) => c.type === "private" && c.other_user_role === "gestor");

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return [];
    const s = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.id !== userId &&
        (c.full_name?.toLowerCase().includes(s) ||
         c.username?.toLowerCase().includes(s) ||
         c.manager_code?.toLowerCase().includes(s))
    ).slice(0, 20);
  }, [contacts, search, userId]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Chats</h1>
            <p className="text-[10px] text-muted-foreground">Mensajes en tiempo real</p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text" placeholder="Buscar contacto..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full card-filled border border-border/40 rounded-xl py-2 pl-9 pr-8 text-sm outline-none focus:border-primary"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-2.5">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {/* Search Results */}
          <AnimatePresence>
            {search.trim() && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-0.5">
                <SectionLabel>🔍 Resultados ({filteredContacts.length})</SectionLabel>
                {filteredContacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-4 text-center">Sin resultados</p>
                ) : (
                  filteredContacts.map((c) => (
                    <ContactItem key={c.id} contact={c} onClick={() => onStartChat(c.id)} />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* No search: show sections */}
          {!search.trim() && (
            <>
              {/* ⭐ Chat con Admin / Soporte */}
              <SectionLabel>⭐ Soporte</SectionLabel>
              {isAdmin ? (
                adminConvs.length > 0 ? (
                  adminConvs.map((c) => (
                    <ConvItem key={c.id} conv={c} active={activeConvId === c.id} onSelect={onSelect} />
                  ))
                ) : (
                  <p className="text-[10px] text-muted-foreground px-2 py-1">Sin mensajes de soporte</p>
                )
              ) : (
                <ConvItem
                  conv={adminConvs[0] || {
                    id: "__admin__", type: "private" as const, name: "Chat con Admin",
                    last_message_preview: "Habla con el administrador", unread_count: 0,
                    other_user_name: "Administrador", other_user_role: "admin", last_message_at: null,
                    created_by: null, created_at: "",
                  }}
                  active={activeConvId === (adminConvs[0]?.id || "")}
                  onSelect={() => onStartChat("__admin__")}
                  isSpecial
                />
              )}

              {/* 👥 Mis Managers (only for gestores) */}
              {!isAdmin && managerConvs.length > 0 && (
                <>
                  <SectionLabel>👥 Mi Manager</SectionLabel>
                  {managerConvs.map((c) => (
                    <ConvItem key={c.id} conv={c} active={activeConvId === c.id} onSelect={onSelect} />
                  ))}
                </>
              )}

              {/* 👤 Mis Gestores (for managers/admins) */}
              {(isAdmin || gestorConvs.length > 0) && (
                <>
                  <SectionLabel>{isAdmin ? "👤 Gestores" : "👤 Mis Contactos"}</SectionLabel>
                  {gestorConvs.length > 0 ? (
                    gestorConvs.map((c) => (
                      <ConvItem key={c.id} conv={c} active={activeConvId === c.id} onSelect={onSelect} />
                    ))
                  ) : contacts.length > 0 && (
                    // Show contacts without existing conversations
                    <>
                      {contacts.filter(c => c.id !== userId && !gestorConvs.some(g => g.other_user_id === c.id))
                        .slice(0, showAllContacts ? 50 : 5)
                        .map((c) => (
                          <ContactItem key={c.id} contact={c} onClick={() => onStartChat(c.id)} />
                        ))}
                      {contacts.filter(c => c.id !== userId && !gestorConvs.some(g => g.other_user_id === c.id)).length > 5 && (
                        <button onClick={() => setShowAllContacts(!showAllContacts)}
                          className="w-full text-center text-[10px] text-muted-foreground py-1.5 hover:text-primary transition">
                          {showAllContacts ? "Mostrar menos" : `Ver todos (${contacts.length - 1})`}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {/* 🌐 Chat Global */}
              <SectionLabel>🌐 Global</SectionLabel>
              {globalConv ? (
                <ConvItem
                  conv={globalConv} active={activeConvId === globalConv.id}
                  onSelect={onSelect} isGlobal
                />
              ) : (
                <p className="text-[10px] text-muted-foreground px-2 py-1">Chat global no disponible</p>
              )}

              {/* Empty state */}
              {conversations.length === 0 && contacts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/20 mb-3" />
                  <h3 className="text-sm font-semibold mb-1">Sin conversaciones</h3>
                  <p className="text-xs text-muted-foreground">Tus chats aparecerán aquí</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// CONVERSATION ITEM
// ═══════════════════════════════════════════════════

function ConvItem({
  conv, active, onSelect, isGlobal, isSpecial,
}: {
  conv: ConversationWithPreview;
  active: boolean;
  onSelect: (id: string) => void;
  isGlobal?: boolean;
  isSpecial?: boolean;
}) {
  const isAdminConv = conv.other_user_role === "admin";
  const name = isGlobal ? "Chat Global" : isSpecial ? "Chat con Admin" : conv.other_user_name || conv.name || "Chat";
  const gradient = isGlobal
    ? "from-emerald-500 to-teal-600"
    : isAdminConv || isSpecial
    ? "from-rose-500 to-pink-600"
    : conv.other_user_role === "manager"
    ? "from-purple-500 to-indigo-600"
    : "from-blue-500 to-cyan-600";

  const Icon = isGlobal ? Globe : isAdminConv || isSpecial ? Headphones : User;
  const statusColor = conv.other_user_status === "active" ? "bg-green-500"
    : conv.other_user_status === "pending" ? "bg-yellow-500" : "bg-gray-400";

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(isSpecial ? conv.id : conv.id)}
      className={`w-full flex items-center gap-3 p-2.5 rounded-[16px] transition-colors ${
        active ? "bg-primary/10 shadow-sm" : "hover:bg-surface/80"
      }`}
    >
      <div className="relative shrink-0">
        <div className={`w-11 h-11 rounded-[14px] bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {conv.other_user_status && !isGlobal && (
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${statusColor} border-2 border-background`} />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <p className="text-sm font-semibold truncate">{name}</p>
            {conv.other_user_role && !isGlobal && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                conv.other_user_role === "admin" ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                : conv.other_user_role === "manager" ? "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
              }`}>
                {conv.other_user_role === "admin" ? "Admin" : conv.other_user_role === "manager" ? "Mgr" : "Ges"}
              </span>
            )}
          </div>
          {conv.last_message_at && (
            <span className="text-[9px] text-muted-foreground/60 shrink-0 ml-2">
              {formatTime(conv.last_message_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-muted-foreground truncate">{conv.last_message_preview || "Sin mensajes"}</p>
          {(conv.unread_count || 0) > 0 && (
            <span className="ml-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0 px-1">
              {(conv.unread_count || 0) > 9 ? "9+" : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════
// CONTACT ITEM (no conversation yet)
// ═══════════════════════════════════════════════════

function ContactItem({ contact, onClick }: { contact: ContactRow; onClick: () => void }) {
  const gradient = contact.role === "admin"
    ? "from-rose-500 to-pink-600"
    : contact.role === "manager"
    ? "from-purple-500 to-indigo-600"
    : "from-blue-500 to-cyan-600";
  const statusColor = contact.status === "active" ? "bg-green-500"
    : contact.status === "pending" ? "bg-yellow-500" : "bg-gray-400";

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-[16px] hover:bg-surface/80 transition-colors"
    >
      <div className="relative shrink-0">
        <div className={`w-10 h-10 rounded-[13px] bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
          {(contact.full_name || "?")[0]}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusColor} border-2 border-background`} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{contact.full_name}</p>
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
            contact.role === "admin" ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
            : contact.role === "manager" ? "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
            : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
          }`}>
            {contact.role === "admin" ? "Admin" : contact.role === "manager" ? "Mgr" : "Ges"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">@{contact.username} · Nivel {contact.level}</p>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-3 pb-1">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{children}</span>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return d.toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit" });
}
