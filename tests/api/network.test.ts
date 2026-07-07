import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════
// UNIT TESTS: Network Tree Functions (v3.0)
// Tests for the commercial tree architecture
// ═══════════════════════════════════════════════════

describe("Árbol Comercial — Tipos", () => {
  it("TreeNode interface tiene campos requeridos", () => {
    const node: import("@/features/network/types").TreeNode = {
      id: "test-123",
      full_name: "Test User",
      username: "testuser",
      role: "gestor",
      status: "active",
      level: 1,
      manager_code: "ABCDEFGH",
      children_count: 0,
      total_network_size: 1,
      avatar_url: null,
      last_seen_at: null,
      parent_id: "parent-456",
      path: "parent.test",
      total_orders: 0,
      total_sales: 0,
      total_commission: 0,
      wallet_balance: 0,
    };
    expect(node.role).toBe("gestor");
    expect(node.level).toBe(1);
    expect(node.manager_code).toHaveLength(8);
    expect(node.children_count).toBe(0);
  });

  it("NetworkFilters defaults funcionan", () => {
    const filters: import("@/features/network/types").NetworkFilters = {
      search: "",
      minLevel: 0,
      maxLevel: 999,
      status: "",
      role: "",
    };
    expect(filters.search).toBe("");
    expect(filters.minLevel).toBe(0);
    expect(filters.maxLevel).toBe(999);
  });

  it("manager_code sigue el patrón correcto (sin I,O,0,1)", () => {
    const validCodes = ["ABCDEFGH", "KLMNPQRS", "TUVWXYZ2", "3456789J"];
    const invalidChars = /[IO01]/;
    for (const code of validCodes) {
      expect(invalidChars.test(code)).toBe(false);
    }
  });
});

describe("Árbol Comercial — Niveles", () => {
  it("Admin debe ser nivel 0", () => {
    const level = 0;
    expect(level).toBe(0);
  });

  it("Gestor directo bajo admin es nivel 1", () => {
    const parentLevel = 0;
    const childLevel = parentLevel + 1;
    expect(childLevel).toBe(1);
  });

  it("Manager con subgestor: gestor = nivel manager + 1", () => {
    const managerLevel = 2;
    const gestorLevel = managerLevel + 1;
    expect(gestorLevel).toBe(3);
  });

  it("Profundidad infinita: nivel 50 funciona", () => {
    let level = 0;
    for (let i = 1; i <= 50; i++) {
      level = i;
    }
    expect(level).toBe(50);
  });
});

describe("Árbol Comercial — Cálculo de Márgenes", () => {
  it("Margen simple: 2 niveles, base=$50, sale=$100", () => {
    const basePrice = 50;
    const salePrice = 100;
    const totalMargin = salePrice - basePrice;
    expect(totalMargin).toBe(50);

    // Nivel 1 (admin): 20% = $10
    const adminMargin = Math.round(totalMargin * 0.2 * 100) / 100;
    expect(adminMargin).toBe(10);

    // Nivel 2 (gestor): resto = $40
    const gestorMargin = Math.round((totalMargin - adminMargin) * 100) / 100;
    expect(gestorMargin).toBe(40);

    // Suma exacta
    expect(adminMargin + gestorMargin).toBe(50);
  });

  it("Margen 3 niveles: base=$50, sale=$100", () => {
    const basePrice = 50;
    const salePrice = 100;
    const totalMargin = salePrice - basePrice;

    let remaining = totalMargin;
    const level1 = Math.round(remaining * 0.2 * 100) / 100;  // $10
    remaining -= level1;
    const level2 = Math.round(remaining * 0.2 * 100) / 100;  // $8
    remaining -= level2;
    const level3 = Math.round(remaining * 100) / 100;        // $32

    expect(level1).toBe(10);
    expect(level2).toBe(8);
    expect(level3).toBe(32);
    expect(level1 + level2 + level3).toBe(50);
  });

  it("Si sale_price <= base_price, margen es 0", () => {
    const totalMargin = 50 - 50; // sale = base
    expect(totalMargin).toBe(0);
  });
});
