import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/features/auth/validation";
import { orderInsertSchema, payoutRequestSchema } from "@/lib/validators";

describe("loginSchema", () => {
  it("valida email correcto", () => {
    expect(loginSchema.shape.email.safeParse("test@gmail.com").success).toBe(true);
  });
  it("rechaza email inválido", () => {
    expect(loginSchema.shape.email.safeParse("noemail").success).toBe(false);
  });
  it("valida contraseña de al menos 6 chars", () => {
    expect(loginSchema.shape.password.safeParse("123456").success).toBe(true);
    expect(loginSchema.shape.password.safeParse("12345").success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("valida teléfono cubano (+53)", () => {
    expect(registerSchema.shape.phone.safeParse("+5351234567").success).toBe(true);
    expect(registerSchema.shape.phone.safeParse("5351234567").success).toBe(true);
    expect(registerSchema.shape.phone.safeParse("+34123456789").success).toBe(false);
  });
  it("valida carnet de identidad (11 dígitos)", () => {
    expect(registerSchema.shape.idCard.safeParse("01020304056").success).toBe(true);
    expect(registerSchema.shape.idCard.safeParse("123").success).toBe(false);
  });
  it("solo acepta Gmail", () => {
    expect(registerSchema.shape.email.safeParse("user@gmail.com").success).toBe(true);
    expect(registerSchema.shape.email.safeParse("user@hotmail.com").success).toBe(false);
    expect(registerSchema.shape.email.safeParse("user@yandex.com").success).toBe(false);
  });
  it("valida contraseña fuerte", () => {
    const pw = registerSchema.shape.password;
    expect(pw.safeParse("Abc123!@").success).toBe(true);
    expect(pw.safeParse("abcdefgh").success).toBe(false);  // sin mayus, num, simbolo
    expect(pw.safeParse("ABCDEFGH").success).toBe(false);  // sin minus, num, simbolo
    expect(pw.safeParse("Abcdefgh").success).toBe(false);  // sin numero, simbolo
    expect(pw.safeParse("Abc12345").success).toBe(false);  // sin simbolo
  });
  it("valida tarjeta bancaria (13-19 dígitos)", () => {
    const card = registerSchema.shape.bankCardNumber;
    expect(card.safeParse("1234567890123").success).toBe(true);   // 13 dígitos
    expect(card.safeParse("1234567890123456789").success).toBe(true); // 19 dígitos
    expect(card.safeParse("123456789012").success).toBe(false);   // 12 dígitos
    expect(card.safeParse("12345678901234567890").success).toBe(false); // 20 dígitos
  });
  it("valida nombre solo letras y espacios", () => {
    const name = registerSchema.shape.fullName;
    expect(name.safeParse("María José").success).toBe(true);
    expect(name.safeParse("Juan O'Neil").success).toBe(true);
    expect(name.safeParse("Pedro123").success).toBe(false);
  });
});

describe("orderInsertSchema", () => {
  it("acepta pedido válido", () => {
    const result = orderInsertSchema.safeParse({
      product_name: "Zapatos Nike",
      base_price: 50,
      sale_price: 80,
      customer_name: "Juan Pérez",
      customer_phone: "+5351234567",
      customer_address: "Calle 23 #456, Vedado, La Habana",
      delivery_price: 5,
      payment_type: "transferencia",
      size: "42",
    });
    expect(result.success).toBe(true);
  });
  it("rechaza pedido sin producto", () => {
    const result = orderInsertSchema.safeParse({
      product_name: "",
      base_price: 50,
      sale_price: 80,
      customer_name: "Juan",
      customer_phone: "123",
      customer_address: "Calle 23",
      payment_type: "efectivo",
    });
    expect(result.success).toBe(false);
  });
});

describe("payoutRequestSchema", () => {
  it("acepta monto válido", () => {
    expect(payoutRequestSchema.safeParse({ amount: 100 }).success).toBe(true);
  });
  it("rechaza monto negativo", () => {
    expect(payoutRequestSchema.safeParse({ amount: -50 }).success).toBe(false);
  });
  it("rechaza monto excesivo", () => {
    expect(payoutRequestSchema.safeParse({ amount: 999999999 }).success).toBe(false);
  });
});
