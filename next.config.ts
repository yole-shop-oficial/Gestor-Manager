import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Headers de seguridad y compatibilidad iOS/Safari ───
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // iOS Safari: permite instalar como PWA
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Permite que el manifest sea leído por Safari
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=604800",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
      {
        source: "/icons/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
