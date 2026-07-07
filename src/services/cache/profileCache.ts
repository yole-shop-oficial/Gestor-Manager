"use client";

// ═══════════════════════════════════════════════════════════
// PROFILE CACHE — In-memory + IndexedDB fallback
// ═══════════════════════════════════════════════════════════
// Stores profiles by ID to avoid re-fetching across pages.
// 
// Strategy:
//   L1: Memory Map (fast, cleared on hard refresh)
//   L2: IndexedDB via sync-engine's getDB (survives refresh)
//   TTL: 5 minutes (memory), 30 minutes (IndexedDB)
// ═══════════════════════════════════════════════════════════

const MEMORY_TTL = 5 * 60 * 1000; // 5 min
const IDB_TTL = 30 * 60 * 1000;   // 30 min

interface CachedEntry<T> {
  data: T;
  cachedAt: number;
}

const memoryStore = new Map<string, CachedEntry<any>>();

export interface CachedProfile {
  id: string;
  full_name: string;
  username: string;
  role: string;
  status: string;
  level: number;
  manager_code: string;
  avatar_url: string | null;
  children_count: number;
  total_network_size: number;
}

/** Get profile from cache (memory first, then IDB) */
export async function getCachedProfile(userId: string): Promise<CachedProfile | null> {
  // L1: Memory
  const mem = memoryStore.get(userId);
  if (mem && Date.now() - mem.cachedAt < MEMORY_TTL) {
    return mem.data as CachedProfile;
  }

  // L2: IndexedDB
  try {
    const { getDB } = await import("@/services/sync/sync-engine");
    const db = await getDB();
    const entry = await db.get("cached_profiles" as any, userId) as any;
    if (entry && Date.now() - entry.cachedAt < IDB_TTL) {
      memoryStore.set(userId, { data: entry.data, cachedAt: entry.cachedAt });
      return entry.data as CachedProfile;
    }
  } catch {
    // IDB not available, skip
  }

  return null;
}

/** Store profile in cache (both levels) */
export async function setCachedProfile(userId: string, profile: CachedProfile): Promise<void> {
  const entry = { data: profile, cachedAt: Date.now() };
  memoryStore.set(userId, entry);

  try {
    const { getDB } = await import("@/services/sync/sync-engine");
    const db = await getDB();
    await db.put("cached_profiles" as any, { id: userId, ...entry });
  } catch {
    // IDB not available, skip
  }
}

/** Clear all cached profiles */
export function clearProfileCache(): void {
  memoryStore.clear();
}

/** Preload multiple profiles in parallel */
export async function preloadProfiles(userIds: string[], fetchFn: (ids: string[]) => Promise<CachedProfile[]>): Promise<void> {
  const missing = userIds.filter(id => {
    const mem = memoryStore.get(id);
    return !mem || Date.now() - mem.cachedAt >= MEMORY_TTL;
  });

  if (missing.length === 0) return;

  try {
    const profiles = await fetchFn(missing);
    for (const p of profiles) {
      await setCachedProfile(p.id, p);
    }
  } catch {
    // Best effort
  }
}

/** Get multiple profiles (checks cache first, fetches missing) */
export async function getProfiles(
  userIds: string[],
  fetchFn: (ids: string[]) => Promise<CachedProfile[]>
): Promise<Map<string, CachedProfile>> {
  const result = new Map<string, CachedProfile>();
  const missing: string[] = [];

  for (const id of userIds) {
    const cached = await getCachedProfile(id);
    if (cached) {
      result.set(id, cached);
    } else {
      missing.push(id);
    }
  }

  if (missing.length > 0) {
    try {
      const fetched = await fetchFn(missing);
      for (const p of fetched) {
        await setCachedProfile(p.id, p);
        result.set(p.id, p);
      }
    } catch {
      // Return whatever we have
    }
  }

  return result;
}
