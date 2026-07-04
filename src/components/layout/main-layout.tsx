"use client";

import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { FloatingToolKit } from "@/components/floating/FloatingToolKit";
import { PagePreloader } from "@/components/ui/PagePreloader";
import { IOSInstallBanner } from "@/components/ui/IOSInstallBanner";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <PagePreloader>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 pb-20">
          {children}
        </main>
        <BottomNav />
        <FloatingToolKit />
        <IOSInstallBanner />
      </div>
    </PagePreloader>
  );
}
