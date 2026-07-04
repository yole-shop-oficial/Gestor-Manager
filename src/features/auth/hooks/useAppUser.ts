"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadUserProject,
  saveUserProject,
  getProjectConfig,
  createLoginClient,
} from "@/services/supabase/roundRobin";

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

interface UseAppUserResult {
  user: User | null;
  loading: boolean;
  client: SupabaseClient | null;
  project: 1 | 2 | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  isAdmin: boolean;
  isGestor: boolean;
  isActive: boolean;
  isPending: boolean;
  refreshProfile: () => Promise<void>;
}

/**
 * Hook unificado que obtiene el usuario + perfil + rol.
 * Determina si es admin o gestor para redirigir al dashboard correcto.
 */
export function useAppUser(): UseAppUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [project, setProject] = useState<1 | 2 | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchProfile = useCallback(
    async (userId: string, supabaseClient: SupabaseClient) => {
      setProfileLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("[useAppUser] Error cargando perfil:", error.message);
        } else if (data) {
          setProfile(data as UserProfile);
        }
      } catch (err) {
        console.error("[useAppUser] Excepción:", err);
      } finally {
        setProfileLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
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

      if (!isMounted) return;

      if (result) {
        setUser(result.user);
        setClient(result.client);
        setProject(result.project);
        setLoading(false);

        // Cargar perfil
        fetchProfile(result.user.id, result.client);

        // Escuchar cambios de auth
        const { data: sub } = result.client.auth.onAuthStateChange(
          (_event, session) => {
            if (!isMounted) return;
            setUser(session?.user ?? null);
            if (!session?.user) {
              setProfile(null);
            }
          }
        );
        subscription = sub.subscription;
      } else {
        setUser(null);
        setClient(null);
        setProject(null);
        setProfile(null);
        setLoading(false);
        setProfileLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user && client) {
      await fetchProfile(user.id, client);
    }
  }, [user, client, fetchProfile]);

  return {
    user,
    loading,
    client,
    project,
    profile,
    profileLoading,
    isAdmin: profile?.role === "admin",
    isGestor: profile?.role === "gestor" || profile?.role === "moderator",
    isActive: profile?.status === "active",
    isPending: profile?.status === "pending",
    refreshProfile,
  };
}
