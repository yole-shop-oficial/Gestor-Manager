"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSettings, verifyPin } from "@/features/setup/settings";
import { Lock, Loader2 } from "lucide-react";

interface PinLockProps {
  onUnlock: () => void;
}

export function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const settings = getSettings();

  const handlePinSubmit = useCallback(async () => {
    if (pin.length !== 4) return;
    setVerifying(true);
    setError("");

    try {
      const valid = await verifyPin(pin, settings.pinCode);
      if (valid) {
        onUnlock();
      } else {
        setPin("");
        setAttempts(prev => prev + 1);
        setError(attempts >= 2 ? "Último intento. ¿Olvidaste tu PIN?" : "PIN incorrecto");
      }
    } catch {
      setError("Error verificando PIN");
      setPin("");
    } finally {
      setVerifying(false);
    }
  }, [pin, settings.pinCode, onUnlock, attempts]);

  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit();
    }
  }, [pin, handlePinSubmit]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 max-w-xs w-full"
      >
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-glow">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold">YOLE SHOP</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresa tu PIN para continuar</p>
        </div>

        {/* PIN Dots */}
        <div className="flex gap-3 justify-center">
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              animate={error && i < pin.length ? { x: [0, -5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.3 }}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-500 font-medium"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              onClick={() => pin.length < 4 && setPin(prev => prev + n)}
              className="w-16 h-16 rounded-2xl card-filled text-xl font-bold flex items-center justify-center mx-auto active:scale-[0.92] transition-transform"
            >
              {n}
            </button>
          ))}
          <div className="w-16 h-16" /> {/* Empty space */}
          <button
            onClick={() => pin.length < 4 && setPin(prev => prev + "0")}
            className="w-16 h-16 rounded-2xl card-filled text-xl font-bold flex items-center justify-center mx-auto active:scale-[0.92] transition-transform"
          >
            0
          </button>
          <button
            onClick={() => setPin(prev => prev.slice(0, -1))}
            className="w-16 h-16 rounded-2xl card-filled text-lg font-bold text-muted-foreground flex items-center justify-center mx-auto active:scale-[0.92] transition-transform"
          >
            ←
          </button>
        </div>

        {verifying && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Verificando...
          </div>
        )}
      </motion.div>
    </div>
  );
}
