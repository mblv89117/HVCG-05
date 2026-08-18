/**
 * Atlas Capital Command Center Hub client.
 * Auth is pass-through (Bearer + existing x-atlas-* scope headers). No secrets.
 *
 * Synthetic fallback is only for Hub unreachable / undeployed routes when
 * VITE_ALLOW_SAMPLE_FALLBACK is explicitly on. 401/403 fail closed.
 * Synthetic figures are never live client financials.
 */

import { microsoftConfig } from '../../microsoft/config';
import type { AtlasHubAuthHeaders } from '../../integrations/hub/api';
import { hubFetchJson } from '../../integrations/hub/hubFetch';
import {
  addSyntheticOpportunity,
  applySyntheticShortlistDecision,
  applySyntheticStrategyDecision,
  applySyntheticTransition,
  getSyntheticCommandCenter,
  getSyntheticMissingRequest,
  getSyntheticOpportunity,
  SYNTHETIC_BANNER,
  type SyntheticCommandCenter,
} from './syntheticFallback';
import {
  CapitalAccessError,
  hubStatus,
  isAuthorizationFailure,
  shouldUseSyntheticFallback as shouldFallback,
  toCapitalAccessError,
  type CapitalFallbackKind,
} from './capitalAccess';

export {
  CapitalAccessError,
  isAuthorizationFailure,
  toCapitalAccessError,
  type CapitalFallbackKind,
};

export { SYNTHETIC_BANNER };

export type CapitalDataSource = 'hub' | 'synthetic';

export const WORK_QUEUES = [
  'NEEDS_ATTENTION',
  'AWAITING_CLIENT',
  'AWAITING_LENDER',
  'AWAITING_MANNY',
  'OFFERS_RECEIVED',
  'CLOSING',
  'FUNDED',
] as const;

export type WorkQueue = (typeof WORK_QUEUES)[number];

export const QUEUE_LABELS: Record<WorkQueue, string> = {
  NEEDS_ATTENTION: 'NEEDS ATTENTION',
  AWAITING_CLIENT: 'AWAITING CLIENT',
  AWAITING_LENDER: 'AWAITING LENDER',
  AWAITING_MANNY: 'AWAITING MANNY',
  OFFERS_RECEIVED: 'OFFERS RECEIVED',
  CLOSING: 'CLOSING',
  FUNDED: 'FUNDED',
};

export const STAGE_LABELS: Record<string, string> = {
  NeedIdentified: 'Need identified',
  InitialQualification: 'Initial qualification',
  DocumentsRequested: 'Documents requested',
  DocumentsInProgress: 'Documents in progress',
  DocumentsComplete: 'Documents complete',
  FinancialUnderwritingReview: 'Financial / underwriting review',
  StrategyDrafted: 'Strategy drafted',
  AwaitingMannyStrategyApproval: 'Awaiting Manny strategy approval',
  StrategyApproved: 'Strategy approved',
  LenderVendorResearch: 'Lender / vendor research',
  AwaitingMannyShortlistApproval: 'Awaiting Manny shortlist approval',
  ReadyForSubmission: 'Ready for submission',
  Submitted: 'Submitted',
  AdditionalInformationRequested: 'Additional information requested',
  Underwriting: 'Underwriting',
  TermSheetOfferReceived: 'Term sheet / offer received',
  OfferComparison: 'Offer comparison',
  ClientDecision: 'Client decision',
  Closing: 'Closing',
  Funded: 'Funded',
  Declined: 'Declined',
  Withdrawn: 'Withdrawn',
  ClosedArchived: 'Closed / archived',
};

export const FINANCING_DISCLAIMER =
  'HVCG is not a lender. Financing outcomes are determined by third-party lenders and capital providers. HVCG does not guarantee approval, terms, or funding.';

export const AI_DISCLAIMER =
  'AI drafts are unverified until a human confirms them against source documents. They are not verified financial data.';

export const MANNY_GATE_COPY =
  'Approve buttons for strategy and shortlist are Manny gates. Nothing is an HVCG recommendation until Manny approves.';

export type AgingBand = 'fresh' | 'watch' | 'overdue' | 'critical';
export type ApprovalState = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISE';
export type StrategyDecision = 'APPROVED' | 'REVISE' | 'REJECTED';

