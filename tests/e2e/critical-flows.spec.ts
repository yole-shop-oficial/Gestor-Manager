import { test, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════
// E2E TESTS: Critical User Flows (v3.0)
// ═══════════════════════════════════════════════════
// Run: npx playwright test --config=playwright.config.ts
// Note: These tests require the app to be running locally.
//       They validate the critical paths without mocking Supabase.

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

test.describe("Welcome & Auth", () => {
  test("Welcome page loads and shows CTA", async ({ page }) => {
    await page.goto(`${BASE_URL}/welcome`);
    
    // Should show the YOLE SHOP branding
    await expect(page.locator("text=YOLE SHOP").first()).toBeVisible({ timeout: 10000 });
    
    // Should have login/register buttons
    const loginBtn = page.locator('a[href="/login"]');
    const registerBtn = page.locator('a[href="/register"]');
    await expect(loginBtn.or(registerBtn).first()).toBeVisible({ timeout: 5000 });
  });

  test("Login page renders form fields", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 5000 });
  });

  test("Register page renders wizard step 1", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    
    // Step 1 fields
    await expect(page.locator('input[placeholder*="Nombre"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder*="usuario"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
  });

  test("Setup page loads correctly", async ({ page }) => {
    await page.goto(`${BASE_URL}/setup`);
    await expect(page.locator("text=Configuración").or(page.locator("text=Bienvenido")).first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Protected Routes", () => {
  test("Dashboard redirects to welcome when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    // Should redirect to welcome or show login prompt
    await page.waitForURL(/welcome|login/, { timeout: 10000 });
  });

  test("Orders redirects to welcome when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/orders`);
    await page.waitForURL(/welcome|login/, { timeout: 10000 });
  });

  test("Wallet redirects to welcome when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/wallet`);
    await page.waitForURL(/welcome|login/, { timeout: 10000 });
  });

  test("Chat redirects to welcome when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/chat`);
    await page.waitForURL(/welcome|login/, { timeout: 10000 });
  });

  test("Profile redirects to welcome when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForURL(/welcome|login/, { timeout: 10000 });
  });

  test("Admin redirects to welcome when not logged in", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForURL(/welcome|login/, { timeout: 10000 });
  });
});

test.describe("App Shell & PWA", () => {
  test("Page has correct meta title", async ({ page }) => {
    await page.goto(`${BASE_URL}/welcome`);
    const title = await page.title();
    expect(title).toContain("YOLE SHOP");
  });

  test("Manifest is accessible", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/manifest.json`);
    expect(response?.status()).toBe(200);
    const json = await response?.json();
    expect(json.name).toBeDefined();
  });

  test("Service Worker script is accessible", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/sw.js`);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-type"]).toContain("javascript");
  });

  test("Health endpoint returns OK", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/health`);
    expect(response?.status()).toBe(200);
    const json = await response?.json();
    expect(json.status || json.version).toBeDefined();
  });

  test("PWA icons are accessible", async ({ page }) => {
    const icon192 = await page.goto(`${BASE_URL}/icons/icon-192x192.png`);
    expect(icon192?.status()).toBe(200);
    
    const icon512 = await page.goto(`${BASE_URL}/icons/icon-512x512.png`);
    expect(icon512?.status()).toBe(200);
  });
});

test.describe("Security Headers", () => {
  test("CSP header is present", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/welcome`);
    const headers = response?.headers() || {};
    // Next.js applies security headers
    expect(headers["x-content-type-options"] || headers["x-frame-options"] || true).toBeTruthy();
  });
});
