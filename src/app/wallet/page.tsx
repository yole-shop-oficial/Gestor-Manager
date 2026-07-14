"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSession, useSupabaseQuery, invalidate } from "@/hooks";
import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { EmptyState, LoadingSpinner, ErrorPanel } from "@/components/shared";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  ChevronDown,
} from "lucide-react";

interface WalletEntry {
  id: string;
  amount: number;
  entry_type: "commission" | "adjustment" | "payout";
  source_level: number | null;
  source_user_id: string | null;
  description: string | null;
  order_id: string | null;
  created_at: string;
}

interface WalletFull {
  balance: number;
  total_commissions: number;
  total_payouts: number;
  entries: WalletEntry[];
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  notes: string | null;
  created_at: string;
}

const ENTRY_PAGE_SIZE = 15;

export default function WalletPage() {
  return (
    <AuthGate>
      <MainLayout>
        <WalletContent />
      </MainLayout>
    </AuthGate>
  );
}

function WalletContent() {
  const { user, client, project } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  // ─── v3.0 OPTIMIZED: 1 RPC instead of 3 separate queries ───
  const { data: walletData, isLoading: summaryLoading, error: walletError } = useSupabaseQuery<WalletFull>({
    key: ["wallet-full", userId],
    queryFn: async (supabase, uid) => {
      const { data, error } = await supabase.rpc("get_wallet_full", { p_manager_id: uid });
      if (error) throw new Error(error.message);
      const d = data as Record<string, unknown>;
      return {
        balance: (d.balance as number) || 0,
        total_commissions: (d.total_commissions as number) || 0,
        total_payouts: (d.total_payouts as number) || 0,
        entries: (d.entries as WalletEntry[]) || [],
      };
    },
    staleTime: 30_000,
  });

  const entries = walletData?.entries || [];
  const entriesLoaded = entries.length;
  const hasMoreEntries = entries.length >= ENTRY_PAGE_SIZE;
  const fetchMoreEntries = () => {};
  const fetchingMoreEntries = false;

  // Payouts still separate (lightweight)
  const { data: payouts = [] } = useSupabaseQuery<PayoutRequest[]>({
    key: ["wallet-payouts", userId],
    queryFn: async (supabase, uid) => {
      const { data } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("manager_id", uid)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data as PayoutRequest[]) || [];
    },
    staleTime: 30_000,
  });

  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submitPayout = async () => {
    if (!user || !client || !project) return;

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: "error", text: "Ingresa un monto válido mayor a 0." });
      return;
    }

    const available = walletData?.balance || 0;
    if (amount > available) {
      setMessage({ type: "error", text: `No puedes solicitar más de tu saldo disponible ($${available.toFixed(2)}).` });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const { error } = await supabase.from("payout_requests").insert([
        {
          manager_id: user.id,
          amount,
          notes: payoutNotes || null,
          status: "pending",
        },
      ]);

      if (error) {
        setMessage({ type: "error", text: "Error: " + error.message });
      } else {
        setMessage({ type: "success", text: "Solicitud de retiro enviada. Un administrador la revisará." });
        setPayoutAmount("");
        setPayoutNotes("");
        setShowPayoutForm(false);
        invalidate.wallet(queryClient, userId);
      }
    } catch (err: any) {
      console.error("[WALLET] Error solicitando retiro:", err?.message || err);
      setMessage({ type: "error", text: "Error al enviar la solicitud." });
    } finally {
      setSubmitting(false);
    }
  };

  const balance = useMemo(() => walletData?.balance || 0, [walletData?.balance]);
  const totalCommissions = useMemo(() => walletData?.total_commissions || 0, [walletData?.total_commissions]);
  const totalPayouts = useMemo(() => walletData?.total_payouts || 0, [walletData?.total_payouts]);

  // Error visible en UI
  if (walletError) {
    return (
      <div className="p-6 pb-24">
        <ErrorPanel title="Error cargando billetera" message={walletError.message} />
      </div>
    );
  }

  if (summaryLoading) {
    return <LoadingSpinner centered />;
  }

  return (
    <div className="p-6 pb-24 space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-2xl font-bold">Billetera</h1>
        <p className="text-sm text-muted-foreground">Tus ganancias y retiros</p>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-[24px] bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 p-6 text-white shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
        <div className="relative z-10">
          <p className="text-sm text-white/70 font-medium">Saldo disponible</p>
          <p className="text-4xl font-extrabold mt-1">${balance.toFixed(2)}</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-white/70" />
              <span className="text-xs text-white/70">Comisiones: ${totalCommissions.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-white/70" />
              <span className="text-xs text-white/70">Retiros: ${totalPayouts.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Botón solicitar retiro */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowPayoutForm(!showPayoutForm)}
          className="w-full py-3.5 rounded-[20px] font-bold text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg flex items-center justify-center gap-2"
        >
          <DollarSign className="w-5 h-5" />
          {showPayoutForm ? "Cancelar" : "Solicitar retiro"}
        </motion.button>
      </motion.div>

      {/* Formulario de retiro */}
      {showPayoutForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="card-filled rounded-[20px] p-5 space-y-4"
        >
          <h3 className="text-sm font-bold">Nueva solicitud de retiro</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold pl-1">Monto a retirar</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="w-full rounded-2xl border border-border/60 card-filled py-3.5 pl-12 pr-4 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
            <p className="text-[10px] text-muted-foreground pl-1">
              Disponible: ${balance.toFixed(2)}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold pl-1">Notas (opcional)</label>
            <textarea
              placeholder="Información adicional para el administrador..."
              value={payoutNotes}
              onChange={(e) => setPayoutNotes(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-border/60 card-filled py-3 px-4 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 transition resize-none"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={submitPayout}
            disabled={submitting || balance <= 0}
            className="w-full py-3 rounded-[16px] font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            {submitting ? "Enviando..." : "Enviar solicitud"}
          </motion.button>
        </motion.div>
      )}

      {/* Mensaje */}
      {message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-2xl border ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
          }`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </motion.div>
      )}

      {/* Solicitudes de retiro pendientes */}
      {payouts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
          <h2 className="text-sm font-semibold">Solicitudes de retiro</h2>
          {payouts.map((p) => (
            <div key={p.id} className="card-filled rounded-[16px] p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 ${
                p.status === "pending" ? "bg-yellow-100 dark:bg-yellow-500/15" :
                p.status === "approved" ? "bg-blue-100 dark:bg-blue-500/15" :
                p.status === "paid" ? "bg-green-100 dark:bg-green-500/15" :
                "bg-red-100 dark:bg-red-500/15"
              }`}>
                {p.status === "pending" ? <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /> :
                 p.status === "paid" ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" /> :
                 p.status === "approved" ? <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> :
                 <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">${p.amount.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {p.status === "pending" ? "⏳ Pendiente" :
                   p.status === "approved" ? "✅ Aprobada" :
                   p.status === "paid" ? "💰 Pagada" :
                   "❌ Rechazada"}
                  {p.notes ? ` · ${p.notes}` : ""}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString("es-CU")}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Historial de movimientos */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-2">
        <h2 className="text-sm font-semibold">Movimientos recientes</h2>
        {entries.length === 0 ? (
          <EmptyState icon={Wallet} title="No hay movimientos aún" description="Los pedidos vendidos generarán comisiones aquí" />
        ) : (
          <>
            {entries.map((e) => (
              <div key={e.id} className="card-filled rounded-[16px] p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 ${
                  e.entry_type === "commission" ? "bg-green-100 dark:bg-green-500/15" :
                  e.entry_type === "payout" ? "bg-orange-100 dark:bg-orange-500/15" :
                  "bg-blue-100 dark:bg-blue-500/15"
                }`}>
                  {e.entry_type === "commission" ? <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" /> :
                   e.entry_type === "payout" ? <TrendingDown className="w-4 h-4 text-orange-600 dark:text-orange-400" /> :
                   <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {e.entry_type === "commission" ? "+" : "-"}${Math.abs(e.amount).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {e.description || (e.entry_type === "commission" ? (e.source_level != null ? `Comisión Nivel ${e.source_level + 1}` : "Comisión por venta") : e.entry_type === "payout" ? "Retiro" : "Ajuste")}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString("es-CU")}
                </span>
              </div>
            ))}

            {hasMoreEntries && (
              <button
                onClick={() => fetchMoreEntries()}
                disabled={fetchingMoreEntries}
                className="w-full py-3 rounded-[16px] card-filled text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {fetchingMoreEntries ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {fetchingMoreEntries ? "Cargando..." : `Cargar más (${entriesLoaded} cargados)`}
              </button>
            )}

            {!hasMoreEntries && entries.length > 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Todos los movimientos cargados ({entriesLoaded})</p>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
