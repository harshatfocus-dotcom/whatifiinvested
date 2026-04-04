interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// TTL constants
export const CACHE_TTL = {
  CURRENT_PRICE: 5 * 60 * 1000,        // 5 minutes
  HISTORICAL_DATA: 24 * 60 * 60 * 1000, // 24 hours (immutable once trading day ends)
  MF_NAV: 6 * 60 * 60 * 1000,          // 6 hours
  NEWS: 30 * 60 * 1000,                 // 30 minutes
};
