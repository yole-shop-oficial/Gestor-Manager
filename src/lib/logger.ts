"use client";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

const MAX_BUFFER = 200;
const logBuffer: LogEntry[] = [];

function log(level: LogLevel, module: string, message: string, data?: unknown) {
  const entry: LogEntry = { timestamp: new Date().toISOString(), level, module, message, data };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER) logBuffer.shift();
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`[${module}] ${message}`, data ?? "");
}

export const logger = {
  debug: (m: string, msg: string, d?: unknown) => log("debug", m, msg, d),
  info: (m: string, msg: string, d?: unknown) => log("info", m, msg, d),
  warn: (m: string, msg: string, d?: unknown) => log("warn", m, msg, d),
  error: (m: string, msg: string, d?: unknown) => log("error", m, msg, d),
  getBuffer: () => [...logBuffer],
  clearBuffer: () => { logBuffer.length = 0; },
};
