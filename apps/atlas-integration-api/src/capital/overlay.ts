/**
 * Durable Hub overlay for capital document-intelligence state.
 *
 * SharePoint remains the SoR for opportunities, DocumentRequests, lenders,
 * and outreach. Facts/reviews/underwriting are not a SharePoint list in this
 * slice; they persist on App Service durable disk so recycle does not require
 * re-ingest. This is not development-json and not a new database.
 *
 * Dual-read: Graph lists hydrate first; overlay merges documents/reviews/audits.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { emptyState, type CapitalState } from './store.ts';

export const CAPITAL_OVERLAY_SCHEMA_VERSION = 1;

export type CapitalOverlay = Pick<
  CapitalState,
  | 'strategies'
  | 'documents'
  | 'reviews'
  | 'applications'
  | 'offers'
  | 'closing'
  | 'fees'
  | 'attributions'
  | 'copilotHandoffs'
  | 'underwriting'
  | 'checklists'
  | 'factReviews'
> & { schemaVersion?: number };

export function emptyOverlay(): CapitalOverlay {
  const s = emptyState();
  return {
    schemaVersion: CAPITAL_OVERLAY_SCHEMA_VERSION,
    strategies: s.strategies,
    documents: s.documents,
    reviews: s.reviews,
    applications: s.applications,
    offers: s.offers,
    closing: s.closing,
    fees: s.fees,
    attributions: s.attributions,
    copilotHandoffs: s.copilotHandoffs,
    underwriting: s.underwriting,
    checklists: s.checklists,
    factReviews: s.factReviews,
  };
}

/**
 * Durable overlay directory.
 * Azure App Service `/home/data` survives recycle and zip --clean of wwwroot.
 * Tests use INTEGRATION_DATA_DIR and never write to /home/data.
 */
export function resolveCapitalOverlayDir(dataDir: string, env: NodeJS.ProcessEnv = process.env): string {
  const explicit = (env.INTEGRATION_CAPITAL_OVERLAY_DIR || '').trim();
  if (explicit) return explicit;
  if ((env.HOME || '') === '/home') {
    const preferred = '/home/data/atlas-capital';
    try {
      mkdirSync(preferred, { recursive: true, mode: 0o700 });
      return preferred;
    } catch {
      /* fall through to INTEGRATION_DATA_DIR */
    }
  }
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'capital-overlay');
  return join(dataDir, 'capital-overlay');
}

export function overlayFilePath(dir: string): string {
  return join(dir, 'capital-intelligence-overlay.json');
}

export function readCapitalOverlay(dir: string): CapitalOverlay | null {
  const path = overlayFilePath(dir);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as CapitalOverlay;
    const base = emptyOverlay();
    return {
      ...base,
      ...parsed,
      schemaVersion: parsed.schemaVersion || CAPITAL_OVERLAY_SCHEMA_VERSION,
      checklists: parsed.checklists || {},
      factReviews: parsed.factReviews || [],
    };
  } catch {
    return null;
  }
}

export function writeCapitalOverlay(dir: string, overlay: CapitalOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = overlayFilePath(dir);
  const tmp = `${path}.${process.pid}.tmp`;
  const payload = JSON.stringify({ ...overlay, schemaVersion: CAPITAL_OVERLAY_SCHEMA_VERSION }, null, 2);
  writeFileSync(tmp, payload, { mode: 0o600 });
  renameSync(tmp, path);
}

export function applyOverlayToState(state: CapitalState, overlay: CapitalOverlay | null): CapitalState {
  if (!overlay) return state;
  state.strategies = overlay.strategies?.length ? overlay.strategies : state.strategies;
  state.documents = overlay.documents || [];
  state.reviews = overlay.reviews || [];
  state.applications = overlay.applications || [];
  state.offers = overlay.offers || [];
  state.closing = overlay.closing || {};
  state.fees = overlay.fees || [];
  state.attributions = overlay.attributions || [];
  state.copilotHandoffs = overlay.copilotHandoffs || [];
  state.underwriting = overlay.underwriting || [];
  if (overlay.checklists) {
    for (const [id, items] of Object.entries(overlay.checklists)) {
      const graphItems = state.checklists[id];
      if (!graphItems?.length) {
        if (items?.length) state.checklists[id] = items;
        continue;
      }
      const byId = new Map((items || []).map((i) => [i.id, i]));
      const byKey = new Map((items || []).map((i) => [i.itemKey, i]));
      state.checklists[id] = graphItems.map((g) => {
        const o = byId.get(g.id) || byKey.get(g.itemKey);
        if (!o) return g;
        return {
          ...g,
          fileId: o.fileId || g.fileId,
          fileLink: o.fileLink || g.fileLink,
          requestSupport: o.requestSupport || g.requestSupport,
          status: o.status || g.status,
          receivedAt: o.receivedAt || g.receivedAt,
          deficiency: o.deficiency || g.deficiency,
          verification:
            o.verification && o.verification !== 'MISSING' ? o.verification : g.verification,
        };
      });
    }
  }
  if (Array.isArray(overlay.factReviews)) state.factReviews = overlay.factReviews;
  return state;
}

export function overlayFromState(state: CapitalState): CapitalOverlay {
  return {
    schemaVersion: CAPITAL_OVERLAY_SCHEMA_VERSION,
    strategies: state.strategies,
    documents: state.documents,
    reviews: state.reviews,
    applications: state.applications,
    offers: state.offers,
    closing: state.closing,
    fees: state.fees,
    attributions: state.attributions,
    copilotHandoffs: state.copilotHandoffs,
    underwriting: state.underwriting,
    checklists: state.checklists,
    factReviews: state.factReviews,
  };
}
