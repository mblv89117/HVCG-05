import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';
import { PmHttpError } from '../sharepoint/errors.ts';
import type { SharePointLead, SharePointOpportunity, SharePointPmService } from '../sharepoint/repository.ts';
import { buildSharePointClientWorkspace, type ClientWorkspacePayload } from '../sharepoint/workspace.ts';
import { hydrateCommercialOverlayForClient } from '../../modules/ingest/hydrateCommercialOverlay.ts';
import { buildOperatorCommercialContext, toDeskCommercialContext } from './build.ts';
import { buildLiveClientPilotBrief } from './liveClientPilot.ts';
import { ObserveError, persistObservation } from './observe.ts';
import { loadOverlay, saveOverlay } from './store.ts';
import { workspaceSnapshotFromPayload, type WorkspaceTruthSnapshot } from './clientTruth.ts';
import type { OperatorCommercialContext } from './types.ts';

export type CommercialMatch =
  | { kind: 'desk' }
  | { kind: 'client'; clientCode: string }
  | { kind: 'opportunity'; id: string }
  | { kind: 'observe' };

export function matchCommercialContextPath(path: string): CommercialMatch | null {
  if (path === '/api/pm/commercial-context') return { kind: 'desk' };
  if (path === '/api/pm/commercial-context/observations') return { kind: 'observe' };
  const client = path.match(/^\/api\/pm\/clients\/([^/]+)\/commercial-context$/);
  if (client) return { kind: 'client', clientCode: decodeURIComponent(client[1]) };
  const opp = path.match(/^\/api\/pm\/opportunities\/([^/]+)\/commercial-context$/);
  if (opp) return { kind: 'opportunity', id: decodeURIComponent(opp[1]) };
  return null;
}

export function readCommercialContext(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  opportunities?: SharePointOpportunity[];
  leads?: SharePointLead[];
  clientCode?: string;
  hydratedFrom?: string[];
  /** In-memory overlay from durable hydrate; when set, disk overlay is not re-read. */
  overlay?: ReturnType<typeof loadOverlay>;
  durableStatus?: string;
  durableReason?: string;
  truncated?: boolean;
  workspace?: WorkspaceTruthSnapshot;
}) {
  const overlay = opts.overlay ?? loadOverlay(opts.dataDir);
  const ctx = buildOperatorCommercialContext({
    principal: opts.principal,
    overlay,
    opportunities: opts.opportunities,
    leads: opts.leads,
    clientCode: opts.clientCode,
  });
  if (opts.clientCode) {
    ctx.liveClientPilot = buildLiveClientPilotBrief(ctx, {
      hydratedFrom: opts.hydratedFrom,
      durableStatus: opts.durableStatus,
      durableReason: opts.durableReason,
      truncated: opts.truncated,
      workspace: opts.workspace,
    });
  }
  return ctx;
}

/** Client commercial read with durable ingest hydrate-on-read. */
export async function readCommercialContextAsync(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  opportunities?: SharePointOpportunity[];
  leads?: SharePointLead[];
  clientCode?: string;
  env?: NodeJS.Dict<string>;
  workspace?: WorkspaceTruthSnapshot;
}) {
  if (!opts.clientCode) {
    return readCommercialContext({
      dataDir: opts.dataDir,
      principal: opts.principal,
      opportunities: opts.opportunities,
      leads: opts.leads,
    });
  }

  // Pure GET composition: hydrate in memory, do not rewrite local overlay history.
  const hydrated = await hydrateCommercialOverlayForClient({
    dataDir: opts.dataDir,
    clientCode: opts.clientCode,
    env: opts.env,
    persist: false,
  });

  return readCommercialContext({
    dataDir: opts.dataDir,
    principal: opts.principal,
    opportunities: opts.opportunities,
    leads: opts.leads,
    clientCode: opts.clientCode,
    hydratedFrom: hydrated.hydratedFrom,
    overlay: hydrated.overlay,
    durableStatus: hydrated.durableStatus,
    durableReason: hydrated.durableReason,
    truncated: hydrated.truncated,
    workspace: opts.workspace,
  });
}

/**
 * Same entitled SharePoint workspace + commercial hydrate used by Live Client GET
 * and W2C Ask Atlas. Never substitutes another ClientCode's workspace.
 */
export async function loadEntitledClientWorkspaceTruth(opts: {
  service: SharePointPmService;
  principal: AtlasPrincipal;
  clientCode: string;
  dataDir: string;
  env?: NodeJS.Dict<string>;
}): Promise<{
  workspace: ClientWorkspacePayload;
  snapshot: WorkspaceTruthSnapshot | undefined;
  commercial: OperatorCommercialContext;
}> {
  const requested = (opts.clientCode || '').trim().toUpperCase();
  if (!isCanonicalClientCode(requested) || requested === '*') {
    throw new PmHttpError(404, 'not_found', 'not_found');
  }
  if (!entitledClientCodes(opts.principal).includes(requested)) {
    throw new PmHttpError(404, 'not_found', 'not_found');
  }
  const workspace = await buildSharePointClientWorkspace(opts.service, opts.principal, requested);
  if (workspace.client.clientCode !== requested) {
    throw new PmHttpError(404, 'not_found', 'not_found');
  }
  const snapshot = workspaceSnapshotFromPayload(workspace);
  if (snapshot && snapshot.clientCode !== requested) {
    throw new PmHttpError(404, 'not_found', 'not_found');
  }
  const commercial = await readCommercialContextAsync({
    dataDir: opts.dataDir,
    principal: opts.principal,
    clientCode: requested,
    env: opts.env,
    workspace: snapshot,
  });
  if (commercial.clientCode && commercial.clientCode !== requested) {
    throw new PmHttpError(404, 'not_found', 'not_found');
  }
  return { workspace, snapshot, commercial };
}

export function readDeskCommercialContext(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  opportunities?: SharePointOpportunity[];
  leads?: SharePointLead[];
}) {
  const ctx = readCommercialContext(opts);
  return toDeskCommercialContext(ctx, entitledClientCodes(opts.principal).length);
}

export async function readDeskCommercialContextAsync(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  opportunities?: SharePointOpportunity[];
  leads?: SharePointLead[];
  env?: NodeJS.Dict<string>;
}) {
  const ctx = await readCommercialContextAsync(opts);
  return toDeskCommercialContext(ctx, entitledClientCodes(opts.principal).length);
}

export function observeCommercialContext(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  body: Record<string, unknown>;
}) {
  const overlay = loadOverlay(opts.dataDir);
  const result = persistObservation(opts.principal, overlay, opts.body);
  if (!result.replay) saveOverlay(opts.dataDir, result.overlay);
  return result;
}

export function assertEntitledClient(principal: AtlasPrincipal, clientCode: string): string | 'not_found' {
  if (!isCanonicalClientCode(clientCode) || clientCode === '*') return 'not_found';
  if (!entitledClientCodes(principal).includes(clientCode)) return 'not_found';
  return clientCode;
}

export { ObserveError };
