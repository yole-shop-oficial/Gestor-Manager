"use client";

import { useSyncExternalStore, useState, useEffect, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadUserProject,
  saveUserProject,
  getProjectConfig,
  createLoginClient,
} from "@/services/supabase/roundRobin";
import { logger } from "@/lib/logger";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type UserRole = "admin" | "gestor" | "moderator";
export type UserStatus = "pending" | "active" | "denied" | "blocked";

export interface UserProfile {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  assigned_project: number;
  has_sales_experience: boolean;
  join_date: string;
  id_card: string;
  address: string;
  bank_card_number: string;
  bank_card_holder: string;
  birth_date: string;
  gender: string;
  age: number;
  observations: string;
}

export interface UseSessionResult {
  user: User | null;
  client: SupabaseClient | null;
  project: 1 | 2 | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  isAdmin: boolean;
  isGestor: boolean;
  isActive: boolean;
  isPending: boolean;
  refreshProfile: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════
// SESSION STATE (immutable snapshot pattern for useSyncExternalStore)
//
// Key insight: useSyncExternalStore compares snapshots with Object.is().
// We MUST create a new object reference ONLY when state actually changes.
// This prevents React from re-rendering when nothing changed.
// ═══════════════════════════════════════════════════════════

interface SessionSnapshot {
  user: User | null;
  client: SupabaseClient | null;
  project: 1 | 2 | null;
  loading: boolean;
  version: number; // incremented on each change for reliable comparison
}

let snapshot: SessionSnapshot = {
  user: null,
  client: null,
  project: null,
  loading: true,
  version: 0,
};

// ═══════════════════════════════════════════════════════════
// LISTENERS (for useSyncExternalStore subscribe/unsubscribe)
// ═══════════════════════════════════════════════════════════

const listeners = new Set<() => void>();

function emitChange() {
  snapshot = { ...snapshot, version: snapshot.version + 1 };
  listeners.forEach((fn) => fn());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): SessionSnapshot {
  return snapshot;
}

function getServerSnapshot(): SessionSnapshot {
  return { user: null, client: null, project: null, loading: true, version: 0 };
}

// ═══════════════════════════════════════════════════════════
// PUBLIC: Set session (called by loginWithRoundRobin after login)
// ═══════════════════════════════════════════════════════════

export function setSession(user: User, client: SupabaseClient, project: 1 | 2): void {
  // Skip if already set to same values
  if (snapshot.user?.id === user.id && snapshot.project === project && !snapshot.loading) {
    return;
  }
  snapshot = { user, client, project, loading: false, version: snapshot.version + 1 };
  saveUserProject(project);
  logger.setUser(user.id, project);
  listeners.forEach((fn) => fn());
}

// ═══════════════════════════════════════════════════════════
// PUBLIC: Clear session (called on logout)
// ═══════════════════════════════════════════════════════════

export function clearSession(): void {
  if (snapshot.user === null && !snapshot.loading) return;
  snapshot = { user: null, client: null, project: null, loading: false, version: snapshot.version + 1 };
  profileCache.clear();
  logger.setUser(null, null);
  logger.flush();
  listeners.forEach((fn) => fn());
}

// ═══════════════════════════════════════════════════════════
// PROFILE CACHE
// ═══════════════════════════════════════════════════════════

const PROFILE_CACHE_TTL = 5 * 60 * 1000;
const profileCache = new Map<string, { profile: UserProfile; cachedAt: number }>();

function getCachedProfile(userId: string): UserProfile | null {
  const entry = profileCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > PROFILE_CACHE_TTL) { profileCache.delete(userId); return null; }
  return entry.profile;
}

function setCachedProfile(userId: string, profile: UserProfile): void {
  profileCache.set(userId, { profile, cachedAt: Date.now() });
}

function clearCachedProfile(userId: string): void { profileCache.delete(userId); }

// ═══════════════════════════════════════════════════════════
// INIT: Check for existing session (runs ONCE via promise guard)
// ═══════════════════════════════════════════════════════════

let initPromise: Promise<void> | null = null;
let authListenersRegistered = false;

function initAuthSingleton(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = doInit();
  return initPromise;
}

