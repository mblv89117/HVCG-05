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
  applySyntheticAddOffer,
  applySyntheticAttestApplication,
  applySyntheticClientDecision,
  applySyntheticExtractOffer,
  applySyntheticGenerateClosing,
  applySyntheticIngestRfi,
  applySyntheticPrepareApplication,
  applySyntheticRecordedSubmission,
  applySyntheticRecordFee,
  applySyntheticRecordFunding,
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
  isSyntheticMutationTarget,
  normalizeOpportunityDetail,
} from './capitalDetail';
import {
  CapitalAccessError,
  accessFailureKind,
  hubStatus,
  isAuthorizationFailure,
  operatorFacingMessage,
  shouldUseSyntheticFallback as shouldFallback,
  toCapitalAccessError,
  type CapitalFallbackKind,
} from './capitalAccess';
import {
  isWorkQueue,
  type WorkQueue,
} from './capitalDisplay';

export {
  CapitalAccessError,
  accessFailureKind,
  isAuthorizationFailure,
  operatorFacingMessage,
  toCapitalAccessError,
  type CapitalFallbackKind,
};

export {
  QUEUE_LABELS,
  STAGE_LABELS,
  WORK_QUEUES,
  agingTone,
  formatAging,
  formatStage,
  formatUsd,
  formatVerification,
  isWorkQueue,
  queueTone,
  readOpportunityQuery,
  titleFromToken,
  type WorkQueue,
} from './capitalDisplay';

export { SYNTHETIC_BANNER };

export type CapitalDataSource = 'hub' | 'synthetic';

export const FINANCING_DISCLAIMER =
  'HVCG is not a lender. Financing outcomes are determined by third-party lenders and capital providers. HVCG does not guarantee approval, terms, or funding.';

export const AI_DISCLAIMER =
  'AI drafts are unverified until a human confirms them against source documents. They are not verified financial data.';

export const MANNY_GATE_COPY =
  'Approve buttons for strategy and shortlist are Manny gates. Nothing is an HVCG recommendation until Manny approves.';

export const RECORDED_ONLY_COPY =
  'Recorded only. Atlas writes a Hub tracking row — it does not send this package to a lender portal, mailbox, or client.';

export const NOT_BORROWER_REPRESENTATION =
  'An application package is not a borrower representation and is not a loan application submitted by HVCG as lender.';

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
  readyForSubmission: number;
  rfiOverdue: number;
  complianceReviewRequired: number;
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

export type ApplicationAttestation =
  | 'PREPARED'
  | 'CLIENT_CONFIRMATION_REQUIRED'
  | 'CLIENT_CONFIRMED'
  | 'CORRECTION_REQUIRED'
  | 'APPROVED_FOR_SUBMISSION';

