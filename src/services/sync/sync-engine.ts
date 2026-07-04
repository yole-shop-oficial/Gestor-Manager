/**
 * SyncEngine
 *
 * Motor de sincronización Offline First.
 * En esta fase solo se define la interfaz y responsabilidades;
 * la implementación real se hará en una fase posterior.
 *
 * Importante:
 * - IndexedDB se usará como cache local y cola de operaciones,
 *   nunca como base de datos principal.
 * - La fuente de verdad siempre será Supabase (proyectos 1 y 2).
 */

export type SyncStatus = "idle" | "syncing" | "error";

export interface PendingOperation {
  id: string;
  type: "create-order" | "update-order-status" | "request-payout";
  payload: unknown;
  createdAt: string;
}

export interface SyncEngineState {
  status: SyncStatus;
  lastSyncAt: string | null;
}

export interface SyncEngine {
  getState(): SyncEngineState;
  enqueue(op: PendingOperation): Promise<void>;
  /**
   * Fuerza una sincronización con Supabase cuando haya conexión.
   */
  syncNow(): Promise<void>;
}

/**
 * Implementación placeholder para poder inyectar el motor
 * en componentes sin definir todavía la lógica real.
 */
export function createNoopSyncEngine(): SyncEngine {
  let state: SyncEngineState = { status: "idle", lastSyncAt: null };

  return {
    getState: () => state,
    enqueue: async () => {
      // NOOP: se implementará más adelante con IndexedDB + cola real.
    },
    syncNow: async () => {
      // NOOP
      state = { status: "idle", lastSyncAt: new Date().toISOString() };
    },
  };
}