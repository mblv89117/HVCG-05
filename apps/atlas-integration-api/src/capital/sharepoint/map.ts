/**
 * Hub camelCase ↔ HVCG_* SharePoint field mapping for capital lists.
 *
 * LIVE tenant columns are still thin. Core fields are always written.
 * Additive fields (Stage / NextAction / Manny* / ChecklistItemKey /
 * SubmissionStatus) are sent only when present in `availableColumns`, or when
 * `includeAdditive` is true (tests). Graph rejects unknown fields.
 *
 * HandoffSource allowed choices: SalesWin, Direct, Referral, Expansion, Other.
 * Unknown sources including EVA map to Other.
 */

import {
  isCapitalStage,
  STAGE_TO_LEGACY_FUNDING_STATUS,
  type CapitalOpportunity,
  type CapitalStage,
  type ChecklistItem,
  type ChecklistStatus,
  type LenderOrganization,
  type LenderSubmission,
  type TransactionType,
} from '@hvcg/atlas-capital-core';
import type { GraphListItem } from './graph.ts';

export const HANDOFF_SOURCE_CHOICES = ['SalesWin', 'Direct', 'Referral', 'Expansion', 'Other'] as const;
export type HandoffSourceChoice = (typeof HANDOFF_SOURCE_CHOICES)[number];

export const CORE_OPPORTUNITY_FIELDS = [
  'Title',
  'ClientCode',
  'ClientIdLookupId',
  'TargetAmount',
  'FundingStatus',
  'CapitalType',
  'Notes',
  'OwnerEmail',
  'UseOfProceeds',
  'HVCG_IdempotencyKey',
  'HandoffSource',
] as const;

export const ADDITIVE_OPPORTUNITY_FIELDS = [
  'Stage',
  'StageEnteredAt',
  'NextAction',
  'NextActionOwner',
  'NextActionDue',
  'Blockers',
  'Risk',
  'SubmissionReadiness',
  'ClosingReadiness',
  'MannyStrategyApproval',
  'MannyShortlistApproval',
  'ClientApproval',
  'TransactionType',
  'Purpose',
  'Urgency',
  'Industry',
] as const;

export const CORE_CHECKLIST_FIELDS = [
  'Title',
  'ClientCode',
  'CapitalOpportunityIdLookupId',
  'RequestStatus',
  'TemplateItemKey',
  'HVCG_IdempotencyKey',
  'DocumentCategory',
  'IsStale',
  'ExpirationDate',
  'DateReceived',
  'FileLink',
] as const;
export const ADDITIVE_CHECKLIST_FIELDS = ['ChecklistItemKey', 'ChecklistStatus'] as const;

export const CORE_SUBMISSION_FIELDS = [
  'Title',
  'CapitalOpportunityIdLookupId',
  'LenderIdLookupId',
  'OwnerEmail',
  'Notes',
  'OutreachDate',
  'Response',
  'NextAction',
  'HVCG_IdempotencyKey',
] as const;
export const ADDITIVE_SUBMISSION_FIELDS = [
  'SubmissionMethod',
  'SubmissionStatus',
  'SubmittedAt',
  'SubmittedBy',
  'ConfirmationNumber',
  'PackageVersion',
] as const;

const ATLAS_NOTES_MARKER = 'ATLAS_CAPITAL_STATE:';

export interface FieldWriteOptions {
  availableColumns?: Set<string>;
  includeAdditive?: boolean;
}

export interface OpportunityMapOptions extends FieldWriteOptions {
  clientSharePointItemId?: string;
}

export interface AtlasOpportunityNotes {
  stage?: CapitalStage;
  transactionType?: TransactionType;
  mannyStrategyApproval?: CapitalOpportunity['mannyStrategyApproval'];
  mannyShortlistApproval?: CapitalOpportunity['mannyShortlistApproval'];
  clientApproval?: CapitalOpportunity['clientApproval'];
  nextAction?: string;
  nextActionOwner?: string;
  stageEnteredAt?: string;
  submissionReadiness?: boolean;
  closingReadiness?: boolean;
}

function asString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true';
}

