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

export class OverlayCorruptError extends Error {
  readonly code = 'CAPITAL_OVERLAY_CORRUPT';
  constructor(message: string) {
    super(message);
    this.name = 'OverlayCorruptError';
  }
}

export class OverlayUnsupportedSchemaError extends Error {
  readonly code = 'CAPITAL_OVERLAY_SCHEMA';
  constructor(message: string) {
    super(message);
    this.name = 'OverlayUnsupportedSchemaError';
  }
}

export type CapitalOverlay = Pick<
  CapitalState,
  | 'opportunities'
  | 'strategies'
  | 'documents'
  | 'reviews'
  | 'applications'
  | 'submissions'
  | 'offers'
  | 'closing'
  | 'fees'
  | 'attributions'
  | 'copilotHandoffs'
  | 'underwriting'
  | 'checklists'
  | 'factReviews'
  | 'rfis'
  | 'interactions'
  | 'fundingEvents'
  | 'clientDecisions'
  | 'lenderIdMaps'
  | 'internalEvents'
> & { schemaVersion?: number };

export function emptyOverlay(): CapitalOverlay {
  const s = emptyState();
  return {
    schemaVersion: CAPITAL_OVERLAY_SCHEMA_VERSION,
    opportunities: s.opportunities,
    strategies: s.strategies,
    documents: s.documents,
    reviews: s.reviews,
    applications: s.applications,
    submissions: s.submissions,
    offers: s.offers,
    closing: s.closing,
    fees: s.fees,
    attributions: s.attributions,
    copilotHandoffs: s.copilotHandoffs,
    underwriting: s.underwriting,
    checklists: s.checklists,
    factReviews: s.factReviews,
    rfis: s.rfis,
    interactions: s.interactions,
    fundingEvents: s.fundingEvents,
    clientDecisions: s.clientDecisions,
    lenderIdMaps: s.lenderIdMaps,
    internalEvents: s.internalEvents,
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
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'capital-overlay');
  if ((env.HOME || '') === '/home') {
    const preferred = '/home/data/atlas-capital';
    try {
      mkdirSync(preferred, { recursive: true, mode: 0o700 });
      return preferred;
    } catch {
      /* fall through to dataDir */
    }
  }
  return join(dataDir, 'capital-overlay');
}

export function overlayFilePath(dir: string): string {
  return join(dir, 'capital-intelligence-overlay.json');
}

export function readCapitalOverlay(dir: string): CapitalOverlay | null {
  const path = overlayFilePath(dir);
  if (!existsSync(path)) return null;
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') {
      throw new OverlayCorruptError('Capital overlay is unreadable');
    }
    throw err;
  }
  if (!raw.trim()) {
    throw new OverlayCorruptError('Capital overlay is empty');
  }
  let parsed: CapitalOverlay;
  try {
    parsed = JSON.parse(raw) as CapitalOverlay;
  } catch {
    throw new OverlayCorruptError('Capital overlay could not be parsed');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new OverlayCorruptError('Capital overlay is not an object');
  }
  const ver = parsed.schemaVersion || CAPITAL_OVERLAY_SCHEMA_VERSION;
  if (ver > CAPITAL_OVERLAY_SCHEMA_VERSION) {
    throw new OverlayUnsupportedSchemaError(
      `Capital overlay schemaVersion ${ver} is newer than runtime ${CAPITAL_OVERLAY_SCHEMA_VERSION}`,
    );
  }
  const base = emptyOverlay();
  return {
    ...base,
    ...parsed,
    schemaVersion: ver,
    opportunities: parsed.opportunities || [],
    checklists: parsed.checklists || {},
    factReviews: parsed.factReviews || [],
  };
}

const overlayWriteLocks = new Map<string, Promise<void>>();

export function writeCapitalOverlay(dir: string, overlay: CapitalOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = overlayFilePath(dir);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify({ ...overlay, schemaVersion: CAPITAL_OVERLAY_SCHEMA_VERSION }, null, 2);
  writeFileSync(tmp, payload, { mode: 0o600 });
  renameSync(tmp, path);
}

/** In-process serialization. Not a distributed lock — single App Service instance only. */
export async function withOverlayWriteLock<T>(dir: string, fn: () => Promise<T> | T): Promise<T> {
  const prev = overlayWriteLocks.get(dir) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  overlayWriteLocks.set(dir, prev.then(() => gate));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

export function applyOverlayToState(state: CapitalState, overlay: CapitalOverlay | null): CapitalState {
  if (!overlay) return state;
  if (overlay.opportunities?.length) {
    const byId = new Map(state.opportunities.map((o) => [o.id, o]));
    for (const row of overlay.opportunities) {
      const graph = byId.get(row.id);
      if (!graph) {
        state.opportunities.push(row);
        continue;
      }
      byId.set(row.id, {
        ...graph,
        stage: row.stage || graph.stage,
        stageEnteredAt: row.stageEnteredAt || graph.stageEnteredAt,
        mannyStrategyApproval: row.mannyStrategyApproval || graph.mannyStrategyApproval,
        mannyShortlistApproval: row.mannyShortlistApproval || graph.mannyShortlistApproval,
        nextAction: row.nextAction || graph.nextAction,
        updatedAt: row.updatedAt || graph.updatedAt,
      });
    }
    state.opportunities = state.opportunities.map((o) => byId.get(o.id) || o);
  }
  state.strategies = overlay.strategies?.length ? overlay.strategies : state.strategies;
  state.documents = overlay.documents || [];
  state.reviews = overlay.reviews || [];
  state.applications = overlay.applications || [];
  if (Array.isArray(overlay.submissions) && overlay.submissions.length) {
    const seen = new Set(state.submissions.map((s) => s.id));
    for (const row of overlay.submissions) {
      if (!seen.has(row.id)) {
        state.submissions.push(row);
        seen.add(row.id);
      }
    }
  }
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
  if (Array.isArray(overlay.rfis)) state.rfis = overlay.rfis;
  if (Array.isArray(overlay.interactions)) state.interactions = overlay.interactions;
  if (Array.isArray(overlay.fundingEvents)) state.fundingEvents = overlay.fundingEvents;
  if (Array.isArray(overlay.clientDecisions)) state.clientDecisions = overlay.clientDecisions;
  if (Array.isArray(overlay.lenderIdMaps)) state.lenderIdMaps = overlay.lenderIdMaps;
  if (Array.isArray(overlay.internalEvents)) state.internalEvents = overlay.internalEvents;
  return state;
}

export function overlayFromState(state: CapitalState): CapitalOverlay {
  return {
    schemaVersion: CAPITAL_OVERLAY_SCHEMA_VERSION,
    opportunities: state.opportunities,
    strategies: state.strategies,
    documents: state.documents,
    reviews: state.reviews,
    applications: state.applications,
    submissions: state.submissions || [],
    offers: state.offers,
    closing: state.closing,
    fees: state.fees,
    attributions: state.attributions,
    copilotHandoffs: state.copilotHandoffs,
    underwriting: state.underwriting,
    checklists: state.checklists,
    factReviews: state.factReviews,
    rfis: state.rfis || [],
    interactions: state.interactions || [],
    fundingEvents: state.fundingEvents || [],
    clientDecisions: state.clientDecisions || [],
    lenderIdMaps: state.lenderIdMaps || [],
    internalEvents: state.internalEvents || [],
  };
}
