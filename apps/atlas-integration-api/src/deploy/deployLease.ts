/**
 * Short-lived deployment lease metadata for Hub production deploys.
 * Persisted to Azure Blob when configured; file overlay for local/tests.
 */

export const DEPLOY_LEASE_CONTRACT = 'atlas-hub-deploy-lease.v1' as const;
export const DEFAULT_DEPLOY_STORAGE_ACCOUNT = 'sthvcgwebintake' as const;
export const DEFAULT_DEPLOY_CONTAINER = 'atlas-deploy-control' as const;
export const DEFAULT_DEPLOY_LOCK_BLOB = 'hub-production.lock' as const;
export const DEFAULT_DEPLOY_STATE_BLOB = 'hub-production-state.json' as const;
export const DEFAULT_LEASE_DURATION_SEC = 90;

export type DeployLeaseRecord = {
  contractVersion: typeof DEPLOY_LEASE_CONTRACT;
  leaseId: string;
  holderId: string;
  candidateSha: string;
  branch: string;
  acquiredAt: string;
  expiresAt: string;
};

export type DeployProductionState = {
  contractVersion: typeof DEPLOY_LEASE_CONTRACT;
  canonicalSha: string;
  deployedSha: string;
  branch: string;
  deployedAt: string;
  holderId?: string;
};

export function buildLeaseRecord(opts: {
  leaseId: string;
  holderId: string;
  candidateSha: string;
  branch: string;
  durationSec?: number;
}): DeployLeaseRecord {
  const now = Date.now();
  const duration = opts.durationSec ?? DEFAULT_LEASE_DURATION_SEC;
  return {
    contractVersion: DEPLOY_LEASE_CONTRACT,
    leaseId: opts.leaseId,
    holderId: opts.holderId,
    candidateSha: opts.candidateSha,
    branch: opts.branch,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + duration * 1000).toISOString(),
  };
}

export function buildProductionState(opts: {
  canonicalSha: string;
  deployedSha: string;
  branch: string;
  holderId?: string;
}): DeployProductionState {
  return {
    contractVersion: DEPLOY_LEASE_CONTRACT,
    canonicalSha: opts.canonicalSha,
    deployedSha: opts.deployedSha,
    branch: opts.branch,
    deployedAt: new Date().toISOString(),
    ...(opts.holderId ? { holderId: opts.holderId } : {}),
  };
}

export function leaseRecordExpired(record: DeployLeaseRecord, nowMs = Date.now()): boolean {
  const expires = Date.parse(record.expiresAt);
  return Number.isFinite(expires) && expires <= nowMs;
}
