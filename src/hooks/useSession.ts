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
  /** Supabase Auth user (null if not logged in) */
  user: User | null;
  /** Supabase client for the user's project */
  client: SupabaseClient | null;
  /** Which project (1 or 2) the user belongs to */
  project: 1 | 2 | null;
  /** User profile from `profiles` table (cached 5 min) */
  profile: UserProfile | null;
  /** True while auth session is being resolved */
  loading: boolean;
  /** True while profile is being fetched (may lag behind loading) */
  profileLoading: boolean;
  /** Derived: profile?.role === "admin" */
  isAdmin: boolean;
  /** Derived: profile?.role === "gestor" || "moderator" */
  isGestor: boolean;
  /** Derived: profile?.status === "active" */
  isActive: boolean;
  /** Derived: profile?.status === "pending" */
  isPending: boolean;
  /** Force-refresh the profile, bypassing cache */
  refreshProfile: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════
// PROFILE CACHE (module-level, survives remounts)
// ═══════════════════════════════════════════════════════════

const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ProfileCacheEntry {
  profile: UserProfile;
  cachedAt: number;
}

const profileCache = new Map<string, ProfileCacheEntry>();

function getCachedProfile(userId: string): UserProfile | null {
  const entry = profileCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > PROFILE_CACHE_TTL) {
    profileCache.delete(userId);
    return null;
  }
  return entry.profile;
}

function setCachedProfile(userId: string, profile: UserProfile): void {
  profileCache.set(userId, { profile, cachedAt: Date.now() });
}

function clearCachedProfile(userId: string): void {
  profileCache.delete(userId);
}

// ═══════════════════════════════════════════════════════════
// SINGLETON: ensure only one auth listener exists
// ═══════════════════════════════════════════════════════════

let singletonInitialized = false;
let singletonUser: User | null = null;
let singletonClient: SupabaseClient | null = null;
let singletonProject: 1 | 2 | null = null;
let singletonLoading = true;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function initAuthSingleton() {
  if (singletonInitialized) return;

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
    singletonLoading = false;
    notifyListeners();

    // Listen for auth changes
    result.client.auth.onAuthStateChange((_event, session) => {
      singletonUser = session?.user ?? null;
      if (!session?.user) {
        singletonClient = null;
        singletonProject = null;
        profileCache.clear();
      }
      notifyListeners();
    });
  } else {
    singletonUser = null;
    singletonClient = null;
    singletonProject = null;
    singletonLoading = false;
    notifyListeners();
  }

  singletonInitialized = true;
}

// ═══════════════════════════════════════════════════════════
// useSession HOOK
// ═══════════════════════════════════════════════════════════

export function useSession(): UseSessionResult {
  const [, forceUpdate] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const profileFetchRef = useRef<string | false>(false);

  // Subscribe to singleton changes
  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    listeners.add(update);

    // Init on first mount
    if (!singletonInitialized) {
      initAuthSingleton();
    }

    return () => {
      listeners.delete(update);
    };
  }, []);

  // Fetch profile when user becomes available
  useEffect(() => {
    if (!singletonUser || !singletonClient) {
      setProfile(null);
      setProfileLoading(false);
      profileFetchRef.current = false;
      return;
    }

    // Avoid duplicate fetch for same user
    const currentUserId = singletonUser.id;
    if (profileFetchRef.current === currentUserId) return;
    profileFetchRef.current = currentUserId;

    // Check cache first
    const cached = getCachedProfile(singletonUser.id);
    if (cached) {
      setProfile(cached);
      setProfileLoading(false);
      return;
    }

    // Fetch from Supabase
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

    return () => {
      cancelled = true;
    };
  }, [singletonUser?.id, singletonClient]);

  const refreshProfile = useCallback(async () => {
    const userId = singletonUser?.id;
    const client = singletonClient;
    if (!userId || !client) return;

    clearCachedProfile(userId);
    setProfileLoading(true);

    try {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

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
