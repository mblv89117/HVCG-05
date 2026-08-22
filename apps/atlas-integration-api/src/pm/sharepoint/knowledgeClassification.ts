/**
 * Atlas knowledge classification — metadata and operating queues only.
 * SharePoint/OneDrive remain authoritative. Atlas does not copy binaries.
 * Never invent deadlines, balances, commitments, project status, or financials.
 */

import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { NO_TOUCH_CLIENT_CODES } from './leadConversion.ts';
import { PmHttpError } from './errors.ts';

export const KNOWLEDGE_PROVENANCE = [
  'CONFIRMED',
  'LIKELY',
  'PROPOSED',
  'STALE_OR_UNCERTAIN',
  'COMPLETE',
] as const;
export type KnowledgeProvenance = (typeof KNOWLEDGE_PROVENANCE)[number];

export const OPERATING_STATES = [
  'Needs Action',
  'Waiting',
  'Overdue',
  'Blocked',
  'Decision Required',
  'At Risk',
  'Ready',
  'Outcomes',
  'Projects',
  'Tasks',
] as const;
export type OperatingState = (typeof OPERATING_STATES)[number];

export type EntityKind =
  | 'client'
  | 'synthetic_qa'
  | 'vendor_referral'
  | 'reference_tenant'
  | 'unknown_code';

export type EntityBoundary = {
  clientCode?: string;
  legalName: string;
  kind: EntityKind;
  writePolicy: 'normal' | 'read_only' | 'none';
  keepDistinctFrom?: string[];
  notes: string;
};

/** Reference catalog. Not a live inventory and not a source of invented work. */
export const ENTITY_BOUNDARIES: readonly EntityBoundary[] = [
  {
    clientCode: 'HFD01',
    legalName: 'Hart Family Dental',
    kind: 'client',
    writePolicy: 'normal',
    notes: 'Known example. Operationalize only from a Hub-visible entitled row.',
  },
  {
    clientCode: 'CPL01',
    legalName: "Christie's Place LLC",
    kind: 'client',
    writePolicy: 'normal',
    keepDistinctFrom: ['Christie Falk'],
    notes: "Christie's Place is the client entity. Falk is a related person, not a second client code.",
  },
  {
    clientCode: 'PDG01',
    legalName: 'Prodigy Games LLC',
    kind: 'client',
    writePolicy: 'normal',
    notes: 'Known example. Operationalize only from a Hub-visible entitled row.',
  },
  {
    clientCode: "KAVA01",
    legalName: "That's Kava LLC",
    kind: 'client',
    writePolicy: 'normal',
    notes: 'Known example. Operationalize only from a Hub-visible entitled row.',
  },
  {
    clientCode: 'ACCG01',
    legalName: 'ACCG',
    kind: 'client',
    writePolicy: 'read_only',
    notes: 'Read-only unless an approved write window exists. This cycle has no approved window.',
  },
  {
    clientCode: 'CCB01',
    legalName: 'Colorado Craft Beef',
    kind: 'client',
    writePolicy: 'normal',
    notes: 'Present on the Hub entitlement/code catalog. Operationalize only from a Hub-visible entitled row.',
  },
  {
    clientCode: 'LIEN01',
    legalName: 'Lien Partners',
    kind: 'client',
    writePolicy: 'normal',
    notes: 'Present on the Hub entitlement/code catalog. Operationalize only from a Hub-visible entitled row.',
  },
  {
    clientCode: 'SYN01',
    legalName: 'SYNTHETIC QA — Atlas Capital Operations',
    kind: 'synthetic_qa',
    writePolicy: 'normal',
    notes: 'Synthetic QA tenant. Never treat as a customer operating record.',
  },
  {
    legalName: 'Loanspark',
    kind: 'vendor_referral',
    writePolicy: 'none',
    notes: 'Vendor/referral partner unless a current Hub client row says otherwise.',
  },
  {
    legalName: 'Best Day Of My Life / Ryan Gnieski',
    kind: 'reference_tenant',
    writePolicy: 'none',
    notes: '360 Website Builder reference tenant. Not standalone software and not a client code.',
  },
];

