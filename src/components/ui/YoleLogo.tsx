import React from "react";

/**
 * Logo oficial de YOLE SHOP — SVG inline (0KB de carga, instantáneo).
 * Gradiente indigo→purple→pink, estrella central, esquinas redondeadas.
 */
export function YoleLogo({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="yoleGrad" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="starGrad" x1="30" y1="26" x2="66" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Fondo redondeado */}
      <rect width="96" height="96" rx="28" fill="url(#yoleGrad)" />
      {/* Brillo sutil */}
      <rect x="4" y="4" width="88" height="44" rx="24" fill="white" fillOpacity="0.12" />
      {/* Estrella central */}
      <path
        d="M48 22 L53.5 38 L70 38 L57 48 L62 64 L48 54 L34 64 L39 48 L26 38 L42.5 38 Z"
        fill="url(#starGrad)"
      />
      {/* Letra Y sutil */}
      <text
        x="48"
        y="82"
        textAnchor="middle"
        fill="white"
        fillOpacity="0.9"
        fontSize="16"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
      >
        YOLE
      </text>
    </svg>
  );
}

/**
 * Logo animado para splash/loading.
 */
export function YoleLogoAnimated({ size = 96 }: { size?: number }) {
  return (
    <div className="relative">
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-[32px] blur-2xl opacity-40"
        style={{
          background: "linear-gradient(135deg, #6366f1, #9333ea, #ec4899)",
        }}
      />
      {/* Pulse ring */}
      <div
        className="absolute inset-[-8px] rounded-[36px] border-2 border-indigo-400/30 animate-ping"
        style={{ animationDuration: "2s" }}
      />
      <div className="relative">
        <YoleLogo size={size} />
      </div>
    </div>
  );
}
