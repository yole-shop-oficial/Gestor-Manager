"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  detectDevice,
  applyTheme,
  applyAccentColor,
  ACCENT_PRESETS,
  type AccentPreset,
  markSetupComplete,
  hashPin,
  type AppSettings,
} from "@/features/setup/settings";
import {
  Bot,
  ChevronRight,
  Check,
  Smartphone,
  Palette,
  Shield,
  Lock,
  Loader2,
  Sun,
  Moon,
  Sparkles,
  Volume2,
  Wifi,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type Step = 
  | "welcome"
  | "ready"
  | "detect-device"
  | "choose-theme"
  | "choose-accent"
  | "security-level"
  | "set-pin"
  | "confirm-pin"
  | "preloading"
  | "done";

interface BotMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════
// ANIMATION HELPERS
// ═══════════════════════════════════════════════════════════

const msgVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, damping: 20, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

let msgIdCounter = 0;
function nextId() { return `msg-${++msgIdCounter}`; }

// ═══════════════════════════════════════════════════════════
// SETUP BOT COMPONENT
// ═══════════════════════════════════════════════════════════

export function SetupBot({ onComplete }: { onComplete: (settings: Partial<AppSettings>) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [botTyping, setBotTyping] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<ReturnType<typeof detectDevice> | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("system");
  const [selectedAccent, setSelectedAccent] = useState<AccentPreset>(ACCENT_PRESETS[0]);
  const [securityLevel, setSecurityLevel] = useState<"basic" | "medium" | "high">("basic");
  const [pinInput, setPinInput] = useState("");
  const [pinHash, setPinHash] = useState("");
  const [pinError, setPinError] = useState("");
  const [preloadProgress, setPreloadProgress] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping]);

  // Add bot message with typing animation
  const addBotMessage = useCallback((text: string, delay = 800) => {
    return new Promise<void>((resolve) => {
      setBotTyping(true);
      setTimeout(() => {
        setBotTyping(false);
        setMessages(prev => [...prev, { id: nextId(), text, isBot: true, timestamp: Date.now() }]);
        setTimeout(resolve, 300);
      }, delay);
    });
  }, []);

  // Add user message
  const addUserMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: nextId(), text, isBot: false, timestamp: Date.now() }]);
  }, []);

  // ─── WELCOME STEP ───
  useEffect(() => {
    if (step === "welcome") {
      addBotMessage("¡Hola! 👋 Soy YoleBot, tu asistente de configuración.", 1000)
        .then(() => addBotMessage("Voy a ayudarte a ajustar la aplicación a tus preferencias y comodidad. 🛠️", 1200))
        .then(() => addBotMessage("Es la primera vez que usas esta aplicación, así que necesito hacer algunos ajustes iniciales.", 1400))
        .then(() => addBotMessage("Esto puede tardar más de 1 minuto según tu conexión. ¿Estás listo/a? 👇", 1000));
    }
  }, [step, addBotMessage]);

  // ─── DEVICE DETECTION ───
  useEffect(() => {
    if (step === "detect-device") {
      const device = detectDevice();
      setDeviceInfo(device);
      addBotMessage("¡Pues comencemos! 🚀 Primero voy a analizar en qué dispositivo estamos...", 1000)
        .then(() => addBotMessage("Analizando... 🔍", 2000))
        .then(() => addBotMessage(
          `✅ Detectado:\n` +
          `📱 Dispositivo: ${device.type}\n` +
          `💻 Sistema: ${device.os}\n` +
          `🌐 Navegador: ${device.browser}\n` +
          `📐 Pantalla: ${device.screen}`,
          1500
        ))
        .then(() => addBotMessage("¿Estoy en lo cierto? 😎", 800));
    }
  }, [step, addBotMessage]);

  // ─── THEME SELECTION ───
  useEffect(() => {
    if (step === "choose-theme") {
      addBotMessage("¡Perfecto! Ahora vamos a elegir cómo quieres que se vea la app. 🎨", 1000)
        .then(() => addBotMessage("¿Qué tema prefieres? Puedes cambiarlo después en Configuración.", 1000));
    }
  }, [step, addBotMessage]);

  // ─── ACCENT COLOR ───
  useEffect(() => {
    if (step === "choose-accent") {
      addBotMessage(`¡Tema ${selectedTheme === "dark" ? "oscuro" : selectedTheme === "light" ? "claro" : "automático"} seleccionado! ✅`, 800)
        .then(() => addBotMessage("Ahora elige tu color de acento. Este será el color principal de la app. 🌈", 1200));
    }
  }, [step, addBotMessage, selectedTheme]);

  // ─── SECURITY LEVEL ───
  useEffect(() => {
    if (step === "security-level") {
      addBotMessage("¡Excelente gusto! 🎨 Ahora hablemos de seguridad. 🔐", 1000)
        .then(() => addBotMessage("¿Qué nivel de seguridad deseas?", 1000));
    }
  }, [step, addBotMessage]);

  // ─── SET PIN ───
  useEffect(() => {
    if (step === "set-pin") {
      addBotMessage("Nivel de seguridad seleccionado. 🔒 Ahora configura tu PIN de acceso.", 1000)
        .then(() => addBotMessage("Ingresa un PIN de 4 dígitos. Este se te pedirá al abrir la app.", 1200));
    }
  }, [step, addBotMessage]);

  // ─── CONFIRM PIN ───
  useEffect(() => {
    if (step === "confirm-pin") {
      addBotMessage("Confirma tu PIN ingresándolo de nuevo.", 800);
    }
  }, [step, addBotMessage]);

  // ─── PRELOADING ───
  useEffect(() => {
    if (step === "preloading") {
      addBotMessage("¡Fue un gusto configurar todo contigo! 🤝", 1000)
        .then(() => addBotMessage("¡Bienvenido/a a la aplicación YOLE SHOP! 🎉", 1500))
        .then(() => addBotMessage("A continuación estaremos descargando los datos del programa para que funcione 100% sin problemas, sin atrasos y sin conexión. 📦", 1500))
        .then(() => {
          // Simulate preloading
          let progress = 0;
          const interval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress >= 100) {
              progress = 100;
              clearInterval(interval);
              setPreloadProgress(100);
              setTimeout(() => setStep("done"), 800);
            }
            setPreloadProgress(Math.min(progress, 100));
          }, 500);
        });
    }
  }, [step, addBotMessage]);

  // ─── DONE ───
  useEffect(() => {
    if (step === "done") {
      const settings: Partial<AppSettings> = {
        theme: selectedTheme,
        accentColor: selectedAccent.color,
        pinCode: pinHash,
        securityLevel,
        deviceType: deviceInfo?.type || "Móvil",
        language: "es",
      };
      markSetupComplete(settings);
      onComplete(settings);
      
      addBotMessage("✅ ¡Todo listo! Redirigiendo...", 1000).then(() => {
        setTimeout(() => router.push("/welcome"), 1500);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── PIN SUBMIT ───
  const handlePinSubmit = async () => {
    if (step === "set-pin") {
      if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
        setPinError("El PIN debe tener exactamente 4 dígitos");
        return;
      }
      const hash = await hashPin(pinInput);
      setPinHash(hash);
      setPinInput("");
      setPinError("");
      addUserMessage("PIN ingresado ****");
      setStep("confirm-pin");
    } else if (step === "confirm-pin") {
      const hash = await hashPin(pinInput);
      if (hash !== pinHash) {
        setPinError("Los PINs no coinciden. Intenta de nuevo.");
        setPinInput("");
        return;
      }
      setPinError("");
      addUserMessage("PIN confirmado **** ✅");
      addBotMessage("¡PIN configurado correctamente! 🔐✅", 800).then(() => setStep("preloading"));
    }
  };

  // ─── HANDLE USER ACTIONS ───
  const handleReadyYes = () => {
    addUserMessage("¡Sí, estoy listo/a!");
    setStep("detect-device");
  };

  const handleReadyNo = () => {
    addUserMessage("No todavía...");
    addBotMessage("¡No hay prisa! Presiona 'Sí' cuando estés listo/a para continuar. 😊", 1000);
  };

  const handleDeviceConfirm = () => {
    addUserMessage("¡Sí, es correcto!");
    addBotMessage("¡Genial! Pasemos a la personalización. 🎨", 800).then(() => setStep("choose-theme"));
  };

  const handleThemeSelect = (theme: "light" | "dark" | "system") => {
    setSelectedTheme(theme);
    applyTheme(theme);
    addUserMessage(`Tema ${theme === "dark" ? "oscuro" : theme === "light" ? "claro" : "automático"}`);
    setStep("choose-accent");
  };

  const handleAccentSelect = (preset: AccentPreset) => {
    setSelectedAccent(preset);
    applyAccentColor(preset.color, preset.darkPrimary);
    addUserMessage(`Color: ${preset.name}`);
    addBotMessage(`¡${preset.name}! Excelente elección. 👌`, 600).then(() => setStep("security-level"));
  };

  const handleSecurityLevel = (level: "basic" | "medium" | "high") => {
    setSecurityLevel(level);
    addUserMessage(`Seguridad: ${level === "basic" ? "Básica" : level === "medium" ? "Media" : "Alta"}`);
    if (level === "basic") {
      addBotMessage("Seguridad básica seleccionada. Sin PIN de acceso.", 800).then(() => setStep("preloading"));
    } else {
      setStep("set-pin");
    }
  };

  const skipPin = () => {
    addUserMessage("Saltar PIN");
    addBotMessage("Sin problema, puedes configurarlo después en Ajustes. 👍", 800).then(() => setStep("preloading"));
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold">YoleBot</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            En línea
          </p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              variants={msgVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}
            >
              <div className={`max-w-[85%] rounded-[18px] px-4 py-3 ${
                msg.isBot
                  ? "card-filled rounded-bl-md"
                  : "bg-primary text-primary-foreground rounded-br-md"
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bot typing indicator */}
        {botTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="card-filled rounded-[18px] rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Action Area */}
      <div className="border-t border-border/30 p-4 safe-bottom">
        <AnimatePresence mode="wait">
          {/* WELCOME: Yes/No */}
          {step === "welcome" && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex gap-3">
              <button
                onClick={handleReadyYes}
                className="flex-1 py-3.5 rounded-[14px] bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Check className="w-4 h-4" /> ¡Sí, vamos!
              </button>
              <button
                onClick={handleReadyNo}
                className="py-3.5 px-5 rounded-[14px] card-filled text-sm font-semibold text-muted-foreground active:scale-[0.97] transition-transform"
              >
                No
              </button>
            </motion.div>
          )}

          {/* DEVICE CONFIRM */}
          {step === "detect-device" && deviceInfo && (
            <motion.div key="device" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex gap-3">
              <button
                onClick={handleDeviceConfirm}
                className="flex-1 py-3.5 rounded-[14px] bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Check className="w-4 h-4" /> Confirmar
              </button>
            </motion.div>
          )}

          {/* THEME SELECTION */}
          {step === "choose-theme" && (
            <motion.div key="theme" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-3 gap-2">
              {([
                { value: "light" as const, icon: Sun, label: "Claro", desc: "Fondo blanco" },
                { value: "dark" as const, icon: Moon, label: "Oscuro", desc: "Fondo oscuro" },
                { value: "system" as const, icon: Smartphone, label: "Auto", desc: "Del sistema" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleThemeSelect(opt.value)}
                  className="py-3 rounded-[14px] card-filled text-center active:scale-[0.97] transition-transform space-y-1"
                >
                  <opt.icon className="w-5 h-5 mx-auto text-primary" />
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className="text-[9px] text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </motion.div>
          )}

          {/* ACCENT COLOR */}
          {step === "choose-accent" && (
            <motion.div key="accent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-4 gap-2">
              {ACCENT_PRESETS.map((preset: AccentPreset) => (
                <button
                  key={preset.name}
                  onClick={() => handleAccentSelect(preset)}
                  className="py-3 rounded-[14px] card-filled text-center active:scale-[0.97] transition-transform space-y-1"
                >
                  <div
                    className="w-8 h-8 rounded-full mx-auto shadow-lg"
                    style={{ backgroundColor: preset.color }}
                  />
                  <p className="text-[10px] font-semibold">{preset.name}</p>
                </button>
              ))}
            </motion.div>
          )}

          {/* SECURITY LEVEL */}
          {step === "security-level" && (
            <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
              {([
                { value: "basic" as const, icon: Shield, label: "Básica", desc: "Sin PIN, solo contraseña de cuenta", color: "text-green-500" },
                { value: "medium" as const, icon: Lock, label: "Media", desc: "PIN de 4 dígitos al abrir la app", color: "text-yellow-500" },
                { value: "high" as const, icon: Lock, label: "Alta", desc: "PIN + bloqueo por inactividad", color: "text-red-500" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleSecurityLevel(opt.value)}
                  className="w-full p-3 rounded-[14px] card-filled flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                >
                  <opt.icon className={`w-5 h-5 ${opt.color} shrink-0`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </button>
              ))}
            </motion.div>
          )}

          {/* PIN INPUT */}
          {(step === "set-pin" || step === "confirm-pin") && (
            <motion.div key="pin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`flex-1 h-14 rounded-[12px] border-2 flex items-center justify-center text-xl font-bold transition-colors ${
                      i < pinInput.length
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface"
                    }`}
                  >
                    {i < pinInput.length ? "●" : ""}
                  </div>
                ))}
              </div>

              {pinError && (
                <p className="text-xs text-red-500 text-center font-medium">{pinError}</p>
              )}

              {/* Numeric keypad */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button
                    key={n}
                    onClick={() => pinInput.length < 4 && setPinInput(prev => prev + n)}
                    className="py-3.5 rounded-[14px] card-filled text-lg font-bold active:scale-[0.95] transition-transform"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={skipPin}
                  className="py-3.5 rounded-[14px] card-filled text-[10px] font-semibold text-muted-foreground active:scale-[0.95] transition-transform"
                >
                  Saltar
                </button>
                <button
                  onClick={() => pinInput.length < 4 && setPinInput(prev => prev + "0")}
                  className="py-3.5 rounded-[14px] card-filled text-lg font-bold active:scale-[0.95] transition-transform"
                >
                  0
                </button>
                <button
                  onClick={() => setPinInput(prev => prev.slice(0, -1))}
                  className="py-3.5 rounded-[14px] card-filled text-sm font-bold text-muted-foreground active:scale-[0.95] transition-transform"
                >
                  ←
                </button>
              </div>

              {pinInput.length === 4 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handlePinSubmit}
                  className="w-full py-3.5 rounded-[14px] bg-primary text-primary-foreground text-sm font-bold active:scale-[0.97] transition-transform"
                >
                  {step === "set-pin" ? "Continuar" : "Confirmar PIN"}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* PRELOADING PROGRESS */}
          {step === "preloading" && (
            <motion.div key="preloading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              <div className="h-3 rounded-full bg-surface overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                  style={{ width: `${preloadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Descargando datos... {Math.round(preloadProgress)}%</span>
              </div>
            </motion.div>
          )}

          {/* DONE */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3"
              >
                <Check className="w-8 h-8 text-green-500" />
              </motion.div>
              <p className="text-sm font-bold">¡Configuración completada!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
