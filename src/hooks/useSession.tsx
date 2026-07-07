"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadUserProject,
  saveUserProject,
  getProjectConfig,
  createLoginClient,
} from "@/services/supabase/roundRobin";
import { logger } from "@/lib/logger";

// ═══════════════════════════════════════════════════════════════
// TYPES — Same API as before, no breaking changes
// ═══════════════════════════════════════════════════════════════

export type UserRole = "admin" | "manager" | "gestor" | "moderator";
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
  // ─── v3.0 Árbol Comercial ───
  manager_code?: string;
  parent_id?: string;
  level?: number;
  path?: string;
  children_count?: number;
  total_network_size?: number;
  avatar_url?: string;
  last_seen_at?: string;
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

// ═══════════════════════════════════════════════════════════════
// SESSION STATE — Simple, no useSyncExternalStore
//
// WHY THIS REWRITE?
// The previous useSyncExternalStore approach caused React #310
// (infinite re-render) in production. The root cause was the
// interaction between:
//   1. useSyncExternalStore + module-level mutable snapshot
//   2. Each component had its own profile/profileLoading state
//   3. useRealtime depended on client/project in useEffect deps
//
// This version uses React Context with a SINGLE provider that
// manages ALL session state (including profile). Components just
// read from context. No per-component state cascades.
// ═══════════════════════════════════════════════════════════════

interface SessionState {
  user: User | null;
  client: SupabaseClient | null;
  project: 1 | 2 | null;
  loading: boolean;
  profile: UserProfile | null;
  profileLoading: boolean;
}

const INITIAL_STATE: SessionState = {
  user: null,
  client: null,
  project: null,
  loading: true,
  profile: null,
  profileLoading: true,
};

// ═══════════════════════════════════════════════════════════════
// PROFILE CACHE (module-level, shared across sessions)
// ═══════════════════════════════════════════════════════════════

const PROFILE_CACHE_TTL = 5 * 60 * 1000;
const profileCache = new Map<string, { profile: UserProfile; cachedAt: number }>();

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

function clearProfileCache(): void {
  profileCache.clear();
}

// ═══════════════════════════════════════════════════════════════
// MODULE-LEVEL SETTERS (backward-compatible API)
//
// setSession() and clearSession() are called from:
//   - api-login.ts (after successful login)
//   - settings/page.tsx (on logout)
//
// They delegate to the provider via a module-level reference.
// ═══════════════════════════════════════════════════════════════

type SetStateFn = (update: Partial<SessionState>) => void;
let providerSetState: SetStateFn | null = null;

/**
 * Set the current session (called after login).
 * Updates the provider's state, which propagates to all consumers.
 */
export function setSession(user: User, client: SupabaseClient, project: 1 | 2): void {
  saveUserProject(project);
  logger.setUser(user.id, project);

  if (providerSetState) {
    // Set user/client/project immediately, mark profile as loading
    providerSetState({
      user,
      client,
      project,
      loading: false,
      profile: null,
      profileLoading: true,
    });
  }
}

/**
 * Clear the current session (called on logout).
 */
