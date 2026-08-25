/**
 * Atlas global status language.
 * Same semantic state must look and sound the same across modules.
 * Hub/backend remains authoritative for classification; this file is display only.
 */

export const ATLAS_STATUS = {
  needsAction: 'Needs Action',
  needsManny: 'Needs Manny',
  waiting: 'Waiting',
  waitingClient: 'Waiting Client',
  waitingLender: 'Waiting Lender',
  waitingInternal: 'Waiting Internal',
  waitingExternal: 'Waiting External',
  ready: 'Ready',
  readyForSubmission: 'Ready for Submission',
  inReview: 'In Review',
  overdue: 'Overdue',
  rfiOverdue: 'RFI Overdue',
  blocked: 'Blocked',
  atRisk: 'At Risk',
  verified: 'Verified',
  unverified: 'Unverified',
  complete: 'Complete',
  funded: 'Funded',
  complianceReview: 'Compliance Review',
  termSheetReceived: 'Term Sheet Received',
  closing: 'Closing',
  decisionRequired: 'Decision Required',
  activationRequired: 'Client Activation Required',
} as const;

export type AtlasStatusLabel = (typeof ATLAS_STATUS)[keyof typeof ATLAS_STATUS];

export type AtlasStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

const TONE_BY_LABEL: Record<string, AtlasStatusTone> = {
  [ATLAS_STATUS.needsAction]: 'warning',
  [ATLAS_STATUS.needsManny]: 'warning',
  [ATLAS_STATUS.decisionRequired]: 'warning',
  [ATLAS_STATUS.activationRequired]: 'gold',
  [ATLAS_STATUS.waiting]: 'info',
  [ATLAS_STATUS.waitingClient]: 'info',
  [ATLAS_STATUS.waitingLender]: 'info',
  [ATLAS_STATUS.waitingInternal]: 'info',
  [ATLAS_STATUS.waitingExternal]: 'info',
  [ATLAS_STATUS.ready]: 'success',
  [ATLAS_STATUS.readyForSubmission]: 'success',
  [ATLAS_STATUS.inReview]: 'info',
  [ATLAS_STATUS.overdue]: 'danger',
  [ATLAS_STATUS.rfiOverdue]: 'danger',
  [ATLAS_STATUS.blocked]: 'danger',
  [ATLAS_STATUS.atRisk]: 'danger',
  [ATLAS_STATUS.verified]: 'success',
  [ATLAS_STATUS.unverified]: 'neutral',
  [ATLAS_STATUS.complete]: 'success',
  [ATLAS_STATUS.funded]: 'success',
  [ATLAS_STATUS.complianceReview]: 'gold',
  [ATLAS_STATUS.termSheetReceived]: 'info',
  [ATLAS_STATUS.closing]: 'info',
};

export function atlasStatusTone(label: string): AtlasStatusTone {
  return TONE_BY_LABEL[label] || 'neutral';
}

/** Normalize Hub / SharePoint tokens for lookup. Display still uses ATLAS_STATUS labels. */
function normalizeStatusToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

const RAW_TO_ATLAS: Record<string, AtlasStatusLabel> = {
  blocked: ATLAS_STATUS.blocked,
  'at risk': ATLAS_STATUS.atRisk,
  atrisk: ATLAS_STATUS.atRisk,
  critical: ATLAS_STATUS.atRisk,
  red: ATLAS_STATUS.atRisk,
  overdue: ATLAS_STATUS.overdue,
  'rfi overdue': ATLAS_STATUS.rfiOverdue,
  waiting: ATLAS_STATUS.waiting,
  'waiting client': ATLAS_STATUS.waitingClient,
  'waiting on client': ATLAS_STATUS.waitingClient,
  'waiting internal': ATLAS_STATUS.waitingInternal,
  'waiting on internal': ATLAS_STATUS.waitingInternal,
  'waiting lender': ATLAS_STATUS.waitingLender,
  'waiting on lender': ATLAS_STATUS.waitingLender,
  'waiting external': ATLAS_STATUS.waitingExternal,
  'waiting on external': ATLAS_STATUS.waitingExternal,
  'needs review': ATLAS_STATUS.inReview,
  'in review': ATLAS_STATUS.inReview,
  'needs owner approval': ATLAS_STATUS.needsManny,
  'needs manny': ATLAS_STATUS.needsManny,
  'decision required': ATLAS_STATUS.decisionRequired,
  'activation required': ATLAS_STATUS.activationRequired,
  'client activation required': ATLAS_STATUS.activationRequired,
  completed: ATLAS_STATUS.complete,
  complete: ATLAS_STATUS.complete,
  ready: ATLAS_STATUS.ready,
  'not started': ATLAS_STATUS.ready,
  'ready for submission': ATLAS_STATUS.readyForSubmission,
  funded: ATLAS_STATUS.funded,
  verified: ATLAS_STATUS.verified,
  unverified: ATLAS_STATUS.unverified,
  'needs action': ATLAS_STATUS.needsAction,
  'compliance review': ATLAS_STATUS.complianceReview,
  closing: ATLAS_STATUS.closing,
  'term sheet received': ATLAS_STATUS.termSheetReceived,
};

/**
 * Map a Hub/SharePoint status token onto Atlas status language when the meaning is known.
 * Unknown values are returned unchanged (never invented). Empty → null.
 */
export function atlasLabelForRawStatus(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const mapped = RAW_TO_ATLAS[normalizeStatusToken(trimmed)];
  return mapped || trimmed;
}

export function atlasStatusDisplay(raw: string | undefined | null): {
  label: string;
  tone: AtlasStatusTone;
} | null {
  const label = atlasLabelForRawStatus(raw);
  if (!label) return null;
  return { label, tone: atlasStatusTone(label) };
}
