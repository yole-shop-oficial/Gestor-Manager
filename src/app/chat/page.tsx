"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { ChatLayout } from "@/features/chat/components/ChatLayout";

export default function ChatPage() {
  return (
    <AuthGate>
      <MainLayout>
        <ChatLayout />
      </MainLayout>
    </AuthGate>
  );
}
