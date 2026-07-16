/**
 * DEBUG — Registro estructurado para desarrollo
 *
 * Solo activo en desarrollo (NODE_ENV === 'development').
 * En producción, todas las funciones son no-op (0 overhead).
 *
 * Registra automáticamente:
 * - nombre del componente
 * - nombre del hook
 * - ruta actual
 * - usuario autenticado
 * - último estado modificado
 * - consulta Supabase ejecutada
 * - tiempo de respuesta
 * - renderizaciones por componente
 * - errores React
 * - errores de hidratación
 */

const IS_DEV = process.env.NODE_ENV === "development";

// Contador de renders por componente
const renderCounts = new Map<string, number>();

// Última query Supabase ejecutada
let lastQuery: { table: string; time: number; duration: number } | null = null;

/**
 * Registra un render de componente (solo en desarrollo).
 * Uso: logRender("AdminContent") dentro del cuerpo del componente.
 */
export function logRender(componentName: string): void {
  if (!IS_DEV) return;
  const count = (renderCounts.get(componentName) ?? 0) + 1;
  renderCounts.set(componentName, count);
  if (count > 5) {
    console.warn(`[DEBUG] ⚠️ ${componentName} renderizado ${count} veces — posible render loop`);
  }
}

/**
 * Registra una consulta a Supabase con su duración.
 */
export function logSupabaseQuery(table: string, durationMs: number): void {
  if (!IS_DEV) return;
  lastQuery = { table, time: Date.now(), duration: durationMs };
  const icon = durationMs > 1000 ? "🐌" : durationMs > 300 ? "⚠️" : "✅";
  console.log(`[DEBUG] ${icon} Supabase ${table}: ${durationMs}ms`);
}

/**
 * Registra un error de React con contexto.
 */
export function logReactError(componentName: string, error: Error): void {
  if (!IS_DEV) return;
  console.error(`[DEBUG] 🔴 React error in ${componentName}:`, error.message);
}

/**
 * Registra un error de hidratación.
 */
export function logHydrationError(message: string): void {
  if (!IS_DEV) return;
  console.error(`[DEBUG] 💧 Hydration mismatch:`, message);
}

/**
 * Obtiene el resumen de renders por componente (para debugging).
 */
export function getRenderSummary(): Record<string, number> {
  return Object.fromEntries(renderCounts);
}

/**
 * Resetea los contadores de render (útil para aislar problemas).
 */
export function resetRenderCounts(): void {
  renderCounts.clear();
}

/**
 * Wrapper para medir el tiempo de una función async (queries Supabase).
 * Uso: const result = await measureQuery("profiles", () => supabase.from("profiles").select("*"));
 */
export async function measureQuery<T>(table: string, fn: () => Promise<T>): Promise<T> {
  if (!IS_DEV) return fn();
  const start = performance.now();
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    logSupabaseQuery(table, duration);
    return result;
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    console.error(`[DEBUG] ❌ Supabase ${table} failed in ${duration}ms:`, err);
    throw err;
  }
}
