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
    notes:
      'Catalog-only. 2026-08-22 HVS-admin discovery found no 00_Client Files folder, Master Client List row, or hart-named files. Remain STALE_OR_UNCERTAIN until Hub-visible.',
  },
  {
    clientCode: 'CPL01',
    legalName: "Christie's Place LLC",
    kind: 'client',
    writePolicy: 'normal',
    keepDistinctFrom: ['Christie Falk', 'Irwin Falk'],
    notes:
      "HVS 00_Client Files folder CONFIRMED. Christie's Place is the client entity. Falk is a related person, not a second client code.",
  },
  {
    clientCode: 'PDG01',
    legalName: 'Prodigy Games LLC',
    kind: 'client',
    writePolicy: 'normal',
    notes:
      'HVS 00_Client Files folder CONFIRMED. Transaction workbooks exist at Documents root. Operationalize only from a Hub-visible entitled row. Do not invent balances.',
  },
  {
    clientCode: "KAVA01",
    legalName: "That's Kava LLC",
    kind: 'client',
    writePolicy: 'normal',
    notes:
      'HVS materials found by admin search but no 00_Client Files folder and no Master Client List row. Client-roster status remains STALE_OR_UNCERTAIN.',
  },
  {
    clientCode: 'ACCG01',
    legalName: 'ACCG',
    kind: 'client',
    writePolicy: 'read_only',
    notes:
      'HVS 00_Client Files folder CONFIRMED (ACCG Inc). Read-only unless an approved write window exists. This cycle has no approved window.',
  },
  {
    clientCode: 'CCB01',
    legalName: 'Colorado Craft Beef',
    kind: 'client',
    writePolicy: 'normal',
    notes:
      'HVS folder name is Colorado Beef. Catalog code CCB01. Operationalize only from a Hub-visible entitled row.',
  },
  {
    clientCode: 'LIEN01',
    legalName: 'Lien Partners',
    kind: 'client',
    writePolicy: 'normal',
    notes: 'HVS 00_Client Files folder CONFIRMED (Lien Partners LLC). Operationalize only from a Hub-visible entitled row.',
  },
  {
    clientCode: 'SYN01',
    legalName: 'SYNTHETIC QA — Atlas Capital Operations',
    kind: 'synthetic_qa',
    writePolicy: 'normal',
    notes: 'Synthetic QA tenant. Never treat as a customer operating record.',
  },
  {
    legalName: 'Christie Falk',
    kind: 'unknown_code',
    writePolicy: 'none',
    keepDistinctFrom: ["Christie's Place LLC"],
    notes: "Related person, not a client. Remain STALE_OR_UNCERTAIN. Do not mint a client code.",
  },
  {
    legalName: 'Irwin Falk',
    kind: 'unknown_code',
    writePolicy: 'none',
    keepDistinctFrom: ["Christie's Place LLC"],
    notes: "Related person, not a client. Remain STALE_OR_UNCERTAIN. Do not mint a client code.",
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
  return clientCode === 'SYN01' || clientCode === 'SYNTH01';
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
  const entityKind = isSyntheticQaClient(input.clientCode)
    ? 'synthetic_qa'
    : boundary?.kind || 'client';
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

/** Map an existing opportunity attention state. Does not invent next actions or money. */
export function opportunityOperatingStates(input: { state?: string }): OperatingState[] {
  switch ((input.state || '').trim()) {
    case 'OVERDUE':
      return ['Overdue', 'Needs Action'];
    case 'NEEDS_ACTION':
    case 'NO_NEXT_ACTION':
      return ['Needs Action'];
    case 'NEEDS_MANNY':
      return ['Decision Required'];
    case 'ACTIVATION_REQUIRED':
      return ['Needs Action', 'Decision Required'];
    case 'WON':
    case 'LOST':
      return ['Outcomes'];
    case 'OPEN':
      return ['Ready'];
    default:
      return [];
  }
}
