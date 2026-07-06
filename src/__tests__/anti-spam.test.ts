import { describe, it, expect, beforeEach } from "vitest";
import { checkSpam, recordMessage, clearSpamTracking } from "../features/chat/anti-spam";

describe("Anti-spam chat", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    clearSpamTracking(userId);
  });

  it("allows first message", () => {
    const result = checkSpam(userId, "Hola");
    expect(result.allowed).toBe(true);
  });

  it("rejects messages over 300 chars", () => {
    const longMsg = "a".repeat(301);
    const result = checkSpam(userId, longMsg);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("largo");
  });

  it("rejects messages with URLs", () => {
    const result = checkSpam(userId, "Mira https://example.com");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("enlaces");
  });

  it("rejects messages sent too fast (< 10s interval)", () => {
    recordMessage(userId, "msg1");
    const result = checkSpam(userId, "msg2");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Espera");
  });

  it("clears tracking for user", () => {
    recordMessage(userId, "msg");
    clearSpamTracking(userId);
    const result = checkSpam(userId, "new msg");
    expect(result.allowed).toBe(true);
  });

  it("rejects www. URLs", () => {
    const result = checkSpam(userId, "Visita www.spam.com ahora");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("enlaces");
  });

  it("allows messages without URLs", () => {
    const result = checkSpam(userId, "Hola, ¿cómo estás?");
    expect(result.allowed).toBe(true);
  });
});
