/**
 * Atlas Capital Operations shared contracts.
 * Hub camelCase. SharePoint HVCG_* internal names are mapped at the adapter layer.
 * Unknown facts stay missing — never guessed.
 */

import type { CapitalStage } from './stages.ts';

export const VERIFICATION_STATES = ['VERIFIED', 'DERIVED', 'UNVERIFIED', 'CONFLICTING', 'MISSING'] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const LENDER_FRESHNESS = ['CURRENT', 'STALE', 'UNKNOWN'] as const;
export type LenderFreshness = (typeof LENDER_FRESHNESS)[number];

export const MATCH_BANDS = ['BEST_FIT', 'POSSIBLE', 'LOW_FIT', 'INELIGIBLE', 'UNKNOWN'] as const;
export type MatchBand = (typeof MATCH_BANDS)[number];

export const CHECKLIST_STATUSES = [
  'MISSING',
  'REQUESTED',
  'RECEIVED',
  'NEEDS_REVIEW',
  'INCOMPLETE',
  'OUTDATED',
  'ACCEPTED',
  'NOT_APPLICABLE',
] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export const REQUIREDNESS = ['REQUIRED', 'OPTIONAL', 'CONDITIONAL'] as const;
export type Requiredness = (typeof REQUIREDNESS)[number];

export const APPROVAL_STATES = ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'REVISE'] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

