"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
// SINGLETON STATE
// ═══════════════════════════════════════════════════════════

let singletonUser: User | null = null;
let singletonClient: SupabaseClient | null = null;
let singletonProject: 1 | 2 | null = null;
let singletonLoading = true;

// Notification system
const listeners = new Set<() => void>();
let lastNotifyTime = 0;
const NOTIFY_THROTTLE_MS = 100;

function notifyListeners() {
  const now = Date.now();
  if (now - lastNotifyTime < NOTIFY_THROTTLE_MS) return; // throttle
  lastNotifyTime = now;
  listeners.forEach((fn) => fn());
}

// Init guard
let initPromise: Promise<void> | null = null;
let authListenersReady = false;

// ═══════════════════════════════════════════════════════════
// AUTH LISTENER: Only responds to SIGNED_IN and SIGNED_OUT
//
// This is the key fix. Supabase onAuthStateChange fires many events:
// - INITIAL_SESSION: fires synchronously on registration (causes loops)
// - TOKEN_REFRESHED: fires periodically (no user change needed)
// - SIGNED_IN: fires on actual login (THIS is what we need)
// - SIGNED_OUT: fires on logout (THIS is what we need)
//
// By filtering to ONLY SIGNED_IN and SIGNED_OUT, we avoid
// the infinite re-render caused by INITIAL_SESSION firing
// synchronously and triggering notifyListeners() → re-render
// → another event → another notifyListeners() → loop.
// ═══════════════════════════════════════════════════════════

function registerAuthListeners() {
  if (authListenersReady) return;
  authListenersReady = true;

  for (const p of [1, 2] as const) {
    const config = getProjectConfig(p);
    if (!config.url || !config.anonKey) continue;
    const client = createLoginClient(config);

    client.auth.onAuthStateChange((event, session) => {
      // ═══ CRITICAL: Only handle real auth state changes ═══
      if (event === "SIGNED_IN" && session?.user) {
        const newUserId = session.user.id;
        // Dedup: skip if same user on same project
        if (singletonUser?.id === newUserId && singletonProject === p) return;
        singletonUser = session.user;
        singletonClient = client;
        singletonProject = p;
        singletonLoading = false;
        saveUserProject(p);
        logger.setUser(session.user.id, p);
        notifyListeners();
      } else if (event === "SIGNED_OUT" && singletonProject === p) {
        // Only clear if signing out from the ACTIVE project
        singletonUser = null;
        singletonClient = null;
        singletonProject = null;
        singletonLoading = false;
        profileCache.clear();
        logger.setUser(null, null);
        logger.flush();
        notifyListeners();
      }
      // Ignore: INITIAL_SESSION, TOKEN_REFRESHED, PASSWORD_RECOVERY, etc.
    });
  }
}

// ═══════════════════════════════════════════════════════════
// INIT: Check for existing session (runs ONCE)
// ═══════════════════════════════════════════════════════════

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
    singletonUser = result.user;
    singletonClient = result.client;
    singletonProject = result.project;
    logger.setUser(result.user.id, result.project);
  } else {
    singletonUser = null;
    singletonClient = null;
    singletonProject = null;
  }

  singletonLoading = false;
  notifyListeners();

  // Always register auth listeners AFTER setting initial state
  // so that INITIAL_SESSION events are properly deduped
  registerAuthListeners();
}

// ═══════════════════════════════════════════════════════════
// HOOK: useSession
// ═══════════════════════════════════════════════════════════

export function useSession(): UseSessionResult {
  const [, forceUpdate] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const profileFetchRef = useRef<string | false>(false);

  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    listeners.add(update);
    initAuthSingleton();
    return () => { listeners.delete(update); };
  }, []);

  // Fetch profile when user becomes available
  useEffect(() => {
    if (!singletonUser || !singletonClient) {
      setProfile(null);
      setProfileLoading(false);
      profileFetchRef.current = false;
      return;
    }

    const currentUserId = singletonUser.id;
    if (profileFetchRef.current === currentUserId) return;
    profileFetchRef.current = currentUserId;

    const cached = getCachedProfile(singletonUser.id);
    if (cached) {
      setProfile(cached);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    singletonClient
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
  }, [singletonUser?.id, singletonClient]);

  const refreshProfile = useCallback(async () => {
    const userId = singletonUser?.id;
    const client = singletonClient;
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
  }, []);

  return {
    user: singletonUser,
    client: singletonClient,
    project: singletonProject,
    profile,
    loading: singletonLoading,
    profileLoading,
    isAdmin: profile?.role === "admin",
    isGestor: profile?.role === "gestor" || profile?.role === "moderator",
    isActive: profile?.status === "active",
    isPending: profile?.status === "pending",
    refreshProfile,
  };
}
