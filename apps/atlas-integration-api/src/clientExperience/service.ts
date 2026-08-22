/**
 * Governed client experience after activation.
 * Stages a logical workspace + record-only invitation bound to the live
 * Hub portal and document-request paths. Never sends email.
 * Never provisions Entra groups or SharePoint libraries.
 */

import type { AtlasPrincipal } from '../middleware/auth.ts';
import { canAccessOperatorDesk, entitledClientCodes } from '../pm/sharepoint/authz.ts';
import { isMannyPrincipal } from '../pm/sharepoint/manny.ts';
import { isCanonicalClientCode } from '../entitlements/clientCode.ts';
import { isReadyClientActivation } from '../pm/sharepoint/clientActivation.ts';
import {
  createDocumentRequest,
  listDocumentRequests,
  updateDocumentRequest,
  type DocumentRequestRecord,
} from '../pm/sharepoint/documentRequests.ts';
import {
  type ActivationGate,
  type ClientAttentionRequest,
  type ClientBinding,
  type ClientDocument,
  type ClientExperienceSnapshot,
  type ClientInvitation,
  type ClientWorkspaceRecord,
  DEFAULT_INVITE_TTL_MS,
  MAX_DOCUMENT_BYTES,
  activationGateFromRecord,
  assertIsolatedClientCode,
  bindGovernedWorkspace,
  gccWorkspaceKey,
  hashInviteToken,
  issueInviteToken,
  loadExperienceStore,
  newId,
  normalizeEmail,
  publicInvitation,
  saveExperienceStore,
} from './store.ts';
import { isClientOnlyPrincipal, isOperatorPrincipal } from './roles.ts';
import {
  hasActiveSynqaClientSession,
  persistSynqaClientSession,
  revokeClientSessions,
} from './clientSession.ts';
import {
  classifyHubClientRow,
  emptyOperatingQueues,
  isSyntheticQaClient,
  type OperatingState,
  type RecoveryLedgerRow,
} from '../pm/sharepoint/knowledgeClassification.ts';
import type { KnowledgeOperatingPicture } from '../pm/sharepoint/knowledgeOperating.ts';
import { readCommercialContext } from '../pm/commercialContext/handle.ts';
import { EMPTY_REASON, type OperatorCommercialContext } from '../pm/commercialContext/types.ts';
import { resolveHubCommit } from '../http/hubCommit.ts';

export class ClientExperienceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ClientExperienceError';
    this.status = status;
    this.code = code;
  }
}

function fail(status: number, code: string, message: string): never {
  throw new ClientExperienceError(status, code, message);
}

const SYNTHETIC_EXPERIENCE_CODE = /^SYN[A-Z]{0,3}[0-9]{2}$/;

/** Labeled SYNQA / isolation-test codes. Never a real HVCG customer record. */
export function isExperienceSyntheticClient(clientCode: string): boolean {
  return (
    isSyntheticQaClient(clientCode) ||
    classifyHubClientRow({ clientCode }).classification === 'SYNTHETIC_QA' ||
    SYNTHETIC_EXPERIENCE_CODE.test(clientCode)
  );
}

/** Manny may stage any ready client. Entitled operators may stage SYNQA only. */
export function canStageClientExperience(principal: AtlasPrincipal, clientCode: string): boolean {
  if (isClientOnlyPrincipal(principal)) return false;
  if (isMannyPrincipal(principal)) return true;
  if (!canAccessOperatorDesk(principal)) return false;
  if (!entitledClientCodes(principal).includes(clientCode)) return false;
  return isExperienceSyntheticClient(clientCode);
}

/** Manny may reissue any staged invite. Entitled operators may reissue SYNQA only. */
export function canReissueClientInvitation(principal: AtlasPrincipal, clientCode: string): boolean {
  return canStageClientExperience(principal, clientCode);
}

function persist(dataDir: string, snapshot: ClientExperienceSnapshot): ClientExperienceSnapshot {
  saveExperienceStore(dataDir, snapshot);
  return snapshot;
}

export function listBoundClientCodes(principal: AtlasPrincipal, snapshot: ClientExperienceSnapshot): string[] {
  const fromToken = entitledClientCodes(principal);
  const email = principal.email ? normalizeEmail(principal.email) : '';
  const fromBinding = snapshot.bindings
    .filter((row) => row.userId === principal.userId || (email && row.email === email))
    .map((row) => row.clientCode);
  return [...new Set([...fromToken, ...fromBinding].filter((code) => isCanonicalClientCode(code)))];
}

export function assertClientWorkspaceAccess(
  principal: AtlasPrincipal,
  snapshot: ClientExperienceSnapshot,
  clientCode: string,
): string {
  const code = assertIsolatedClientCode(clientCode);
  if (isOperatorPrincipal(principal) && isMannyPrincipal(principal)) return code;
  if (!listBoundClientCodes(principal, snapshot).includes(code)) {
    fail(403, 'forbidden', 'Access denied: client not in principal scope');
  }
  return code;
}

function seedGovernedRequests(dataDir: string, clientCode: string, createdBy: string) {
  const existingOverlay = listDocumentRequests(dataDir, clientCode);
  if (existingOverlay[0]) return existingOverlay[0];
  return createDocumentRequest(dataDir, {
    clientCode,
    title: 'Upload operating agreement',
    createdBy,
  });
}

