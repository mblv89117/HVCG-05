/**
 * PM persistence wiring.
 *
 * JSON file store is development/local only. SharePoint Graph is the production
 * repository and is selected only when INTEGRATION_PM_BACKEND=sharepoint and
 * required IDs are valid. There is no JSON fallback from SharePoint.
 */

import type { AppConfig } from '../config.ts';
import { lookupUserBasic } from '../entitlements/userLookup.ts';
import { PmRepository } from './repository.ts';
import { createGraphTransport } from './sharepoint/graph.ts';
import { SharePointPmService } from './sharepoint/repository.ts';
import { createManagedIdentityTokenProvider } from './sharepoint/token.ts';

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

export function createSharePointPmService(cfg: AppConfig): SharePointPmService | null {
  if (cfg.pmBackend.mode !== 'sharepoint' || !cfg.pmBackend.sharepoint) return null;
  const settings = cfg.pmBackend.sharepoint;
  const tokenProvider =
    cfg.pmTokenProvider || createManagedIdentityTokenProvider(settings.managedIdentityClientId);
  const graph = cfg.pmGraphTransport || createGraphTransport(settings, tokenProvider);
  const lookup = cfg.lookupUserBasic || ((oid: string) => lookupUserBasic(cfg, oid));
  return new SharePointPmService(settings, graph, lookup);
}
