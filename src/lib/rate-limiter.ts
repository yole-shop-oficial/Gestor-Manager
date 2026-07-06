"use client";

// Rate limiter simple en memoria para el lado cliente.
// En producción, esto debería moverse a un middleware de Vercel
// o a una Edge Function de Supabase. Es una primera capa de defensa.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpieza periódica cada 5 minutos
if (typeof window !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 300_000);
}

/**
 * Verifica si una acción (identificada por key) excede el límite.
 * @param key — identificador único (ej: "login:192.168.1.1" o "register:user@mail.com")
 * @param maxRequests — máximo de solicitudes permitidas en la ventana
 * @param windowMs — ventana de tiempo en milisegundos
 * @returns true si la solicitud está permitida, false si excedió el límite
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Obtiene los segundos restantes hasta que se reinicie el límite.
 */
export function getRateLimitReset(key: string): number {
  const entry = store.get(key);
  if (!entry) return 0;
  const remaining = Math.ceil((entry.resetAt - Date.now()) / 1000);
  return Math.max(0, remaining);
}

/**
 * Limpia una entrada del rate limiter.
 */
export function clearRateLimit(key: string): void {
  store.delete(key);
}