function asUrl(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (v && typeof v === 'object' && !Array.isArray(v) && 'Url' in v) {
    return asString((v as { Url: unknown }).Url);
  }
  return undefined;
}

function asFreshness(v: unknown): 'CURRENT' | 'STALE' | 'UNKNOWN' | undefined {
  const s = asString(v);
  if (s === 'CURRENT' || s === 'STALE' || s === 'UNKNOWN') return s;
  return undefined;
}

export function mapHandoffSource(raw: string | undefined | null): HandoffSourceChoice {
  const v = (raw || '').trim();
  if ((HANDOFF_SOURCE_CHOICES as readonly string[]).includes(v)) return v as HandoffSourceChoice;
  return 'Other';
}

export function capitalTypeFromTransaction(tx: string | undefined): string {
  const t = (tx || '').toLowerCase();
  if (t.startsWith('sba')) return 'SBA';
  if (t === 'commercial_real_estate' || t === 'construction') return 'Commercial Real Estate';
  if (t === 'equipment') return 'Equipment Financing';
  if (t === 'working_capital_loc' || t === 'ar_financing' || t === 'inventory') return 'Working Capital';
  if (t === 'acquisition' || t === 'recapitalization' || t === 'bridge') return 'Private Credit';
  if (t === 'conventional_bank_loan' || t === 'refinance' || t === 'asset_based_lending') return 'Debt';
  return 'Other';
}

export const LIVE_DOCUMENT_CATEGORIES = [
  'Engagement Administration',
  'Corporate',
  'Ownership',
  'Historical Financials',
  'Current Financials',
  'Tax Returns',
  'Bank Statements',
  'Debt Schedule',
  'AR',
  'AP',
  'Payroll',
  'Contracts',
  'Real Estate',
  'Insurance',
  'Legal',
  'Other',
] as const;

export function mapDocumentCategory(category: string | undefined): string {
  if (category && (LIVE_DOCUMENT_CATEGORIES as readonly string[]).includes(category)) return category;
  if (category === 'SBA') return 'Other';
  return 'Other';
}

export function requestStatusFromChecklist(status: ChecklistStatus | string | undefined): string {
  switch (status) {
    case 'RECEIVED':
      return 'Received';
    case 'NEEDS_REVIEW':
    case 'INCOMPLETE':
    case 'OUTDATED':
      return 'In Review';
    case 'ACCEPTED':
      return 'Accepted';
    case 'NOT_APPLICABLE':
      return 'Waived';
    default:
      return 'Requested';
  }
}

export function checklistStatusFromRequest(status: string | undefined): ChecklistStatus {
  switch (status) {
    case 'Received':
      return 'RECEIVED';
    case 'In Review':
      return 'NEEDS_REVIEW';
    case 'Accepted':
      return 'ACCEPTED';
    case 'Waived':
    case 'Cancelled':
      return 'NOT_APPLICABLE';
    case 'Rejected':
      return 'INCOMPLETE';
    default:
      return 'REQUESTED';
  }
}

function shouldWrite(name: string, kind: 'core' | 'additive', opts?: FieldWriteOptions): boolean {
  if (kind === 'core') {
    if (opts?.availableColumns) return opts.availableColumns.has(name) || CORE_ALWAYS.has(name);
    return true;
  }
  if (opts?.availableColumns) return opts.availableColumns.has(name);
  return opts?.includeAdditive === true;
}

const CORE_ALWAYS = new Set<string>([
  ...CORE_OPPORTUNITY_FIELDS,
  ...CORE_CHECKLIST_FIELDS,
  ...CORE_SUBMISSION_FIELDS,
]);

function put(
  out: Record<string, unknown>,
  name: string,
  value: unknown,
  kind: 'core' | 'additive',
  opts?: FieldWriteOptions,
): void {
  if (value === undefined) return;
  if (!shouldWrite(name, kind, opts)) return;
  out[name] = value;
}