export function stageClientExperience(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  clientCode: string;
  displayName?: string;
  invitationEmail: string;
  activationGate: string;
  activationStatus?: string;
}): {
  workspace: ClientWorkspaceRecord;
  invitation: Omit<ClientInvitation, 'tokenHash'>;
  inviteToken: string;
  replay: boolean;
} {
  const clientCode = assertIsolatedClientCode(opts.clientCode);
  if (!canStageClientExperience(opts.principal, clientCode)) {
    if (isExperienceSyntheticClient(clientCode)) {
      fail(403, 'forbidden', 'SYNQA workspace staging requires an entitled operator principal.');
    }
    fail(403, 'PM_MANNY_ONLY', 'Client experience staging is restricted to the authenticated HVCG owner principal.');
  }
  const gate = activationGateFromRecord(
    opts.activationStatus ? { status: opts.activationStatus as ActivationGate } : undefined,
    opts.activationGate,
  );
  if (!gate || !isReadyClientActivation(gate)) {
    fail(409, 'activation_not_ready', 'Governed activation must be authorized, active, or verified before staging.');
  }
  const email = normalizeEmail(opts.invitationEmail);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(400, 'invalid_invitation_email', 'A real invitation email is required.');
  }

  const snapshot = loadExperienceStore(opts.dataDir);
  const existing = snapshot.workspaces[clientCode];
  const openInvite = snapshot.invitations.find(
    (row) => row.clientCode === clientCode && row.status === 'staged' && row.email === email,
  );
  if (existing && openInvite) {
    return {
      workspace: existing,
      invitation: publicInvitation(openInvite),
      inviteToken: '',
      replay: true,
    };
  }

  const now = new Date();
  const workspace = bindGovernedWorkspace({
    clientCode,
    displayName: (opts.displayName || existing?.displayName || clientCode).trim() || clientCode,
    stagedAt: existing?.stagedAt || now.toISOString(),
    stagedBy: existing?.stagedBy || opts.principal.userId,
    activationGate: gate,
  });
  snapshot.workspaces[clientCode] = workspace;

  const issued = issueInviteToken();
  const invitation: ClientInvitation = {
    id: newId('inv'),
    clientCode,
    email,
    tokenHash: issued.tokenHash,
    status: 'staged',
    outboundSent: false,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + DEFAULT_INVITE_TTL_MS).toISOString(),
  };
  snapshot.invitations.push(invitation);

  const overlay = seedGovernedRequests(opts.dataDir, clientCode, opts.principal.userId);
  if (!snapshot.requests.some((row) => row.clientCode === clientCode && row.kind === 'document')) {
    snapshot.requests.push({
      id: newId('req'),
      clientCode,
      kind: 'document',
      title: overlay.title,
      detail: 'Provide the current operating agreement for the engagement file.',
      status: 'open',
      decision: 'pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      documentRequestId: overlay.id,
    });
  }
  if (!snapshot.requests.some((row) => row.clientCode === clientCode && row.kind === 'decision')) {
    snapshot.requests.push({
      id: newId('req'),
      clientCode,
      kind: 'decision',
      title: 'Confirm kickoff week',
      detail: 'Accept or decline the proposed first working week.',
      status: 'open',
      decision: 'pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }
  if (!snapshot.projects.some((row) => row.clientCode === clientCode)) {
    snapshot.projects.push({
      id: newId('prj'),
      clientCode,
      name: 'Engagement kickoff',
      priority: 'now',
      health: 'healthy',
      nextAction: 'Complete requested documents and confirm kickoff.',
    });
  }

  persist(opts.dataDir, snapshot);
  return {
    workspace,
    invitation: publicInvitation(invitation),
    inviteToken: issued.token,
    replay: false,
  };
}

export function reissueClientInvitation(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  clientCode: string;
  invitationEmail?: string;
}): {
  workspace: ClientWorkspaceRecord;
  invitation: Omit<ClientInvitation, 'tokenHash'>;
  inviteToken: string;
  outboundSent: false;
} {
  const clientCode = assertIsolatedClientCode(opts.clientCode);
  if (!canReissueClientInvitation(opts.principal, clientCode)) {
    if (isExperienceSyntheticClient(clientCode)) {
      fail(403, 'forbidden', 'SYNQA invitation reissue requires an entitled operator principal.');
    }
    fail(403, 'PM_MANNY_ONLY', 'Client invitation reissue is restricted to the authenticated HVCG owner principal.');
  }
  const snapshot = loadExperienceStore(opts.dataDir);
  const workspace = snapshot.workspaces[clientCode];
  if (!workspace) fail(404, 'not_found', 'Client workspace is not staged.');

  const latest = latestInvitation(snapshot, clientCode);
  const synqaRotate = isExperienceSyntheticClient(clientCode);
  if (latest?.status === 'redeemed' && !synqaRotate) {
    fail(409, 'invitation_redeemed', 'Invitation is already redeemed. Do not mint a replacement token.');
  }

  const email = normalizeEmail(opts.invitationEmail || latest?.email || '');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(400, 'invalid_invitation_email', 'A real invitation email is required to reissue.');
  }

  const now = new Date();
  for (const row of snapshot.invitations) {
    if (row.clientCode !== clientCode) continue;
    if (row.status === 'staged' || (synqaRotate && row.status === 'redeemed')) {
      row.status = 'revoked';
    }
  }
  revokeClientSessions(snapshot, clientCode);
  const issued = issueInviteToken();
  const invitation: ClientInvitation = {
    id: newId('inv'),
    clientCode,
    email,
    tokenHash: issued.tokenHash,
    status: 'staged',
    outboundSent: false,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + DEFAULT_INVITE_TTL_MS).toISOString(),
  };
  snapshot.invitations.push(invitation);
  persist(opts.dataDir, snapshot);
  return {
    workspace,
    invitation: publicInvitation(invitation),
    inviteToken: issued.token,
    outboundSent: false,
  };
}

export function redeemInvitation(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  token: string;
}): { binding: ClientBinding; workspace: ClientWorkspaceRecord } {
  if (!isClientOnlyPrincipal(opts.principal)) {
    fail(403, 'forbidden', 'Only a client principal may redeem a client invitation.');
  }
  const email = opts.principal.email ? normalizeEmail(opts.principal.email) : '';
  if (!email) fail(403, 'forbidden', 'Signed-in email is required to redeem an invitation.');
  const token = typeof opts.token === 'string' ? opts.token.trim() : '';
  if (!token) fail(400, 'invalid_token', 'Invitation token is required.');

  const snapshot = loadExperienceStore(opts.dataDir);
  const tokenHash = hashInviteToken(token);
  const invitation = snapshot.invitations.find((row) => row.tokenHash === tokenHash);
  if (!invitation) fail(403, 'forbidden', 'Invitation is not valid.');
  if (invitation.status === 'revoked' || invitation.status === 'expired') {
    fail(403, 'forbidden', 'Invitation is no longer valid.');
  }
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    invitation.status = 'expired';
    persist(opts.dataDir, snapshot);
    fail(403, 'forbidden', 'Invitation is no longer valid.');
  }
  if (invitation.email !== email) fail(403, 'forbidden', 'Invitation email does not match the signed-in principal.');

  const workspace = snapshot.workspaces[invitation.clientCode];
  if (!workspace) fail(404, 'not_found', 'Client workspace is not staged.');

  const existing = snapshot.bindings.find(
    (row) => row.clientCode === invitation.clientCode && row.userId === opts.principal.userId,
  );
  if (existing) {
    return { binding: existing, workspace };
  }

  invitation.status = 'redeemed';
  invitation.redeemedAt = new Date().toISOString();
  invitation.redeemedByUserId = opts.principal.userId;
  const binding: ClientBinding = {
    userId: opts.principal.userId,
    email,
    clientCode: invitation.clientCode,
    boundAt: invitation.redeemedAt,
  };
  snapshot.bindings.push(binding);
  persist(opts.dataDir, snapshot);
  return { binding, workspace };
}

