import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import QueryProvider from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ErrorBoundary } from "@/components/security/ErrorBoundary";
import { SessionProvider } from "@/hooks/useSession";

export const metadata: Metadata = {
  title: "YOLE SHOP",
  description: "YOLE SHOP v2.0 — Gestión profesional de pedidos, comisiones y pagos para gestores",

  // Manifest para PWA (Android)
  manifest: "/manifest.json",

  // Iconos
  icons: {
    icon: [
      { url: "/icons/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Apple Web App (iOS PWA)
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YOLE SHOP",
  },

  // Formato de color para navegadores
  formatDetection: {
    telephone: false,
  },

  // No indexar (app privada)
  robots: {
    index: false,
    follow: false,
  },

  // Open Graph
  openGraph: {
    title: "YOLE SHOP",
    description: "YOLE SHOP v2.0 — Gestión profesional de pedidos, comisiones y pagos para gestores",
    type: "website",
    locale: "es_CU",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e27" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Service Worker — registro seguro para Safari */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      reg.onupdatefound = function() {
                        var newWorker = reg.installing;
                        newWorker.onstatechange = function() {
                          if (newWorker.state === 'activated') {
                            // Nuevo SW activado
                          }
                        };
                      };
                    })
                    .catch(function(err) {
                      console.warn('[SW] Registro falló (no crítico):', err);
                    });
                });
              }

              // Load saved accent color on initial load (prevents flash)
              try {
                var light = localStorage.getItem('yole_accent_light');
                var dark = localStorage.getItem('yole_accent_dark');
                if (light) {
                  var isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.style.setProperty('--primary', isDark && dark ? dark : light);
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <ErrorBoundary>
              <SessionProvider>
                {children}
              </SessionProvider>
            </ErrorBoundary>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