export interface ApplicationPackage {
  id: string;
  capitalOpportunityId?: string;
  lenderId: string;
  productId?: string;
  populatedFields: Record<string, { value: unknown; verification: string }>;
  missingFields: Array<{ field: string; requiredFrom: string }>;
  attachedDocumentIds: string[];
  status: string;
  attestation?: ApplicationAttestation | string;
  packageStatus?: string;
  notBorrowerRepresentation?: boolean;
  expectedQuestions?: string[];
  createdAt: string;
  attestedAt?: string;
  attestedBy?: string;
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

export interface RfiItem {
  id: string;
  capitalOpportunityId?: string;
  clientCode?: string;
  lenderId?: string;
  item: string;
  action?: string;
  sla?: string;
  responseDue?: string;
  nextAction?: string;
  nextActionOwner?: string;
  agingDays?: number;
  candidateOnly?: boolean;
}

export interface TermComparison {
  rows: Array<{
    offerId: string;
    lenderName: string;
    product?: string;
    amount?: number;
    interestRate?: number;
    termMonths?: number;
    origination?: number;
  }>;
  bands: Record<string, string>;
  notes: string[];
  mannyRecommendation?: string;
  mannyRecommendationBy?: string;
  disclaimer?: string;
  derivedNotQuoted?: boolean;
}

export interface FundingEvent {
  id: string;
  capitalOpportunityId?: string;
  clientCode?: string;
  fundedDate: string;
  grossAmount?: number;
  netProceeds?: number;
  lenderId?: string;
  verifiedBy?: string;
  evidenceKind?: string;
}

export interface ClientDecisionRecord {
  id: string;
  selectedTermSheetId?: string;
  decision: string;
  decisionBy?: string;
  reason?: string;
  legallyBinding?: boolean;
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
  applications?: ApplicationPackage[];
  submissions: LenderSubmission[];
  offers: TermSheetOffer[];
  closing: ClosingCondition[];
  fees: FeeRecord[];
  rfis?: RfiItem[];
  comparison?: TermComparison | null;
  funding?: FundingEvent | null;
  decision?: ClientDecisionRecord | null;
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
  const msg = operatorFacingMessage(err, 'Hub unavailable');
  if (msg === 'Hub is unreachable. Capital data was not loaded.') return 'Hub is unreachable';
  return msg;
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
    readyForSubmission: 0,
    rfiOverdue: 0,
    complianceReviewRequired: 0,
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
  return normalizeOpportunityDetail(raw) as unknown as CapitalOpportunityDetail;
}

export { normalizeOpportunityDetail, isSyntheticMutationTarget };

async function hubMutateThenReload(
  auth: AtlasHubAuthHeaders,
  id: string,
  opts: { source?: CapitalDataSource } | undefined,
  synthetic: () => CapitalOpportunityDetail,
  request: () => Promise<unknown>,
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    if (!isSyntheticMutationTarget(id)) {
      throw new Error('Synthetic capital mutations are limited to SYN* demonstration files.');
    }
    return { detail: synthetic(), source: 'synthetic' };
  }
  try {
    await request();
    const raw = await hubFetchJson<unknown>(auth, `/api/capital/opportunities/${encodeURIComponent(id)}`);
    return { detail: asDetail(raw), source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
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

export async function prepareApplication(
  auth: AtlasHubAuthHeaders,
  id: string,
  input: { lenderId: string; productId?: string },
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  return hubMutateThenReload(
    auth,
    id,
    opts,
    () => applySyntheticPrepareApplication(id, input),
    () =>
      hubFetchJson(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/application`, {
        method: 'POST',
        body: JSON.stringify({
          lenderId: input.lenderId,
          productId: input.productId || undefined,
        }),
      }),
  );
}

export async function attestApplicationPackage(
  auth: AtlasHubAuthHeaders,
  id: string,
  input: { attestation: ApplicationAttestation; applicationId?: string; lenderId?: string },
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  return hubMutateThenReload(
    auth,
    id,
    opts,
    () => applySyntheticAttestApplication(id, input),
    () =>
      hubFetchJson(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/application/attest`, {
        method: 'POST',
        body: JSON.stringify({
          attestation: input.attestation,
          applicationId: input.applicationId || undefined,
          lenderId: input.lenderId || undefined,
        }),
      }),
  );
}

export async function recordLenderSubmission(
  auth: AtlasHubAuthHeaders,
  id: string,
  input: { lenderId: string; confirmationNumber?: string; packageVersion?: string },
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  return hubMutateThenReload(
    auth,
    id,
    opts,
    () => applySyntheticRecordedSubmission(id, input),
    () =>
      hubFetchJson(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/submissions`, {
        method: 'POST',
        body: JSON.stringify({
          lenderId: input.lenderId,
          confirmationNumber: input.confirmationNumber || undefined,
          packageVersion: input.packageVersion || 'v1',
          recordedOnly: true,
          externalSubmit: false,
        }),
      }),
  );
}

export async function ingestLenderRfi(
  auth: AtlasHubAuthHeaders,
  id: string,
  input: { text: string; lenderId?: string; applyStage?: boolean },
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  return hubMutateThenReload(
    auth,
    id,
    opts,
    () => applySyntheticIngestRfi(id, input),
    () =>
      hubFetchJson(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/rfi`, {
        method: 'POST',
        body: JSON.stringify({
          text: input.text,
          lenderId: input.lenderId || undefined,
          applyStage: input.applyStage === true,
        }),
      }),
  );
}

export async function loadRfis(
  auth: AtlasHubAuthHeaders,
  id: string,
  opts?: { source?: CapitalDataSource },
): Promise<{ rfis: RfiItem[]; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    return { rfis: getSyntheticOpportunity(id).rfis || [], source: 'synthetic' };
  }
  try {
    const raw = await hubFetchJson<{ rfis?: RfiItem[] }>(
      auth,
      `/api/capital/opportunities/${encodeURIComponent(id)}/rfi`,
    );
    return { rfis: Array.isArray(raw.rfis) ? raw.rfis : [], source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
}

export async function addTermSheet(
  auth: AtlasHubAuthHeaders,
  id: string,
  input: {
    lenderId: string;
    lenderName: string;
    product?: string;
    amount?: number | null;
    interestRate?: number | null;
    termMonths?: number | null;
    origination?: number | null;
    assumptions?: string[];
  },
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  return hubMutateThenReload(
    auth,
    id,
    opts,
    () => applySyntheticAddOffer(id, input),
    () =>
      hubFetchJson(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/offers`, {
        method: 'POST',
        body: JSON.stringify({
          lenderId: input.lenderId,
          lenderName: input.lenderName,
          product: input.product || undefined,
          amount: input.amount ?? undefined,
          interestRate: input.interestRate ?? undefined,
          termMonths: input.termMonths ?? undefined,
          origination: input.origination ?? undefined,
          assumptions: input.assumptions || ['manual entry UNVERIFIED'],
        }),
      }),
  );
}

export async function extractTermSheet(
  auth: AtlasHubAuthHeaders,
  id: string,
  input: { text: string; lenderId?: string; lenderName?: string },
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  return hubMutateThenReload(
    auth,
    id,
    opts,
    () => applySyntheticExtractOffer(id, input),
    () =>
      hubFetchJson(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/offers/extract`, {
        method: 'POST',
        body: JSON.stringify({
          text: input.text,
          lenderId: input.lenderId || undefined,
          lenderName: input.lenderName || undefined,
        }),
      }),
  );
}

async function comparisonFromHub(
  auth: AtlasHubAuthHeaders,
  id: string,
  path: string,
  init?: RequestInit,
): Promise<TermComparison> {
  const raw = await hubFetchJson<Record<string, unknown>>(
    auth,
    `/api/capital/opportunities/${encodeURIComponent(id)}${path}`,
    init,
  );
  const comparison = (raw.comparison || raw) as TermComparison;
  if (!comparison || typeof comparison !== 'object') {
    throw new Error('Term comparison was not returned.');
  }
  return comparison;
}

export async function compareTermSheets(
  auth: AtlasHubAuthHeaders,
  id: string,
  opts?: { source?: CapitalDataSource },
): Promise<{ comparison: TermComparison; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    const detail = getSyntheticOpportunity(id);
    return {
      comparison: detail.comparison || {
        rows: (detail.offers || []).map((o) => ({
          offerId: o.id,
          lenderName: o.lenderName,
          product: o.product,
          amount: o.amount,
          interestRate: o.interestRate,
          termMonths: o.termMonths,
          origination: o.origination,
        })),
        bands: {},
        notes: ['Synthetic demonstration comparison — not live terms.'],
        derivedNotQuoted: true,
        disclaimer: FINANCING_DISCLAIMER,
      },
      source: 'synthetic',
    };
  }
  try {
    return { comparison: await comparisonFromHub(auth, id, '/offers/compare'), source: 'hub' };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
}

export async function recommendTermSheet(
  auth: AtlasHubAuthHeaders,
  id: string,
  recommendation: string,
  opts?: { source?: CapitalDataSource },
): Promise<{ comparison: TermComparison; source: CapitalDataSource }> {
  if (opts?.source === 'synthetic') {
    if (!isSyntheticMutationTarget(id)) {
      throw new Error('Synthetic capital mutations are limited to SYN* demonstration files.');
    }
    const compared = await compareTermSheets(auth, id, opts);
    return {
      comparison: {
        ...compared.comparison,
        mannyRecommendation: recommendation,
        mannyRecommendationBy: 'manny@hvcg.example',
      },
      source: 'synthetic',
    };
  }
  try {
    return {
      comparison: await comparisonFromHub(auth, id, '/recommendation', {
        method: 'POST',
        body: JSON.stringify({ recommendation }),
      }),
      source: 'hub',
    };
  } catch (err) {
    if (isAuthorizationFailure(err)) throw toCapitalAccessError(err);
    throw err;
  }
}

export async function recordClientDecision(
  auth: AtlasHubAuthHeaders,
  id: string,
  input: { decision: string; selectedTermSheetId?: string; reason?: string },
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  return hubMutateThenReload(
    auth,
    id,
    opts,
    () => applySyntheticClientDecision(id, input),
    () =>
      hubFetchJson(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: input.decision,
          selectedTermSheetId: input.selectedTermSheetId || undefined,
          reason: input.reason || undefined,
        }),
      }),
  );
}

export async function generateClosingConditions(
  auth: AtlasHubAuthHeaders,
  id: string,
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  return hubMutateThenReload(
    auth,
    id,
    opts,
    () => applySyntheticGenerateClosing(id),
    () =>
      hubFetchJson(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/closing/generate`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  );
}

export async function recordFundingEvent(
  auth: AtlasHubAuthHeaders,
  id: string,
  input: {
    fundedDate: string;
    verifiedBy: string;
    evidenceKind?: string;
    sourceSystem: string;
    capturedAt: string;
    lenderId?: string;
    grossAmount?: number | null;
  },
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  return hubMutateThenReload(
    auth,
    id,
    opts,
    () => applySyntheticRecordFunding(id, input),
    () =>
      hubFetchJson(auth, `/api/capital/opportunities/${encodeURIComponent(id)}/funding`, {
        method: 'POST',
        body: JSON.stringify({
          fundedDate: input.fundedDate,
          verifiedBy: input.verifiedBy,
          evidenceKind: input.evidenceKind || 'authorized_confirmation',
          lenderId: input.lenderId || undefined,
          grossAmount: input.grossAmount ?? undefined,
          sourceRef: {
            sourceSystem: input.sourceSystem,
            capturedAt: input.capturedAt,
            capturedBy: input.verifiedBy,
          },
        }),
      }),
  );
}

export async function recordFee(
  auth: AtlasHubAuthHeaders,
  id: string,
  input: { clientCode: string; feeType: string; notes?: string; feeFormula?: string },
  opts?: { source?: CapitalDataSource },
): Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }> {
  return hubMutateThenReload(
    auth,
    id,
    opts,
    () => applySyntheticRecordFee(id, input),
    () =>
      hubFetchJson(auth, '/api/capital/fees', {
        method: 'POST',
        body: JSON.stringify({
          clientCode: input.clientCode,
          capitalOpportunityId: id,
          feeType: input.feeType,
          feeFormula: input.feeFormula || undefined,
          notes: input.notes || undefined,
        }),
      }),
  );
}
