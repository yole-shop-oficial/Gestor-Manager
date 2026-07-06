"use client";

import React from "react";
import Link from "next/link";
import { Bell, Search, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export function Header() {
  const unreadCount = useUnreadNotifications();
  const hasUnread = unreadCount > 0;

  return (
    <header className="sticky top-0 z-40 w-full surface-blur border-b border-border/40 shadow-card">
      <div className="flex items-center justify-between h-16 px-5 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">
              YOLE SHOP
            </h1>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Premium</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2.5 rounded-[14px] hover:bg-surface transition-colors"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          <Link href="/notifications">
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-[14px] hover:bg-surface transition-colors relative"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {/* Unread badge — only shows when there are unread notifications */}
              <AnimatePresence>
                {hasUnread && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center"
                  >
                    <span className="text-[8px] font-bold text-white px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
