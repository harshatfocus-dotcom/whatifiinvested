import { LRUCache } from 'lru-cache';

declare global {
  var _appCache: LRUCache<string, any> | undefined;
}

const LRU_OPTIONS = {
  max: 1000,
  ttl: 1000 * 60 * 60, // Default 1 hour
  allowStale: false,
};

const store = globalThis._appCache || new LRUCache<string, any>(LRU_OPTIONS);

if (process.env.NODE_ENV !== "production") {
  globalThis._appCache = store;
}

export function cacheGet<T>(key: string): T | null {
  if (store.has(key)) {
    return store.get(key) as T;
  }
  return null;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, data, { ttl: ttlMs });
}

// TTL constants
export const CACHE_TTL = {
  CURRENT_PRICE: 5 * 60 * 1000,         // 5 minutes
  HISTORICAL_DATA: 24 * 60 * 60 * 1000, // 24 hours (immutable once trading day ends)
  MF_NAV: 6 * 60 * 60 * 1000,           // 6 hours
  NEWS: 30 * 60 * 1000,                 // 30 minutes
};