/**
 * SYNQA-only redeem: the one-time invitation token is the credential.
 * Real CLIENT invitations still require an Entra Client Executive principal.
 */
export function redeemSynqaInvitation(opts: {
  dataDir: string;
  token: string;
}): {
  binding: ClientBinding;
  workspace: ClientWorkspaceRecord;
  clientSessionToken: string;
  signedClientSession: true;
  classification: 'SYNTHETIC_QA';
} {
  const token = typeof opts.token === 'string' ? opts.token.trim() : '';
  if (!token) fail(400, 'invalid_token', 'Invitation token is required.');

  const snapshot = loadExperienceStore(opts.dataDir);
  const tokenHash = hashInviteToken(token);
  const invitation = snapshot.invitations.find((row) => row.tokenHash === tokenHash);
  if (!invitation) fail(403, 'forbidden', 'Invitation is not valid.');
  if (!isExperienceSyntheticClient(invitation.clientCode)) {
    fail(403, 'forbidden', 'Real client invitations require a Client Executive principal.');
  }
  if (
    invitation.status === 'revoked' ||
    invitation.status === 'expired' ||
    invitation.status === 'redeemed'
  ) {
    fail(403, 'forbidden', 'Invitation is no longer valid.');
  }
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    invitation.status = 'expired';
    persist(opts.dataDir, snapshot);
    fail(403, 'forbidden', 'Invitation is no longer valid.');
  }

  const workspace = snapshot.workspaces[invitation.clientCode];
  if (!workspace) fail(404, 'not_found', 'Client workspace is not staged.');

  const userId = `synqa:${invitation.clientCode}:${invitation.email}`;
  const existing = snapshot.bindings.find(
    (row) => row.clientCode === invitation.clientCode && (row.userId === userId || row.email === invitation.email),
  );
  const now = new Date().toISOString();
  invitation.status = 'redeemed';
  invitation.redeemedAt = invitation.redeemedAt || now;
  invitation.redeemedByUserId = invitation.redeemedByUserId || userId;
  const binding: ClientBinding = existing || {
    userId,
    email: invitation.email,
    clientCode: invitation.clientCode,
    boundAt: invitation.redeemedAt,
  };
  if (!existing) snapshot.bindings.push(binding);
  const issued = persistSynqaClientSession({
    snapshot,
    clientCode: invitation.clientCode,
    email: invitation.email,
    userId,
  });
  persist(opts.dataDir, snapshot);
  return {
    binding,
    workspace,
    clientSessionToken: issued.token,
    signedClientSession: true,
    classification: 'SYNTHETIC_QA',
  };
}

function overlayAttention(dataDir: string, clientCode: string): DocumentRequestRecord[] {
  return listDocumentRequests(dataDir, clientCode).filter((row) => row.status === 'requested');
}

