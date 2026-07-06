"use client";

/**
 * @deprecated Use `useSession` from `@/hooks` instead.
 * This is a backward-compatible alias that will be removed in a future version.
 *
 * Re-exports all types for backward compatibility.
 */
export { useSession as useAppUser } from "@/hooks/useSession";
export type {
  UserProfile,
  UserRole,
  UserStatus,
} from "@/hooks/useSession";