export interface CapitalKpis {
  activeOpportunities: number;
  totalRequested: number;
  documentsBlocked: number;
  clientActionsOverdue: number;
  lenderResponsesDue: number;
  mannyApprovalsRequired: number;
  offersReceived: number;
  transactionsClosing: number;
  recentlyFunded: number;
  feeReceivableOpen: number;
}

export interface QueueItem {
  opportunityId: string;
  title: string;
  clientCode: string;
  companyName?: string;
  stage: string;
  queue: WorkQueue;
  nextAction?: string;
  nextActionOwner?: string;
  due?: string;
  agingDays: number;
  aging: AgingBand;
  blocker?: string;
  requestedAmount?: number | null;
  transactionType?: string;
}

export interface CapitalNeed {
  requestedAmount: number | null;
  purpose?: string;
  useOfFunds?: string;
  timing?: string;
  urgency?: string;
  desiredStructure?: string;
  targetClosingDate?: string;
}

export interface ProvenancedValue<T> {
  value: T | null;
  verification: string;
  confidence?: number | null;
  notes?: string;
}

export interface CapitalOpportunity {
  id: string;
  title: string;
  clientId: string;
  clientCode: string;
  companyName?: string;
  transactionType: string;
  need: CapitalNeed;
  business?: {
    industry?: string;
    naics?: string;
    annualRevenue?: ProvenancedValue<number>;
    ebitda?: ProvenancedValue<number>;
    yearsInBusiness?: ProvenancedValue<number>;
    ownership?: string;
  };
  capitalProfile?: {
    existingDebt?: ProvenancedValue<number>;
    collateral?: string;
    currentLenders?: string;
  };
  stage: string;
  stageEnteredAt: string;
  ownerEmail: string;
  nextAction?: string;
  nextActionOwner?: string;
  nextActionDue?: string;
  blockers?: string;
  risk?: string;
  submissionReadiness: boolean;
  closingReadiness: boolean;
  lastMeaningfulActivityAt: string;
  clientApproval: ApprovalState;
  mannyStrategyApproval: ApprovalState;
  mannyShortlistApproval: ApprovalState;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  itemKey: string;
  name: string;
  category: string;
  requiredness: string;
  responsibleParty: string;
  status: string;
  deficiency?: string;
  verification: string;
  requestedAt?: string;
  receivedAt?: string;
}

export interface CapitalDocument {
  id: string;
  fileName: string;
  documentType: string;
  source: string;
  associatedAt: string;
  associatedBy: string;
  verification?: string;
  webUrl?: string;
}

export interface UnderwritingSummary {
  id: string;
  sections: Record<string, string>;
  missingInformation: string[];
  expectedQuestions: string[];
  potentialStructures: string[];
  recommendedNextSteps: string[];
  usedUnverifiedFacts: boolean;
  createdAt: string;
  createdBy: string;
  disclaimer: string;
}

export interface LenderMatch {
  lenderId: string;
  lenderName: string;
  productId?: string;
  productName?: string;
  band: string;
  reasons: string[];
  missingCriteria: string[];
  stale: boolean;
}

export interface FinancingStrategy {
  id: string;
  capitalOpportunityId: string;
  clientCode: string;
  needSummary: string;
  paths: Array<{ rank: number; name: string; rationale: string }>;
  strengths: string[];
  risks: string[];
  missingInformation: string[];
  lenderCandidates: LenderMatch[];
  rationale: string;
  mannyApproval: ApprovalState;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  disclaimer: string;
}

export interface ApplicationPackage {
  id: string;
  lenderId: string;
  productId?: string;
  populatedFields: Record<string, { value: unknown; verification: string }>;
  missingFields: Array<{ field: string; requiredFrom: string }>;
  attachedDocumentIds: string[];
  status: string;
  createdAt: string;
}

export interface LenderSubmission {
  id: string;
  lenderId: string;
  lenderName?: string;
  method: string;
  status: string;
  submittedAt?: string;
  submittedBy?: string;
  confirmationNumber?: string;
  notes?: string;
}

