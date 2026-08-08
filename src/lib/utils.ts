import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely format a numeric value with toFixed().
 * 
 * ROOT CAUSE: Supabase returns `numeric`/`decimal` DB columns as strings 
 * (e.g. "0" instead of 0). Calling .toFixed() on a string throws 
 * TypeError: J.toFixed is not a function.
 * 
 * This function converts any value to a proper Number before calling toFixed(),
 * handling strings, null, undefined, NaN, and objects gracefully.
 */
export function fmt(value: unknown, decimals: number = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
}