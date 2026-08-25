/**
 * Durable overlay for current-client business memory backfill progress,
 * identity map, and per-client operating records. Not a second CRM or KB.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AskAtlasClassification } from './types.ts';

export const BUSINESS_MEMORY_SCHEMA_VERSION = 1;
export const BUSINESS_MEMORY_MISSION_KEY = 'ATLAS-M365-CURRENT-CLIENT-BACKFILL-001' as const;

export type IdentityConfidence = 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';

export type ClientBackfillPhase =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'BACKFILLED'
  | 'PARTIAL'
  | 'BLOCKED';

export type ClientIdentityAlias = {
  value: string;
  kind: 'legal_name' | 'dba' | 'contact_email' | 'email_domain' | 'hvs_folder' | 'contract_party' | 'project_alias';
  confidence: IdentityConfidence;
  provenance: string;
};

export type ClientIdentityRecord = {
  clientCode: string;
  legalName?: string;
  operatingName?: string;
  aliases: ClientIdentityAlias[];
  contactEmails: string[];
  emailDomains: string[];
  historicalHvsRelationship?: boolean;
  authoritativeSource: 'HVCG_Clients' | 'ENTITLED_HUB_MI';
  currentClient: true;
  updatedAt: string;
};

export type M365SyncProofStatus = 'LIVE' | 'PARTIAL' | 'BLOCKED' | 'NOT_PROVED';

export type M365ReadProofs = {
  hvcgMail: M365SyncProofStatus;
  hvsMail: M365SyncProofStatus;
  hvcgFiles: M365SyncProofStatus;
  hvsFiles: M365SyncProofStatus;
  deltaCheckpoints: M365SyncProofStatus;
  syncRecovery: M365SyncProofStatus;
  hvsReadOnly: true;
  mailSendAdded: false;
  notes: string[];
  verifiedAt?: string;
};

export type BusinessMemoryCommitment = {
  id: string;
  who: string;
  toWhom: string;
  commitment: string;
  dueDate?: string;
  source: string;
  status: 'OPEN' | 'COMPLETE' | 'STALE_OR_UNCERTAIN';
  confidence: IdentityConfidence;
};

export type BusinessMemoryDecision = {
  id: string;
  decision: string;
  decisionMaker?: string;
  at?: string;
  source: string;
  confidence: IdentityConfidence;
  superseded?: boolean;
};

export type BusinessMemoryWaiting = {
  id: string;
  state: 'WAITING_ON_CLIENT' | 'WAITING_ON_HVCG' | 'WAITING_ON_VENDOR' | 'WAITING_ON_OWNER' | 'BLOCKED';
  summary: string;
  source: string;
  confidence: IdentityConfidence;
};

export type ClientOperatingRecordOverlay = {
  clientCode: string;
  clientName?: string;
  phase: ClientBackfillPhase;
  whoIsTheClient?: string;
  whatWeAreWorkingOn?: string[];
  whatWeDelivered?: string[];
  whatIsOpen?: string[];
  waitingOnUs?: string[];
  waitingOnThem?: string[];
  decisionsMade?: string[];
  documentsThatMatter?: string[];
  needsOwnerAttention?: string[];
  nextAction?: string;
  commitments: BusinessMemoryCommitment[];
  decisions: BusinessMemoryDecision[];
  waiting: BusinessMemoryWaiting[];
  mailMessagesReconciled: number;
  threadsReconstructed: number;
  attachmentsReconciled: number;
  filesReconciled: number;
  projectsReconstructed: number;
  contractsSowReconciled: number;
  capitalHistoryPresent: boolean;
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  provenance: string;
  lastBackfillAt?: string;
  blockers?: string[];
};

export type BusinessMemoryProgress = {
  currentClientsEnumerated: number;
  currentClientsBackfilled: number;
  currentClientsPartial: number;
  currentClientsBlocked: number;
  currentClientsRemaining: number;
  mailMessagesReconciled: number;
  threadsReconstructed: number;
  attachmentsReconciled: number;
  filesReconciled: number;
  projectsReconstructed: number;
  commitmentsIdentified: number;
  decisionsIdentified: number;
  firstRealClientBackfill?: string;
  lastRunAt?: string;
};

export type BusinessMemoryOverlay = {
  schemaVersion?: number;
  identityMap: ClientIdentityRecord[];
  operatingRecords: ClientOperatingRecordOverlay[];
  progress: BusinessMemoryProgress;
  readProofs: M365ReadProofs;
};

export function resolveBusinessMemoryDir(dataDir: string, env: NodeJS.ProcessEnv = process.env): string {
  const explicit = (env.INTEGRATION_BUSINESS_MEMORY_DIR || '').trim();
  if (explicit) return explicit;
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'business-memory');
  return join(dataDir, 'business-memory');
}

export function businessMemoryFilePath(dir: string): string {
  return join(dir, 'business-memory-overlay.json');
}

export function emptyM365ReadProofs(): M365ReadProofs {
  return {
    hvcgMail: 'NOT_PROVED',
    hvsMail: 'NOT_PROVED',
    hvcgFiles: 'NOT_PROVED',
    hvsFiles: 'NOT_PROVED',
    deltaCheckpoints: 'NOT_PROVED',
    syncRecovery: 'NOT_PROVED',
    hvsReadOnly: true,
    mailSendAdded: false,
    notes: [],
  };
}

export function emptyBusinessMemoryProgress(): BusinessMemoryProgress {
  return {
    currentClientsEnumerated: 0,
    currentClientsBackfilled: 0,
    currentClientsPartial: 0,
    currentClientsBlocked: 0,
    currentClientsRemaining: 0,
    mailMessagesReconciled: 0,
    threadsReconstructed: 0,
    attachmentsReconciled: 0,
    filesReconciled: 0,
    projectsReconstructed: 0,
    commitmentsIdentified: 0,
    decisionsIdentified: 0,
  };
}

export function emptyBusinessMemoryOverlay(): BusinessMemoryOverlay {
  return {
    schemaVersion: BUSINESS_MEMORY_SCHEMA_VERSION,
    identityMap: [],
    operatingRecords: [],
    progress: emptyBusinessMemoryProgress(),
    readProofs: emptyM365ReadProofs(),
  };
}

export function readBusinessMemoryOverlay(dir: string): BusinessMemoryOverlay {
  const path = businessMemoryFilePath(dir);
  if (!existsSync(path)) return emptyBusinessMemoryOverlay();
  try {
    const raw = readFileSync(path, 'utf8');
    if (!raw.trim()) return emptyBusinessMemoryOverlay();
    const parsed = JSON.parse(raw) as BusinessMemoryOverlay;
    return {
      schemaVersion: parsed.schemaVersion ?? BUSINESS_MEMORY_SCHEMA_VERSION,
      identityMap: Array.isArray(parsed.identityMap) ? parsed.identityMap : [],
      operatingRecords: Array.isArray(parsed.operatingRecords) ? parsed.operatingRecords : [],
      progress: { ...emptyBusinessMemoryProgress(), ...(parsed.progress || {}) },
      readProofs: { ...emptyM365ReadProofs(), ...(parsed.readProofs || {}) },
    };
  } catch {
    return emptyBusinessMemoryOverlay();
  }
}

export function writeBusinessMemoryOverlay(dir: string, overlay: BusinessMemoryOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = businessMemoryFilePath(dir);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(
    tmp,
    JSON.stringify(
      {
        schemaVersion: BUSINESS_MEMORY_SCHEMA_VERSION,
        identityMap: overlay.identityMap,
        operatingRecords: overlay.operatingRecords,
        progress: overlay.progress,
        readProofs: overlay.readProofs,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  renameSync(tmp, path);
}

export function upsertOperatingRecord(
  overlay: BusinessMemoryOverlay,
  record: ClientOperatingRecordOverlay,
): BusinessMemoryOverlay {
  const idx = overlay.operatingRecords.findIndex((r) => r.clientCode === record.clientCode);
  if (idx >= 0) overlay.operatingRecords[idx] = record;
  else overlay.operatingRecords.push(record);
  return overlay;
}

export function recomputeProgress(overlay: BusinessMemoryOverlay): BusinessMemoryProgress {
  const enumerated = overlay.identityMap.filter((r) => r.currentClient).length;
  let backfilled = 0;
  let partial = 0;
  let blocked = 0;
  let mailMessages = 0;
  let threads = 0;
  let attachments = 0;
  let files = 0;
  let projects = 0;
  let commitments = 0;
  let decisions = 0;
  let firstReal: string | undefined = overlay.progress.firstRealClientBackfill;
  for (const row of overlay.operatingRecords) {
    mailMessages += row.mailMessagesReconciled;
    threads += row.threadsReconstructed;
    attachments += row.attachmentsReconciled;
    files += row.filesReconciled;
    projects += row.projectsReconstructed;
    commitments += row.commitments.length;
    decisions += row.decisions.length;
    if (row.phase === 'BACKFILLED') backfilled += 1;
    else if (row.phase === 'PARTIAL') partial += 1;
    else if (row.phase === 'BLOCKED') blocked += 1;
    if (!firstReal && row.phase === 'BACKFILLED') firstReal = row.clientCode;
  }
  const remaining = Math.max(0, enumerated - backfilled - partial - blocked);
  return {
    currentClientsEnumerated: enumerated,
    currentClientsBackfilled: backfilled,
    currentClientsPartial: partial,
    currentClientsBlocked: blocked,
    currentClientsRemaining: remaining,
    mailMessagesReconciled: mailMessages,
    threadsReconstructed: threads,
    attachmentsReconciled: attachments,
    filesReconciled: files,
    projectsReconstructed: projects,
    commitmentsIdentified: commitments,
    decisionsIdentified: decisions,
    ...(firstReal ? { firstRealClientBackfill: firstReal } : {}),
    lastRunAt: overlay.progress.lastRunAt,
  };
}