export interface TermSheetOffer {
  id: string;
  lenderId: string;
  lenderName: string;
  product?: string;
  amount?: number;
  interestRate?: number;
  termMonths?: number;
  estimatedPayment?: number;
  origination?: number;
  closingFees?: number;
  collateral?: string;
  personalGuarantee?: string;
  conditions?: string;
  assumptions: string[];
  createdAt: string;
}

export interface ClosingCondition {
  id: string;
  name: string;
  owner: string;
  due?: string;
  status: string;
  blocker?: string;
  notes?: string;
}

export interface FeeRecord {
  id: string;
  feeType: string;
  feeFormula?: string;
  earnedEvent?: string;
  approvalStatus: ApprovalState;
  invoiceStatus: string;
  paymentStatus: string;
  legalComplianceReviewRequired: boolean;
  notes?: string;
}

export interface MissingDocumentRequest {
  subject: string;
  items: Array<{ name: string; category: string; status: string; deficiency?: string }>;
  body: string;
}

export interface CapitalOpportunityDetail {
  opportunity: CapitalOpportunity;
  checklist: ChecklistItem[];
  documents: CapitalDocument[];
  underwriting: UnderwritingSummary | null;
  strategy: FinancingStrategy | null;
  matches: LenderMatch[];
  application: ApplicationPackage | null;
  submissions: LenderSubmission[];
  offers: TermSheetOffer[];
  closing: ClosingCondition[];
  fees: FeeRecord[];
  missingRequest: MissingDocumentRequest | null;
}

export interface CapitalCommandCenterPayload {
  kpis: CapitalKpis;
  items: QueueItem[];
  source: CapitalDataSource;
  generatedAt: string;
  fallbackReason?: string;
}

export interface CreateOpportunityInput {
  title: string;
  clientCode: string;
  clientId?: string;
  transactionType: string;
  requestedAmount?: number | null;
  purpose?: string;
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
  return STAGE_LABELS[stage] || stage.replace(/([A-Z])/g, ' $1').trim();
}

export function agingTone(aging: AgingBand): 'success' | 'info' | 'warning' | 'danger' {
  if (aging === 'critical') return 'danger';
  if (aging === 'overdue') return 'warning';
  if (aging === 'watch') return 'info';
  return 'success';
}

export function queueTone(queue: WorkQueue): 'danger' | 'warning' | 'info' | 'gold' | 'success' | 'neutral' {
  if (queue === 'NEEDS_ATTENTION' || queue === 'AWAITING_MANNY') return 'danger';
  if (queue === 'AWAITING_CLIENT') return 'warning';
  if (queue === 'AWAITING_LENDER') return 'info';
  if (queue === 'OFFERS_RECEIVED') return 'gold';
  if (queue === 'CLOSING') return 'info';
  if (queue === 'FUNDED') return 'success';
  return 'neutral';
}

export function isWorkQueue(value: string): value is WorkQueue {
  return (WORK_QUEUES as readonly string[]).includes(value);
}

export { hubStatus };

/**
 * Synthetic fallback is opt-in demo mode for Hub outage / undeployed routes.
 * 401/403 always fail closed. Mutations never fall back. Item 404 is not-found.
 */
export function shouldUseSyntheticFallback(
  err: unknown,
  kind: CapitalFallbackKind = 'read-collection',
  allowSampleFallback = microsoftConfig.allowSampleFallback,
): boolean {
  return shouldFallback(err, kind, allowSampleFallback);
}

function fallbackReason(err: unknown): string {
  const status = hubStatus(err);
  if (status === 404) return 'Capital API is not mounted on Hub yet';
  if (status === 501 || status === 503) return 'Capital backend is unavailable';
  const msg = String((err as Error)?.message || err || '');
  if (/failed to fetch|networkerror|load failed|mixed content|err_connection|econnrefused|network request failed/i.test(msg)) {
    return 'Hub is unreachable';
  }
  return err instanceof Error ? err.message : 'Hub unavailable';
}

function emptyKpis(): CapitalKpis {
  return {
    activeOpportunities: 0,
    totalRequested: 0,
    documentsBlocked: 0,
    clientActionsOverdue: 0,
    lenderResponsesDue: 0,
    mannyApprovalsRequired: 0,
    offersReceived: 0,
    transactionsClosing: 0,
    recentlyFunded: 0,
    feeReceivableOpen: 0,
  };
}

