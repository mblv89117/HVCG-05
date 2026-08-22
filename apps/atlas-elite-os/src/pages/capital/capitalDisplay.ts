/**
 * Operator-facing Capital labels. Display only — Hub remains authoritative.
 * Queue copy is Title Case from Atlas status language, not ALL CAPS.
 */

import { ATLAS_STATUS, atlasStatusTone, type AtlasStatusTone } from '../../ui/statusLanguage';

export const WORK_QUEUES = [
  'AWAITING_MANNY',
  'AWAITING_CLIENT',
  'AWAITING_LENDER',
  'READY_FOR_SUBMISSION',
  'RFI_OVERDUE',
  'OFFERS_RECEIVED',
  'CLOSING',
  'FUNDED',
  'COMPLIANCE_REVIEW',
  'NEEDS_ATTENTION',
] as const;

export type WorkQueue = (typeof WORK_QUEUES)[number];

export const QUEUE_LABELS: Record<WorkQueue, string> = {
  NEEDS_ATTENTION: ATLAS_STATUS.needsAction,
  AWAITING_CLIENT: ATLAS_STATUS.waitingClient,
  AWAITING_LENDER: ATLAS_STATUS.waitingLender,
  AWAITING_MANNY: ATLAS_STATUS.needsManny,
  READY_FOR_SUBMISSION: ATLAS_STATUS.readyForSubmission,
  RFI_OVERDUE: ATLAS_STATUS.rfiOverdue,
  OFFERS_RECEIVED: ATLAS_STATUS.termSheetReceived,
  CLOSING: ATLAS_STATUS.closing,
  FUNDED: ATLAS_STATUS.funded,
  COMPLIANCE_REVIEW: ATLAS_STATUS.complianceReview,
};

export const STAGE_LABELS: Record<string, string> = {
  NeedIdentified: 'Need Identified',
  InitialQualification: 'Initial Qualification',
  DocumentsRequested: 'Documents Requested',
  DocumentsInProgress: 'Documents In Progress',
  DocumentsComplete: 'Documents Complete',
  FinancialUnderwritingReview: 'Financial / Underwriting Review',
  StrategyDrafted: 'Strategy Drafted',
  AwaitingMannyStrategyApproval: 'Awaiting Manny Strategy Approval',
  StrategyApproved: 'Strategy Approved',
  LenderVendorResearch: 'Lender / Vendor Research',
  AwaitingMannyShortlistApproval: 'Awaiting Manny Shortlist Approval',
  ReadyForSubmission: ATLAS_STATUS.readyForSubmission,
  Submitted: 'Submitted',
  AdditionalInformationRequested: 'Additional Information Requested',
  Underwriting: 'Underwriting',
  TermSheetOfferReceived: ATLAS_STATUS.termSheetReceived,
  OfferComparison: 'Offer Comparison',
  ClientDecision: 'Client Decision',
  Closing: ATLAS_STATUS.closing,
  Funded: ATLAS_STATUS.funded,
  Declined: 'Declined',
  Withdrawn: 'Withdrawn',
  ClosedArchived: 'Closed / Archived',
};

const ACRONYMS = new Set(['RFI', 'SBA', 'HVCG', 'AR', 'ABL', 'LOC', 'CRE', 'AI', 'YTD']);

export function isWorkQueue(value: string): value is WorkQueue {
  return (WORK_QUEUES as readonly string[]).includes(value);
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return 'Not recorded';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatStage(stage: string): string {
  return STAGE_LABELS[stage] || titleFromToken(stage);
}

export function queueTone(queue: WorkQueue): AtlasStatusTone {
  return atlasStatusTone(QUEUE_LABELS[queue]);
}

export function agingTone(aging: 'fresh' | 'watch' | 'overdue' | 'critical'): 'success' | 'info' | 'warning' | 'danger' {
  if (aging === 'critical') return 'danger';
  if (aging === 'overdue') return 'warning';
  if (aging === 'watch') return 'info';
  return 'success';
}

export function formatAging(agingDays: number, aging: string): string {
  const days = `${agingDays} ${agingDays === 1 ? 'day' : 'days'}`;
  if (aging === 'overdue') return `${days} · ${ATLAS_STATUS.overdue}`;
  if (aging === 'critical') return `${days} · ${ATLAS_STATUS.atRisk}`;
  if (aging === 'watch') return `${days} · Watch`;
  return `${days} · Fresh`;
}

/** Read `/capital?opportunity=` without treating blank or whitespace as a file id. */
export function readOpportunityQuery(search: string | URLSearchParams | null | undefined): string | null {
  const params =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search || undefined;
  const id = String(params?.get('opportunity') || '').trim();
  return id || null;
}

/** Title Case operator copy for Hub enums. Never dumps raw ALL_CAPS into the UI. */
export function titleFromToken(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return 'Not recorded';
  if (isWorkQueue(raw)) return QUEUE_LABELS[raw];
  const words = raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  return words.join(' ') || 'Not recorded';
}

export function formatVerification(value: string | null | undefined): string {
  const token = String(value || '').toUpperCase();
  if (token === 'VERIFIED') return ATLAS_STATUS.verified;
  if (token === 'UNVERIFIED') return ATLAS_STATUS.unverified;
  if (token === 'MISSING') return 'Missing';
  return titleFromToken(value);
}
