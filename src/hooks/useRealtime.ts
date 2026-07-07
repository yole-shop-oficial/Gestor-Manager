"use client";

import { useEffect, useRef, useState } from "react";
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
// WEBSOCKET FAILURE DETECTION
// ═══════════════════════════════════════════════════════════

const WS_FAILURES = new Map<string, number>();
const MAX_WS_FAILURES = 2;

/**
 * Returns true if WebSocket connections have failed too many times.
 * When true, all Realtime hooks should fall back to polling.
 */
export function isRealtimeDisabled(): boolean {
  // Check global failure count
  let total = 0;
  for (const v of WS_FAILURES.values()) total += v;
  return total >= MAX_WS_FAILURES;
}

export function resetRealtimeFailures(): void {
  WS_FAILURES.clear();
}

// ═══════════════════════════════════════════════════════════
// HOOK: useRealtime
// ═══════════════════════════════════════════════════════════

export function useRealtime(config: UseRealtimeConfig): void {
  const { user, client, project } = useSession();
  const [disabled, setDisabled] = useState(false);

  const clientRef = useRef(client);
  clientRef.current = client;

  const onEventRef = useRef(config.onEvent);
  onEventRef.current = config.onEvent;

  const { channel: channelName, table, filter, event = "*", enabled = true } = config;
  const userId = user?.id ?? "";

  // Check if globally disabled
  useEffect(() => {
    if (isRealtimeDisabled()) setDisabled(true);
  }, []);

  const effectiveEnabled = enabled && !disabled && !isRealtimeDisabled();
  const stableKey = `${channelName}::${table}::${filter}::${event}::${effectiveEnabled}::${userId}::${project}`;

  useEffect(() => {
    if (!effectiveEnabled || !userId) return;

    const supabase = clientRef.current;
    if (!supabase) return;

    const changesConfig: Record<string, unknown> = { event, schema: "public", table };
    if (filter) changesConfig.filter = filter;

    let failCount = 0;
    let closed = false;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes" as any, changesConfig as any,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          onEventRef.current(payload);
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          // Success — reset failure count
          const current = WS_FAILURES.get(channelName) || 0;
          if (current > 0) WS_FAILURES.set(channelName, 0);
        } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          failCount++;
          const total = (WS_FAILURES.get(channelName) || 0) + 1;
          WS_FAILURES.set(channelName, total);
          
          // If too many failures, disable all realtime
          if (isRealtimeDisabled()) {
            setDisabled(true);
            try { supabase.removeChannel(channel); } catch {}
          }
        }
      });

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [stableKey]);
}

export function getActiveChannelCount(): number {
  return 0; // Simplified — channels are now per-effect
}
