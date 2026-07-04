"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useAppUser } from "@/features/auth/hooks/useAppUser";
import { getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  Mail,
  Shield,
  Bell,
  Smartphone,
  Palette,
  Globe,
  HelpCircle,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { clearUserProject } from "@/services/supabase/roundRobin";

export default function SettingsPage() {
  return (
    <AuthGate>
      <MainLayout>
        <SettingsContent />
      </MainLayout>
    </AuthGate>
  );
}

function SettingsContent() {
  const { user, client, project, profile } = useAppUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const sendPasswordReset = async () => {
    if (!user?.email) return;
    setLoading("password");
    setMessage(null);

    try {
      const config = getProjectConfig(project!);
      const supabase = createLoginClient(config);

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        setMessage({ type: "error", text: "Error: " + error.message });
      } else {
        setMessage({ type: "success", text: "¡Correo enviado! Revisa tu bandeja de entrada para cambiar la contraseña." });
      }
    } catch (err: any) {
      console.error("[SETTINGS] Error enviando reset de contraseña:", err?.message || err);
      setMessage({ type: "error", text: "Error al enviar el correo." });
    } finally {
      setLoading(null);
    }
  };

  const changeEmail = async (newEmail: string) => {
    if (!client) return;
    setLoading("email");

    try {
      const { error } = await client.auth.updateUser({ email: newEmail });
      if (error) {
        setMessage({ type: "error", text: "Error: " + error.message });
      } else {
        setMessage({ type: "success", text: "Se envió un correo de confirmación a tu nueva dirección." });
      }
    } catch (err: any) {
      console.error("[SETTINGS] Error cambiando correo:", err?.message || err);
      setMessage({ type: "error", text: "Error al cambiar el correo." });
    } finally {
      setLoading(null);
    }
  };

  const handleLogout = async () => {
    if (client) await client.auth.signOut();
    clearUserProject();
    router.push("/welcome");
  };

  interface SettingsItem {
    icon: React.ElementType;
    label: string;
    desc: string;
    action?: () => void;
    href?: string;
    loading?: boolean;
  }

  const settingsGroups: { title: string; items: SettingsItem[] }[] = [
    {
      title: "Cuenta",
      items: [
        {
          icon: KeyRound,
          label: "Cambiar contraseña",
          desc: "Enviar enlace de recuperación al correo",
          action: sendPasswordReset,
          loading: loading === "password",
        },
        {
          icon: Mail,
          label: "Cambiar correo",
          desc: user?.email || "",
          action: () => {
            const newEmail = prompt("Nuevo correo Gmail:", "");
            if (newEmail && newEmail.includes("@")) changeEmail(newEmail);
          },
          loading: loading === "email",
        },
      ],
    },
    {
      title: "Preferencias",
      items: [
        {
          icon: Bell,
          label: "Notificaciones",
          desc: "Configurar alertas",
          href: "/notifications",
        },
        {
          icon: Palette,
          label: "Tema",
          desc: "Claro / Oscuro / Automático",
          action: () => {
            // Toggle theme via next-themes
            const current = document.documentElement.classList.contains("dark");
            document.documentElement.classList.toggle("dark", !current);
            localStorage.setItem("theme", current ? "light" : "dark");
          },
        },
      ],
    },
    {
      title: "Información",
      items: [
        {
          icon: Shield,
          label: "Privacidad y seguridad",
          desc: "Cómo protegemos tus datos",
          action: () => setMessage({ type: "success", text: "Tus datos están protegidos con RLS y cifrado HTTPS." }),
        },
        {
          icon: Smartphone,
          label: "Instalar como app",
          desc: "Agregar a pantalla de inicio",
          action: () => setMessage({ type: "success", text: "En Safari: Compartir → Agregar a pantalla de inicio. En Chrome: menú → Instalar app." }),
        },
        {
          icon: Globe,
          label: "Proyecto Supabase",
          desc: `Proyecto ${project || "?"}`,
          action: () => {},
        },
      ],
    },
  ];

  return (
    <div className="p-6 pb-24 space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-2xl card-filled">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Configuración</h1>
          <p className="text-xs text-muted-foreground">Cuenta, seguridad y preferencias</p>
        </div>
      </motion.div>

      {/* Mensaje */}
      {message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-2xl border ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
          }`}
        >
          <div className="flex items-start gap-2">
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        </motion.div>
      )}

      {/* Info del perfil */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-filled rounded-[20px] p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-glow">
          <span className="text-white font-bold text-lg">
            {(profile?.full_name || user?.email || "U")[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{profile?.full_name || user?.email?.split("@")[0]}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <p className="text-[10px] text-primary font-semibold mt-0.5">
            {profile?.role === "admin" ? "👑 Administrador" : "🏷️ Gestor"} · Proyecto {project}
          </p>
        </div>
      </motion.div>

      {/* Grupos de settings */}
      {settingsGroups.map((group, gi) => (
        <motion.div
          key={group.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + gi * 0.05 }}
          className="space-y-2"
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">{group.title}</h2>
          <div className="card-filled rounded-[20px] overflow-hidden divide-y divide-border/30">
            {group.items.map((item, ii) => {
              const Icon = item.icon;
              const isLoading = item.loading;

              return (
                <button
                  key={ii}
                  onClick={() => {
                    if (item.href) router.push(item.href);
                    else if (item.action) item.action();
                  }}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface/50 transition-colors active:bg-surface"
                >
                  <div className="w-9 h-9 rounded-[12px] bg-surface flex items-center justify-center shrink-0">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                </button>
              );
            })}
          </div>
        </motion.div>
      ))}

      {/* Cerrar sesión */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-[20px] bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </motion.div>

      <p className="text-[10px] text-center text-muted-foreground/40 pt-2">
        YOLE SHOP APP v2.0 · Proyecto {project}
      </p>
    </div>
  );
}
