"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PendingOperation {
  id: string;
  type: "create-order" | "update-order-status" | "request-payout";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SyncEngine {
  getState: () => SyncEngineState;
  enqueue: (op: PendingOperation) => Promise<void>;
  syncNow: () => Promise<void>;
}

export interface SyncEngineState {
  status: "idle" | "syncing" | "error";
  lastSyncAt: string | null;
}

const DB_NAME = "yole-offline-db";
const DB_VERSION = 1;

interface OfflineDBSchema {
  pending_operations: {
    key: string;
    value: PendingOperation & { syncStatus: "pending" | "syncing" | "failed"; retries: number };
  };
  cached_orders: {
    key: string;
    value: { id: string; data: unknown; cachedAt: string };
  };
}

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("pending_operations")) {
        const store = db.createObjectStore("pending_operations", { keyPath: "id" });
        store.createIndex("by-status", "syncStatus");
        store.createIndex("by-created", "createdAt");
      }
      if (!db.objectStoreNames.contains("cached_orders")) {
        db.createObjectStore("cached_orders", { keyPath: "id" });
      }
    },
  });
  return dbInstance;
}

export async function createRealSyncEngine(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<SyncEngine> {
  const db = await getDB();
  let state: SyncEngineState = { status: "idle", lastSyncAt: null };

  return {
    getState: () => state,
    enqueue: async (op: PendingOperation) => {
      await db.add("pending_operations", {
        ...op,
        syncStatus: "pending" as const,
        retries: 0,
        createdAt: op.createdAt || new Date().toISOString(),
      });
      if (navigator.onLine) {
        syncPendingOperations(db, supabaseClient, userId).catch(console.error);
      }
    },
    syncNow: async () => {
      state = { status: "syncing", lastSyncAt: state.lastSyncAt };
      try {
        await syncPendingOperations(db, supabaseClient, userId);
        state = { status: "idle", lastSyncAt: new Date().toISOString() };
      } catch (err) {
        console.error("[SYNC] Error:", err);
        state = { status: "error", lastSyncAt: state.lastSyncAt };
      }
    },
  };
}

async function syncPendingOperations(
  db: IDBPDatabase<OfflineDBSchema>,
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const ops = await db.getAllFromIndex("pending_operations", "by-status", "pending");
  for (const op of ops) {
    try {
      await db.put("pending_operations", { ...op, syncStatus: "syncing" });
      switch (op.type) {
        case "create-order": {
          const payload = op.payload as Record<string, unknown>;
          const { error } = await supabase.from("orders").insert([{ ...payload, manager_id: userId }]);
          if (error) throw error;
          break;
        }
        case "update-order-status": {
          const p = op.payload as { orderId: string; status: string };
          const { error } = await supabase.from("orders").update({ status: p.status }).eq("id", p.orderId);
          if (error) throw error;
          break;
        }
        case "request-payout": {
          const payload = op.payload as Record<string, unknown>;
          const { error } = await supabase.from("payout_requests").insert([{ ...payload, manager_id: userId }]);
          if (error) throw error;
          break;
        }
      }
      await db.delete("pending_operations", op.id);
    } catch (err) {
      const retries = (op.retries || 0) + 1;
      await db.put("pending_operations", { ...op, syncStatus: retries >= 5 ? "failed" : "pending", retries });
    }
  }
}

export async function cacheOrders(userId: string, supabase: SupabaseClient): Promise<void> {
  const db = await getDB();
  const { data } = await supabase.from("orders").select("*").eq("manager_id", userId).order("created_at", { ascending: false }).limit(50);
  if (data) {
    const tx = db.transaction("cached_orders", "readwrite");
    await tx.store.clear();
    for (const order of data) {
      await tx.store.put({ id: order.id, data: order, cachedAt: new Date().toISOString() });
    }
    await tx.done;
  }
}

export async function getCachedOrders(): Promise<unknown[]> {
  const db = await getDB();
  const cached = await db.getAll("cached_orders");
  return cached.map(c => c.data);
}

export function createNoopSyncEngine(): SyncEngine {
  return {
    getState: () => ({ status: "idle" as const, lastSyncAt: null }),
    enqueue: async () => {},
    syncNow: async () => {},
  };
}
