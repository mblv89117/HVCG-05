/**
 * Capital persistence wiring.
 *
 * JSON file store is development/local only. SharePoint Graph is selected only
 * when INTEGRATION_CAPITAL_BACKEND=sharepoint and required IDs are valid.
 * There is no JSON fallback from SharePoint. Capital list IDs are never mixed
 * into the PM allowlist.
 */

import type { AppConfig } from '../config.ts';
import { CAPITAL_BACKEND_UNAVAILABLE } from './errors.ts';
import { createCapitalGraphTransport } from './sharepoint/graph.ts';
import { createGraphCapitalFileSource } from './sharepoint/files.ts';
import { AsyncCapitalStore, GraphCapitalStore } from './sharepoint/repository.ts';
import { CapitalStore, type CapitalPersistence } from './store.ts';
import { createManagedIdentityTokenProvider, GRAPH_TOKEN_RESOURCE } from '../pm/sharepoint/token.ts';

export { CAPITAL_BACKEND_UNAVAILABLE };

export function capitalBackendUnavailableBody() {
  return {
    error: CAPITAL_BACKEND_UNAVAILABLE,
    code: CAPITAL_BACKEND_UNAVAILABLE,
    classification: 'unavailable' as const,
    message:
      'No approved production capital backend is configured. The development JSON store is not an operational system of record and is not used as a fallback.',
  };
}

/**
 * Construct the local JSON capital store only when explicitly authorized.
 * Returns null without touching the filesystem when capital is unavailable.
 */
export function createAuthorizedCapitalStore(cfg: AppConfig): CapitalStore | null {
  if (cfg.capitalBackend.mode !== 'development-json' || !cfg.capitalBackend.localJsonAuthorized) {
    return null;
  }
  return new CapitalStore(cfg.dataDir, { seedSyntheticLenders: true });
}

export function createSharePointCapitalService(cfg: AppConfig): CapitalPersistence | null {
  if (cfg.capitalBackend.mode !== 'sharepoint' || !cfg.capitalBackend.sharepoint) return null;
  const settings = cfg.capitalBackend.sharepoint;
  const tokenProvider =
    cfg.pmTokenProvider ||
    createManagedIdentityTokenProvider(settings.managedIdentityClientId, {
      resource: GRAPH_TOKEN_RESOURCE,
    });
  const graph = cfg.capitalGraphTransport || createCapitalGraphTransport(settings, tokenProvider);
  if (!cfg.capitalFileSource) {
    cfg.capitalFileSource = createGraphCapitalFileSource(tokenProvider);
  }
  return new AsyncCapitalStore(new GraphCapitalStore(settings, graph), { dataDir: cfg.dataDir });
}
