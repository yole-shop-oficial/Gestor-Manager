"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSession } from "@/hooks";
import { CommercialTree } from "@/features/network/components/CommercialTree";
import { Network, Users, Copy, Check, Link2, Share2 } from "lucide-react";
import { useState } from "react";

export default function NetworkPage() {
  return (
    <AuthGate>
      <MainLayout>
        <NetworkContent />
      </MainLayout>
    </AuthGate>
  );
}

function NetworkContent() {
  const { user, profile } = useSession();
  const isAdmin = profile?.role === "admin";
  const managerCode = profile?.manager_code || "";
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (!managerCode) return;
    navigator.clipboard.writeText(managerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 pb-24 space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Network className="w-6 h-6 text-indigo-500" />
          {isAdmin ? "Árbol Comercial" : "Mi Red"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Estructura jerárquica completa de YOLE SHOP" : "Gestiona tu red de gestores y subgestores"}
        </p>
      </motion.div>

      {/* Código de afiliación */}
      {!isAdmin && managerCode && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
          <p className="text-xs text-white/70 mb-2">Comparte tu código para invitar gestores</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-white/60" />
              <span className="text-lg font-mono font-bold tracking-[0.12em]">{managerCode}</span>
            </div>
            <button onClick={copyCode}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition">
              {copied ? <Check className="w-5 h-5 text-green-300" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>
      )}

      {/* Tree */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <CommercialTree isAdmin={isAdmin} />
      </motion.div>
    </div>
  );
}
