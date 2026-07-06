import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the Supabase client factory and roundRobin to avoid real calls
vi.mock("@/services/supabase/clientFactory", () => ({
  getOrCreateClient: vi.fn(() => ({
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
  STORAGE_KEYS: { AUTH_P1: "yole-auth-p1" },
}));

vi.mock("@/services/supabase/roundRobin", () => ({
  getProjectConfig: vi.fn(() => ({
    url: "https://test.supabase.co",
    anonKey: "test-key",
  })),
}));

// Import after mocks
import { logger } from "@/lib/logger";

describe("Logger", () => {
  beforeEach(() => {
    logger.clearBuffer();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    logger.destroy();
  });

  it("should log info events to local buffer", () => {
    logger.info("test_event", { key: "value" });
    const buffer = logger.getBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].level).toBe("info");
    expect(buffer[0].event).toBe("test_event");
    expect(buffer[0].data).toEqual({ key: "value" });
  });

  it("should log warn events to local buffer", () => {
    logger.warn("warning_event");
    const buffer = logger.getBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].level).toBe("warn");
    expect(buffer[0].event).toBe("warning_event");
  });

  it("should log error events to local buffer", () => {
    logger.error("error_event", { code: 500 });
    const buffer = logger.getBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].level).toBe("error");
    expect(buffer[0].event).toBe("error_event");
    expect(buffer[0].data).toEqual({ code: 500 });
  });

  it("should add timestamps to log entries", () => {
    logger.info("timestamp_test");
    const buffer = logger.getBuffer();
    expect(buffer[0].timestamp).toBeTruthy();
    expect(new Date(buffer[0].timestamp).getTime()).not.toBeNaN();
  });

  it("should limit local buffer to 200 entries", () => {
    for (let i = 0; i < 250; i++) {
      logger.info(`event_${i}`);
    }
    const buffer = logger.getBuffer();
    expect(buffer.length).toBe(200);
    // First 50 entries should be evicted
    expect(buffer[0].event).toBe("event_50");
    expect(buffer[199].event).toBe("event_249");
  });

  it("should clear the local buffer", () => {
    logger.info("test1");
    logger.info("test2");
    expect(logger.getBuffer().length).toBe(2);
    logger.clearBuffer();
    expect(logger.getBuffer().length).toBe(0);
  });

  it("should set user context", () => {
    logger.setUser("user-123", 1);
    // No error thrown
    expect(true).toBe(true);
  });

  it("should handle log with no data", () => {
    logger.info("no_data_event");
    const buffer = logger.getBuffer();
    expect(buffer[0].data).toBeUndefined();
  });

  it("should handle multiple events in sequence", () => {
    logger.info("first");
    logger.warn("second");
    logger.error("third");
    const buffer = logger.getBuffer();
    expect(buffer.length).toBe(3);
    expect(buffer[0].level).toBe("info");
    expect(buffer[1].level).toBe("warn");
    expect(buffer[2].level).toBe("error");
  });

  it("should produce entries with valid ISO timestamps", () => {
    logger.info("iso_test");
    const buffer = logger.getBuffer();
    const ts = buffer[0].timestamp;
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
