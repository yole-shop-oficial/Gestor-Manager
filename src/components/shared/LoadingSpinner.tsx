"use client";

import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Reusable loading spinner.
 * Used in 20+ places across the app.
 */

interface LoadingSpinnerProps {
  /** Size: default "md" (w-8 h-8) */
  size?: "sm" | "md" | "lg";
  /** Color variant: default "primary" */
  variant?: "primary" | "muted";
  /** Whether to center in container */
  centered?: boolean;
  /** Extra className */
  className?: string;
}

const SIZE_MAP = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

const VARIANT_MAP = {
  primary: "text-primary",
  muted: "text-muted-foreground",
};

export const LoadingSpinner = React.memo(function LoadingSpinner({
  size = "md",
  variant = "primary",
  centered = false,
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <Loader2 className={`${SIZE_MAP[size]} animate-spin ${VARIANT_MAP[variant]} ${className || ""}`} />
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        {spinner}
      </div>
    );
  }

  return spinner;
});