export function encodeAtlasNotes(state: AtlasOpportunityNotes, humanNotes?: string): string {
  const encoded = ATLAS_NOTES_MARKER + JSON.stringify(state);
  const extra = (humanNotes || '').replace(new RegExp(`${ATLAS_NOTES_MARKER}.*$`, 's'), '').trim();
  return extra ? `${extra}\n${encoded}` : encoded;
}

export function decodeAtlasNotes(raw: string | undefined): { state: AtlasOpportunityNotes | null; notes?: string } {
  if (!raw) return { state: null };
  const idx = raw.indexOf(ATLAS_NOTES_MARKER);
  if (idx < 0) return { state: null, notes: raw };
  const human = raw.slice(0, idx).trim();
  const json = raw.slice(idx + ATLAS_NOTES_MARKER.length).trim();
  try {
    const parsed = JSON.parse(json) as AtlasOpportunityNotes;
    return { state: parsed, notes: human || undefined };
  } catch {
    return { state: null, notes: raw };
  }
}

export function pickWritableFields(
  fields: Record<string, unknown>,
  opts?: FieldWriteOptions,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const additive =
      (ADDITIVE_OPPORTUNITY_FIELDS as readonly string[]).includes(name) ||
      (ADDITIVE_CHECKLIST_FIELDS as readonly string[]).includes(name) ||
      (ADDITIVE_SUBMISSION_FIELDS as readonly string[]).includes(name);
    if (shouldWrite(name, additive ? 'additive' : 'core', opts)) out[name] = value;
  }
  return out;
}

export function opportunityToFields(opp: CapitalOpportunity, opts: OpportunityMapOptions = {}): Record<string, unknown> {
  const atlas: AtlasOpportunityNotes = {
    stage: opp.stage,
    transactionType: opp.transactionType,
    mannyStrategyApproval: opp.mannyStrategyApproval,
    mannyShortlistApproval: opp.mannyShortlistApproval,
    clientApproval: opp.clientApproval,
    nextAction: opp.nextAction,
    nextActionOwner: opp.nextActionOwner,
    stageEnteredAt: opp.stageEnteredAt,
    submissionReadiness: opp.submissionReadiness,
    closingReadiness: opp.closingReadiness,
  };
  const out: Record<string, unknown> = {};
  put(out, 'Title', opp.title, 'core', opts);
  put(out, 'ClientCode', opp.clientCode, 'core', opts);
  if (opts.clientSharePointItemId) {
    put(out, 'ClientIdLookupId', Number(opts.clientSharePointItemId) || opts.clientSharePointItemId, 'core', opts);
  }
  put(out, 'TargetAmount', opp.need.requestedAmount ?? 0, 'core', opts);
  put(out, 'FundingStatus', STAGE_TO_LEGACY_FUNDING_STATUS[opp.stage] || 'Identified', 'core', opts);
  put(out, 'CapitalType', opp.capitalTypeLegacy && isLegacyCapitalType(opp.capitalTypeLegacy)
    ? opp.capitalTypeLegacy
    : capitalTypeFromTransaction(opp.transactionType), 'core', opts);
  put(out, 'Notes', encodeAtlasNotes(atlas, opp.notes), 'core', opts);
  put(out, 'OwnerEmail', opp.ownerEmail || '', 'core', opts);
  put(out, 'UseOfProceeds', opp.need.useOfFunds || opp.need.purpose || '', 'core', opts);
  put(out, 'HVCG_IdempotencyKey', opp.idempotencyKey || '', 'core', opts);
  put(out, 'HandoffSource', mapHandoffSource(opp.handoffSource), 'core', opts);

  put(out, 'Stage', opp.stage, 'additive', opts);
  put(out, 'StageEnteredAt', opp.stageEnteredAt, 'additive', opts);
  put(out, 'NextAction', opp.nextAction || '', 'additive', opts);
  put(out, 'NextActionOwner', opp.nextActionOwner || '', 'additive', opts);
  put(out, 'NextActionDue', opp.nextActionDue || null, 'additive', opts);
  put(out, 'Blockers', opp.blockers || '', 'additive', opts);
  put(out, 'Risk', opp.risk || '', 'additive', opts);
  put(out, 'SubmissionReadiness', opp.submissionReadiness, 'additive', opts);
  put(out, 'ClosingReadiness', opp.closingReadiness, 'additive', opts);
  put(out, 'MannyStrategyApproval', opp.mannyStrategyApproval, 'additive', opts);
  put(out, 'MannyShortlistApproval', opp.mannyShortlistApproval, 'additive', opts);
  put(out, 'ClientApproval', opp.clientApproval, 'additive', opts);
  put(out, 'TransactionType', opp.transactionType, 'additive', opts);
  put(out, 'Purpose', opp.need.purpose || '', 'additive', opts);
  put(out, 'Urgency', opp.need.urgency || '', 'additive', opts);
  put(out, 'Industry', opp.business.industry || '', 'additive', opts);
  return out;
}

