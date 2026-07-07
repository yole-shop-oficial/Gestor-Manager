import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════
// UNIT TESTS: Pedidos con Márgenes Multi-nivel (v3.0)
// ═══════════════════════════════════════════════════

interface MarginEntry {
  user_id: string;
  margin: number;
  price: number;
}

interface Margins {
  [level: string]: MarginEntry;
}

/** Simula calculate_margins (misma lógica que el PL/pgSQL) */
function simulateCalculateMargins(chain: string[], basePrice: number, salePrice: number): Margins {
  const totalMargin = salePrice - basePrice;
  const levelCount = chain.length;
  const margins: Margins = {};

  if (totalMargin <= 0 || levelCount === 0) return margins;

  let remaining = totalMargin;
  let currentPrice = basePrice;

  for (let i = 0; i < levelCount; i++) {
    let marginAmount: number;
    if (i === levelCount - 1) {
      marginAmount = Math.round(remaining * 100) / 100;
    } else {
      marginAmount = Math.round(remaining * 0.2 * 100) / 100;
    }
    currentPrice += marginAmount;
    remaining -= marginAmount;

    margins[String(i)] = {
      user_id: chain[i],
      margin: marginAmount,
      price: currentPrice,
    };
  }

  return margins;
}

describe("calculate_margins", () => {
  it("2 niveles: admin + gestor, base=50, sale=100", () => {
    const chain = ["admin-1", "gestor-1"];
    const margins = simulateCalculateMargins(chain, 50, 100);

    expect(Object.keys(margins)).toHaveLength(2);
    expect(margins["0"].margin).toBe(10);
    expect(margins["1"].margin).toBe(40);
    expect(margins["1"].price).toBe(100);
  });

  it("3 niveles: admin + manager + gestor", () => {
    const chain = ["admin-1", "manager-1", "gestor-2"];
    const margins = simulateCalculateMargins(chain, 50, 100);

    expect(Object.keys(margins)).toHaveLength(3);
    expect(margins["0"].margin).toBe(10);
    expect(margins["1"].margin).toBe(8);
    expect(margins["2"].margin).toBe(32);
    expect(margins["0"].price + margins["1"].margin + margins["2"].margin).toBeGreaterThan(90);
  });

  it("Precio final siempre = sale_price", () => {
    const testCases = [
      { chain: ["a", "b"], base: 50, sale: 100 },
      { chain: ["a", "b", "c"], base: 100, sale: 250 },
      { chain: ["a"], base: 10, sale: 30 },
      { chain: ["a", "b", "c", "d"], base: 200, sale: 500 },
    ];

    for (const tc of testCases) {
      const margins = simulateCalculateMargins(tc.chain, tc.base, tc.sale);
      const lastLevel = String(tc.chain.length - 1);
      expect(margins[lastLevel].price).toBe(tc.sale);
    }
  });

  it("Sin margen (sale <= base) devuelve vacío", () => {
    const margins = simulateCalculateMargins(["a", "b"], 100, 100);
    expect(Object.keys(margins)).toHaveLength(0);

    const margins2 = simulateCalculateMargins(["a"], 100, 50);
    expect(Object.keys(margins2)).toHaveLength(0);
  });

  it("Cadena vacía devuelve vacío", () => {
    const margins = simulateCalculateMargins([], 50, 100);
    expect(Object.keys(margins)).toHaveLength(0);
  });

  it("1 solo nivel: todo el margen para ese nivel", () => {
    const margins = simulateCalculateMargins(["solo-gestor"], 50, 100);
    expect(margins["0"].margin).toBe(50);
    expect(margins["0"].price).toBe(100);
  });

  it("Margins nunca exceden sale_price", () => {
    const margins = simulateCalculateMargins(["a", "b", "c", "d", "e"], 50, 200);
    let totalMargins = 0;
    for (const key of Object.keys(margins)) {
      totalMargins += margins[key].margin;
    }
    expect(totalMargins).toBe(150); // 200 - 50
    expect(totalMargins + 50).toBe(200);
  });

  it("10 niveles profundos: última comprobación", () => {
    const chain = Array.from({ length: 10 }, (_, i) => `user-${i}`);
    const margins = simulateCalculateMargins(chain, 50, 100);
    expect(Object.keys(margins)).toHaveLength(10);
    const lastLevel = String(9);
    expect(margins[lastLevel].price).toBeCloseTo(100, 0);
  });
});

describe("chain + margins integration", () => {
  it("chain debe coincidir con las keys de margins", () => {
    const chain = ["admin-1", "manager-1", "gestor-3"];
    const margins = simulateCalculateMargins(chain, 50, 100);

    for (let i = 0; i < chain.length; i++) {
      expect(margins[String(i)].user_id).toBe(chain[i]);
    }
  });

  it("source_level en wallet debe mapear a la key de margins", () => {
    const chain = ["admin", "manager", "gestor"];
    const margins = simulateCalculateMargins(chain, 50, 100);

    const walletEntries = Object.entries(margins).map(([level, m]) => ({
      manager_id: m.user_id,
      amount: m.margin,
      source_level: parseInt(level),
      source_user_id: chain[chain.length - 1], // el gestor que creó el pedido
    }));

    expect(walletEntries).toHaveLength(3);
    expect(walletEntries[0].source_level).toBe(0);
    expect(walletEntries[1].source_level).toBe(1);
    expect(walletEntries[2].source_level).toBe(2);
    expect(walletEntries[2].manager_id).toBe("gestor");
  });
});
