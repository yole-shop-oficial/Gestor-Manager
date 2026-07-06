"use client";

import React from "react";

/**
 * Reusable error panel component.
 * Used in 10+ places across the app (all pages show errors in UI).
 */

interface ErrorPanelProps {
  title?: string;
  message: string;
  /** Variant: "error" (red) or "warning" (yellow) */
  variant?: "error" | "warning";
  /** Whether to use compact padding */
  compact?: boolean;
}

export const ErrorPanel = React.memo(function ErrorPanel({
  title = "Error",
  message,
  variant = "error",
  compact = false,
}: ErrorPanelProps) {
  const styles = variant === "error"
    ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
    : "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20";

  const textStyles = variant === "error"
    ? "text-red-700 dark:text-red-400"
    : "text-yellow-800 dark:text-yellow-300";

  const descStyles = variant === "error"
    ? "text-red-600 dark:text-red-400"
    : "text-yellow-700 dark:text-yellow-400";

  return (
    <div className={`rounded-2xl border ${styles} ${compact ? "p-4" : "p-6"} text-center`}>
      <p className={`text-sm font-bold ${textStyles}`}>{title}</p>
      <p className={`text-xs ${descStyles} mt-1`}>{message}</p>
    </div>
  );
});
