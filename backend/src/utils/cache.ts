// Minimal in-memory TTL cache — no Redis in this stack, so dashboard
// aggregation results are cached per-process with a short expiry.
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export const cacheGet = <T>(key: string): T | null => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
};

export const cacheSet = <T>(key: string, value: T, ttlSeconds: number): void => {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
};

export const cacheInvalidate = (prefix: string): void => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};