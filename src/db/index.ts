import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// En CI (por ejemplo GitHub Actions) no siempre tenemos una base
// de datos real disponible. Para permitir que los builds se
// ejecuten sin fallar, usamos un valor de reserva solo cuando
// CI=true. En entornos reales, DATABASE_URL debe estar definido.
const isCI = process.env.CI === "true";
const databaseUrl =
  process.env.DATABASE_URL ??
  (isCI ? "postgresql://postgres:postgres@127.0.0.1:5432/app_db" : undefined);

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool, { schema });
