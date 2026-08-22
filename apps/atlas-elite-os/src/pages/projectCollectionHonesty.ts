/**
 * D13 — Project Detail collection honesty (BU-P1-PROJECT-DEFERRED).
 *
 * Tasks, milestones, and the project record remain live Hub surfaces.
 * These eight collections are NOT SharePoint production MVP unless Hub
 * explicitly confirms they are persistable / non-deferred.
 */

export const PROJECT_DEFERRED_COLLECTION_KEYS = [
  'risks',
  'waiting',
  'commitments',
  'deliverables',
  'documents',
  'notes',
  'decisions',
  'activity',
] as const;

export type ProjectDeferredCollectionKey = (typeof PROJECT_DEFERRED_COLLECTION_KEYS)[number];

export type ProjectCollectionHonestyMeta = {
  /** Hub map of deferred collection → reason code (e.g. PM_COLLECTION_NOT_IN_MVP). */
  deferred?: Record<string, string> | null;
  /**
   * Explicit persistable confirmation. Only `true` / membership opens a collection.
   * Missing or false keeps the collection deferred-closed.
   */
  persistable?: Record<string, boolean> | readonly string[] | null;
};

const KEY_SET = new Set<string>(PROJECT_DEFERRED_COLLECTION_KEYS);

export function isProjectDeferredCollectionKey(key: string): key is ProjectDeferredCollectionKey {
  return KEY_SET.has(key);
}

function explicitlyPersistable(
  key: ProjectDeferredCollectionKey,
  persistable: ProjectCollectionHonestyMeta['persistable'],
): boolean {
  if (!persistable) return false;
  if (Array.isArray(persistable)) return (persistable as readonly string[]).includes(key);
  return (persistable as Record<string, boolean>)[key] === true;
}

/**
 * Deferred-closed unless Hub explicitly confirms persistable/non-deferred.
 * A missing deferred flag is NOT treated as “none yet” / live empty SoR.
 */
export function isCollectionDeferredClosed(
  key: ProjectDeferredCollectionKey,
  meta: ProjectCollectionHonestyMeta | undefined | null,
): boolean {
  if (explicitlyPersistable(key, meta?.persistable)) return false;
  return true;
}

/** Build the effective deferred map used for UI (always closed for unconfirmed keys). */
export function resolveDeferredClosedMap(
  meta: ProjectCollectionHonestyMeta | undefined | null,
): Record<ProjectDeferredCollectionKey, boolean> {
  const out = {} as Record<ProjectDeferredCollectionKey, boolean>;
  for (const key of PROJECT_DEFERRED_COLLECTION_KEYS) {
    out[key] = isCollectionDeferredClosed(key, meta);
  }
  return out;
}

export function deferredTabLabel(
  base: string,
  keys: readonly ProjectDeferredCollectionKey[],
  meta: ProjectCollectionHonestyMeta | undefined | null,
): string {
  if (keys.some((k) => isCollectionDeferredClosed(k, meta))) {
    return `${base} (deferred)`;
  }
  return base;
}

export const DEFERRED_CLOSED_COPY =
  'is not in the SharePoint production MVP. Hub marked this collection deferred (or did not confirm it is persistable). Atlas will not treat missing rows as “none yet.”';

export const DEFERRED_WRITE_BLOCKED =
  'This collection is deferred (or Hub did not confirm it is persistable). Atlas will not create or patch a local-only row that looks saved.';
