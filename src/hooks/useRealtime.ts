"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useSession } from "./useSession";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface UseRealtimeConfig {
  channel: string;
  table: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  onEvent: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  enabled?: boolean;
}

// ═══════════════════════════════════════════════════════════
// TRACKER: prevent duplicate channels
// ═══════════════════════════════════════════════════════════

const activeChannels = new Map<string, { channel: RealtimeChannel; refCount: number }>();

// ═══════════════════════════════════════════════════════════
// HOOK: useRealtime
//
// KEY FIX: onEvent is stored in a ref, NOT in useEffect deps.
// This prevents the channel from being destroyed/recreated on
// every render when the parent component creates a new closure.
// ═══════════════════════════════════════════════════════════

export function useRealtime(config: UseRealtimeConfig): void {
  const { user, client, project } = useSession();

  // Store onEvent in a ref so it doesn't trigger re-subscriptions
  const onEventRef = useRef(config.onEvent);
  onEventRef.current = config.onEvent;

  const {
    channel: channelName,
    table,
    filter,
    event = "*",
    enabled = true,
  } = config;

  // Use a stable key that only changes when the subscription identity changes
  // NOT including onEvent (which changes on every render)
  const stableKey = `${channelName}::${table}::${filter}::${event}::${enabled}::${user?.id}::${project}`;

  useEffect(() => {
    if (!enabled || !user || !client || !project) return;

    const supabase = client;
    const channelKey = `${channelName}-${project}`;

    // Build postgres_changes config
    const changesConfig: Record<string, unknown> = {
      event,
      schema: "public",
      table,
    };
    if (filter) {
      changesConfig.filter = filter;
    }

    // Create channel — use onEventRef.current for the callback
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        changesConfig as any,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          onEventRef.current(payload);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[REALTIME] ✅ ${channelName} connected`);
        } else if (status === "CHANNEL_ERROR") {
          console.warn(`[REALTIME] ❌ ${channelName} error`);
        } else if (status === "TIMED_OUT") {
          console.warn(`[REALTIME] ⏰ ${channelName} timed out`);
        }
      });

    // Track channel
    if (activeChannels.has(channelKey)) {
      activeChannels.get(channelKey)!.refCount++;
    } else {
      activeChannels.set(channelKey, { channel, refCount: 1 });
    }

    // Page Visibility API
    const handleVisibility = () => {
      // Tab visibility changed — React Query handles refetch via staleTime
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);

      const entry = activeChannels.get(channelKey);
      if (entry) {
        entry.refCount--;
        if (entry.refCount <= 0) {
          supabase.removeChannel(channel);
          activeChannels.delete(channelKey);
          console.log(`[REALTIME] 🗑️ ${channelName} removed (no subscribers)`);
        }
      } else {
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey, client, project]);
}

export function getActiveChannelCount(): number {
  return activeChannels.size;
}