const LEGACY_CAPITAL_TYPES = new Set([
  'Debt',
  'Equity',
  'SBA',
  'Commercial Real Estate',
  'Private Credit',
  'Equipment Financing',
  'Working Capital',
  'Hybrid',
  'Other',
]);

function isLegacyCapitalType(v: string): boolean {
  return LEGACY_CAPITAL_TYPES.has(v);
}

export function opportunityFromItem(item: GraphListItem): CapitalOpportunity | null {
  const title = asString(item.fields.Title);
  const clientCode = asString(item.fields.ClientCode);
  if (!item.id || !title || !clientCode) return null;
  const decoded = decodeAtlasNotes(asString(item.fields.Notes));
  const stageRaw = asString(item.fields.Stage) || decoded.state?.stage;
  const stage: CapitalStage = isCapitalStage(stageRaw) ? stageRaw : 'NeedIdentified';
  const tx = (asString(item.fields.TransactionType) || decoded.state?.transactionType || 'working_capital_loc') as TransactionType;
  const created = asString(item.fields.Created) || new Date(0).toISOString();
  const updated = asString(item.fields.Modified) || created;
  const stageEnteredAt = asString(item.fields.StageEnteredAt) || decoded.state?.stageEnteredAt || created;
  const ownerEmail = asString(item.fields.OwnerEmail) || '';
  return {
    id: item.id,
    title,
    clientId: clientCode,
    clientCode,
    transactionType: tx,
    capitalTypeLegacy: asString(item.fields.CapitalType) || capitalTypeFromTransaction(tx),
    need: {
      requestedAmount: asNumber(item.fields.TargetAmount),
      purpose: asString(item.fields.Purpose) || undefined,
      useOfFunds: asString(item.fields.UseOfProceeds) || undefined,
      urgency: (asString(item.fields.Urgency) as CapitalOpportunity['need']['urgency']) || 'normal',
    },
    business: {
      industry: asString(item.fields.Industry) || undefined,
    },
    capitalProfile: {},
    transaction: {},
    stage,
    stageEnteredAt,
    ownerEmail,
    nextAction: asString(item.fields.NextAction) || decoded.state?.nextAction,
    nextActionOwner: asString(item.fields.NextActionOwner) || decoded.state?.nextActionOwner,
    nextActionDue: asString(item.fields.NextActionDue),
    blockers: asString(item.fields.Blockers),
    risk: asString(item.fields.Risk),
    submissionReadiness: item.fields.SubmissionReadiness != null ? asBool(item.fields.SubmissionReadiness) : Boolean(decoded.state?.submissionReadiness),
    closingReadiness: item.fields.ClosingReadiness != null ? asBool(item.fields.ClosingReadiness) : Boolean(decoded.state?.closingReadiness),
    lastMeaningfulActivityAt: updated,
    clientApproval: (asString(item.fields.ClientApproval) || decoded.state?.clientApproval || 'NOT_REQUIRED') as CapitalOpportunity['clientApproval'],
    mannyStrategyApproval: (asString(item.fields.MannyStrategyApproval) || decoded.state?.mannyStrategyApproval || 'NOT_REQUIRED') as CapitalOpportunity['mannyStrategyApproval'],
    mannyShortlistApproval: (asString(item.fields.MannyShortlistApproval) || decoded.state?.mannyShortlistApproval || 'NOT_REQUIRED') as CapitalOpportunity['mannyShortlistApproval'],
    createdAt: created,
    updatedAt: updated,
    idempotencyKey: asString(item.fields.HVCG_IdempotencyKey),
    handoffSource: mapHandoffSource(asString(item.fields.HandoffSource)),
    notes: decoded.notes,
  };
}