function asQueueItem(raw: Record<string, unknown>): QueueItem {
  const queue = isWorkQueue(String(raw.queue || '')) ? (raw.queue as WorkQueue) : 'NEEDS_ATTENTION';
  const agingRaw = String(raw.aging || 'fresh');
  const aging: AgingBand =
    agingRaw === 'watch' || agingRaw === 'overdue' || agingRaw === 'critical' ? agingRaw : 'fresh';
  return {
    opportunityId: String(raw.opportunityId || raw.id || ''),
    title: String(raw.title || 'Untitled opportunity'),
    clientCode: String(raw.clientCode || ''),
    companyName: raw.companyName ? String(raw.companyName) : undefined,
    stage: String(raw.stage || ''),
    queue,
    nextAction: raw.nextAction ? String(raw.nextAction) : undefined,
    nextActionOwner: raw.nextActionOwner ? String(raw.nextActionOwner) : undefined,
    due: raw.due ? String(raw.due) : undefined,
    agingDays: Number(raw.agingDays || 0),
    aging,
    blocker: raw.blocker ? String(raw.blocker) : undefined,
    requestedAmount:
      typeof raw.requestedAmount === 'number'
        ? raw.requestedAmount
        : raw.requestedAmount == null
          ? null
          : Number(raw.requestedAmount),
    transactionType: raw.transactionType ? String(raw.transactionType) : undefined,
  };
}

function normalizeCommandCenter(raw: unknown, source: CapitalDataSource): CapitalCommandCenterPayload {
  const body = (raw || {}) as Record<string, unknown>;
  const kpis = { ...emptyKpis(), ...((body.kpis || body.commandKpis || {}) as Partial<CapitalKpis>) };
  let items: QueueItem[] = [];
  if (Array.isArray(body.items)) {
    items = body.items.map((row) => asQueueItem(row as Record<string, unknown>));
  } else if (body.queues && typeof body.queues === 'object') {
    items = Object.values(body.queues as Record<string, unknown[]>)
      .flat()
      .map((row) => asQueueItem((row || {}) as Record<string, unknown>));
  }
  return {
    kpis,
    items,
    source,
    generatedAt: String(body.generatedAt || new Date().toISOString()),
  };
}

function fromSynthetic(pack: SyntheticCommandCenter, reason?: string): CapitalCommandCenterPayload {
  return {
    kpis: pack.kpis,
    items: pack.items,
    source: 'synthetic',
    generatedAt: pack.generatedAt,
    fallbackReason: reason,
  };
}

function asDetail(raw: unknown): CapitalOpportunityDetail {
  const body = (raw || {}) as Record<string, unknown>;
  const opportunity = (body.opportunity || body) as CapitalOpportunity;
  return {
    opportunity,
    checklist: Array.isArray(body.checklist) ? (body.checklist as ChecklistItem[]) : [],
    documents: Array.isArray(body.documents) ? (body.documents as CapitalDocument[]) : [],
    underwriting: (body.underwriting as UnderwritingSummary) || null,
    strategy: (body.strategy as FinancingStrategy) || null,
    matches: Array.isArray(body.matches) ? (body.matches as LenderMatch[]) : [],
    application: (body.application as ApplicationPackage) || null,
    submissions: Array.isArray(body.submissions) ? (body.submissions as LenderSubmission[]) : [],
    offers: Array.isArray(body.offers) ? (body.offers as TermSheetOffer[]) : [],
    closing: Array.isArray(body.closing) ? (body.closing as ClosingCondition[]) : [],
    fees: Array.isArray(body.fees) ? (body.fees as FeeRecord[]) : [],
    missingRequest: (body.missingRequest as MissingDocumentRequest) || null,
  };
}

export async function loadCommandCenter(auth: AtlasHubAuthHeaders): Promise<CapitalCommandCenterPayload> {
  try {
    const raw = await hubFetchJson<unknown>(auth, '/api/capital/command-center');
    return normalizeCommandCenter(raw, 'hub');
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    if (shouldUseSyntheticFallback(err, 'read-collection')) {
      return fromSynthetic(getSyntheticCommandCenter(), fallbackReason(err));
    }
    throw err;
  }
}

