"use client";

import React from "react";

/**
 * Reusable empty state component.
 * Used across Orders, Notifications, Wallet, Admin, Analytics.
 */

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  /** Extra className for the container */
  className?: string;
}

export const EmptyState = React.memo(function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={`card-filled rounded-[24px] border-dashed border-border/70 p-8 text-center ${className || ""}`}>
      <Icon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
});
