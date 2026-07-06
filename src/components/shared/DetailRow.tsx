"use client";

import React from "react";

/**
 * Reusable detail row — label/value pair with optional highlight.
 * Used in OrderDetail and other detail views.
 */

interface DetailRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

export const DetailRow = React.memo(function DetailRow({ label, value, highlight }: DetailRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold text-right max-w-[60%] truncate ${highlight ? "text-green-600 dark:text-green-400" : ""}`}>
        {value}
      </span>
    </div>
  );
});
