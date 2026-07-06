import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Headers de seguridad y compatibilidad iOS/Safari ───
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval+inline
              "style-src 'self' 'unsafe-inline'", // Tailwind requires inline styles
              "img-src 'self' data: blob: https://lustmqeqbninkavixttz.supabase.co https://lqwyidsixjzjffwtrltw.supabase.co",
              "font-src 'self'",
              "connect-src 'self' https://lustmqeqbninkavixttz.supabase.co https://lqwyidsixjzjffwtrltw.supabase.co wss://lustmqeqbninkavixttz.supabase.co wss://lqwyidsixjzjffwtrltw.supabase.co https://api.supabase.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
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
