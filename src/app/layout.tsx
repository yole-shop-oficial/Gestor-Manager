import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import QueryProvider from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: "YOLE SHOP",
  description: "Gestión profesional de pedidos, comisiones y pagos para gestores",

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
    description: "Gestión profesional de pedidos, comisiones y pagos para gestores",
    type: "website",
    locale: "es_CU",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ⚠️ NO poner maximumScale=1 ni userScalable=false
  // iOS Safari 16+ lo bloquea por accesibilidad
  // Si lo pones, Safari puede no cargar bien la página
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
                      // SW registrado OK
                      reg.onupdatefound = function() {
                        var newWorker = reg.installing;
                        newWorker.onstatechange = function() {
                          if (newWorker.state === 'activated') {
                            // Nuevo SW activado — recargar si es necesario
                          }
                        };
                      };
                    })
                    .catch(function(err) {
                      // SW falló — la app sigue funcionando sin SW
                      console.warn('[SW] Registro falló (no crítico):', err);
                    });
                });
              }
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
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
