import { describe, it, expect, beforeEach, vi } from "vitest";

// Importamos después de mockear Date.now
describe("rateLimiter", () => {
  beforeEach(() => {
    // Limpiar el módulo para resetear el Map interno
    vi.resetModules();
  });

  it("permite solicitudes dentro del límite", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limiter");
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("test-key", 5, 60000)).toBe(true);
    }
  });

  it("bloquea cuando se excede el límite", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limiter");
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-key-2", 5, 60000);
    }
    expect(checkRateLimit("test-key-2", 5, 60000)).toBe(false);
  });

  it("claves diferentes tienen límites independientes", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limiter");
    for (let i = 0; i < 5; i++) {
      checkRateLimit("key-a", 5, 60000);
    }
    expect(checkRateLimit("key-a", 5, 60000)).toBe(false);
    expect(checkRateLimit("key-b", 5, 60000)).toBe(true);
  });
});
