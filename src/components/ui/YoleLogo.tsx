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
      <rect width="96" height="96" rx="28" fill="url(#yoleGrad)" />
      <rect x="4" y="4" width="88" height="44" rx="24" fill="white" fillOpacity="0.12" />
      <path
        d="M48 22 L53.5 38 L70 38 L57 48 L62 64 L48 54 L34 64 L39 48 L26 38 L42.5 38 Z"
        fill="url(#starGrad)"
      />
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
 * v2: Sin blur-2xl ni animate-ping (causaban artefactos en Android).
 * Usamos una animación CSS simple de opacidad (ligera para GPU).
 */
export function YoleLogoAnimated({ size = 96 }: { size?: number }) {
  return (
    <div
      className="relative"
      style={{
        animation: "yoleLogoPulse 2s ease-in-out infinite",
      }}
    >
      <YoleLogo size={size} />
      <style>{`
        @keyframes yoleLogoPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(0.97); }
        }
      `}</style>
    </div>
  );
}
