// ═══════════════════════════════════════════════════════════
// NETWORK TYPES — v3.0 Árbol Comercial
// ═══════════════════════════════════════════════════════════

export interface TreeNode {
  id: string;
  full_name: string;
  username: string;
  role: "admin" | "manager" | "gestor";
  status: string;
  level: number;
  manager_code: string;
  children_count: number;
  total_network_size: number;
  avatar_url: string | null;
  last_seen_at: string | null;
  parent_id: string | null;
  path: string;
  total_orders?: number;
  total_sales?: number;
  total_commission?: number;
  wallet_balance?: number;
}

export interface NetworkStats {
  total_gestores: number;
  total_managers: number;
  total_network: number;
  total_commission: number;
}

export interface NetworkFilters {
  search: string;
  minLevel: number;
  maxLevel: number;
  status: string;
  role: string;
}