export function clearSession(): void {
  clearProfileCache();
  logger.setUser(null, null);
  logger.flush();

  if (providerSetState) {
    providerSetState({
      user: null,
      client: null,
      project: null,
      loading: false,
      profile: null,
      profileLoading: false,
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT — Default value for SSR and safety
// ═══════════════════════════════════════════════════════════════

const SessionContext = createContext<UseSessionResult>({
  user: null,
  client: null,
  project: null,
  profile: null,
  loading: true,
  profileLoading: true,
  isAdmin: false,
  isGestor: false,
  isActive: false,
  isPending: false,
  refreshProfile: async () => {},
});

// ═══════════════════════════════════════════════════════════════
// SESSION PROVIDER
//
// ONE component that manages ALL session state:
//   - Initialization (check localStorage for existing session)
//   - Profile fetching (single fetch, not per-component)
//   - Session updates (via setSession/clearSession)
//
// This eliminates the cascade of per-component state updates
// that caused React #310.
// ═══════════════════════════════════════════════════════════════

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<SessionState>(INITIAL_STATE);

  // Stable merge-setState (never changes identity)
  const setState = useCallback<SetStateFn>((update) => {
    setStateRaw((prev) => ({ ...prev, ...update }));
  }, []);

  // Register provider so setSession/clearSession can update it
  useEffect(() => {
    providerSetState = setState;
    return () => {
      providerSetState = null;
    };
  }, [setState]);

  // ─── INIT: Check for existing session (runs ONCE) ───
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    (async () => {
      try {
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

        let result: {
          user: User;
          client: SupabaseClient;
          project: 1 | 2;
        } | null = null;

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
          logger.setUser(result.user.id, result.project);
          setState({
            user: result.user,
            client: result.client,
            project: result.project,
            loading: false,
            // profile is still null, profileLoading will be set by profile effect
          });
        } else {
          setState({ loading: false, profileLoading: false });
        }
      } catch (err) {
        console.error("[SessionProvider] Init error:", err);
        setState({ loading: false, profileLoading: false });
      }
    })();
  }, [setState]);

  // ─── PROFILE FETCH: ONE instance, not per-component ───
  // Only re-fetches when user?.id changes (login/logout)
  const profileUserId = useRef<string | null>(null);
  useEffect(() => {
    const userId = state.user?.id ?? null;

    // No user → clear profile
    if (!userId || !state.client) {
      if (state.profile !== null || state.profileLoading !== false) {
        setState({ profile: null, profileLoading: false });
      }
      profileUserId.current = null;
      return;
    }

    // Already fetching or fetched this user
    if (profileUserId.current === userId) return;
    profileUserId.current = userId;

    // Check cache first
    const cached = getCachedProfile(userId);
    if (cached) {
      setState({ profile: cached, profileLoading: false });
      return;
    }

    // Fetch profile
    setState({ profileLoading: true, profile: null });

    let cancelled = false;
    state.client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(
            "[SessionProvider] Error cargando perfil:",
            error.message
          );
          setState({ profileLoading: false });
        } else if (data) {
          const p = data as UserProfile;
          setCachedProfile(userId, p);
          setState({ profile: p, profileLoading: false });
        } else {
          setState({ profileLoading: false });
        }
      });

    return () => {
      cancelled = true;
    };
    // IMPORTANT: deps are ONLY state.user?.id and state.client
    // NOT the full state object — prevents unnecessary re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id, state.client, setState]);

  // ─── REFRESH PROFILE callback ───
  const refreshProfile = useCallback(async () => {
    const userId = state.user?.id;
    const client = state.client;
    if (!userId || !client) return;

    profileCache.delete(userId);
    profileUserId.current = null; // Allow re-fetch
    setState({ profileLoading: true });

    try {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) {
        console.error(
          "[SessionProvider] Error refrescando perfil:",
          error.message
        );
      } else if (data) {
        const p = data as UserProfile;
        setCachedProfile(userId, p);
        setState({ profile: p, profileLoading: false });
      }
    } catch (err) {
      console.error("[SessionProvider] Excepción:", err);
      setState({ profileLoading: false });
    }
  }, [state.user?.id, state.client, setState]);

  // ─── COMPUTE CONTEXT VALUE (memoized) ───
  const value = useMemo<UseSessionResult>(
    () => ({
      user: state.user,
      client: state.client,
      project: state.project,
      profile: state.profile,
      loading: state.loading,
      profileLoading: state.profileLoading,
      isAdmin: state.profile?.role === "admin",
      isGestor:
        state.profile?.role === "gestor" ||
        state.profile?.role === "moderator",
      isActive: state.profile?.status === "active",
      isPending: state.profile?.status === "pending",
      refreshProfile,
    }),
    [state, refreshProfile]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOOK: useSession
//
// Just reads from context. No local state. No effects.
// This is the key change — previously each call to useSession()
// created its own profile/profileLoading state, causing cascading
// renders. Now there's ONE source of truth in SessionProvider.
// ═══════════════════════════════════════════════════════════════

export function useSession(): UseSessionResult {
  return useContext(SessionContext);
}