export function buildClientWorkspaceView(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  clientCode?: string;
  gccAppOrigin?: string | null;
}) {
  const snapshot = loadExperienceStore(opts.dataDir);
  const bound = listBoundClientCodes(opts.principal, snapshot);
  if (isClientOnlyPrincipal(opts.principal) && bound.length === 0) {
    fail(403, 'forbidden', 'No client workspace is bound to this principal.');
  }
  const requested = opts.clientCode
    ? assertClientWorkspaceAccess(opts.principal, snapshot, opts.clientCode)
    : bound[0];
  if (!requested) fail(404, 'not_found', 'Client workspace is not staged.');
  const workspace = snapshot.workspaces[requested];
  if (!workspace) fail(404, 'not_found', 'Client workspace is not staged.');

  const documents = snapshot.documents
    .filter((row) => row.clientCode === requested)
    .map(({ contentB64: _omit, ...meta }) => {
      void _omit;
      return meta;
    });
  const requests = snapshot.requests.filter((row) => row.clientCode === requested);
  const projects = snapshot.projects.filter((row) => row.clientCode === requested);
  const documentRequests = listDocumentRequests(opts.dataDir, requested);
  const attention = [
    ...requests.filter((row) => row.status === 'open' || row.decision === 'pending'),
    ...overlayAttention(opts.dataDir, requested).map((row) => ({
      id: row.id,
      clientCode: requested,
      kind: 'document' as const,
      title: row.title,
      detail: 'Governed document request. Upload through the client workspace, not SharePoint.',
      status: 'open' as const,
      decision: 'pending' as const,
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
      documentRequestId: row.id,
    })),
  ];
  const seen = new Set<string>();
  const uniqueAttention = attention.filter((row) => {
    const key = row.documentRequestId || row.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const commercial = bindClientVisibleCommercial({
    dataDir: opts.dataDir,
    principal: opts.principal,
    clientCode: requested,
  });

  return {
    kind: 'client_experience_v1' as const,
    clientCode: requested,
    workspace,
    documents,
    requests,
    documentRequests,
    attention: uniqueAttention,
    projects,
    portal: {
      kind: 'client_portal_v1' as const,
      operatorChrome: false,
      atlasOperatorDesk: false,
      clientCode: requested,
      displayName: workspace.displayName,
      portalHref: workspace.portalHref,
      workspaceHref: workspace.workspaceHref,
      documentRequestHref: workspace.documentRequestHref,
      clientDeskHref: workspace.clientDeskHref,
      portalAccessProvisioned: true,
      documentRequestPathProvisioned: true,
      workspaceProvisioning: 'ready' as const,
    },
    gcc: bindIsolatedGccWorkspace({
      workspaceKey: workspace.gccWorkspaceKey,
      clientCode: requested,
      commercial,
      gccAppOrigin: opts.gccAppOrigin,
      hubSha: resolveHubCommit(),
    }),
    commercial,
    documentExchange: buildClientDocumentExchange({
      clientCode: requested,
      documents,
      documentRequests,
    }),
    decisions: buildClientDecisionContext({ clientCode: requested, requests }),
    priorities: buildClientPriorityContext({ clientCode: requested, projects }),
    operatingPicture: buildClientVisibleOperatingPicture({
      clientCode: requested,
      displayName: workspace.displayName,
      requests,
      projects,
    }),
    isolation: {
      failClosed: true,
      sharePointPrimaryUx: false,
      sharePointNavigation: false,
      operatorDesk: false,
    },
  };
}

export function bindClientVisibleCommercial(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  clientCode: string;
}) {
  const ctx = readCommercialContext({
    dataDir: opts.dataDir,
    principal: opts.principal,
    clientCode: opts.clientCode,
  });
  const gccSignals = ctx.gcc.signals.filter((row) => row.clientCode === opts.clientCode);
  const gccCount = gccSignals.length;
  const copilotCount =
    ctx.copilot.assessments.filter((row) => row.clientCode === opts.clientCode).length +
    ctx.copilot.preCall.filter((row) => row.atlasClientCode === opts.clientCode).length +
    ctx.copilot.sharepoint.filter((row) => row.clientCode === opts.clientCode).length;
  const gtmCount =
    ctx.gtm.attributions.filter((row) => row.clientCode === opts.clientCode).length +
    ctx.gtm.crmSources.filter((row) => row.clientCode === opts.clientCode).length;
  return {
    clientCode: opts.clientCode,
    permitted: true as const,
    liveGtmOutbound: false as const,
    paidAds: false as const,
    invented: false as const,
    gcc: {
      available: gccCount > 0,
      recordedOnly: true as const,
      signalCount: gccCount,
      recordedSignals: gccSignals.map((row) => ({
        signalId: row.signalId,
        clientCode: row.clientCode,
        signalType: row.signalType,
        severity: row.severity,
        summary: row.summary,
        emittedAt: row.emittedAt,
        invented: false as const,
      })),
      emptyReason: gccCount > 0 ? undefined : ctx.gcc.honesty.emptyReason || EMPTY_REASON.gcc,
    },
    copilot: {
      available: copilotCount > 0,
      recordedOnly: true as const,
      recordedCount: copilotCount,
      emptyReason: copilotCount > 0 ? undefined : ctx.copilot.honesty.emptyReason || EMPTY_REASON.copilot,
    },
    gtm: {
      available: gtmCount > 0,
      recordedOnly: true as const,
      recordedCount: gtmCount,
      emptyReason: gtmCount > 0 ? undefined : ctx.gtm.honesty.emptyReason || EMPTY_REASON.gtm,
    },
  };
}

export function bindIsolatedGccWorkspace(opts: {
  workspaceKey: string;
  clientCode: string;
  commercial: ReturnType<typeof bindClientVisibleCommercial>;
  gccAppOrigin?: string | null;
  hubSha?: string | null;
}) {
  const origin = (opts.gccAppOrigin || '').trim().replace(/\/$/, '');
  return {
    workspaceKey: opts.workspaceKey,
    isolated: true as const,
    clientCode: opts.clientCode,
    recordedOnly: true as const,
    liveDispatch: false as const,
    invented: false as const,
    available: opts.commercial.gcc.available,
    signalCount: opts.commercial.gcc.signalCount,
    recordedSignals: opts.commercial.gcc.recordedSignals || [],
    emptyReason: opts.commercial.gcc.emptyReason,
    classification: isExperienceSyntheticClient(opts.clientCode)
      ? 'SYNTHETIC_QA'
      : classifyHubClientRow({ clientCode: opts.clientCode }).classification,
    hubSha: opts.hubSha || undefined,
    crossClientFallback: false as const,
    sharePointNavigation: false as const,
    binding: {
      kind: 'hub_gcc_session_v1' as const,
      liveDispatch: false as const,
      invented: false as const,
      recordedOnly: true as const,
      isolated: true as const,
      crossClientFallback: false as const,
    },
    gccHref: origin || undefined,
  };
}

/** Foreign GCC workspace keys fail closed. Matching or omitted keys are allowed. */
export function assertRequestedGccWorkspaceKey(
  requestedKey: string | null | undefined,
  boundKey: string,
): void {
  const key = (requestedKey || '').trim();
  if (!key) return;
  if (key !== boundKey) {
    fail(403, 'forbidden', 'GCC workspace is isolated to the signed client.');
  }
}

type DocumentExchangeUpload = {
  id: string;
  clientCode: string;
  title: string;
  fileName: string;
  uploadedAt: string;
  requestedId?: string;
};

export function buildClientDocumentExchange(opts: {
  clientCode: string;
  documents: DocumentExchangeUpload[];
  documentRequests: DocumentRequestRecord[];
}) {
  const requested = opts.documentRequests
    .filter((row) => row.clientCode === opts.clientCode)
    .map((row) => ({
      id: row.id,
      clientCode: row.clientCode,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt,
      binariesInAtlas: false as const,
      sharePointNavigation: false as const,
    }));
  const received = requested.filter((row) => row.status === 'received');
  const cancelled = requested.filter((row) => row.status === 'cancelled');
  const missing = requested
    .filter((row) => row.status === 'requested')
    .map((row) => ({
      id: row.id,
      clientCode: row.clientCode,
      title: row.title,
      status: 'missing' as const,
      binariesInAtlas: false as const,
    }));
  const uploads = opts.documents
    .filter((row) => row.clientCode === opts.clientCode)
    .map((row) => ({
      id: row.id,
      clientCode: row.clientCode,
      title: row.title,
      fileName: row.fileName,
      uploadedAt: row.uploadedAt,
      requestedId: row.requestedId,
      binariesInAtlas: false as const,
    }));
  const nothingRecorded = requested.length === 0 && uploads.length === 0;
  return {
    kind: 'client_document_exchange_v1' as const,
    clientCode: opts.clientCode,
    invented: false as const,
    sharePointNavigation: false as const,
    binariesInAtlas: false as const,
    requested,
    received,
    cancelled,
    missing,
    uploads,
    outstandingCount: missing.length,
    receivedCount: received.length,
    honestEmpty: nothingRecorded,
    emptyReason: nothingRecorded
      ? 'No documents have been requested or exchanged for this ClientCode. Atlas does not invent a checklist or files.'
      : undefined,
    missingHonesty:
      requested.length === 0
        ? 'No documents have been requested for this ClientCode. Atlas does not invent a document checklist.'
        : missing.length === 0
          ? 'No outstanding requested documents. Received items stay isolated to this ClientCode.'
          : `${missing.length} requested document(s) still outstanding. Atlas does not invent files.`,
  };
}

export function buildClientDecisionContext(opts: {
  clientCode: string;
  requests: Array<{
    id: string;
    clientCode: string;
    kind: string;
    title: string;
    detail: string;
    status: string;
    decision: string;
    updatedAt: string;
  }>;
}) {
  const decisions = opts.requests
    .filter((row) => row.clientCode === opts.clientCode && row.kind === 'decision')
    .map((row) => ({
      id: row.id,
      clientCode: row.clientCode,
      title: row.title,
      detail: row.detail,
      status: row.status,
      decision: row.decision,
      updatedAt: row.updatedAt,
      invented: false as const,
    }));
  return {
    kind: 'client_decisions_v1' as const,
    clientCode: opts.clientCode,
    invented: false as const,
    decisions,
    openCount: decisions.filter((row) => row.decision === 'pending').length,
    honestEmpty: decisions.length === 0,
    emptyReason:
      decisions.length === 0 ? 'No client decisions are recorded for this ClientCode. Atlas does not invent approvals.' : undefined,
  };
}

export function buildClientPriorityContext(opts: {
  clientCode: string;
  projects: Array<{
    id: string;
    clientCode: string;
    name: string;
    priority: string;
    health: string;
    nextAction: string;
  }>;
}) {
  const projects = opts.projects.filter((row) => row.clientCode === opts.clientCode);
  return {
    kind: 'client_priorities_v1' as const,
    clientCode: opts.clientCode,
    invented: false as const,
    projects,
    honestEmpty: projects.length === 0,
    emptyReason:
      projects.length === 0 ? 'No entitled project or priority context is recorded for this ClientCode.' : undefined,
  };
}

export function uploadClientDocument(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  clientCode: string;
  title: string;
  fileName: string;
  contentType?: string;
  contentB64: string;
  requestedId?: string;
}): ClientDocument {
  const snapshot = loadExperienceStore(opts.dataDir);
  const clientCode = assertClientWorkspaceAccess(opts.principal, snapshot, opts.clientCode);
  if (!snapshot.workspaces[clientCode]) fail(404, 'not_found', 'Client workspace is not staged.');
  if (!opts.contentB64 || typeof opts.contentB64 !== 'string') {
    fail(400, 'invalid_document', 'Document content is required.');
  }
  let bytes: number;
  try {
    bytes = Buffer.from(opts.contentB64, 'base64').length;
  } catch {
    fail(400, 'invalid_document', 'Document content is not valid base64.');
  }
  if (!bytes || bytes > MAX_DOCUMENT_BYTES) {
    fail(400, 'invalid_document', 'Document exceeds the synthetic exchange limit.');
  }
  const now = new Date().toISOString();
  const doc: ClientDocument = {
    id: newId('doc'),
    clientCode,
    title: (opts.title || opts.fileName || 'Untitled').trim(),
    fileName: (opts.fileName || 'upload.bin').trim(),
    contentType: (opts.contentType || 'application/octet-stream').trim(),
    bytes,
    uploadedBy: opts.principal.userId,
    uploadedAt: now,
    requestedId: opts.requestedId,
    contentB64: opts.contentB64,
    provenance: 'synthetic_qa_overlay',
    binariesInSharePoint: true,
  };
  snapshot.documents.push(doc);
  if (opts.requestedId) {
    const req = snapshot.requests.find((row) => row.id === opts.requestedId && row.clientCode === clientCode);
    if (req) {
      req.status = 'submitted';
      req.updatedAt = now;
      if (req.documentRequestId) {
        updateDocumentRequest(opts.dataDir, {
          clientCode,
          id: req.documentRequestId,
          status: 'received',
          updatedBy: opts.principal.userId,
        });
      }
    } else {
      updateDocumentRequest(opts.dataDir, {
        clientCode,
        id: opts.requestedId,
        status: 'received',
        updatedBy: opts.principal.userId,
      });
    }
  }
  persist(opts.dataDir, snapshot);
  return doc;
}

