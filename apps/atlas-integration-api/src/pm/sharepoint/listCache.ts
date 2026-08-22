/**
 * Bounded raw SharePoint list-item cache for Graph listAll.
 *
 * Security:
 * - Keys are listId only (never principal / role / client scope).
 * - Cached values are raw Graph items; callers must apply authorization after load.
 * - Short TTL + size cap limit stale privileged metadata exposure.
 * - In-flight dedupe collapses duplicate concurrent Graph list fetches.
 * - Graph $filter is never used (Lists.SelectedOperations.Selected → 403).
 */

export type GraphListItemLike = {
  id: string;
  etag?: string;
  fields: Record<string, unknown>;
};

export type ListItemCacheStats = {
  hits: number;
  misses: number;
  dedupes: number;
  size: number;
  inflight: number;
  ttlMs: number;
};

export type ListItemCache = {
  getOrLoad: (listId: string, loader: () => Promise<GraphListItemLike[]>) => Promise<GraphListItemLike[]>;
  invalidate: (listId: string) => void;
  clear: () => void;
  stats: () => ListItemCacheStats;
};

type Entry = {
  expiresAt: number;
  items: GraphListItemLike[];
};

function readTtlMs(): number {
  const raw = (process.env.INTEGRATION_PM_LIST_CACHE_TTL_MS || '').trim();
  if (raw === '0') return 0;
  if (raw && /^\d+$/.test(raw)) return Math.min(120_000, Math.max(0, Number(raw)));
  return 20_000;
}

export function createListItemCache(opts?: { ttlMs?: number; maxEntries?: number }): ListItemCache {
  const ttlMs = opts?.ttlMs ?? readTtlMs();
  const maxEntries = opts?.maxEntries ?? 48;
  const store = new Map<string, Entry>();
  const inflight = new Map<string, Promise<GraphListItemLike[]>>();
  let hits = 0;
  let misses = 0;
  let dedupes = 0;

  const evictIfNeeded = () => {
    while (store.size >= maxEntries) {
      const oldest = store.keys().next().value;
      if (!oldest) break;
      store.delete(oldest);
    }
  };

  return {
    async getOrLoad(listId, loader) {
      const key = String(listId || '').trim();
      if (!key || ttlMs <= 0) {
        misses += 1;
        return loader();
      }
      const now = Date.now();
      const hit = store.get(key);
      if (hit && hit.expiresAt > now) {
        hits += 1;
        return hit.items;
      }
      const pending = inflight.get(key);
      if (pending) {
        dedupes += 1;
        return pending;
      }
      misses += 1;
      const loadPromise = loader()
        .then((items) => {
          evictIfNeeded();
          store.set(key, { expiresAt: Date.now() + ttlMs, items });
          inflight.delete(key);
          return items;
        })
        .catch((err) => {
          inflight.delete(key);
          throw err;
        });
      inflight.set(key, loadPromise);
      return loadPromise;
    },
    invalidate(listId) {
      const key = String(listId || '').trim();
      if (!key) return;
      store.delete(key);
      inflight.delete(key);
    },
    clear() {
      store.clear();
      inflight.clear();
    },
    stats() {
      return { hits, misses, dedupes, size: store.size, inflight: inflight.size, ttlMs };
    },
  };
}
