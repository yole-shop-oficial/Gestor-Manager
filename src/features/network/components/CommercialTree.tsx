"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network, Users, User, Shield, Search, X, ChevronRight, ChevronDown,
  Package, Wallet, TrendingUp, Clock, Filter, Eye, Loader2, ExternalLink,
  ArrowUp, ArrowDown, AlertCircle, BarChart3,
} from "lucide-react";
import { useSession, useSupabaseQuery } from "@/hooks";
import { StatusBadge, LoadingSpinner, EmptyState, ErrorPanel } from "@/components/shared";
import Link from "next/link";
import type { TreeNode, NetworkStats } from "../types";

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

interface CommercialTreeProps {
  /** If true, show admin-level controls (full tree). If false, show my branch only */
  isAdmin?: boolean;
}

// ═══════════════════════════════════════════════════════════
// COMMERCIAL TREE
// ═══════════════════════════════════════════════════════════

export function CommercialTree({ isAdmin = false }: CommercialTreeProps) {
  const { user, profile } = useSession();
  const userId = user?.id ?? "";
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRole, setFilterRole] = useState("");

  // Fetch ALL nodes (admin) or descendants (manager/gestor)
  const queryFn = isAdmin
    ? "profiles_full"
    : "descendants";

  const { data: nodes, isLoading, error } = useSupabaseQuery<TreeNode[]>({
    key: ["commercial-tree", userId, queryFn],
    queryFn: async (client, uid) => {
      if (isAdmin) {
        const { data } = await client
          .from("profiles")
          .select("id, full_name, username, role, status, level, manager_code, children_count, total_network_size, avatar_url, last_seen_at, parent_id, path::text")
          .order("level", { ascending: true })
          .order("full_name", { ascending: true })
          .limit(500);
        return (data as TreeNode[]) || [];
      } else {
        const { data } = await client.rpc("get_descendants", { p_user_id: uid });
        return (data as TreeNode[]) || [];
      }
    },
    staleTime: 60_000,
  });

  // Stats
  const { data: stats } = useSupabaseQuery<NetworkStats>({
    key: ["commercial-tree-stats", userId, queryFn],
    queryFn: async (client, uid) => {
      const { data } = await client.rpc("get_network_stats", { p_user_id: uid });
      return (data as NetworkStats) || { total_gestores: 0, total_managers: 0, total_network: 0, total_commission: 0 };
    },
    staleTime: 60_000,
    enabled: !!userId,
  });

  // Selected node detail
  const { data: selectedNodeDetail } = useSupabaseQuery<any>({
    key: ["node-detail", selectedNodeId || "none"],
    queryFn: async (client) => {
      if (!selectedNodeId) return null;
      const [profile, orders, wallet] = await Promise.all([
        client.from("profiles").select("id, full_name, username, role, status, level, manager_code, children_count, total_network_size, avatar_url, last_seen_at, parent_id, path::text, email, phone, join_date").eq("id", selectedNodeId).maybeSingle(),
        client.from("orders").select("status", { count: "exact", head: true }).eq("manager_id", selectedNodeId),
        client.from("wallet_entries").select("amount, entry_type").eq("manager_id", selectedNodeId),
      ]);
      const totalOrders = orders.count || 0;
      const totalCommission = (wallet.data || []).filter((w: any) => w.entry_type === "commission").reduce((s: number, w: any) => s + Number(w.amount), 0);
      return { ...profile.data, total_orders: totalOrders, total_commission: totalCommission };
    },
    staleTime: 30_000,
    enabled: !!selectedNodeId,
  });

  // Filter nodes
  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    let result = nodes.filter(n => n.id !== userId || isAdmin); // Don't filter self unless admin

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(n =>
        n.full_name?.toLowerCase().includes(s) ||
        n.username?.toLowerCase().includes(s) ||
        n.manager_code?.toLowerCase().includes(s)
      );
    }
    if (filterStatus) result = result.filter(n => n.status === filterStatus);
    if (filterRole) result = result.filter(n => n.role === filterRole);

    return result;
  }, [nodes, search, filterStatus, filterRole, userId, isAdmin]);

  // Build tree
  const tree = useMemo(() => {
    const nodeMap = new Map<string, TreeNode & { children: (TreeNode & { children: any[] })[] }>();
    const roots: any[] = [];

    for (const n of filteredNodes) {
      nodeMap.set(n.id, { ...n, children: [] });
    }
    for (const n of nodeMap.values()) {
      if (n.parent_id && nodeMap.has(n.parent_id)) {
        nodeMap.get(n.parent_id)!.children.push(n);
      } else {
        roots.push(n);
      }
    }
    return roots;
  }, [filteredNodes]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!nodes) return;
    setExpandedIds(new Set(nodes.filter(n => n.children_count > 0 || (tree.some(t => t.id === n.id && n.level < 2))).map(n => n.id)));
  };

  const collapseAll = () => setExpandedIds(new Set());

  const selectNode = (id: string) => {
    setSelectedNodeId(prev => prev === id ? null : id);
  };

  if (isLoading) return <LoadingSpinner variant="muted" />;
  if (error) return <ErrorPanel title="Error" message={error.message} compact />;

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <MiniStat icon={Users} label="Gestores" value={stats.total_gestores} color="text-blue-500" />
          <MiniStat icon={Shield} label="Managers" value={stats.total_managers} color="text-purple-500" />
          <MiniStat icon={Network} label="Total Red" value={stats.total_network} color="text-indigo-500" />
        </div>
      )}

      {/* Search + toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text" placeholder="Buscar por nombre, usuario o código..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full card-filled border border-border/40 rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-2.5">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-xl ${showFilters || filterStatus || filterRole ? "bg-primary/15 text-primary" : "card-filled text-muted-foreground"} transition`}>
          <Filter className="w-4 h-4" />
        </button>
        <button onClick={expandAll} className="p-2 rounded-xl card-filled text-muted-foreground" title="Expandir todo">
          <ArrowDown className="w-4 h-4" />
        </button>
        <button onClick={collapseAll} className="p-2 rounded-xl card-filled text-muted-foreground" title="Colapsar todo">
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 overflow-hidden">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="flex-1 card-filled border border-border/40 rounded-xl py-2 px-3 text-xs outline-none">
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="pending">Pendiente</option>
              <option value="denied">Denegado</option>
              <option value="blocked">Bloqueado</option>
            </select>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              className="flex-1 card-filled border border-border/40 rounded-xl py-2 px-3 text-xs outline-none">
              <option value="">Todos los roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="gestor">Gestor</option>
            </select>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count */}
      <p className="text-[10px] text-muted-foreground">
        {filteredNodes.length} de {nodes?.length || 0} nodos
        {(filterStatus || filterRole || search) && " · filtros activos"}
      </p>

      {/* Tree */}
      {tree.length === 0 ? (
        <EmptyState icon={Network} title="Sin miembros en la red" description="Invita gestores con tu código de afiliación" />
      ) : (
        <div className="space-y-1">
          {tree.map(root => (
            <TreeNodeRow
              key={root.id}
              node={root}
              depth={0}
              expandedIds={expandedIds}
              selectedId={selectedNodeId}
              onToggle={toggleExpand}
              onSelect={selectNode}
              allNodes={filteredNodes}
            />
          ))}
        </div>
      )}

      {/* Node detail drawer */}
      <AnimatePresence>
        {selectedNodeId && selectedNodeDetail && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="card-filled rounded-2xl p-5 space-y-4 border border-primary/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {(selectedNodeDetail.full_name || "?")[0]}
                </div>
                <div>
                  <p>{selectedNodeDetail.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">@{selectedNodeDetail.username} · {selectedNodeDetail.role === "admin" ? "Admin" : selectedNodeDetail.role === "manager" ? "Manager" : "Gestor"}</p>
                </div>
              </h3>
              <button onClick={() => setSelectedNodeId(null)} className="p-1"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <DetailBadge icon={Package} label="Pedidos" value={selectedNodeDetail.total_orders || 0} />
              <DetailBadge icon={TrendingUp} label="Comisión" value={`$${(selectedNodeDetail.total_commission || 0).toFixed(0)}`} />
              <DetailBadge icon={Network} label="Nivel" value={selectedNodeDetail.level} />
              <DetailBadge icon={Users} label="Subgestores" value={selectedNodeDetail.children_count || 0} />
              <DetailBadge icon={Clock} label="Ingreso" value={selectedNodeDetail.join_date || "—"} />
              <StatusBadge status={selectedNodeDetail.status as any} />
            </div>

            {selectedNodeDetail.manager_code && (
              <div className="flex items-center gap-2 bg-primary/5 rounded-xl p-2.5">
                <span className="text-[10px] text-muted-foreground">Código:</span>
                <span className="text-xs font-mono font-bold">{selectedNodeDetail.manager_code}</span>
              </div>
            )}

            <Link href={`/profile`} className="block text-center text-xs font-bold text-primary py-2">
              Ver perfil completo →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TREE NODE ROW (Recursive)
// ═══════════════════════════════════════════════════════════

function TreeNodeRow({
  node,
  depth,
  expandedIds,
  selectedId,
  onToggle,
  onSelect,
  allNodes,
}: {
  node: TreeNode & { children?: any[] };
  depth: number;
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  allNodes: TreeNode[];
}) {
  const hasChildren = (node.children_count || 0) > 0 || (node.children?.length || 0) > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const children = node.children || [];
  const padLeft = depth * 20;

  const roleIcon = node.role === "admin" ? Shield : node.role === "manager" ? Users : User;
  const roleColor = node.role === "admin"
    ? "text-rose-500" : node.role === "manager"
    ? "text-purple-500" : "text-blue-500";

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.02 }}
        onClick={() => onSelect(node.id)}
        className={`flex items-center gap-2 py-2.5 px-3 rounded-xl cursor-pointer transition-all group ${
          isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-surface/80"
        }`}
        style={{ paddingLeft: 12 + padLeft }}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition ${hasChildren ? "text-muted-foreground hover:text-foreground" : "opacity-0"}`}
        >
          {hasChildren && (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </button>

        {/* Avatar */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 ${
          node.role === "admin" ? "bg-gradient-to-br from-rose-500 to-pink-600" :
          node.role === "manager" ? "bg-gradient-to-br from-purple-500 to-indigo-600" :
          "bg-gradient-to-br from-blue-500 to-cyan-600"
        }`}>
          {(node.full_name || "?")[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{node.full_name}</p>
            {node.role === "admin" && <span className="text-[9px] bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full font-bold">Admin</span>}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            @{node.username} · Nivel {node.level}
            {node.children_count > 0 && ` · ${node.children_count} directos`}
          </p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={node.status as any} size="sm" />
          <span className="text-[9px] text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition">
            {node.manager_code}
          </span>
        </div>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && children.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            {children.map((child: any) => (
              <TreeNodeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                selectedId={selectedId}
                onToggle={onToggle}
                onSelect={onSelect}
                allNodes={allNodes}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function MiniStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="card-filled rounded-xl p-3 text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DetailBadge({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="bg-surface/50 rounded-xl p-2.5 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <div>
        <p className="text-[9px] text-muted-foreground">{label}</p>
        <p className="text-xs font-bold">{value}</p>
      </div>
    </div>
  );
}

export default CommercialTree;
