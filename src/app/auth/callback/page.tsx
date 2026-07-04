"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

/**
 * Página de callback para confirmación de email.
 * Supabase redirige aquí cuando el usuario confirma su correo.
 * Esta página verifica el hash fragment y redirige al login.
 *
 * Compatible con Safari/iOS — maneja el token en el hash
 * y no depende de cookies que Safari pueda bloquear.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verificando tu correo...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase pone el token en el hash: #access_token=xxx&type=signup
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1) // quitar el #
        );

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type"); // "signup" | "recovery" | "magiclink"

        if (!accessToken) {
          // No hay token en hash — quizás ya confirmó antes
          setStatus("success");
          setMessage("Tu correo ya fue confirmado. Puedes iniciar sesión.");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        setStatus("success");

        if (type === "recovery") {
          setMessage("¡Contraseña restablecida! Serás redirigido al login...");
        } else if (type === "magiclink") {
          setMessage("¡Enlace verificado! Iniciando sesión...");
        } else {
          setMessage("¡Correo confirmado! Tu cuenta está lista. Serás redirigido...");
        }

        // Limpiar el hash de la URL por seguridad
        window.history.replaceState(null, "", "/auth/callback");

        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } catch (err) {
        console.error("[AUTH CALLBACK] Error:", err);
        setStatus("error");
        setMessage("Hubo un problema verificando tu correo. Intenta iniciar sesión manualmente.");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="max-w-sm w-full text-center"
      >
        <div className="rounded-[32px] card-filled p-8 space-y-4">
          {/* Icono */}
          {status === "loading" && (
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto" />
          )}
          {status === "success" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            </motion.div>
          )}
          {status === "error" && (
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          )}

          {/* Mensaje */}
          <h1 className="text-xl font-bold">
            {status === "loading" && "Verificando..."}
            {status === "success" && "¡Todo listo!"}
            {status === "error" && "Ups..."}
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>

          {/* Botón manual */}
          {status !== "loading" && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/login")}
              className="w-full py-3 mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold text-sm shadow-lg"
            >
              Ir a iniciar sesión
            </motion.button>
          )}
        </div>

        {/* Logo */}
        <p className="text-xs text-muted-foreground/50 mt-4">
          YOLE SHOP APP
        </p>
      </motion.div>
    </div>
  );
}
