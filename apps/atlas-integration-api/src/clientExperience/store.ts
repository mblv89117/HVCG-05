/**
 * Isolated client-experience persistence keyed by ClientCode.
 * SharePoint remains the document store. This overlay is invitation +
 * workspace binding + synthetic QA exchange. Fail-closed: no wildcard.
 */

import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isCanonicalClientCode } from '../entitlements/clientCode.ts';
import { clientPortalHrefs, type ClientActivationRecord } from '../pm/sharepoint/clientActivation.ts';

export const CLIENT_EXPERIENCE_VERSION = 1 as const;
export const DEFAULT_INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const SYNQA_CLIENT_SESSION_PREFIX = 'hvcg-cx1.';
export const MAX_DOCUMENT_BYTES = 1_000_000;

export type ActivationGate = 'authorized' | 'active' | 'verified';
export type InvitationStatus = 'staged' | 'redeemed' | 'expired' | 'revoked';
export type RequestStatus = 'open' | 'submitted' | 'decided';
export type DecisionState = 'pending' | 'accepted' | 'declined';

export type ClientInvitation = {
  id: string;
  clientCode: string;
  email: string;
  tokenHash: string;
  status: InvitationStatus;
  outboundSent: false;
  createdAt: string;
  expiresAt: string;
  redeemedAt?: string;
  redeemedByUserId?: string;
};

export type ClientBinding = {
  userId: string;
  email: string;
  clientCode: string;
  boundAt: string;
};

export type ClientSession = {
  id: string;
  clientCode: string;
  email: string;
  userId: string;
  tokenHash: string;
  status: 'active' | 'revoked' | 'expired';
  classification: 'SYNTHETIC_QA';
  createdAt: string;
  expiresAt: string;
  lastSeenAt?: string;
  revokedAt?: string;
};

export type ClientDocument = {
  id: string;
  clientCode: string;
  title: string;
  fileName: string;
  contentType: string;
  bytes: number;
  uploadedBy: string;
  uploadedAt: string;
  requestedId?: string;
  contentB64: string;
  provenance: 'synthetic_qa_overlay';
  binariesInSharePoint: true;
};

export type ClientAttentionRequest = {
  id: string;
  clientCode: string;
  kind: 'document' | 'decision';
  title: string;
  detail: string;
  status: RequestStatus;
  decision: DecisionState;
  createdAt: string;
  updatedAt: string;
  documentRequestId?: string;
};

export type ClientProjectPriority = {
  id: string;
  clientCode: string;
  name: string;
  priority: 'now' | 'next' | 'later';
  health: 'healthy' | 'watch' | 'blocked';
  nextAction: string;
};

export type ClientWorkspaceRecord = {
  clientCode: string;
  displayName: string;
  stagedAt: string;
  stagedBy: string;
  activationGate: ActivationGate;
  entitlementProvisioned: false;
  entraGroupProvisioned: false;
  sharePointLibraryProvisioned: false;
  portalAccessProvisioned: true;
  documentRequestPathProvisioned: true;
  workspaceProvisioning: 'ready';
  outboundInviteSent: false;
  gccWorkspaceKey: string;
  portalHref: string;
  workspaceHref: string;
  documentRequestHref: string;
  clientDeskHref: '/client';
  experienceHref: string;
  clientPortalHrefs: ReturnType<typeof clientPortalHrefs>;
};

export type ClientExperienceSnapshot = {
  version: typeof CLIENT_EXPERIENCE_VERSION;
  workspaces: Record<string, ClientWorkspaceRecord>;
  invitations: ClientInvitation[];
  bindings: ClientBinding[];
  documents: ClientDocument[];
  requests: ClientAttentionRequest[];
  projects: ClientProjectPriority[];
  clientSessions: ClientSession[];
};

export function emptySnapshot(): ClientExperienceSnapshot {
  return {
    version: CLIENT_EXPERIENCE_VERSION,
    workspaces: {},
    invitations: [],
    bindings: [],
    documents: [],
    requests: [],
    projects: [],
    clientSessions: [],
  };
}

export function experienceStorePath(dataDir: string): string {
  return join(dataDir, 'client-experience', 'v1.json');
}

export function loadExperienceStore(dataDir: string): ClientExperienceSnapshot {
  const path = experienceStorePath(dataDir);
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as ClientExperienceSnapshot;
    if (parsed?.version !== CLIENT_EXPERIENCE_VERSION || !parsed.workspaces) return emptySnapshot();
    return {
      ...emptySnapshot(),
      ...parsed,
      workspaces: parsed.workspaces || {},
      invitations: parsed.invitations || [],
      bindings: parsed.bindings || [],
      documents: parsed.documents || [],
      requests: parsed.requests || [],
      projects: parsed.projects || [],
      clientSessions: parsed.clientSessions || [],
    };
  } catch {
    return emptySnapshot();
  }
}

export function saveExperienceStore(dataDir: string, snapshot: ClientExperienceSnapshot): void {
  const path = experienceStorePath(dataDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function issueInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashInviteToken(token) };
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertIsolatedClientCode(clientCode: string): string {
  if (!isCanonicalClientCode(clientCode) || clientCode === '*') {
    const err = new Error('not_found') as Error & { status: number; code: string };
    err.status = 404;
    err.code = 'not_found';
    throw err;
  }
  return clientCode;
}

export function publicInvitation(row: ClientInvitation): Omit<ClientInvitation, 'tokenHash'> {
  const { tokenHash: _omit, ...rest } = row;
  void _omit;
  return rest;
}

export function gccWorkspaceKey(clientCode: string): string {
  return `gcc-${clientCode}`;
}

export function bindGovernedWorkspace(opts: {
  clientCode: string;
  displayName: string;
  stagedAt: string;
  stagedBy: string;
  activationGate: ActivationGate;
}): ClientWorkspaceRecord {
  const hrefs = clientPortalHrefs(opts.clientCode);
  return {
    clientCode: opts.clientCode,
    displayName: opts.displayName,
    stagedAt: opts.stagedAt,
    stagedBy: opts.stagedBy,
    activationGate: opts.activationGate,
    entitlementProvisioned: false,
    entraGroupProvisioned: false,
    sharePointLibraryProvisioned: false,
    portalAccessProvisioned: true,
    documentRequestPathProvisioned: true,
    workspaceProvisioning: 'ready',
    outboundInviteSent: false,
    gccWorkspaceKey: gccWorkspaceKey(opts.clientCode),
    portalHref: hrefs.portalHref,
    workspaceHref: hrefs.workspaceHref,
    documentRequestHref: hrefs.documentRequestHref,
    clientDeskHref: '/client',
    experienceHref: hrefs.experienceHref,
    clientPortalHrefs: hrefs,
  };
}

export function activationGateFromRecord(
  record: Pick<ClientActivationRecord, 'status'> | undefined,
  fallback: string,
): ActivationGate | null {
  const status = record?.status || fallback;
  if (status === 'authorized' || status === 'active' || status === 'verified') return status;
  return null;
}
