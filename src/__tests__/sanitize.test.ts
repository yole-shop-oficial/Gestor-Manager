import { describe, it, expect } from "vitest";
import { sanitizeMessage, stripHtml, containsDangerousContent } from "@/lib/sanitize";

describe("sanitizeMessage", () => {
  it("escapes HTML special characters", () => {
    const result = sanitizeMessage('Hello <script>alert("xss")</script>');
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("removes event handlers", () => {
    const result = sanitizeMessage('Click <img src=x onerror=alert(1)>');
    expect(result).not.toContain("onerror=");
  });

  it("removes javascript: URLs", () => {
    const result = sanitizeMessage("Click here: javascript:alert(1)");
    expect(result).not.toContain("javascript:");
  });

  it("removes data:text/html URLs", () => {
    const result = sanitizeMessage("data:text/html,<script>alert(1)</script>");
    expect(result).not.toContain("data:text/html");
  });

  it("preserves normal text", () => {
    const result = sanitizeMessage("Hola, ¿cómo estás? ✅");
    expect(result).toBe("Hola, ¿cómo estás? ✅");
  });

  it("trims whitespace", () => {
    const result = sanitizeMessage("  hello  ");
    expect(result).toBe("hello");
  });

  it("escapes ampersands", () => {
    const result = sanitizeMessage("A & B");
    expect(result).toBe("A &amp; B");
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    const result = stripHtml("<b>Bold</b> and <i>italic</i>");
    expect(result).toBe("Bold and italic");
  });

  it("unescapes HTML entities", () => {
    const result = stripHtml("&lt;script&gt;");
    expect(result).toBe("<script>");
  });
});

describe("containsDangerousContent", () => {
  it("detects script tags", () => {
    expect(containsDangerousContent("<script>alert(1)</script>")).toBe(true);
  });

  it("detects iframe tags", () => {
    expect(containsDangerousContent('<iframe src="evil.com">')).toBe(true);
  });

  it("detects event handlers", () => {
    expect(containsDangerousContent('<img onerror="alert(1)">')).toBe(true);
  });

  it("detects javascript: URLs", () => {
    expect(containsDangerousContent("javascript:void(0)")).toBe(true);
  });

  it("allows normal text", () => {
    expect(containsDangerousContent("Hola, todo bien!")).toBe(false);
  });

  it("allows URLs", () => {
    expect(containsDangerousContent("https://example.com")).toBe(false);
  });
});
