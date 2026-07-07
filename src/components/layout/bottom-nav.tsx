"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, Wallet, MessageCircle, User, Shield, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useSession } from "@/hooks";

const gestorItems = [
  { label: "Inicio", icon: Home, href: "/" },
  { label: "Pedidos", icon: ShoppingCart, href: "/orders" },
  { label: "Mi Red", icon: Network, href: "/network" },
  { label: "Billetera", icon: Wallet, href: "/wallet" },
  { label: "Chat", icon: MessageCircle, href: "/chat" },
  { label: "Perfil", icon: User, href: "/profile" },
];

const adminItems = [
  { label: "Admin", icon: Shield, href: "/admin" },
  { label: "Pedidos", icon: ShoppingCart, href: "/orders" },
  { label: "Red", icon: Network, href: "/network" },
  { label: "Chat", icon: MessageCircle, href: "/chat" },
  { label: "Wallet", icon: Wallet, href: "/wallet" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { profile, profileLoading } = useSession();

  const isAdmin = profile?.role === "admin";
  const items = isAdmin ? adminItems : gestorItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 surface-blur border-t border-border/40 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href === "/admin" && pathname === "/admin" && item.label === "Admin");
          const Icon = item.icon;

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-full h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-x-2 inset-y-1.5 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 dark:from-indigo-500/15 dark:to-purple-600/15 rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className={cn("relative z-10 flex flex-col items-center transition-all duration-300", isActive ? "scale-110" : "scale-100")}>
                <div className={cn("p-1.5 rounded-2xl transition-all duration-300", isActive && "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow")}>
                  <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-white" : "text-muted-foreground")} />
                </div>
                <span className={cn("text-[9px] mt-0.5 font-semibold transition-colors uppercase tracking-wider", isActive ? "text-primary" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