export const TRANSACTION_TYPES = [
  'conventional_bank_loan',
  'sba',
  'sba_working_capital',
  'sba_express',
  'acquisition',
  'commercial_real_estate',
  'construction',
  'working_capital_loc',
  'equipment',
  'ar_financing',
  'asset_based_lending',
  'inventory',
  'refinance',
  'bridge',
  'recapitalization',
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const REGULATED_FEE_TYPES = [
  'securities_related',
  'equity_related',
  'investment_related',
  'ma_transaction',
  'transaction_based',
  'other_regulated',
] as const;
export type RegulatedFeeType = (typeof REGULATED_FEE_TYPES)[number];

export const LENDER_MESSAGE_CLASSES = [
  'ACKNOWLEDGMENT',
  'REQUEST_FOR_INFORMATION',
  'MISSING_DOCUMENT',
  'UNDERWRITING_QUESTION',
  'DECLINE',
  'CONDITIONAL_APPROVAL',
  'TERM_SHEET',
  'CLOSING_CONDITION',
  'FUNDED',
  'OTHER',
] as const;
export type LenderMessageClass = (typeof LENDER_MESSAGE_CLASSES)[number];

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

export interface SourceRef {
  sourceSystem: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  field?: string;
  capturedAt: string;
  capturedBy?: string;
}

export interface ProvenancedValue<T> {
  value: T | null;
  verification: VerificationState;
  confidence: number | null;
  sourceRef?: SourceRef;
  obtainedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  superseded?: boolean;
  notes?: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  clientCode?: string;
  detail?: string;
  before?: unknown;
  after?: unknown;
}

export interface CapitalNeed {
  requestedAmount: number | null;
  purpose?: string;
  useOfFunds?: string;
  timing?: string;
  urgency?: 'low' | 'normal' | 'high' | 'critical';
  desiredStructure?: string;
  targetClosingDate?: string;
}

export interface CapitalBusinessFacts {
  industry?: string;
  naics?: string;
  annualRevenue?: ProvenancedValue<number>;
  ebitda?: ProvenancedValue<number>;
  yearsInBusiness?: ProvenancedValue<number>;
  ownership?: string;
  guarantors?: string;
  locations?: string;
}

export interface CapitalProfileSnapshot {
  existingDebt?: ProvenancedValue<number>;
  monthlyDebtService?: ProvenancedValue<number>;
  collateral?: string;
  ar?: ProvenancedValue<number>;
  inventory?: ProvenancedValue<number>;
  realEstate?: string;
  equipment?: string;
  liens?: string;
  ucc?: string;
  currentLenders?: string;
  creditObservations?: string;
  defaultsCollections?: string;
}

export interface CapitalTransactionFacts {
  purchaseAmount?: number;
  realEstateComponent?: boolean;
  equipmentComponent?: boolean;
  workingCapitalComponent?: boolean;
  constructionComponent?: boolean;
  refinanceComponent?: boolean;
  sellerFinancing?: boolean;
  equityInjection?: number;
  sources?: string;
  uses?: string;
  projectCosts?: number;
}

export interface CapitalOpportunity {
  id: string;
  title: string;
  clientId: string;
  clientCode: string;
  companyId?: string;
  opportunityId?: string;
  projectId?: string;
  engagementId?: string;
  transactionType: TransactionType;
  capitalTypeLegacy?: string;
  need: CapitalNeed;
  business: CapitalBusinessFacts;
  capitalProfile: CapitalProfileSnapshot;
  transaction: CapitalTransactionFacts;
  stage: CapitalStage;
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
  idempotencyKey?: string;
  handoffSource?: string;
  notes?: string;
}

export interface CapitalProfile {
  id: string;
  clientId: string;
  clientCode: string;
  legalName: ProvenancedValue<string>;
  dba?: ProvenancedValue<string>;
  einProtected?: boolean;
  entityType?: ProvenancedValue<string>;
  formationState?: ProvenancedValue<string>;
  formationDate?: ProvenancedValue<string>;
  addresses?: ProvenancedValue<string>;
  ownership?: ProvenancedValue<string>;
  guarantors?: ProvenancedValue<string>;
  industry?: ProvenancedValue<string>;
  naics?: ProvenancedValue<string>;
  revenue?: ProvenancedValue<number>;
  profitability?: ProvenancedValue<number>;
  employees?: ProvenancedValue<number>;
  existingDebt?: ProvenancedValue<number>;
  monthlyDebtService?: ProvenancedValue<number>;
  bankRelationships?: ProvenancedValue<string>;
  ar?: ProvenancedValue<number>;
  inventory?: ProvenancedValue<number>;
  equipment?: ProvenancedValue<string>;
  realEstate?: ProvenancedValue<string>;
  collateral?: ProvenancedValue<string>;
  financingHistory?: ProvenancedValue<string>;
  narrative?: ProvenancedValue<string>;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  itemKey: string;
  name: string;
  category: string;
  transactionTypes: TransactionType[];
  requiredness: Requiredness;
  condition?: string;
  responsibleParty: 'client' | 'hvcg' | 'lender' | 'third_party';
  status: ChecklistStatus;
  requestedAt?: string;
  receivedAt?: string;
  source?: string;
  currentThrough?: string;
  expiration?: string;
  deficiency?: string;
  version?: number;
  relatedLenderId?: string;
  notes?: string;
  verification: VerificationState;
  fileId?: string;
  fileLink?: string;
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: string;
}

export const EXTRACTION_METHODS = ['NATIVE_TEXT', 'OFFICE_PARSER', 'OCR', 'METADATA_ONLY', 'FAILED'] as const;
export type ExtractionMethod = (typeof EXTRACTION_METHODS)[number];
export const OCR_STATUS = ['STUBBED_NOT_RUN', 'UNAVAILABLE', ...EXTRACTION_METHODS] as const;
export type OcrStatus = (typeof OCR_STATUS)[number];

export interface CapitalDocument {
  id: string;
  capitalOpportunityId: string;
  clientCode: string;
  checklistItemId?: string;
  documentType: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256?: string;
  version: number;
  source: string;
  associatedAt: string;
  associatedBy: string;
  originalPreserved: true;
  webUrl?: string;
  driveId?: string;
  itemId?: string;
  extractionMethod?: ExtractionMethod;
}

export interface ExtractedFact {
  field: string;
  value: string | number | null;
  verification: VerificationState;
  confidence: number;
  sourceRef: SourceRef;
  period?: string;
  entityName?: string;
}

export interface DocumentReview {
  id: string;
  documentId: string;
  capitalOpportunityId: string;
  classifiedType?: string;
  period?: string;
  entityName?: string;
  summary?: string;
  extractedFacts: ExtractedFact[];
  incompletePages: boolean;
  stale: boolean;
  duplicateOf?: string;
  inconsistentPeriod: boolean;
  conflicts: string[];
  confidence: number;
  reviewer: 'ai' | 'human';
  createdAt: string;
  disclaimer: string;
}

export interface PeriodDetection {
  periodLabel: string | null;
  periodStart?: string;
  periodEnd?: string;
  taxYear?: number;
  determined: boolean;
  verification: VerificationState;
  sourceRef: SourceRef;
}

export interface EntityDetection {
  entityName: string | null;
  matchesOpportunity: boolean | null;
  verification: VerificationState;
  sourceRef: SourceRef;
}

export interface FreshnessDetection {
  stale: boolean;
  determined: boolean;
  reason?: string;
  currentThrough?: string;
  asOf: string;
  verification: VerificationState;
  sourceRef: SourceRef;
}

export interface ConflictFinding {
  field: string;
  left: { documentId: string; value: string | number | null; sourceRef: SourceRef };
  right: { documentId: string | 'atlas'; value: string | number | null; sourceRef: SourceRef };
  verification: 'CONFLICTING';
}

export interface CompletenessResult {
  percent: number;
  requiredCount: number;
  acceptedCount: number;
  blockingItems: Array<{ itemKey: string; name: string; status: ChecklistStatus }>;
  bankStatementMonths?: string[];
  verification: 'DERIVED';
  sourceRef: SourceRef;
}

export interface DocumentIntelligenceCollection {
  associated: true;
  checklistItemId?: string;
  suggestedItemKey?: string;
  duplicateOf?: string;
  fileName: string;
  webUrl?: string;
  originalPreserved: true;
}

export interface DocumentIntelligenceDocumentResult {
  documentId: string;
  collection: DocumentIntelligenceCollection;
  classification: {
    documentType: string;
    confidence: number;
    verification: 'DERIVED' | 'UNVERIFIED';
    sourceRef: SourceRef;
  };
  extraction: {
    facts: ExtractedFact[];
    ocr: OcrStatus;
    verification: VerificationState;
  };
  period: PeriodDetection;
  entity: EntityDetection;
  freshness: FreshnessDetection;
  incompletePages: boolean;
  review: DocumentReview;
}

export interface DocumentIntelligenceReport {
  capitalOpportunityId: string;
  clientCode: string;
  asOf: string;
  documents: DocumentIntelligenceDocumentResult[];
  completeness: CompletenessResult;
  conflicts: ConflictFinding[];
  missingDocuments: Array<{
    itemKey: string;
    name: string;
    status: ChecklistStatus;
    requiredness: string;
    deficiency?: string;
  }>;
  clientRequest: {
    subject: string;
    items: Array<{ name: string; category: string; status: ChecklistStatus; deficiency?: string }>;
    body: string;
  } | null;
  clientRequestSendAttempted: false;
  underwriting?: UnderwritingSummary;
  usedUnverifiedFacts: boolean;
  disclaimer: string;
}

export interface LenderOrganization {
  id: string;
  name: string;
  organizationType?: string;
  website?: string;
  geography?: string;
  relationshipStatus?: string;
  relationshipOwner?: string;
  notes?: string;
  capitalSourceId?: string;
  /** Unstructured sourced note from HVCG_Lenders.PreferredProducts — never parsed into numeric criteria. */
  preferredProductsNote?: string;
  lastVerifiedAt?: string;
  freshness?: LenderFreshness;
  verificationSource?: string;
  lastContactDate?: string;
}

export type MatchExplanationOutcome = 'met' | 'not_met' | 'ineligible' | 'unknown' | 'degraded' | 'context';

export interface MatchExplanation {
  criterion: string;
  statement: string;
  outcome: MatchExplanationOutcome;
  sourceRef: SourceRef;
}

export interface HvcgLenderExperience {
  outreachCount: number;
  submittedCount: number;
  declinedCount: number;
  offerCount: number;
  fundedCount: number;
  lastOutreachAt?: string;
  lastResponse?: string;
  lastSubmissionStatus?: string;
  sourceRefs: SourceRef[];
}

export interface LenderFilterRecord {
  lenderId: string;
  lenderName: string;
  reason: string;
  sourceRef: SourceRef;
}

export interface LenderMatchRun {
  matches: LenderMatch[];
  filteredOut: LenderFilterRecord[];
  review: {
    status: 'PENDING_MANNY';
    disclaimer: string;
  };
  generatedAt: string;
}

export interface LenderProduct {
  id: string;
  lenderId: string;
  productName: string;
  productCategory?: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  minRevenue?: number | null;
  timeInBusinessMonths?: number | null;
  industriesPreferred?: string[];
  industriesRestricted?: string[];
  geography?: string;
  creditExpectations?: string;
  dscrMin?: number | null;
  leverageMax?: number | null;
  collateral?: string;
  personalGuarantee?: string;
  arEligible?: boolean;
  inventoryEligible?: boolean;
  realEstateAppetite?: boolean;
  acquisitionAppetite?: boolean;
  constructionAppetite?: boolean;
  equipmentAppetite?: boolean;
  sbaParticipation?: boolean;
  expectedCloseDays?: number | null;
  knownFees?: string;
  pricing?: string;
  requiredDocuments?: string[];
  otherCriteria?: string;
  freshness: LenderFreshness;
  lastVerifiedAt?: string;
  verifiedBy?: string;
  source?: string;
  verificationMethod?: string;
  confidence: number | null;
}

export interface LenderMatch {
  lenderId: string;
  lenderName: string;
  productId?: string;
  productName?: string;
  band: MatchBand;
  reasons: string[];
  explanations: MatchExplanation[];
  missingCriteria: string[];
  stale: boolean;
  freshness: LenderFreshness;
  sourceRef: SourceRef;
  historicalExperience?: HvcgLenderExperience;
  reviewStatus: 'PENDING_MANNY';
}

export interface UnderwritingSummary {
  id: string;
  capitalOpportunityId: string;
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
  capitalOpportunityId: string;
  lenderId: string;
  productId?: string;
  populatedFields: Record<string, { value: unknown; verification: VerificationState }>;
  missingFields: Array<{ field: string; requiredFrom: 'CLIENT_INPUT_REQUIRED' | 'MANNY_INPUT_REQUIRED' }>;
  attachedDocumentIds: string[];
  status: 'PREPARED' | 'BLOCKED_MISSING_FIELDS';
  createdAt: string;
}

export interface LenderSubmission {
  id: string;
  capitalOpportunityId: string;
  lenderId: string;
  method: 'package' | 'email' | 'portal_instructions' | 'approved_api';
  status: 'draft' | 'submitted' | 'acknowledged' | 'rfi' | 'underwriting' | 'offer' | 'declined' | 'withdrawn';
  submittedAt?: string;
  submittedBy?: string;
  confirmationNumber?: string;
  packageVersion?: string;
  documentIds: string[];
  portalInstructions?: string;
  draftEmail?: string;
  notes?: string;
}

export interface TermSheetOffer {
  id: string;
  capitalOpportunityId: string;
  submissionId?: string;
  lenderId: string;
  lenderName: string;
  product?: string;
  amount?: number;
  interestRate?: number;
  index?: string;
  spread?: number;
  rateType?: 'fixed' | 'variable' | 'unknown';
  termMonths?: number;
  amortizationMonths?: number;
  estimatedPayment?: number;
  origination?: number;
  closingFees?: number;
  collateral?: string;
  personalGuarantee?: string;
  prepayment?: string;
  covenants?: string;
  reportingObligations?: string;
  deposits?: string;
  conditions?: string;
  expectedClosingDays?: number;
  majorRisks?: string;
  effectiveCostNotes?: string;
  assumptions: string[];
  createdAt: string;
}

export interface ClosingCondition {
  id: string;
  capitalOpportunityId: string;
  name: string;
  owner: string;
  due?: string;
  status: 'open' | 'in_progress' | 'satisfied' | 'waived' | 'blocked';
  blocker?: string;
  notes?: string;
  documentId?: string;
}

export interface FeeRecord {
  id: string;
  clientCode: string;
  engagementId?: string;
  capitalOpportunityId?: string;
  executedAgreementRef?: string;
  feeType: string;
  feeFormula?: string;
  startDate?: string;
  earnedEvent?: string;
  tailStart?: string;
  tailEnd?: string;
  lenderId?: string;
  approvalStatus: ApprovalState;
  invoiceStatus: 'not_invoiced' | 'invoiced' | 'paid' | 'void';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  legalComplianceReviewRequired: boolean;
  notes?: string;
}

export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  adGroup?: string;
  ad?: string;
  creative?: string;
  keyword?: string;
  landingPage?: string;
  utm?: Record<string, string>;
  assessmentStartedAt?: string;
  assessmentCompletedAt?: string;
  qualified?: boolean;
  consent?: boolean;
}

export interface CapitalCommandKpis {
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
  stage: CapitalStage;
  queue: WorkQueue;
  nextAction?: string;
  due?: string;
  agingDays: number;
  aging: import('./stages.ts').AgingBand;
  blocker?: string;
}

export const AI_DISCLAIMER =
  'AI output is advisory. Extracted values are unverified until a human confirms them against source documents. HVCG does not guarantee financing, approval, terms, or funding.';

export const FINANCING_DISCLAIMER =
  'Financing outcomes are determined by third-party lenders and capital providers. HVCG does not guarantee approval, terms, or funding. HVCG is not a lender.';

export const LEGAL_COMPLIANCE_REVIEW_REQUIRED = 'LEGAL / COMPLIANCE REVIEW REQUIRED';
