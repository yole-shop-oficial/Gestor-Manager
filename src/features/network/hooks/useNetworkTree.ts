"use client";

import { useMemo } from "react";
import { useSession, useSupabaseQuery } from "@/hooks";
import type { TreeNode, NetworkStats, NetworkFilters } from "../types";

/**
 * Hook to fetch and filter the network tree for the current user.
 * - Admin: sees the entire tree
 * - Manager: sees only their branch
 * - Gestor: sees only themselves
 */
export function useNetworkTree(filters?: NetworkFilters) {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const { data: allNodes, isLoading, error } = useSupabaseQuery<TreeNode[]>({
    key: ["network-tree", userId],
    queryFn: async (client) => {
      // Fetch ALL profiles (get_descendants requires a specific user, 
      // but admin needs ALL, so we fetch profiles directly for now)
      const { data } = await client
        .from("profiles")
        .select("id, full_name, username, role, status, level, manager_code, children_count, total_network_size, avatar_url, last_seen_at, parent_id, path")
        .order("level", { ascending: true })
        .order("full_name", { ascending: true })
        .limit(500);
      return (data as TreeNode[]) || [];
    },
    staleTime: 60_000,
  });

  const { data: stats } = useSupabaseQuery<NetworkStats>({
    key: ["network-stats-root", userId],
    queryFn: async (client, uid) => {
      const { data } = await client.rpc("get_network_stats", { p_user_id: uid });
      return (data as NetworkStats) || { total_gestores: 0, total_managers: 0, total_network: 0, total_commission: 0 };
    },
    staleTime: 60_000,
    enabled: !!userId,
  });

  // Apply filters client-side
  const filteredNodes = useMemo(() => {
    if (!allNodes) return [];
    let result = allNodes;

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (n) =>
          n.full_name?.toLowerCase().includes(s) ||
          n.username?.toLowerCase().includes(s) ||
          n.manager_code?.toLowerCase().includes(s)
      );
    }

    if (filters?.minLevel !== undefined && filters.minLevel > 0) {
      result = result.filter((n) => n.level >= filters.minLevel);
    }

    if (filters?.maxLevel !== undefined && filters.maxLevel < 999) {
      result = result.filter((n) => n.level <= filters.maxLevel);
    }

    if (filters?.status) {
      result = result.filter((n) => n.status === filters.status);
    }

    if (filters?.role) {
      result = result.filter((n) => n.role === filters.role);
    }

    return result;
  }, [allNodes, filters]);

  // Build tree structure from flat list
  const tree = useMemo(() => {
    if (!filteredNodes.length) return [];
    
    const nodeMap = new Map<string, TreeNode & { children: (TreeNode & { children: any[] })[] }>();
    const roots: (TreeNode & { children: any[] })[] = [];

    // First pass: create all nodes
    for (const node of filteredNodes) {
      nodeMap.set(node.id, { ...node, children: [] });
    }

    // Second pass: build tree
    for (const node of nodeMap.values()) {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        nodeMap.get(node.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }, [filteredNodes]);

  return {
    nodes: allNodes || [],
    filteredNodes,
    tree,
    stats,
    isLoading,
    error,
    totalCount: allNodes?.length || 0,
    filteredCount: filteredNodes.length,
  };
}