export function getClientDocument(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  documentId: string;
}): ClientDocument {
  const snapshot = loadExperienceStore(opts.dataDir);
  const doc = snapshot.documents.find((row) => row.id === opts.documentId);
  if (!doc) fail(404, 'not_found', 'not_found');
  assertClientWorkspaceAccess(opts.principal, snapshot, doc.clientCode);
  return doc;
}

export function decideClientRequest(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  requestId: string;
  decision: 'accepted' | 'declined';
}): ClientAttentionRequest {
  const snapshot = loadExperienceStore(opts.dataDir);
  const req = snapshot.requests.find((row) => row.id === opts.requestId);
  if (req) {
    assertClientWorkspaceAccess(opts.principal, snapshot, req.clientCode);
    req.decision = opts.decision;
    req.status = 'decided';
    req.updatedAt = new Date().toISOString();
    persist(opts.dataDir, snapshot);
    return req;
  }
  const bound = listBoundClientCodes(opts.principal, snapshot);
  for (const code of bound) {
    const overlay = updateDocumentRequest(opts.dataDir, {
      clientCode: code,
      id: opts.requestId,
      status: opts.decision === 'accepted' ? 'received' : 'cancelled',
      updatedBy: opts.principal.userId,
    });
    if (overlay) {
      return {
        id: overlay.id,
        clientCode: overlay.clientCode,
        kind: 'document',
        title: overlay.title,
        detail: 'Governed document request.',
        status: 'decided',
        decision: opts.decision,
        createdAt: overlay.createdAt,
        updatedAt: new Date().toISOString(),
        documentRequestId: overlay.id,
      };
    }
  }
  fail(404, 'not_found', 'not_found');
}

