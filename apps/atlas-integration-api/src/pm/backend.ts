/**
 * PM persistence wiring.
 *
 * The JSON file store is development/local only. Production has no approved PM
 * backend in this gate. There is no SharePoint PM repository, no fallback from
 * an unavailable production backend to pm-store.json, and no silent substitution.
 */

import type { AppConfig } from '../config.ts';
import { PmRepository } from './repository.ts';

export const PM_BACKEND_UNAVAILABLE = 'PM_BACKEND_UNAVAILABLE';

export function pmBackendUnavailableBody() {
  return {
    error: PM_BACKEND_UNAVAILABLE,
    code: PM_BACKEND_UNAVAILABLE,
    classification: 'unavailable' as const,
    message:
      'No approved production PM backend is configured. The development JSON store is not an operational system of record and is not used as a fallback.',
  };
}

/**
 * Construct the local JSON PM repository only when explicitly authorized.
 * Returns null without touching the filesystem when PM is unavailable.
 */
export function createAuthorizedPmRepository(
  cfg: AppConfig,
  create: (dataDir: string) => PmRepository = (dir) => new PmRepository(dir),
): PmRepository | null {
  if (cfg.pmBackend.mode !== 'development-json' || !cfg.pmBackend.localJsonAuthorized) {
    return null;
  }
  return create(cfg.dataDir);
}