export function checklistItemToFields(
  item: ChecklistItem,
  opportunityItemId: string,
  clientCode: string,
  opts: FieldWriteOptions = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  put(out, 'Title', item.name || item.itemKey, 'core', opts);
  put(out, 'ClientCode', clientCode, 'core', opts);
  put(out, 'CapitalOpportunityIdLookupId', Number(opportunityItemId) || opportunityItemId, 'core', opts);
  put(out, 'RequestStatus', requestStatusFromChecklist(item.status), 'core', opts);
  put(out, 'TemplateItemKey', item.itemKey, 'core', opts);
  put(out, 'HVCG_IdempotencyKey', `cap-chk|${opportunityItemId}|${item.itemKey}`, 'core', opts);
  put(out, 'DocumentCategory', mapDocumentCategory(item.category), 'core', opts);
  put(out, 'IsStale', item.status === 'OUTDATED', 'core', opts);
  put(out, 'ExpirationDate', item.expiration || undefined, 'core', opts);
  put(out, 'DateReceived', item.receivedAt || undefined, 'core', opts);
  put(out, 'FileLink', item.fileLink ? { Url: item.fileLink, Description: item.name || item.itemKey } : undefined, 'core', opts);
  put(out, 'ChecklistItemKey', item.itemKey, 'additive', opts);
  put(out, 'ChecklistStatus', item.status, 'additive', opts);
  return out;
}

export function checklistItemFromItem(item: GraphListItem, fallback?: Partial<ChecklistItem>): ChecklistItem | null {
  if (!item.id) return null;
  const key =
    asString(item.fields.ChecklistItemKey) ||
    asString(item.fields.TemplateItemKey) ||
    fallback?.itemKey ||
    `item-${item.id}`;
  const statusRaw = asString(item.fields.ChecklistStatus);
  let status: ChecklistStatus =
    statusRaw &&
    [
      'MISSING',
      'REQUESTED',
      'RECEIVED',
      'NEEDS_REVIEW',
      'INCOMPLETE',
      'OUTDATED',
      'ACCEPTED',
      'NOT_APPLICABLE',
    ].includes(statusRaw)
      ? (statusRaw as ChecklistStatus)
      : checklistStatusFromRequest(asString(item.fields.RequestStatus));
  if (asBool(item.fields.IsStale) && status === 'ACCEPTED') status = 'OUTDATED';
  return {
    id: item.id,
    itemKey: key,
    name: asString(item.fields.Title) || fallback?.name || key,
    category: fallback?.category || asString(item.fields.DocumentCategory) || 'Corporate',
    transactionTypes: fallback?.transactionTypes || [],
    requiredness: fallback?.requiredness || 'REQUIRED',
    condition: fallback?.condition,
    responsibleParty: fallback?.responsibleParty || 'client',
    status,
    requestedAt: fallback?.requestedAt,
    receivedAt: asString(item.fields.DateReceived) || fallback?.receivedAt,
    notes: fallback?.notes,
    verification: fallback?.verification || 'MISSING',
    fileLink: asUrl(item.fields.FileLink) || fallback?.fileLink,
    expiration: asString(item.fields.ExpirationDate) || fallback?.expiration,
    overrideReason: fallback?.overrideReason,
    overrideBy: fallback?.overrideBy,
    overrideAt: fallback?.overrideAt,
    version: fallback?.version || 1,
  };
}

export function lookupIdFromFields(fields: Record<string, unknown>, graphName: string): string | undefined {
  const v = fields[`${graphName}LookupId`] ?? fields[graphName];
  return asString(v);
}

