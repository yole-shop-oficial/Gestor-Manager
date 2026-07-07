"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useSession } from "./useSession";

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
// KEY FIX vs previous version:
// 1. client is stored in a REF, NOT in useEffect deps
//    → Channel is NOT destroyed/recreated when client changes
// 2. project is a primitive (number | null) — safe in deps
// 3. onEvent is stored in a ref — doesn't cause re-subscriptions
// 4. Only string/primitive deps determine when to re-subscribe
//
// This prevents the connect/disconnect loop that contributed
// to React #310.
// ═══════════════════════════════════════════════════════════

export function useRealtime(config: UseRealtimeConfig): void {
  const { user, client, project } = useSession();

  // Store client in a REF — read inside effect, NOT a dep
  const clientRef = useRef(client);
  clientRef.current = client;

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

  const userId = user?.id ?? "";

  // Stable key based ONLY on primitives — never object references
  const stableKey = `${channelName}::${table}::${filter}::${event}::${enabled}::${userId}::${project}`;

  useEffect(() => {
    if (!enabled || !userId) return;

    // Read client from ref — NOT from deps
    const supabase = clientRef.current;
    if (!supabase) return;

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
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(`[REALTIME] ✅ ${channelName} connected`);
        } else if (status === "CHANNEL_ERROR") {
          console.warn(`[REALTIME] ❌ ${channelName} error:`, err?.message || "unknown");
        } else if (status === "TIMED_OUT") {
          console.warn(`[REALTIME] ⏰ ${channelName} timed out`);
        } else if (status === "CLOSED") {
          console.warn(`[REALTIME] 🔒 ${channelName} closed`);
        }
      });

    // Track channel
    if (activeChannels.has(channelKey)) {
      activeChannels.get(channelKey)!.refCount++;
    } else {
      activeChannels.set(channelKey, { channel, refCount: 1 });
    }

    return () => {
      const entry = activeChannels.get(channelKey);
      if (entry) {
        entry.refCount--;
        if (entry.refCount <= 0) {
          supabase.removeChannel(channel);
          activeChannels.delete(channelKey);
          console.log(`[REALTIME] 🗑️ ${channelName} removed (no subscribers)`);
        }
      } else {
        try { supabase.removeChannel(channel); } catch {}
      }
    };
    // ONLY the stableKey string in deps — NO object references
    // client is read from clientRef.current inside the effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);
}

export function getActiveChannelCount(): number {
  return activeChannels.size;
}
