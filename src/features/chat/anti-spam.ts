// ═══════════════════════════════════════════════════════════
// ANTI-SPAM for Chat
// ═══════════════════════════════════════════════════════════

interface SpamCheck {
  allowed: boolean;
  reason?: string;
  cooldownMs?: number;
}

const RATE_LIMITS = {
  minIntervalMs: 10_000,    // 1 message per 10s
  maxPerMinute: 5,          // 5 messages per minute
  maxPerHour: 60,           // 60 messages per hour
  maxBodyLength: 300,       // 300 chars max
  floodWindowMs: 30_000,    // 30s window for flood detection
  floodThreshold: 3,        // 3 identical messages = flood
};

// Track message timestamps per user
const userTimestamps = new Map<string, number[]>();
// Track message bodies per user for flood detection
const userBodies = new Map<string, { body: string; at: number }[]>();

export function checkSpam(userId: string, body: string): SpamCheck {
  const now = Date.now();

  // 1. Body length check
  if (body.length > RATE_LIMITS.maxBodyLength) {
    return {
      allowed: false,
      reason: `Mensaje muy largo (máximo ${RATE_LIMITS.maxBodyLength} caracteres)`,
    };
  }

  // 2. URL detection (no links in global chat)
  const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/i;
  if (urlPattern.test(body)) {
    return {
      allowed: false,
      reason: "No se permiten enlaces en el chat",
    };
  }

  // 3. Rate limit: min interval
  const timestamps = userTimestamps.get(userId) || [];
  const lastMsg = timestamps.length > 0 ? timestamps[timestamps.length - 1] : 0;
  if (now - lastMsg < RATE_LIMITS.minIntervalMs) {
    const cooldownMs = RATE_LIMITS.minIntervalMs - (now - lastMsg);
    return {
      allowed: false,
      reason: `Espera ${Math.ceil(cooldownMs / 1000)}s antes de enviar otro mensaje`,
      cooldownMs,
    };
  }

  // 4. Rate limit: max per minute
  const recentMinute = timestamps.filter((t) => now - t < 60_000);
  if (recentMinute.length >= RATE_LIMITS.maxPerMinute) {
    return {
      allowed: false,
      reason: `Máximo ${RATE_LIMITS.maxPerMinute} mensajes por minuto`,
    };
  }

  // 5. Flood detection: identical messages
  const recentBodies = (userBodies.get(userId) || [])
    .filter((e) => now - e.at < RATE_LIMITS.floodWindowMs && e.body === body);
  if (recentBodies.length >= RATE_LIMITS.floodThreshold - 1) {
    return {
      allowed: false,
      reason: "No repitas el mismo mensaje",
    };
  }

  return { allowed: true };
}

export function recordMessage(userId: string, body: string): void {
  const now = Date.now();

  // Record timestamp
  const timestamps = userTimestamps.get(userId) || [];
  timestamps.push(now);
  // Keep only last hour
  const trimmed = timestamps.filter((t) => now - t < 3600_000);
  userTimestamps.set(userId, trimmed);

  // Record body for flood detection
  const bodies = userBodies.get(userId) || [];
  bodies.push({ body, at: now });
  const trimmedBodies = bodies.filter((e) => now - e.at < RATE_LIMITS.floodWindowMs);
  userBodies.set(userId, trimmedBodies);
}

// Clear spam tracking for a user (e.g., on logout)
export function clearSpamTracking(userId: string): void {
  userTimestamps.delete(userId);
  userBodies.delete(userId);
}
