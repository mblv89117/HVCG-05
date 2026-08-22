/**
 * Governed Client Activation — separate from Opportunity Won.
 * Won creates Activation Required. Authorize (Manny-only) is the only
 * path that sets ClientStage=Active Client.
 * Authorize/verify attach Hub-governed portal + workspace + document-request
 * paths. They never provision Entra groups or SharePoint libraries.
 */

export const CLIENT_ACTIVATION_MARKER = 'HVCG_ACTIVATION_V1:';
export const CLIENT_STAGES = [
  'Lead',
  'Prospect',
  'Assessment',
  'Proposal',
  'Active Client',
  'On Hold',
  'Alumni',
  'Do Not Engage',
] as const;

export type ClientStage = (typeof CLIENT_STAGES)[number];
export type ClientActivationAction = 'request' | 'review' | 'authorize' | 'verify';
export type ClientActivationStatus =
  | 'not_started'
  | 'activation_required'
  | 'review'
  | 'authorized'
  | 'active'
  | 'verified'
  | 'failed';

export type ClientActivationRecord = {
  version: 1;
  clientCode: string;
  opportunityId: string;
  status: ClientActivationStatus;
  idempotencyKey: string;
  requestedAt?: string;
  requestedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  authorizedAt?: string;
  authorizedBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  failedAt?: string;
  notes?: string;
  entitlementProvisioned: false;
  entraGroupProvisioned: false;
  sharePointLibraryProvisioned: false;
  portalAccessProvisioned: boolean;
  documentRequestPathProvisioned: boolean;
  workspaceProvisioning: 'not_started' | 'staged' | 'ready' | 'blocked_pending_owner';
};

export function activationIdempotencyKey(clientCode: string, opportunityId: string): string {
  return `client-activate|${clientCode}|${opportunityId}`;
}

export function isClientStage(value: string | undefined): value is ClientStage {
  return Boolean(value && (CLIENT_STAGES as readonly string[]).includes(value));
}

export function parseActivationNotes(notes?: string): ClientActivationRecord | undefined {
  if (!notes) return undefined;
  const idx = notes.indexOf(CLIENT_ACTIVATION_MARKER);
  if (idx < 0) return undefined;
  const raw = notes.slice(idx + CLIENT_ACTIVATION_MARKER.length).trim();
  const json = raw.split('\n')[0]?.trim();
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as ClientActivationRecord;
    if (parsed?.version !== 1 || !parsed.clientCode || !parsed.opportunityId) return undefined;
    return {
      ...parsed,
      documentRequestPathProvisioned: parsed.documentRequestPathProvisioned === true,
      portalAccessProvisioned: parsed.portalAccessProvisioned === true,
    };
  } catch {
    return undefined;
  }
}

export function writeActivationNotes(existing: string | undefined, record: ClientActivationRecord): string {
  const encoded = `${CLIENT_ACTIVATION_MARKER}${JSON.stringify(record)}`;
  if (!existing) return encoded;
  const idx = existing.indexOf(CLIENT_ACTIVATION_MARKER);
  if (idx < 0) return `${existing.trim()}\n${encoded}`.trim();
  const before = existing.slice(0, idx).trim();
  const afterMarker = existing.slice(idx);
  const nl = afterMarker.indexOf('\n');
  const after = nl >= 0 ? afterMarker.slice(nl + 1).trim() : '';
  return [before, encoded, after].filter(Boolean).join('\n');
}

export function classifyClientActivation(input: {
  clientStage?: string;
  winLossStatus?: string;
  opportunityStage?: string;
  record?: ClientActivationRecord;
}): ClientActivationStatus {
  if (input.clientStage === 'Active Client') {
    if (input.record?.status === 'verified') return 'verified';
    return 'active';
  }
  if (input.record?.status === 'failed') return 'failed';
  if (input.record?.status === 'review') return 'review';
  if (input.record?.status === 'activation_required') return 'activation_required';
  if (input.winLossStatus === 'Won' || input.opportunityStage === 'Won') return 'activation_required';
  return input.record?.status || 'not_started';
}

export function emptyProvisioning(): Pick<
  ClientActivationRecord,
  | 'entitlementProvisioned'
  | 'entraGroupProvisioned'
  | 'sharePointLibraryProvisioned'
  | 'portalAccessProvisioned'
  | 'documentRequestPathProvisioned'
  | 'workspaceProvisioning'
> {
  return {
    entitlementProvisioned: false,
    entraGroupProvisioned: false,
    sharePointLibraryProvisioned: false,
    portalAccessProvisioned: false,
    documentRequestPathProvisioned: false,
    workspaceProvisioning: 'not_started',
  };
}

/** Hub-local paths only. Never claims Entra / SharePoint library / entitlement groups. */
export function governedHubProvisioning(): Pick<
  ClientActivationRecord,
  | 'entitlementProvisioned'
  | 'entraGroupProvisioned'
  | 'sharePointLibraryProvisioned'
  | 'portalAccessProvisioned'
  | 'documentRequestPathProvisioned'
  | 'workspaceProvisioning'
> {
  return {
    entitlementProvisioned: false,
    entraGroupProvisioned: false,
    sharePointLibraryProvisioned: false,
    portalAccessProvisioned: true,
    documentRequestPathProvisioned: true,
    workspaceProvisioning: 'ready',
  };
}

export function isReadyClientActivation(status: string | undefined): boolean {
  return status === 'authorized' || status === 'active' || status === 'verified';
}

export function needsGovernedHubReplay(
  record: ClientActivationRecord | undefined,
  status?: string,
): boolean {
  const ready = isReadyClientActivation(record?.status) || isReadyClientActivation(status);
  if (!ready || !record) return false;
  return (
    record.portalAccessProvisioned !== true ||
    record.documentRequestPathProvisioned !== true ||
    record.workspaceProvisioning !== 'ready'
  );
}

/** Persist Hub-local path flags only. Never flips Entra / library / entitlement. */
export function replayGovernedHubProvisioning(record: ClientActivationRecord): ClientActivationRecord {
  return {
    ...record,
    ...governedHubProvisioning(),
  };
}

export function clientPortalHrefs(clientCode: string) {
  return {
    portalHref: `/api/pm/clients/${clientCode}/portal`,
    workspaceHref: `/api/pm/clients/${clientCode}/workspace`,
    documentRequestHref: `/api/pm/clients/${clientCode}/document-requests`,
    attentionHref: `/api/pm/clients/${clientCode}/attention`,
    clientDeskHref: '/client',
    experienceHref: `/api/pm/clients/${clientCode}/experience`,
  };
}
