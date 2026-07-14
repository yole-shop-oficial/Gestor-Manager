"use client";

import { getOrCreateClient, STORAGE_KEYS } from "@/services/supabase/clientFactory";
import { getProjectConfig } from "@/services/supabase/roundRobin";

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
const FLUSH_INTERVAL = 30_000; // 30 seconds
const LOCAL_BUFFER_MAX = 200; // in-memory ring buffer for debugging

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

const flushBuffer: LogEntry[] = [];
const localBuffer: FlushEntry[] = []; // ring buffer for getBuffer()
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
// ═══════════════════════════════════════════════════════════

async function flushToSupabase(): Promise<void> {
  if (flushBuffer.length === 0 || !currentUserId || !currentProject) return;

  // Take all entries from buffer atomically
  const entries = flushBuffer.splice(0, flushBuffer.length);
  if (entries.length === 0) return;

  try {
    const config = getProjectConfig(currentProject);
    // Use a non-auth client for logging (avoid auth state issues)
    const supabase = getOrCreateClient(config.url, config.anonKey, {
      storageKey: `${STORAGE_KEYS.AUTH_P1}-logger`,
      persistSession: false,
      autoRefreshToken: false,
    });

    // v4 FIX: No longer call supabase.auth.getSession() on every flush.
    // The logger client has persistSession: false, so getSession() always returns null.
    // Instead, pass user_id directly from the module-level currentUserId variable.

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
// SCHEDULER: Auto-flush every 30s or when buffer full
// ═══════════════════════════════════════════════════════════

function ensureScheduler(): void {
  if (flushTimer) return;

  flushTimer = setInterval(() => {
    flushToSupabase();
  }, FLUSH_INTERVAL);

  // Don't prevent tab from closing
  if (flushTimer && typeof flushTimer === "number") {
    // Node.js timer — no unref needed in browser
  }
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

  // Always add to local ring buffer
  addToLocalBuffer({ level, event, data, timestamp });

  // Console output
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`[${level.toUpperCase()}] ${event}`, data ?? "");

  // In production, only buffer warn and error for Supabase flush
  const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";
  if (isProduction && level === "info") return;

  // Add to flush buffer
  const entry: LogEntry = {
    level,
    event,
    data,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : undefined,
    user_id: currentUserId || undefined,
  };

  flushBuffer.push(entry);
  ensureScheduler();

  // Immediate flush if buffer is full
  if (flushBuffer.length >= MAX_BUFFER) {
    flushToSupabase();
  }
}

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

export const logger = {
  /** Log an info event (only sent to Supabase in development) */
  info: (event: string, data?: Record<string, unknown>) => log("info", event, data),

  /** Log a warning event (always sent to Supabase) */
  warn: (event: string, data?: Record<string, unknown>) => log("warn", event, data),

  /** Log an error event (always sent to Supabase) */
  error: (event: string, data?: Record<string, unknown>) => log("error", event, data),

  /** Set the current user context for logging */
  setUser: (userId: string | null, project: 1 | 2 | null) => {
    currentUserId = userId;
    currentProject = project;
  },

  /** Manually flush buffered logs to Supabase */
  flush: () => flushToSupabase(),

  /** Get the local ring buffer (for debugging) */
  getBuffer: (): FlushEntry[] => [...localBuffer],

  /** Clear the local ring buffer */
  clearBuffer: (): void => {
    localBuffer.length = 0;
  },

  /** Stop the auto-flush scheduler */
  destroy: (): void => {
    stopScheduler();
    flushToSupabase(); // final flush
  },
};
