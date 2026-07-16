"use client";

import React, { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Sparkles, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/features/auth/validation";
import { loginWithRoundRobin } from "@/features/auth/api-login";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = useCallback(async (values: LoginFormValues) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setError(null);
    setLoading(true);

    try {
      const result = await loginWithRoundRobin(values.email, values.password);

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error("[LOGIN] Error inesperado:", err?.message || err);
      setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  }, [router]);

  return (
    <div className="min-h-dvh flex flex-col bg-background relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute -top-40 -right-40 w-[400px] h-[400px] bg-indigo-500/8 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-purple-500/8 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      {/* Partículas extra en dark */}
      {/* Partículas eliminadas (causaban GPU stress en Android) */}

      {/* Botón volver */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="pt-6 pl-4 relative z-10"
      >
        <button
          type="button"
          onClick={() => router.push("/welcome")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-2xl active:bg-surface"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </button>
      </motion.div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col justify-center px-8 max-w-sm mx-auto w-full relative z-10">
        {/* Logo e info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="w-20 h-20 mx-auto mb-5 rounded-[26px] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-glow"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-extrabold gradient-text mb-1">
            Iniciar sesión
          </h1>
          <p className="text-sm text-muted-foreground">
            Accede con tu correo y contraseña
          </p>
        </motion.div>

        {/* Formulario */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Campo correo */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold pl-1">Correo Gmail</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-[14px] bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <input
                type="email"
                placeholder="tucorreo@gmail.com"
                autoComplete="email"
                className="w-full card-filled border-2 border-border/40 rounded-[20px] py-4 pl-16 pr-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive pl-2">{errors.email.message}</p>
            )}
          </div>

          {/* Campo contraseña */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold pl-1">Contraseña</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-[14px] bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center">
                <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full card-filled border-2 border-border/40 rounded-[20px] py-4 pl-16 pr-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive pl-2">{errors.password.message}</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl"
            >
              <p className="text-sm text-red-700 dark:text-red-400 text-center font-medium">
                {error}
              </p>
            </motion.div>
          )}

          {/* Botón entrar */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-[20px] font-bold text-base text-white bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 shadow-glow disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? "Buscando tu cuenta..." : "Entrar"}
          </motion.button>
        </motion.form>

        {/* Enlace a registrarse */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 pt-6 border-t border-border/40 text-center"
        >
          <p className="text-sm text-muted-foreground mb-3">
            ¿No tienes cuenta?
          </p>
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="w-full py-3.5 rounded-[20px] font-bold text-sm card-filled border-2 border-border/50 active:scale-[0.97] transition-transform"
          >
            Crear cuenta de gestor
          </button>
        </motion.div>
      </div>
    </div>
  );
}
