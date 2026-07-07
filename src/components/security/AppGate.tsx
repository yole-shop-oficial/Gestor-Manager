"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isSetupComplete, getSettings, loadSavedAccent, clearAllAppCache } from "@/features/setup/settings";
import { PinLock } from "@/components/security/PinLock";

// ═══════════════════════════════════════════════════════════
// APP GATE — Controls entry to the app
//
// Flow:
// 1. Is setup complete? → No → redirect to /setup
// 2. Is PIN set? → Yes → show PinLock
// 3. Is user logged in? → No → redirect to /welcome
// 4. All good → render children
// ═══════════════════════════════════════════════════════════

const PUBLIC_ROUTES = ["/welcome", "/login", "/register", "/setup"];
const ERROR_CACHE_KEY = "yole_error_count";
const MAX_ERRORS_BEFORE_CLEAR = 3;

export function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);

  // Load saved accent color on mount
  useEffect(() => {
    loadSavedAccent();
  }, []);

  // Check setup + PIN on mount
  useEffect(() => {
    const setupDone = isSetupComplete();
    
    if (!setupDone && pathname !== "/setup") {
      setNeedsSetup(true);
      setChecking(false);
      router.replace("/setup");
      return;
    }

    const settings = getSettings();
    if (settings.pinCode && !PUBLIC_ROUTES.includes(pathname ?? "")) {
      setNeedsPin(true);
    }

    setChecking(false);
  }, [pathname, router]);

  // ─── Auto cache clear on errors ───
  useEffect(() => {
    const originalError = console.error;
    let errorCount = 0;

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      
      // Count critical errors
      const msg = args.join(" ").toLowerCase();
      const isCritical = 
        msg.includes("chunk") || 
        msg.includes("failed to fetch") || 
        msg.includes("network error") ||
        msg.includes("minified react error");

      if (isCritical) {
        errorCount++;
        if (errorCount >= MAX_ERRORS_BEFORE_CLEAR) {
          console.log("[CACHE] Auto-clearing due to repeated errors");
          clearAllAppCache().then(() => {
            // Force reload after cache clear
            window.location.reload();
          });
        }
      }
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Handle global unhandled errors → auto clear cache
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      const msg = event.message?.toLowerCase() || "";
      if (
        msg.includes("chunk") ||
        msg.includes("loading css") ||
        msg.includes("loading module") ||
        msg.includes("minified react error")
      ) {
        console.log("[CACHE] Auto-clearing due to unhandled error:", event.message);
        clearAllAppCache().then(() => {
          window.location.reload();
        });
      }
    };

    window.addEventListener("error", handleUnhandledError);
    return () => window.removeEventListener("error", handleUnhandledError);
  }, []);

  // ─── Loading ───
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ─── Setup not complete ───
  if (needsSetup && pathname !== "/setup") {
    return null; // redirecting
  }

  // ─── PIN Lock ───
  if (needsPin && !unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} />;
  }

  return <>{children}</>;
}