export function submissionToFields(
  sub: LenderSubmission,
  opportunityItemId: string,
  opts: FieldWriteOptions & { ownerEmail?: string } = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  put(out, 'Title', `Recorded submission ${sub.lenderId}`, 'core', opts);
  put(out, 'CapitalOpportunityIdLookupId', Number(opportunityItemId) || opportunityItemId, 'core', opts);
  const lenderLookup = Number(sub.lenderId);
  if (Number.isFinite(lenderLookup) && lenderLookup > 0) {
    put(out, 'LenderIdLookupId', lenderLookup, 'core', opts);
  }
  put(out, 'OwnerEmail', opts.ownerEmail || sub.submittedBy || '', 'core', opts);
  put(out, 'Notes', sub.notes || 'Record only — no external portal submit. BL-C1.', 'core', opts);
  put(out, 'OutreachDate', sub.submittedAt || new Date().toISOString(), 'core', opts);
  put(out, 'Response', 'None', 'core', opts);
  put(out, 'NextAction', 'Await lender response', 'core', opts);
  put(out, 'SubmissionMethod', sub.method, 'additive', opts);
  put(out, 'SubmissionStatus', sub.status, 'additive', opts);
  put(out, 'SubmittedAt', sub.submittedAt || '', 'additive', opts);
  put(out, 'SubmittedBy', sub.submittedBy || '', 'additive', opts);
  put(
    out,
    'HVCG_IdempotencyKey',
    `cap-sub|${opportunityItemId}|${sub.lenderId}|${sub.packageVersion || 'v1'}`,
    'core',
    opts,
  );
  put(out, 'ConfirmationNumber', sub.confirmationNumber || '', 'additive', opts);
  put(out, 'PackageVersion', sub.packageVersion || '', 'additive', opts);
  return out;
}

export function submissionFromItem(item: GraphListItem): LenderSubmission | null {
  if (!item.id) return null;
  const oppId = lookupIdFromFields(item.fields, 'CapitalOpportunityId') || '';
  const statusRaw = asString(item.fields.SubmissionStatus) || 'submitted';
  const methodRaw = asString(item.fields.SubmissionMethod) || 'package';
  return {
    id: item.id,
    capitalOpportunityId: oppId,
    lenderId: asString(item.fields.LenderIdLookupId) || asString(item.fields.LenderId) || 'unknown',
    method: (['package', 'email', 'portal_instructions', 'approved_api'].includes(methodRaw)
      ? methodRaw
      : 'package') as LenderSubmission['method'],
    status: ([
      'draft',
      'submitted',
      'acknowledged',
      'rfi',
      'underwriting',
      'offer',
      'declined',
      'withdrawn',
    ].includes(statusRaw)
      ? statusRaw
      : 'submitted') as LenderSubmission['status'],
    submittedAt: asString(item.fields.SubmittedAt) || asString(item.fields.OutreachDate),
    submittedBy: asString(item.fields.SubmittedBy) || asString(item.fields.OwnerEmail),
    confirmationNumber: asString(item.fields.ConfirmationNumber),
    packageVersion: asString(item.fields.PackageVersion),
    documentIds: [],
    notes: asString(item.fields.Notes),
  };
}

/** Read-only map from HVCG_Lenders. Never invents product criteria from PreferredProducts. */
export function lenderFromItem(item: GraphListItem): LenderOrganization | null {
  const name = asString(item.fields.Title);
  if (!item.id || !name) return null;
  return {
    id: item.id,
    name,
    organizationType: asString(item.fields.LenderType),
    website: asUrl(item.fields.Website),
    geography: asString(item.fields.Geography),
    relationshipStatus: asString(item.fields.RelationshipStatus),
    relationshipOwner: asString(item.fields.RelationshipOwner) || asString(item.fields.OwnerEmail),
    notes: asString(item.fields.Notes),
    capitalSourceId: lookupIdFromFields(item.fields, 'CapitalSourceId'),
    preferredProductsNote: asString(item.fields.PreferredProducts),
    lastVerifiedAt: asString(item.fields.LastVerifiedAt),
    freshness: asFreshness(item.fields.CriteriaFreshness),
    verificationSource: asString(item.fields.VerificationSource),
    lastContactDate: asString(item.fields.LastContactDate),
  };
}