export async function loadOpportunity(
  auth: AtlasHubAuthHeaders,
  id: string,
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource; fallbackReason?: string }> {
  if (opts?.source === 'synthetic') {
    return { detail: getSyntheticOpportunity(id), source: 'synthetic' };
  }
  try {
    const raw = await hubFetchJson<unknown>(auth, `/api/capital/opportunities/${encodeURIComponent(id)}`);
    return { detail: asDetail(raw), source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    if (shouldUseSyntheticFallback(err, 'read-item')) {
      return {
        detail: getSyntheticOpportunity(id),
        source: 'synthetic',
        fallbackReason: fallbackReason(err),
      };
    }
    throw err;
  }
}

export async function createOpportunity(
  auth: AtlasHubAuthHeaders,
  input: CreateOpportunityInput,
  opts?: { source?: CapitalDataSource },
): Promise<{ opportunity: CapitalOpportunity; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    return { opportunity: addSyntheticOpportunity(input), source: 'synthetic' };
  }
  try {
    const raw = await hubFetchJson<{ opportunity?: CapitalOpportunity } & CapitalOpportunity>(
      auth,
      '/api/capital/opportunities',
      { method: 'POST', body: JSON.stringify(input) },
    );
    return { opportunity: (raw.opportunity || raw) as CapitalOpportunity, source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
}

export async function transitionOpportunity(
  auth: AtlasHubAuthHeaders,
  id: string,
  toStage: string,
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    return { detail: applySyntheticTransition(id, toStage), source: 'synthetic' };
  }
  try {
    const raw = await hubFetchJson<unknown>(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/transition`, {
      method: 'POST',
      body: JSON.stringify({ toStage, stage: toStage }),
    });
    return { detail: asDetail(raw), source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
}

export async function generateOpportunityChecklist(
  auth: AtlasHubAuthHeaders,
  id: string,
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    return { detail: getSyntheticOpportunity(id), source: 'synthetic' };
  }
  try {
    const raw = await hubFetchJson<unknown>(
      auth,
      `/api/capital/opportunities/${encodeURIComponent(id)}/checklist/generate`,
      { method: 'POST', body: JSON.stringify({}) },
    );
    return { detail: asDetail(raw), source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
}

export async function decideStrategy(
  auth: AtlasHubAuthHeaders,
  id: string,
  decision: StrategyDecision,
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    return { detail: applySyntheticStrategyDecision(id, decision), source: 'synthetic' };
  }
  try {
    const raw = await hubFetchJson<unknown>(
      auth,
      `/api/capital/opportunities/${encodeURIComponent(id)}/strategy/decision`,
      { method: 'POST', body: JSON.stringify({ decision }) },
    );
    return { detail: asDetail(raw), source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
}

export async function decideShortlist(
  auth: AtlasHubAuthHeaders,
  id: string,
  decision: StrategyDecision,
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    return { detail: applySyntheticShortlistDecision(id, decision), source: 'synthetic' };
  }
  try {
    const raw = await hubFetchJson<unknown>(
      auth,
      `/api/capital/opportunities/${encodeURIComponent(id)}/shortlist/decision`,
      { method: 'POST', body: JSON.stringify({ decision }) },
    );
    return { detail: asDetail(raw), source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
}

export async function runLenderMatch(
  auth: AtlasHubAuthHeaders,
  id: string,
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    return { detail: getSyntheticOpportunity(id), source: 'synthetic' };
  }
  try {
    const raw = await hubFetchJson<unknown>(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/match`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return { detail: asDetail(raw), source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
}

export async function loadMissingRequest(
  auth: AtlasHubAuthHeaders,
  id: string,
  opts?: { source?: CapitalDataSource },
): Promise<{ request: MissingDocumentRequest | null; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    return { request: getSyntheticMissingRequest(id), source: 'synthetic' };
  }
  try {
    const raw = await hubFetchJson<{ request?: MissingDocumentRequest } & MissingDocumentRequest>(
      auth,
      `/api/capital/opportunities/${encodeURIComponent(id)}/missing-request`,
    );
    const request = (raw.request || raw) as MissingDocumentRequest;
    return { request: request?.subject ? request : null, source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
}
