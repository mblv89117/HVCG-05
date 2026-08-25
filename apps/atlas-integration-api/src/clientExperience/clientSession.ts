/**
 * SYNQA-only Hub client sessions.
 * Real CLIENT invitations still require an Entra Client Executive principal.
 * Session tokens are hashed at rest and never inherit operator desk access.
 */

import type { AtlasPrincipal } from '../middleware/auth.ts';
import {
  type ClientExperienceSnapshot,
  type ClientSession,
  DEFAULT_SESSION_TTL_MS,
  SYNQA_CLIENT_SESSION_PREFIX,
  hashInviteToken,
  issueInviteToken,
  loadExperienceStore,
  newId,
  saveExperienceStore,
} from './store.ts';
import { isCanonicalClientCode } from '../entitlements/clientCode.ts';

export function isSynqaClientSessionToken(token: string): boolean {
  return token.startsWith(SYNQA_CLIENT_SESSION_PREFIX);
}

export function issueSynqaClientSessionToken(): { token: string; tokenHash: string } {
  const issued = issueInviteToken();
  return {
    token: `${SYNQA_CLIENT_SESSION_PREFIX}${issued.token}`,
    tokenHash: hashInviteToken(`${SYNQA_CLIENT_SESSION_PREFIX}${issued.token}`),
  };
}

export function revokeClientSessions(snapshot: ClientExperienceSnapshot, clientCode: string): void {
  const now = new Date().toISOString();
  for (const row of snapshot.clientSessions) {
    if (row.clientCode === clientCode && row.status === 'active') {
      row.status = 'revoked';
      row.revokedAt = now;
    }
  }
}

export function hasActiveSynqaClientSession(
  snapshot: ClientExperienceSnapshot,
  clientCode: string,
  nowMs = Date.now(),
): boolean {
  return snapshot.clientSessions.some(
    (row) =>
      row.clientCode === clientCode &&
      row.status === 'active' &&
      Date.parse(row.expiresAt) > nowMs,
  );
}

export function persistSynqaClientSession(opts: {
  snapshot: ClientExperienceSnapshot;
  clientCode: string;
  email: string;
  userId: string;
}): { session: ClientSession; token: string } {
  revokeClientSessions(opts.snapshot, opts.clientCode);
  const issued = issueSynqaClientSessionToken();
  const now = new Date();
  const session: ClientSession = {
    id: newId('cxs'),
    clientCode: opts.clientCode,
    email: opts.email,
    userId: opts.userId,
    tokenHash: issued.tokenHash,
    status: 'active',
    classification: 'SYNTHETIC_QA',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + DEFAULT_SESSION_TTL_MS).toISOString(),
  };
  opts.snapshot.clientSessions.push(session);
  return { session, token: issued.token };
}

export function resolveSynqaClientSession(
  dataDir: string,
  token: string,
): AtlasPrincipal | null {
  if (!isSynqaClientSessionToken(token)) return null;
  const snapshot = loadExperienceStore(dataDir);
  const tokenHash = hashInviteToken(token);
  const row = snapshot.clientSessions.find((item) => item.tokenHash === tokenHash);
  if (!row || row.status !== 'active') return null;
  if (!isCanonicalClientCode(row.clientCode) || row.classification !== 'SYNTHETIC_QA') return null;
  if (Date.parse(row.expiresAt) <= Date.now()) {
    row.status = 'expired';
    saveExperienceStore(dataDir, snapshot);
    return null;
  }
  row.lastSeenAt = new Date().toISOString();
  saveExperienceStore(dataDir, snapshot);
  return {
    userId: row.userId,
    email: row.email,
    organizationId: 'org-hvcg',
    allowedClientIds: [row.clientCode],
    roles: ['Client Executive'],
  };
}
