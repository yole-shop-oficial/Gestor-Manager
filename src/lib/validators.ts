import { z } from "zod";

// ─── Validación server-side para inserción de pedidos ───
// (Duplica el schema del cliente pero sin transform() ni refine() de UI)

export const orderInsertSchema = z.object({
  product_name: z.string().min(1, "Producto requerido").max(200),
  base_price: z.number().positive("Precio base debe ser > 0"),
  sale_price: z.number().positive("Precio de venta debe ser > 0"),
  size: z.string().max(50).nullable().optional(),
  customer_name: z.string().min(1, "Cliente requerido").max(100),
  customer_phone: z.string().min(1, "Teléfono requerido").max(30),
  customer_address: z.string().min(5, "Dirección muy corta").max(200),
  delivery_price: z.number().min(0).default(0),
  delivery_time: z.string().max(50).nullable().optional(),
  payment_type: z.enum(["transferencia", "efectivo", "zelle", "otro"]),
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(["pending", "confirmed", "sold", "denied", "cancelled"]).default("pending"),
});

export const payoutRequestSchema = z.object({
  amount: z.number().positive("Monto debe ser > 0").max(999999.99, "Monto excede el límite"),
  notes: z.string().max(500).nullable().optional(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(3).max(80).optional(),
  phone: z.string().min(1).max(30).optional(),
  address: z.string().min(5).max(200).optional(),
  bank_card_number: z.string().min(13).max(19).optional(),
  bank_card_holder: z.string().min(3).max(80).optional(),
});

export const messageInsertSchema = z.object({
  body: z.string().min(1, "Mensaje vacío").max(2000),
  recipient_id: z.string().uuid(),
});

export type OrderInsert = z.infer<typeof orderInsertSchema>;
export type PayoutRequestInsert = z.infer<typeof payoutRequestSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type MessageInsert = z.infer<typeof messageInsertSchema>;
