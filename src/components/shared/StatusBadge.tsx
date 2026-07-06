"use client";

import React from "react";

/**
 * Reusable status badge component.
 * Used across Admin, Orders, Profile, GestorDashboard.
 */

export type StatusType =
  | "pending" | "active" | "denied" | "blocked"
  | "confirmed" | "sold" | "cancelled"
  | "approved" | "paid" | "rejected";

export type BadgeSize = "sm" | "md";

interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  /** Optional icon to show before label */
  icon?: React.ElementType;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  // User statuses
  pending:   { label: "Pendiente",  className: "badge-yellow bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  active:    { label: "Activa",     className: "badge-green bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  denied:    { label: "Denegada",   className: "badge-red bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  blocked:   { label: "Bloqueada",  className: "badge-gray bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
  // Order statuses
  confirmed: { label: "Confirmado", className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  sold:      { label: "Vendido",    className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
  cancelled: { label: "Cancelado",  className: "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400" },
  // Payout statuses
  approved:  { label: "Aprobada",   className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  paid:      { label: "Pagada",     className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected:  { label: "Rechazada",  className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export const StatusBadge = React.memo(function StatusBadge({ status, size = "sm", icon: Icon }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || STATUS_MAP.pending;
  const sizeClass = size === "md"
    ? "px-3 py-1 rounded-full text-xs font-bold"
    : "px-2 py-0.5 rounded-full text-[10px] font-bold";

  return (
    <span className={`${sizeClass} ${config.className} inline-flex items-center gap-1`}>
      {Icon && <Icon className={size === "md" ? "w-3.5 h-3.5" : "w-3 h-3"} />}
      {config.label}
    </span>
  );
});
