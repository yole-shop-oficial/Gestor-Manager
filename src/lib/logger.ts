"use client";

import { getOrCreateClient, STORAGE_KEYS } from "@/services/supabase/clientFactory";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  event: string;
  data?: Record<string, unknown>;
  user_agent?: string;
  user_id?: string;
}

interface FlushEntry extends LogEntry {
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const MAX_BUFFER = 20;
const FLUSH_INTERVAL = 60_000; // Increased from 30s to 60s — less Supabase load
const LOCAL_BUFFER_MAX = 200;

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

const flushBuffer: LogEntry[] = [];
const localBuffer: FlushEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let currentUserId: string | null = null;
let currentProject: 1 | 2 | null = null;

// ═══════════════════════════════════════════════════════════
// LOCAL BUFFER (ring buffer for debugging)
// ═══════════════════════════════════════════════════════════

function addToLocalBuffer(entry: FlushEntry): void {
  localBuffer.push(entry);
  if (localBuffer.length > LOCAL_BUFFER_MAX) localBuffer.shift();
}

// ═══════════════════════════════════════════════════════════
// FLUSH: Send buffer to Supabase app_logs
// v4 FIX: Use the SAME authenticated client that useSession uses
// instead of creating a separate client with persistSession:false.
// The separate client had no valid JWT → RLS blocked inserts.
// ═══════════════════════════════════════════════════════════

async function flushToSupabase(): Promise<void> {
  if (flushBuffer.length === 0 || !currentUserId || !currentProject) return;

  const entries = flushBuffer.splice(0, flushBuffer.length);
  if (entries.length === 0) return;

  try {
    const config = getProjectConfig(currentProject);
    // v4 FIX: Use the SAME authenticated client with persistSession + autoRefresh
    // This ensures the logger has a valid JWT for RLS policies
    const supabase = createLoginClient(config);

    const rows = entries.map((e) => ({
      user_id: e.user_id || currentUserId,
      level: e.level,
      event: e.event,
      data: e.data ?? null,
      user_agent: e.user_agent ?? (typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null),
    }));

    const { error } = await supabase.from("app_logs").insert(rows);

    if (error) {
      console.error("[Logger] Failed to flush logs:", error.message);
    }
  } catch (err) {
    console.error("[Logger] Flush error:", err);
  }
}

// ═══════════════════════════════════════════════════════════
// SCHEDULER: Auto-flush every 60s or when buffer full
// ═══════════════════════════════════════════════════════════

function ensureScheduler(): void {
  if (flushTimer) return;

  flushTimer = setInterval(() => {
    flushToSupabase();
  }, FLUSH_INTERVAL);
}

function stopScheduler(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

// ═══════════════════════════════════════════════════════════
// CORE LOG FUNCTION
// ═══════════════════════════════════════════════════════════

function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();

  addToLocalBuffer({ level, event, data, timestamp });

  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`[${level.toUpperCase()}] ${event}`, data ?? "");

  // In production, only buffer warn and error for Supabase flush
  const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";
  if (isProduction && level === "info") return;

  const entry: LogEntry = {
    level,
    event,
    data,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : undefined,
    user_id: currentUserId || undefined,
  };

  flushBuffer.push(entry);
  ensureScheduler();

  if (flushBuffer.length >= MAX_BUFFER) {
    flushToSupabase();
  }
}

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => log("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => log("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => log("error", event, data),

  setUser: (userId: string | null, project: 1 | 2 | null) => {
    currentUserId = userId;
    currentProject = project;
  },

  flush: () => flushToSupabase(),
  getBuffer: (): FlushEntry[] => [...localBuffer],
  clearBuffer: (): void => { localBuffer.length = 0; },
  destroy: (): void => {
    stopScheduler();
    flushToSupabase();
  },
};
