"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { motion } from "framer-motion";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useSupabaseUser } from "@/features/auth/hooks/useSupabaseUser";
import { clearUserProject, getProjectConfig, createLoginClient } from "@/services/supabase/roundRobin";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Shield,
  LogOut,
  Server,
  Hash,
  BadgeCheck,
  AlertTriangle,
  Loader2,
  Settings,
  Bell,
} from "lucide-react";

interface ProfileData {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  age: number;
  birth_date: string;
  gender: string;
  id_card: string;
  address: string;
  bank_card_number: string;
  bank_card_holder: string;
  role: string;
  status: string;
  has_sales_experience: boolean;
  join_date: string;
  assigned_project: number;
}

export default function ProfilePage() {
  return (
    <AuthGate>
      <MainLayout>
        <ProfileContent />
      </MainLayout>
    </AuthGate>
  );
}

function ProfileContent() {
  const { user, client, project } = useSupabaseUser();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user || !project) {
      setProfileLoading(false);
      return;
    }

    try {
      const config = getProjectConfig(project);
      const supabase = client || createLoginClient(config);

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

      if (error) {
        console.error("[PROFILE] Error cargando perfil:", error.message);
      } else if (data) {
        setProfile(data as ProfileData);
      }
    } catch (err) {
      console.error("[PROFILE] Excepción cargando perfil:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [user, client, project]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (client) await client.auth.signOut();
      clearUserProject();
    } finally {
      setLoggingOut(false);
    }
  };

  const statusColor = profile?.status === "active"
    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
    : profile?.status === "pending"
    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
    : profile?.status === "denied"
    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
    : profile?.status === "blocked"
    ? "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400"
    : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400";

  const statusLabel = profile?.status === "active" ? "Activa"
    : profile?.status === "pending" ? "Pendiente"
    : profile?.status === "denied" ? "Denegada"
    : profile?.status === "blocked" ? "Bloqueada"
    : "Desconocido";

  const genderLabel = profile?.gender === "male" ? "Masculino"
    : profile?.gender === "female" ? "Femenino"
    : profile?.gender === "other" ? "Otro"
    : "—";

  return (
    <div className="p-6 pb-24 space-y-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-muted-foreground">Datos del gestor y configuración personal.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-[24px] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-5 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-[20px] bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{profile?.full_name || user?.email?.split("@")[0] || "Gestor"}</h2>
            <p className="text-xs text-white/70">@{profile?.username || "—"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>{statusLabel}</span>
              <span className="text-[10px] text-white/50 capitalize">{profile?.role === "gestor" ? "Gestor" : profile?.role === "admin" ? "Admin" : profile?.role === "moderator" ? "Moderador" : "Gestor"}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-[24px] card-filled p-5 space-y-4">
        <h3 className="text-sm font-semibold">Datos personales</h3>
        {profileLoading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            <ProfileRow icon={Mail} label="Correo" value={profile?.email || user?.email || "—"} />
            <ProfileRow icon={Phone} label="Teléfono" value={profile?.phone ? `+53 ${profile.phone.replace(/^\+53/, "").trim()}` : "—"} />
            <ProfileRow icon={Calendar} label="Edad" value={profile?.age ? `${profile.age} años` : "—"} />
            <ProfileRow icon={Calendar} label="Fecha de nacimiento" value={profile?.birth_date || "—"} />
            <ProfileRow icon={User} label="Género" value={genderLabel} />
            <ProfileRow icon={Hash} label="Carnet de identidad" value={profile?.id_card ? `****${profile.id_card.slice(-4)}` : "—"} />
            <ProfileRow icon={MapPin} label="Dirección" value={profile?.address || "—"} />
            <ProfileRow icon={CreditCard} label="Tarjeta bancaria" value={profile?.bank_card_number ? `****${profile.bank_card_number.slice(-4)}` : "—"} />
            <ProfileRow icon={BadgeCheck} label="Experiencia en ventas" value={profile?.has_sales_experience ? "Sí" : "No"} />
            <ProfileRow icon={Calendar} label="Fecha de ingreso" value={profile?.join_date || "—"} />
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-[24px] card-filled p-5 space-y-3">
        <h3 className="text-sm font-semibold">Información del sistema</h3>
        <div className="space-y-2">
          <ProfileRow icon={Server} label="Proyecto Supabase" value={`Proyecto ${project || profile?.assigned_project || "?"}`} />
          <ProfileRow icon={Shield} label="ID de usuario" value={user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : "—"} />
        </div>
      </motion.div>

      {profile?.status === "pending" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-[20px] bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">Cuenta pendiente de aprobación</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">Un administrador debe activar tu cuenta para que puedas crear pedidos y ver tu wallet. Recibirás una notificación cuando tu cuenta sea activada.</p>
          </div>
        </motion.div>
      )}

      {profile?.status === "denied" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-[20px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-300">Cuenta denegada</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">Tu solicitud de registro fue denegada por un administrador. Contacta al soporte a través del chat si crees que es un error.</p>
          </div>
        </motion.div>
      )}

      {profile?.status === "blocked" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-[20px] bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-300">Cuenta bloqueada</p>
            <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">Tu cuenta ha sido bloqueada por un administrador. Contacta al soporte para más información.</p>
          </div>
        </motion.div>
      )}

      {/* Acciones rápidas */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 gap-3">
        <Link href="/notifications">
          <motion.div whileTap={{ scale: 0.95 }} className="card-filled rounded-[20px] p-4 flex flex-col items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            <span className="text-xs font-bold">Notificaciones</span>
          </motion.div>
        </Link>
        <Link href="/settings">
          <motion.div whileTap={{ scale: 0.95 }} className="card-filled rounded-[20px] p-4 flex flex-col items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            <span className="text-xs font-bold">Configuración</span>
          </motion.div>
        </Link>
      </motion.div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-[24px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
        {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
      </motion.button>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}
