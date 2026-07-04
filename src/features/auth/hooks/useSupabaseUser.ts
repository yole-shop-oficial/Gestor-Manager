"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { loadUserProject, saveUserProject, getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import type { SupabaseClient } from "@supabase/supabase-js";

interface UseSupabaseUserResult {
  user: User | null;
  loading: boolean;
  client: SupabaseClient | null;
  project: 1 | 2 | null;
}

/**
 * Hook que obtiene el usuario actual, buscando en el proyecto
 * correcto según el round-robin (guardado en localStorage).
 */
export function useSupabaseUser(): UseSupabaseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [project, setProject] = useState<1 | 2 | null>(null);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // Intentar leer el proyecto guardado
      const savedProject = loadUserProject();

      if (!savedProject) {
        // No sabemos en qué proyecto está el usuario
        // Intentar ambos proyectos para ver dónde hay sesión activa
        for (const p of [1, 2] as const) {
          const config = getProjectConfig(p);
          if (!config.url || !config.anonKey) continue;

          const tempClient = createLoginClient(config);
          const { data } = await tempClient.auth.getUser();

          if (data?.user) {
            saveUserProject(p);
            if (!isMounted) return;

            setClient(tempClient);
            setUser(data.user);
            setProject(p);
            setLoading(false);

            // Escuchar cambios de auth en este cliente
            const { data: subscription } = tempClient.auth.onAuthStateChange(
              (_event, session) => {
                if (!isMounted) return;
                setUser(session?.user ?? null);
              }
            );

            // Cleanup en el return del useEffect
            return () => {
              isMounted = false;
              subscription.subscription.unsubscribe();
            };
          }
        }

        // No hay sesión en ningún proyecto
        if (isMounted) {
          setUser(null);
          setClient(null);
          setProject(null);
          setLoading(false);
        }
        return;
      }

      // Ya sabemos el proyecto
      const config = getProjectConfig(savedProject);
      if (!config.url || !config.anonKey) {
        if (isMounted) {
          setUser(null);
          setClient(null);
          setProject(null);
          setLoading(false);
        }
        return;
      }

      const authClient = createLoginClient(config);
      if (isMounted) {
        setClient(authClient);
        setProject(savedProject);
      }

      const { data } = await authClient.auth.getUser();
      if (isMounted) {
        setUser(data?.user ?? null);
      }

      const { data: subscription } = authClient.auth.onAuthStateChange(
        (_event, session) => {
          if (!isMounted) return;
          setUser(session?.user ?? null);
        }
      );

      if (isMounted) {
        setLoading(false);
      }

      return () => {
        isMounted = false;
        subscription.subscription.unsubscribe();
      };
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  return { user, loading, client, project };
}
