"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Phone, Mail, MapPin, CreditCard, Calendar, User, Shield,
  Package, Wallet, TrendingUp, Network, Hash, Eye, Loader2,
} from "lucide-react";
import { useSession, useSupabaseQuery } from "@/hooks";
import { getCrossProjectP2Client } from "@/services/supabase/crossProjectAdmin";
import { StatusBadge } from "@/components/shared";
import { useState } from "react";

// ============================================================
// USER PROFILE MODAL — Muestra TODOS los datos de un usuario
// ============================================================
// Se usa desde el árbol comercial, la lista de gestores del
// admin, etc. Detecta automáticamente en qué proyecto está el
// usuario y carga sus datos completos.
// ============================================================

interface UserProfileModalProps {
  userId: string | null;
  assignedProject?: number; // pista: en qué proyecto buscar (1 o 2)
  onClose: () => void;
}

interface FullProfile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  phone: string;
  age: number | null;
  birth_date: string | null;
  gender: string | null;
  id_card: string;
  address: string;
  bank_card_number: string;
  bank_card_holder: string;
  role: string;
  status: string;
  manager_code: string;
  parent_id: string | null;
  level: number;
  children_count: number;
  total_network_size: number;
  join_date: string;
  assigned_project: number;
  has_sales_experience: boolean;
  last_seen_at: string | null;
  observations: string | null;
  // stats calculadas
  total_orders?: number;
  total_commission?: number;
}

export function UserProfileModal({ userId, assignedProject, onClose }: UserProfileModalProps) {
  const { client } = useSession();

  const { data: profile, isLoading } = useSupabaseQuery<FullProfile | null>({
    key: ["user-profile-modal", userId || "none"],
    queryFn: async (supabase, _uid) => {
      if (!userId) return null;

      // Determinar qué cliente usar: P2 si el usuario es de P2
      let queryClient = supabase;
      if (assignedProject === 2) {
        const p2 = await getCrossProjectP2Client();
        if (p2) queryClient = p2;
      }

      // Cargar perfil completo
      const { data: profileData } = await queryClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!profileData) return null;

      // Cargar stats (pedidos + comisiones)
      const [ordersRes, walletRes] = await Promise.all([
        queryClient.from("orders").select("status", { count: "exact", head: true }).eq("manager_id", userId),
        queryClient.from("wallet_entries").select("amount, entry_type").eq("manager_id", userId),
      ]);

      const totalOrders = ordersRes.count || 0;
      const totalCommission = (walletRes.data || [])
        .filter((w: any) => w.entry_type === "commission")
        .reduce((s: number, w: any) => s + Number(w.amount), 0);

      return {
        ...(profileData as FullProfile),
        total_orders: totalOrders,
        total_commission: totalCommission,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  return (
    <AnimatePresence>
      {userId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-[210] max-h-[90vh] overflow-y-auto rounded-t-[28px] bg-background border-t border-border shadow-2xl"
          >
            {/* Handle bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-lg pt-3 pb-2 px-5 border-b border-border/50">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Perfil completo</h2>
                <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-accent transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-5 pb-8 pt-4 space-y-5">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : profile ? (
                <>
                  {/* Header con avatar */}
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center text-white font-bold text-2xl shrink-0 ${
                      profile.role === "admin" ? "bg-gradient-to-br from-rose-500 to-pink-600" :
                      "bg-gradient-to-br from-indigo-500 to-purple-600"
                    }`}>
                      {(profile.full_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-bold truncate">{profile.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={profile.status as any} size="sm" />
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          profile.assigned_project === 2
                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                            : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        }`}>Proyecto {profile.assigned_project}</span>
                        {profile.role === "admin" && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">ADMIN</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats rápidas */}
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox icon={Package} label="Pedidos" value={profile.total_orders ?? 0} color="from-blue-500 to-cyan-500" />
                    <StatBox icon={TrendingUp} label="Comisión" value={`$${(profile.total_commission ?? 0).toFixed(0)}`} color="from-violet-500 to-purple-500" />
                    <StatBox icon={Network} label="Subgestores" value={profile.children_count ?? 0} color="from-orange-500 to-red-500" />
                  </div>

                  {/* Datos personales */}
                  <Section title="Datos personales">
                    <InfoRow icon={Mail} label="Correo" value={profile.email} />
                    <InfoRow icon={Phone} label="Teléfono" value={profile.phone ? `+53 ${profile.phone.replace(/^\+53/, "").trim()}` : "—"} />
                    <InfoRow icon={Calendar} label="Edad" value={profile.age ? `${profile.age} años` : "—"} />
                    <InfoRow icon={Calendar} label="Nacimiento" value={profile.birth_date || "—"} />
                    <InfoRow icon={User} label="Género" value={
                      profile.gender === "male" ? "Masculino" :
                      profile.gender === "female" ? "Femenino" :
                      profile.gender === "other" ? "Otro" : "—"
                    } />
                    <InfoRow icon={Hash} label="Carnet" value={profile.id_card || "—"} />
                    <InfoRow icon={MapPin} label="Dirección" value={profile.address || "—"} />
                  </Section>

                  {/* Datos bancarios */}
                  <Section title="Datos bancarios">
                    <InfoRow icon={CreditCard} label="Tarjeta" value={profile.bank_card_number || "—"} />
                    <InfoRow icon={User} label="Titular" value={profile.bank_card_holder || "—"} />
                  </Section>

                  {/* Datos de red */}
                  <Section title="Red comercial">
                    <InfoRow icon={Hash} label="Código" value={profile.manager_code || "—"} />
                    <InfoRow icon={Network} label="Nivel" value={String(profile.level ?? 0)} />
                    <InfoRow icon={Users2} label="Red total" value={String(profile.total_network_size ?? 0)} />
                    <InfoRow icon={Calendar} label="Fecha ingreso" value={profile.join_date || "—"} />
                  </Section>

                  {/* Observaciones */}
                  {profile.observations && (
                    <Section title="Observaciones">
                      <p className="text-sm text-muted-foreground bg-surface/50 rounded-xl p-3">{profile.observations}</p>
                    </Section>
                  )}

                  {/* Última conexión */}
                  {profile.last_seen_at && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Última conexión: {new Date(profile.last_seen_at).toLocaleString("es-CU")}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <p className="text-sm text-muted-foreground">No se encontraron datos de este usuario.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Helpers ───

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="card-filled rounded-2xl p-3 text-center">
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg mx-auto mb-1.5`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-lg font-extrabold leading-none">{value}</p>
      <p className="text-[9px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1">{title}</h3>
      <div className="card-filled rounded-2xl divide-y divide-border/30 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1 text-right break-all">{value}</span>
    </div>
  );
}

function Users2({ className }: { className?: string }) {
  return <Network className={className} />;
}
