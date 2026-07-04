"use client";

import React from "react";
import { Bell, Search, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { motion } from "framer-motion";

export function Header() {
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
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2.5 rounded-[14px] hover:bg-surface transition-colors relative"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-full border-2 border-background"
            />
          </motion.button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