export function entityBoundaryFor(clientCode: string | undefined): EntityBoundary | undefined {
  if (!clientCode) return undefined;
  return ENTITY_BOUNDARIES.find((row) => row.clientCode === clientCode);
}

export function isSyntheticQaClient(clientCode: string | undefined): boolean {
  return clientCode === 'SYN01';
}

export function isAccgReadOnly(clientCode: string | undefined): boolean {
  return Boolean(clientCode && NO_TOUCH_CLIENT_CODES.has(clientCode));
}

/** ACCG01 writes require an approved window. None is configured in this cycle. */
export function assertWritableClientCode(clientCode: string, action: string): void {
  if (!isCanonicalClientCode(clientCode)) {
    throw new PmHttpError(400, 'invalid_client_code', 'Canonical ClientCode is required.');
  }
  if (isAccgReadOnly(clientCode)) {
    throw new PmHttpError(
      403,
      'ACCG01_WRITE_WINDOW_REQUIRED',
      `ACCG01 is read-only. ${action} is blocked until an approved write window exists.`,
    );
  }
}

export type RecoveryLedgerRow = {
  source: string;
  client: string;
  clientCode: string;
  dataType: string;
  discovered: boolean;
  accessible: boolean;
  indexed: boolean;
  classified: boolean;
  operationalized: boolean;
  validated: boolean;
  exceptions: string;
  blocker: string;
  provenance: KnowledgeProvenance;
};

export function emptyOperatingQueues(): Record<OperatingState, unknown[]> {
  return {
    'Needs Action': [],
    Waiting: [],
    Overdue: [],
    Blocked: [],
    'Decision Required': [],
    'At Risk': [],
    Ready: [],
    Outcomes: [],
    Projects: [],
    Tasks: [],
  };
}

export function classifyHubClientRow(input: {
  clientCode: string;
  displayName?: string;
  sharePointLibraryUrl?: string;
}): {
  clientCode: string;
  displayName: string;
  entityKind: EntityKind;
  writePolicy: EntityBoundary['writePolicy'];
  customerRecord: boolean;
  provenance: KnowledgeProvenance;
  classification: 'SYNTHETIC_QA' | 'CLIENT' | 'READ_ONLY_CLIENT';
} {
  const boundary = entityBoundaryFor(input.clientCode);
  const entityKind = boundary?.kind || 'client';
  const writePolicy = boundary?.writePolicy || (isAccgReadOnly(input.clientCode) ? 'read_only' : 'normal');
  const classification =
    entityKind === 'synthetic_qa'
      ? 'SYNTHETIC_QA'
      : writePolicy === 'read_only'
        ? 'READ_ONLY_CLIENT'
        : 'CLIENT';
  return {
    clientCode: input.clientCode,
    displayName: input.displayName || boundary?.legalName || input.clientCode,
    entityKind,
    writePolicy,
    customerRecord: entityKind === 'client',
    provenance: 'CONFIRMED',
    classification,
  };
}

export function taskOperatingStates(input: {
  status?: string;
  dueDate?: string;
  today?: string;
}): OperatingState[] {
  const states: OperatingState[] = ['Tasks'];
  const status = (input.status || '').trim();
  const today = (input.today || new Date().toISOString()).slice(0, 10);
  const due = (input.dueDate || '').slice(0, 10);
  if (status === 'completed') states.push('Outcomes');
  if (status === 'waiting') states.push('Waiting');
  if (status === 'blocked') states.push('Blocked');
  if (status === 'needs_owner_approval') states.push('Decision Required');
  if (status === 'ready' || status === 'inbox') states.push('Ready');
  if (status === 'in_progress' || status === 'needs_review') states.push('Needs Action');
  if (due && status !== 'completed' && status !== 'cancelled' && due < today) states.push('Overdue');
  return [...new Set(states)];
}

export function projectOperatingStates(input: { health?: string; status?: string }): OperatingState[] {
  const states: OperatingState[] = ['Projects'];
  const health = (input.health || '').trim();
  const status = (input.status || '').trim();
  if (health === 'at_risk' || health === 'critical') states.push('At Risk');
  if (status === 'blocked') states.push('Blocked');
  if (status === 'completed') states.push('Outcomes');
  return [...new Set(states)];
}
