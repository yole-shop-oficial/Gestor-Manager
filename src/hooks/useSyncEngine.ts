"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createRealSyncEngine,
  createNoopSyncEngine,
  type SyncEngine,
  type PendingOperation,
  type SyncEngineState,
} from "@/services/sync/sync-engine";
import { logger } from "@/lib/logger";
import { useSession } from "./useSession";
import { invalidate } from "./useSupabaseQuery";
import { getDB } from "@/services/sync/sync-engine";

/**
 * Hook to interact with the offline sync engine.
 *
 * - Enqueues operations when offline
 * - Auto-syncs when coming back online
 * - Exposes pending count for UI badges
 * - Invalidates React Query cache after successful sync
 */
export function useSyncEngine() {
  const { user, client, project } = useSession();
  const queryClient = useQueryClient();
  const [state, setState] = useState<SyncEngineState>({ status: "idle", lastSyncAt: null });
  const [pendingCount, setPendingCount] = useState(0);
  const engineRef = useRef<SyncEngine>(createNoopSyncEngine());

  // Create real sync engine when session is available
  useEffect(() => {
    if (!user || !client || !project) {
      engineRef.current = createNoopSyncEngine();
      return;
    }

    createRealSyncEngine(client, user.id).then((engine) => {
      engineRef.current = engine;
      refreshState();
    });
  }, [user?.id, client, project]);

  // Listen for online event → auto sync
  useEffect(() => {
    const handleOnline = async () => {
      try {
        await engineRef.current.syncNow();
        refreshState();
        // Invalidate all queries after sync
        queryClient.invalidateQueries();
      } catch (err: any) {
        logger.error("sync_auto_failed", { error: err?.message || String(err) });
      }
    };

    // Listen for SW messages (Background Sync)
    const handleSWMessage = async (event: MessageEvent) => {
      if (event.data?.type === "SYNC_PENDING") {
        try {
          await engineRef.current.syncNow();
          refreshState();
          queryClient.invalidateQueries();
        } catch (err: any) {
          logger.error("sync_sw_failed", { error: err?.message || String(err) });
        }
      }
    };

    window.addEventListener("online", handleOnline);
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, [queryClient]);

  const refreshState = useCallback(async () => {
    const engineState = engineRef.current.getState();
    setState(engineState);

    // Count pending operations from IndexedDB
    try {
      const db = await getDB();
      const pending = await db.getAllFromIndex("pending_operations", "by-status", "pending");
      const failed = await db.getAllFromIndex("pending_operations", "by-status", "failed");
      setPendingCount(pending.length + failed.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const enqueue = useCallback(async (op: PendingOperation) => {
    await engineRef.current.enqueue(op);
    await refreshState();
  }, [refreshState]);

  const syncNow = useCallback(async () => {
    await engineRef.current.syncNow();
    await refreshState();
    // Invalidate all queries after sync
    queryClient.invalidateQueries();
  }, [queryClient, refreshState]);

  return {
    /** Current sync engine state */
    state,
    /** Number of pending + failed operations */
    pendingCount,
    /** Whether there are pending operations */
    hasPending: pendingCount > 0,
    /** Enqueue a new operation for offline sync */
    enqueue,
    /** Manually trigger sync */
    syncNow,
    /** Refresh pending count from IndexedDB */
    refreshState,
  };
}
