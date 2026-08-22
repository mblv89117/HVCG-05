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
  if (!isMannyPrincipal(opts.principal)) {
    fail(403, 'PM_MANNY_ONLY', 'Client experience staging is restricted to the authenticated HVCG owner principal.');
  }
  const clientCode = assertIsolatedClientCode(opts.clientCode);
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

function overlayAttention(dataDir: string, clientCode: string): DocumentRequestRecord[] {
  return listDocumentRequests(dataDir, clientCode).filter((row) => row.status === 'requested');
}

export function buildClientWorkspaceView(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  clientCode?: string;
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
    gcc: {
      workspaceKey: workspace.gccWorkspaceKey,
      isolated: true,
      clientCode: requested,
    },
    commercial: {
      clientCode: requested,
      permitted: true,
      liveGtmOutbound: false,
      paidAds: false,
    },
    isolation: {
      failClosed: true,
      sharePointPrimaryUx: false,
      operatorDesk: false,
    },
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
        });
      }
    } else {
      updateDocumentRequest(opts.dataDir, {
        clientCode,
        id: opts.requestedId,
        status: 'received',
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
    },
    commercial: {
      clientCode,
      permitted: true,
      liveGtmOutbound: false,
      paidAds: false,
    },
    isolation: {
      failClosed: true,
      sharePointPrimaryUx: false,
      operatorDesk: false,
      signedClientSession: false,
    },
  };
}

export function operatorExperienceStatus(opts: { dataDir: string; principal: AtlasPrincipal; clientCode: string }) {
  if (!isMannyPrincipal(opts.principal) && !isOperatorPrincipal(opts.principal)) {
    fail(403, 'forbidden', 'Operator role required.');
  }
  const clientCode = assertIsolatedClientCode(opts.clientCode);
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