async function doInit() {
  const savedProject = loadUserProject();

  const tryProject = async (p: 1 | 2) => {
    const config = getProjectConfig(p);
    if (!config.url || !config.anonKey) return null;
    const tempClient = createLoginClient(config);
    const { data } = await tempClient.auth.getUser();
    if (data?.user) {
      saveUserProject(p);
      return { user: data.user, client: tempClient, project: p };
    }
    return null;
  };

  let result: { user: User; client: SupabaseClient; project: 1 | 2 } | null = null;

  if (savedProject) {
    result = await tryProject(savedProject);
  }
  if (!result) {
    for (const p of [1, 2] as const) {
      result = await tryProject(p);
      if (result) break;
    }
  }

  if (result) {
    snapshot = { user: result.user, client: result.client, project: result.project, loading: false, version: snapshot.version + 1 };
    logger.setUser(result.user.id, result.project);
  } else {
    snapshot = { user: null, client: null, project: null, loading: false, version: snapshot.version + 1 };
  }

  listeners.forEach((fn) => fn());

  // Register auth listeners ONLY for SIGNED_OUT detection
  registerAuthListeners();
}

// ═══════════════════════════════════════════════════════════
// AUTH LISTENERS: ONLY for SIGNED_OUT
//
// Login detection is handled by setSession() (called from
// loginWithRoundRobin). We do NOT handle SIGNED_IN here
// because it fires synchronously during onAuthStateChange
// registration and causes infinite re-render loops (#310).
//
// onAuthStateChange events:
// - INITIAL_SESSION: fires synchronously on registration → IGNORE
// - SIGNED_IN: handled by setSession() in api-login → IGNORE
// - TOKEN_REFRESHED: client handles internally → IGNORE
// - SIGNED_OUT: user logged out or session expired → HANDLE
// ═══════════════════════════════════════════════════════════

function registerAuthListeners() {
  if (authListenersRegistered) return;
  authListenersRegistered = true;

  for (const p of [1, 2] as const) {
    const config = getProjectConfig(p);
    if (!config.url || !config.anonKey) continue;
    const client = createLoginClient(config);

    client.auth.onAuthStateChange((event, _session) => {
      // ONLY handle SIGNED_OUT from the active project
      if (event === "SIGNED_OUT" && snapshot.project === p) {
        clearSession();
      }
      // ALL other events are intentionally ignored here.
      // SIGNED_IN is handled by setSession() called from loginWithRoundRobin.
    });
  }
}

// ═══════════════════════════════════════════════════════════
// HOOK: useSession
// ═══════════════════════════════════════════════════════════

export function useSession(): UseSessionResult {
  // useSyncExternalStore: React-blessed way to subscribe to external state.
  // Prevents infinite re-renders by comparing snapshot references.
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Trigger init on first mount
  useEffect(() => {
    initAuthSingleton();
  }, []);

  // Profile management (separate from session snapshot)
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const profileFetchRef = useRef<string | false>(false);

  useEffect(() => {
    if (!session.user || !session.client) {
      setProfile(null);
      setProfileLoading(false);
      profileFetchRef.current = false;
      return;
    }

    const currentUserId = session.user.id;
    if (profileFetchRef.current === currentUserId) return;
    profileFetchRef.current = currentUserId;

    const cached = getCachedProfile(currentUserId);
    if (cached) {
      setProfile(cached);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    session.client
      .from("profiles")
      .select("*")
      .eq("id", currentUserId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[useSession] Error cargando perfil:", error.message);
        } else if (data) {
          const p = data as UserProfile;
          setProfile(p);
          setCachedProfile(currentUserId, p);
        }
        setProfileLoading(false);
      });

    return () => { cancelled = true; };
  }, [session.user?.id, session.client]);

  const refreshProfile = useCallback(async () => {
    const userId = session.user?.id;
    const client = session.client;
    if (!userId || !client) return;
    clearCachedProfile(userId);
    setProfileLoading(true);
    try {
      const { data, error } = await client.from("profiles").select("*").eq("id", userId).single();
      if (error) {
        console.error("[useSession] Error refrescando perfil:", error.message);
      } else if (data) {
        const p = data as UserProfile;
        setProfile(p);
        setCachedProfile(userId, p);
      }
    } catch (err) {
      console.error("[useSession] Excepción:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [session.user?.id, session.client]);

  return {
    user: session.user,
    client: session.client,
    project: session.project,
    profile,
    loading: session.loading,
    profileLoading,
    isAdmin: profile?.role === "admin",
    isGestor: profile?.role === "gestor" || profile?.role === "moderator",
    isActive: profile?.status === "active",
    isPending: profile?.status === "pending",
    refreshProfile,
  };
}
