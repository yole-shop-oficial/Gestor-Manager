"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════
// useRealtime v3 — NO-OP en producción
// ═══════════════════════════════════════════════════════════
// Firefox bloquea wss:// de Supabase Realtime.
// Usamos polling en useConversations y notifications.
// Este hook existe por compatibilidad pero no hace nada.

export interface UseRealtimeConfig {
  channel: string;
  table: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  onEvent: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  enabled?: boolean;
}

export function useRealtime(_config: UseRealtimeConfig): void {
  // No-op: Realtime desactivado. Usamos polling en su lugar.
}

export function getActiveChannelCount(): number { return 0; }
export function isRealtimeDisabled(): boolean { return true; }
export function resetRealtimeFailures(): void {}
