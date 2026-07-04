"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { useAppUser } from "@/features/auth/hooks/useAppUser";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { GestorDashboard } from "@/components/dashboard/GestorDashboard";

export default function Home() {
  return (
    <AuthGate>
      <MainLayout>
        <HomeContent />
      </MainLayout>
    </AuthGate>
  );
}

function HomeContent() {
  const { user, client, project, profile, profileLoading, isAdmin } = useAppUser();
  const router = useRouter();

  useEffect(() => {
    if (profileLoading) return;
    if (isAdmin) {
      router.replace("/admin");
    }
  }, [isAdmin, profileLoading, router]);

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <GestorDashboard />;
}