export function buildOperatorClientDeskPreview(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  clientCode: string;
  displayName?: string;
}) {
  if (isClientOnlyPrincipal(opts.principal)) {
    fail(403, 'forbidden', 'Client principals use /client, not the operator preview.');
  }
  if (!canAccessOperatorDesk(opts.principal)) {
    fail(403, 'forbidden', 'Operator preview requires an operator or entitled Hub principal.');
  }
  const clientCode = assertIsolatedClientCode(opts.clientCode);
  const entitled = entitledClientCodes(opts.principal);
  const snapshot = loadExperienceStore(opts.dataDir);
  const existing = snapshot.workspaces[clientCode];
  const mannyStaged = isMannyPrincipal(opts.principal) && Boolean(existing);
  if (!entitled.includes(clientCode) && !mannyStaged) {
    fail(404, 'not_found', 'not_found');
  }
  const workspace =
    existing ||
    bindGovernedWorkspace({
      clientCode,
      displayName: (opts.displayName || clientCode).trim() || clientCode,
      stagedAt: new Date().toISOString(),
      stagedBy: 'operator-preview',
      activationGate: 'authorized',
    });

  const documents = snapshot.documents
    .filter((row) => row.clientCode === clientCode)
    .map(({ contentB64: _omit, ...meta }) => {
      void _omit;
      return meta;
    });
  const requests = snapshot.requests.filter((row) => row.clientCode === clientCode);
  const projects = snapshot.projects.filter((row) => row.clientCode === clientCode);
  const documentRequests = listDocumentRequests(opts.dataDir, clientCode);
  const attention = [
    ...requests.filter((row) => row.status === 'open' || row.decision === 'pending'),
    ...overlayAttention(opts.dataDir, clientCode).map((row) => ({
      id: row.id,
      clientCode,
      kind: 'document' as const,
      title: row.title,
      detail: 'Governed document request. Upload through the client workspace, not SharePoint.',
      status: 'open' as const,
      decision: 'pending' as const,
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
      documentRequestId: row.id,
    })),
  ];
  const seen = new Set<string>();
  const uniqueAttention = attention.filter((row) => {
    const key = row.documentRequestId || row.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    kind: 'client_experience_v1' as const,
    preview: true as const,
    operatorPreview: true as const,
    signedClientSession: false as const,
    clientCode,
    workspace,
    documents,
    requests,
    documentRequests,
    attention: uniqueAttention,
    projects,
    portal: {
      kind: 'client_portal_v1' as const,
      operatorChrome: false,
      atlasOperatorDesk: false,
      clientCode,
      displayName: workspace.displayName,
      portalHref: workspace.portalHref,
      workspaceHref: workspace.workspaceHref,
      documentRequestHref: workspace.documentRequestHref,
      clientDeskHref: workspace.clientDeskHref,
      operatorPreviewHref: `/api/pm/clients/${clientCode}/desk`,
      portalAccessProvisioned: true,
      documentRequestPathProvisioned: true,
      workspaceProvisioning: 'ready' as const,
    },
    gcc: {
      workspaceKey: workspace.gccWorkspaceKey,
      isolated: true,
      clientCode,
      recordedOnly: true as const,
      liveDispatch: false as const,
      invented: false as const,
      available: false,
      signalCount: 0,
      recordedSignals: [] as Array<{ signalId: string; clientCode: string; invented: false }>,
      crossClientFallback: false as const,
      sharePointNavigation: false as const,
      emptyReason: 'No GCC value signal on record. Live GCC dispatch is OFF. Atlas does not invent LTV, renewal, or expansion numbers.',
    },
    commercial: {
      clientCode,
      permitted: true as const,
      liveGtmOutbound: false as const,
      paidAds: false as const,
      invented: false as const,
      gcc: { available: false, recordedOnly: true as const, signalCount: 0, recordedSignals: [], emptyReason: 'No GCC value signal on record. Live GCC dispatch is OFF. Atlas does not invent LTV, renewal, or expansion numbers.' },
      copilot: { available: false, recordedOnly: true as const, recordedCount: 0, emptyReason: 'No Copilot assessment or pre-call brief on record. Atlas does not invent MRI findings.' },
      gtm: { available: false, recordedOnly: true as const, recordedCount: 0, emptyReason: 'No GTM attribution on record. Live GTM outbound is OFF. Atlas does not invent campaigns.' },
    },
    documentExchange: buildClientDocumentExchange({
      clientCode,
      documents,
      documentRequests,
    }),
    decisions: buildClientDecisionContext({ clientCode, requests }),
    priorities: buildClientPriorityContext({ clientCode, projects }),
    operatingPicture: emptyClientOperatingPicture(clientCode, workspace.displayName),
    isolation: {
      failClosed: true,
      sharePointPrimaryUx: false,
      sharePointNavigation: false,
      operatorDesk: false,
      signedClientSession: false,
    },
  };
}

function emptyClientOperatingPicture(clientCode: string, displayName?: string) {
  const classified = classifyHubClientRow({ clientCode, displayName });
  const synthetic = isExperienceSyntheticClient(clientCode) || classified.entityKind === 'synthetic_qa';
  const entityKind = synthetic ? 'synthetic_qa' : classified.entityKind;
  const classification = synthetic ? 'SYNTHETIC_QA' : classified.classification;
  const customerRecord = synthetic ? false : classified.customerRecord;
  const missingData: string[] = [];
  if (entityKind === 'synthetic_qa') {
    missingData.push('SYNTHETIC_QA — labeled fixture, not a customer operationalization.');
  }
  missingData.push('Historical HVS repositories are not accessible to this principal (HVS_DATA_ACCESS=BLOCKED).');
  if (entityKind === 'client') {
    missingData.push('No entitled Hub-visible work has been operationalized for this ClientCode.');
  }
  return {
    kind: 'client_operating_picture_v1' as const,
    clientCode,
    invented: false as const,
    classification,
    entityKind,
    customerRecord,
    hvsDataAccess: 'BLOCKED' as const,
    realClientOperationalized: false,
    honestEmpty: true,
    clientVisible: false as const,
    operatorChrome: true as const,
    source: 'hub_operator_preview' as const,
    queues: emptyOperatingQueues() as Record<OperatingState, Array<{ id: string; title: string; queue: OperatingState; kind: string; provenance: string }>>,
    recovery: undefined as RecoveryLedgerRow | undefined,
    missingData,
  };
}

/** Client-safe queues from the signed workspace overlay. Never leaks operator SharePoint work. */
export function buildClientVisibleOperatingPicture(opts: {
  clientCode: string;
  displayName?: string;
  requests: Array<{
    id: string;
    clientCode: string;
    kind: string;
    title: string;
    status: string;
    decision: string;
  }>;
  projects: Array<{
    id: string;
    clientCode: string;
    name: string;
    health: string;
    nextAction: string;
  }>;
}) {
  const picture = emptyClientOperatingPicture(opts.clientCode, opts.displayName);
  const queues = emptyOperatingQueues() as typeof picture.queues;
  const push = (queue: OperatingState, row: { id: string; title: string; kind: string }) => {
    queues[queue].push({
      id: row.id,
      title: row.title,
      queue,
      kind: row.kind,
      provenance: 'CONFIRMED',
    });
  };

  for (const req of opts.requests) {
    if (req.clientCode !== opts.clientCode) continue;
    if (req.status !== 'open' && req.decision !== 'pending') continue;
    if (req.kind === 'decision') {
      push('Decision Required', { id: req.id, title: req.title, kind: 'decision' });
    } else {
      push('Needs Action', { id: req.id, title: req.title, kind: req.kind });
    }
  }

  for (const project of opts.projects) {
    if (project.clientCode !== opts.clientCode) continue;
    push('Projects', { id: project.id, title: project.name, kind: 'project' });
    if (project.health === 'blocked') {
      push('Blocked', { id: `${project.id}:blocked`, title: project.name, kind: 'project' });
    } else if (project.health === 'watch') {
      push('At Risk', { id: `${project.id}:watch`, title: project.name, kind: 'project' });
    }
    if (project.nextAction) {
      push('Needs Action', {
        id: `${project.id}:next`,
        title: project.nextAction,
        kind: 'project',
      });
    }
  }

  const hasItems = Object.values(queues).some((rows) => rows.length > 0);
  return {
    ...picture,
    clientVisible: true as const,
    operatorChrome: false as const,
    source: 'hub_governed_overlay' as const,
    honestEmpty: !hasItems,
    queues,
  };
}

export function attachOperatorDeskOperatingPicture<
  T extends ReturnType<typeof buildOperatorClientDeskPreview>,
>(
  view: T,
  opts?: {
    commercial?: OperatorCommercialContext;
    knowledge?: KnowledgeOperatingPicture;
  },
): T {
  const clientCode = view.clientCode;
  const classified = classifyHubClientRow({
    clientCode,
    displayName: view.workspace.displayName,
  });
  const synthetic = isExperienceSyntheticClient(clientCode) || classified.entityKind === 'synthetic_qa';
  const entityKind = synthetic ? 'synthetic_qa' : classified.entityKind;
  const classification = synthetic ? 'SYNTHETIC_QA' : classified.classification;
  const customerRecord = synthetic ? false : classified.customerRecord;
  let commercial = view.commercial;
  if (opts?.commercial) {
    const gccSignals = opts.commercial.gcc.signals.filter((s) => s.clientCode === clientCode);
    const gccCount = gccSignals.length;
    const copilotCount =
      opts.commercial.copilot.assessments.filter((a) => a.clientCode === clientCode).length +
      opts.commercial.copilot.preCall.filter((b) => b.atlasClientCode === clientCode).length +
      opts.commercial.copilot.sharepoint.filter((s) => s.clientCode === clientCode).length;
    const gtmCount =
      opts.commercial.gtm.attributions.filter((a) => a.clientCode === clientCode).length +
      opts.commercial.gtm.crmSources.filter((s) => s.clientCode === clientCode).length;
    commercial = {
      clientCode,
      permitted: true,
      liveGtmOutbound: false,
      paidAds: false,
      invented: false,
      gcc: {
        available: gccCount > 0,
        recordedOnly: true,
        signalCount: gccCount,
        recordedSignals: gccSignals.map((row) => ({
          signalId: row.signalId,
          clientCode: row.clientCode,
          signalType: row.signalType,
          severity: row.severity,
          summary: row.summary,
          emittedAt: row.emittedAt,
          invented: false as const,
        })),
        emptyReason: gccCount > 0 ? undefined : opts.commercial.gcc.honesty.emptyReason,
      },
      copilot: {
        available: copilotCount > 0,
        recordedOnly: true,
        recordedCount: copilotCount,
        emptyReason: copilotCount > 0 ? undefined : opts.commercial.copilot.honesty.emptyReason,
      },
      gtm: {
        available: gtmCount > 0,
        recordedOnly: true,
        recordedCount: gtmCount,
        emptyReason: gtmCount > 0 ? undefined : opts.commercial.gtm.honesty.emptyReason,
      },
    };
  }

  let operatingPicture = view.operatingPicture;
  if (opts?.knowledge) {
    const queues = emptyOperatingQueues() as typeof operatingPicture.queues;
    for (const [state, rows] of Object.entries(opts.knowledge.queues) as Array<
      [OperatingState, KnowledgeOperatingPicture['queues'][OperatingState]]
    >) {
      queues[state] = rows
        .filter((row) => row.clientCode === clientCode)
        .map((row) => ({
          id: row.id,
          title: row.title,
          queue: row.queue,
          kind: row.kind,
          provenance: row.provenance,
        }));
    }
    const recovery = opts.knowledge.recoveryLedger.find((row) => row.clientCode === clientCode);
    const realClientOperationalized =
      customerRecord &&
      Object.values(queues).some((rows) => rows.length > 0);
    const missingData: string[] = [];
    if (entityKind === 'synthetic_qa') {
      missingData.push('SYNTHETIC_QA — labeled fixture, not a customer operationalization.');
    }
    if (opts.knowledge.hvsDataAccess === 'BLOCKED') {
      missingData.push('Historical HVS repositories are not accessible to this principal (HVS_DATA_ACCESS=BLOCKED).');
    } else if (opts.knowledge.hvsDataAccess === 'PARTIAL') {
      missingData.push('Historical HVS access is partial. Unreadable repositories stay blocked.');
    }
    if (customerRecord && !realClientOperationalized) {
      missingData.push('No entitled Hub-visible work has been operationalized for this ClientCode.');
    }
    if (recovery?.exceptions) missingData.push(recovery.exceptions);
    if (recovery?.blocker) missingData.push(recovery.blocker);
    operatingPicture = {
      kind: 'client_operating_picture_v1',
      clientCode,
      invented: false,
      classification,
      entityKind,
      customerRecord,
      hvsDataAccess: opts.knowledge.hvsDataAccess,
      realClientOperationalized,
      honestEmpty: !realClientOperationalized,
      clientVisible: false,
      operatorChrome: true,
      source: 'hub_operator_preview',
      queues,
      recovery,
      missingData: [...new Set(missingData)],
    };
  }

  return { ...view, commercial, operatingPicture };
}

export function operatorExperienceStatus(opts: { dataDir: string; principal: AtlasPrincipal; clientCode: string }) {
  if (!isMannyPrincipal(opts.principal) && !canAccessOperatorDesk(opts.principal)) {
    fail(403, 'forbidden', 'Operator desk access required.');
  }
  const clientCode = assertIsolatedClientCode(opts.clientCode);
  if (
    !isMannyPrincipal(opts.principal) &&
    !entitledClientCodes(opts.principal).includes(clientCode)
  ) {
    fail(404, 'not_found', 'Client workspace is not staged.');
  }
  const snapshot = loadExperienceStore(opts.dataDir);
  const workspace = snapshot.workspaces[clientCode];
  if (!workspace) fail(404, 'not_found', 'Client workspace is not staged.');
  return {
    workspace,
    invitations: snapshot.invitations.filter((row) => row.clientCode === clientCode).map(publicInvitation),
    bindings: snapshot.bindings.filter((row) => row.clientCode === clientCode),
    documentCount: snapshot.documents.filter((row) => row.clientCode === clientCode).length,
    requestCount: snapshot.requests.filter((row) => row.clientCode === clientCode).length,
    documentRequests: listDocumentRequests(opts.dataDir, clientCode),
    gccWorkspaceKey: gccWorkspaceKey(clientCode),
  };
}

export type OperatorClientJourney = {
  clientCode: string;
  classification: 'SYNTHETIC_QA' | 'CLIENT' | 'READ_ONLY_CLIENT';
  workspaceStaged: boolean;
  activationGate: string | null;
  invitationStatus: 'none' | 'staged' | 'redeemed' | 'expired' | 'revoked';
  invitationOutboundSent: false;
  invitationEmail: string | null;
  signedClientSession: boolean;
  bindingCount: number;
  openRequestCount: number;
  documentCount: number;
  gccWorkspaceKey: string;
  previewHref: string;
  stageHref: string;
  reissueHref: string;
  redeemHref: '/api/client/invitations/redeem';
  canStageFromDesk: boolean;
  canReissueInviteFromDesk: boolean;
  nextAction: string;
};

function latestInvitation(
  snapshot: ReturnType<typeof loadExperienceStore>,
  clientCode: string,
) {
  return snapshot.invitations
    .filter((row) => row.clientCode === clientCode)
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

function journeyNextAction(input: {
  workspaceStaged: boolean;
  invitationStatus: OperatorClientJourney['invitationStatus'];
  bindingCount: number;
  canStageFromDesk: boolean;
  canReissueInviteFromDesk: boolean;
  signedClientSession: boolean;
}): string {
  if (input.signedClientSession) {
    return input.canReissueInviteFromDesk
      ? 'Signed SYNQA client session is live. /client is isolated to this ClientCode. Entitled operator may POST reissueHref to rotate the one-time token. The prior session is revoked.'
      : 'Signed SYNQA client session is live. /client is isolated to this ClientCode.';
  }
  if (!input.workspaceStaged) {
    return input.canStageFromDesk
      ? 'Workspace not staged. Entitled operator may POST a record-only SYNQA invitation to stageHref.'
      : 'Workspace not staged. Governed activation must complete before invitation.';
  }
  if (input.invitationStatus === 'none') {
    return input.canReissueInviteFromDesk
      ? 'Workspace staged. Entitled operator may POST a record-only SYNQA invitation to reissueHref.'
      : 'Workspace staged. No invitation recorded.';
  }
  if (input.invitationStatus === 'expired' || input.invitationStatus === 'revoked') {
    return input.canReissueInviteFromDesk
      ? 'Invitation is no longer valid. Entitled operator may POST a replacement token to reissueHref.'
      : 'Invitation is no longer valid. Re-stage a record-only invitation.';
  }
  if (input.invitationStatus === 'staged') {
    return input.canReissueInviteFromDesk
      ? 'Invitation staged (record-only, outbound not sent). Entitled operator may POST reissueHref for a one-time token. A Client Executive principal redeems at redeemHref.'
      : 'Invitation staged (record-only, outbound not sent). Waiting for a Client Executive principal to redeem.';
  }
  if (input.bindingCount > 0) {
    return 'Invitation redeemed. signedClientSession remains false until a client principal uses /client.';
  }
  return 'Invitation redeemed. No signed client session on this operator desk.';
}

/** Entitled-only client journey status for the operator desk. Never lists foreign ClientCodes. */
export function listOperatorClientJourneys(opts: {
  dataDir: string;
  entitledClientCodes: string[];
  principal?: AtlasPrincipal;
}): OperatorClientJourney[] {
  const snapshot = loadExperienceStore(opts.dataDir);
  const codes = [...new Set(opts.entitledClientCodes.filter((code) => isCanonicalClientCode(code)))];
  return codes.map((clientCode) => {
    const classified = classifyHubClientRow({ clientCode });
    const workspace = snapshot.workspaces[clientCode];
    const invite = latestInvitation(snapshot, clientCode);
    const bindingCount = snapshot.bindings.filter((row) => row.clientCode === clientCode).length;
    const invitationStatus = invite?.status || 'none';
    const workspaceStaged = Boolean(workspace);
    const canStageFromDesk = Boolean(
      opts.principal && canStageClientExperience(opts.principal, clientCode) && !workspaceStaged,
    );
    const canReissueInviteFromDesk = Boolean(
      opts.principal &&
        canReissueClientInvitation(opts.principal, clientCode) &&
        workspaceStaged &&
        (invitationStatus !== 'redeemed' || isExperienceSyntheticClient(clientCode)),
    );
    return {
      clientCode,
      classification: classified.classification,
      workspaceStaged,
      activationGate: workspace?.activationGate || null,
      invitationStatus,
      invitationOutboundSent: false,
      invitationEmail:
        classified.classification === 'SYNTHETIC_QA' && invite?.email ? invite.email : null,
      signedClientSession: hasActiveSynqaClientSession(snapshot, clientCode),
      bindingCount,
      openRequestCount: snapshot.requests.filter(
        (row) => row.clientCode === clientCode && row.status === 'open',
      ).length,
      documentCount: snapshot.documents.filter((row) => row.clientCode === clientCode).length,
      gccWorkspaceKey: gccWorkspaceKey(clientCode),
      previewHref: `/api/pm/clients/${clientCode}/desk`,
      stageHref: `/api/pm/clients/${clientCode}/experience`,
      reissueHref: `/api/pm/clients/${clientCode}/invitation/reissue`,
      redeemHref: '/api/client/invitations/redeem',
      canStageFromDesk,
      canReissueInviteFromDesk,
      nextAction: journeyNextAction({
        workspaceStaged,
        invitationStatus,
        bindingCount,
        canStageFromDesk,
        canReissueInviteFromDesk,
        signedClientSession: hasActiveSynqaClientSession(snapshot, clientCode),
      }),
    };
  });
}
