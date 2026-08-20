/**
 * Governed Client Activation — separate from Opportunity Won.
 * Won creates Activation Required. Authorize (Manny-only) is the only
 * path that sets ClientStage=Active Client. This workflow never provisions
 * Entra groups, SharePoint libraries, portal access, or entitlements.
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
  portalAccessProvisioned: false;
  workspaceProvisioning: 'not_started' | 'staged' | 'blocked_pending_owner';
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
    return parsed;
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
  | 'workspaceProvisioning'
> {
  return {
    entitlementProvisioned: false,
    entraGroupProvisioned: false,
    sharePointLibraryProvisioned: false,
    portalAccessProvisioned: false,
    workspaceProvisioning: 'not_started',
  };
}
