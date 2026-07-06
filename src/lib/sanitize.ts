/**
 * HTML sanitization utilities for user-generated content.
 * Prevents XSS attacks in chat messages, notes, and other text fields.
 */

/**
 * Sanitizes a text string by escaping HTML special characters
 * and removing potentially dangerous patterns.
 *
 * Used for:
 * - Chat messages (before sending to Supabase)
 * - Order notes
 * - Any user-generated text that might be rendered in the UI
 */
export function sanitizeMessage(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    // Remove event handlers (onclick, onerror, onload, etc.)
    .replace(/\bon\w+\s*=/gi, "")
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, "")
    // Remove data: URLs (can embed scripts)
    .replace(/data\s*:\s*text\/html/gi, "")
    .trim();
}

/**
 * Strips all HTML tags from a string, returning plain text only.
 * More aggressive than sanitizeMessage — use when you want
 * absolutely no HTML interpretation.
 */
export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim();
}

/**
 * Checks if a string contains potentially dangerous HTML patterns.
 * Returns true if dangerous content is detected.
 */
export function containsDangerousContent(text: string): boolean {
  const dangerousPatterns = [
    /<script\b/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<link\b/i,
    /<meta\b/i,
    /on\w+\s*=/i,
    /javascript\s*:/i,
    /data\s*:\s*text\/html/i,
    /<img\b[^>]+\bon\w+/i,
  ];
  return dangerousPatterns.some((pattern) => pattern.test(text));
}
