// ═══════════════════════════════════════════════════════════
// APP SETTINGS STORE — persisted in localStorage
// ═══════════════════════════════════════════════════════════

export interface AppSettings {
  /** Has the user completed the onboarding setup? */
  setupComplete: boolean;
  /** App version when setup was last completed */
  setupVersion: string;
  /** Theme: "light" | "dark" | "system" */
  theme: "light" | "dark" | "system";
  /** Primary accent color (hex) */
  accentColor: string;
  /** Security: PIN code (hashed), empty = no PIN */
  pinCode: string;
  /** Security level: "basic" | "medium" | "high" */
  securityLevel: "basic" | "medium" | "high";
  /** Detected device type */
  deviceType: string;
  /** Language */
  language: string;
}

const STORAGE_KEY = "yole_app_settings";
const CURRENT_VERSION = "2.0.0";

const DEFAULT_SETTINGS: AppSettings = {
  setupComplete: false,
  setupVersion: "",
  theme: "system",
  accentColor: "#6366f1",
  pinCode: "",
  securityLevel: "basic",
  deviceType: "",
  language: "es",
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function isSetupComplete(): boolean {
  return getSettings().setupComplete;
}

export function markSetupComplete(settings: Partial<AppSettings> = {}): void {
  saveSettings({ ...settings, setupComplete: true, setupVersion: CURRENT_VERSION });
}

export function resetSetup(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ═══════════════════════════════════════════════════════════
// DEVICE DETECTION
// ═══════════════════════════════════════════════════════════

export function detectDevice(): { type: string; os: string; browser: string; screen: string } {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const screenW = typeof window !== "undefined" && window.screen ? window.screen.width : 0;

  // Device type
  let type = "Desktop";
  if (/Mobi|Android/i.test(ua)) {
    type = /Tablet|iPad/i.test(ua) ? "Tablet" : "Móvil";
  } else if (/iPad/i.test(ua)) {
    type = "Tablet";
  }

  // OS
  let os = "Desconocido";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  // Browser
  let browser = "Desconocido";
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Edge|Edg/i.test(ua)) browser = "Edge";

  // Screen size category
  const screenSize = screenW < 640 ? "Pequeña" : screenW < 1024 ? "Mediana" : "Grande";

  return { type, os, browser, screen: screenSize };
}

// ═══════════════════════════════════════════════════════════
// ACCENT COLOR PRESETS
// ═══════════════════════════════════════════════════════════

export interface AccentPreset {
  name: string;
  color: string;
  darkPrimary: string;
  label: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: "Índigo", color: "#6366f1", darkPrimary: "#818cf8", label: "🟣 Índigo (por defecto)" },
  { name: "Verde", color: "#10b981", darkPrimary: "#34d399", label: "🟢 Verde" },
  { name: "Rojo", color: "#ef4444", darkPrimary: "#f87171", label: "🔴 Rojo" },
  { name: "Naranja", color: "#f97316", darkPrimary: "#fb923c", label: "🟠 Naranja" },
  { name: "Rosa", color: "#ec4899", darkPrimary: "#f472b6", label: "🩷 Rosa" },
  { name: "Cian", color: "#06b6d4", darkPrimary: "#22d3ee", label: "🔵 Cian" },
  { name: "Ámbar", color: "#f59e0b", darkPrimary: "#fbbf24", label: "🟡 Ámbar" },
  { name: "Violeta", color: "#8b5cf6", darkPrimary: "#a78bfa", label: "💜 Violeta" },
];

// ═══════════════════════════════════════════════════════════
// THEME APPLICATION
// ═══════════════════════════════════════════════════════════

export function applyTheme(theme: "light" | "dark" | "system"): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
  localStorage.setItem("theme", theme);
}

export function applyAccentColor(color: string, darkPrimary: string): void {
  const root = document.documentElement;
  // Light mode primary
  root.style.setProperty("--primary", color);
  // Dark mode primary
  if (root.classList.contains("dark")) {
    root.style.setProperty("--primary", darkPrimary);
  }
  // Store both for theme switching
  root.setAttribute("data-accent-light", color);
  root.setAttribute("data-accent-dark", darkPrimary);
  localStorage.setItem("yole_accent_light", color);
  localStorage.setItem("yole_accent_dark", darkPrimary);
}

export function loadSavedAccent(): void {
  const light = localStorage.getItem("yole_accent_light");
  const dark = localStorage.getItem("yole_accent_dark");
  if (light && dark) {
    const isDark = document.documentElement.classList.contains("dark");
    document.documentElement.style.setProperty("--primary", isDark ? dark : light);
    document.documentElement.setAttribute("data-accent-light", light);
    document.documentElement.setAttribute("data-accent-dark", dark);
  }
}

// ═══════════════════════════════════════════════════════════
// PIN HASHING (simple, client-side only)
// ═══════════════════════════════════════════════════════════

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "yole-shop-salt-2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === storedHash;
}

// ═══════════════════════════════════════════════════════════
// CACHE MANAGEMENT — auto-clear on errors
// ═══════════════════════════════════════════════════════════

export async function clearAllAppCache(): Promise<void> {
  // Clear localStorage (except auth tokens)
  const keysToKeep = ["yole_user_project", STORAGE_KEY, "theme", "yole_accent_light", "yole_accent_dark"];
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !keysToKeep.includes(key) && !key.startsWith("yole-auth-")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Clear IndexedDB (sync engine)
  try {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  } catch {
    // Fallback: delete known databases
    try { indexedDB.deleteDatabase("yole-sync-engine"); } catch {}
  }

  // Clear Service Worker caches
  if ("caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    } catch {}
  }

  // Clear React Query cache via queryClient (caller must do this)

  console.log("[CACHE] All app cache cleared successfully");
}
