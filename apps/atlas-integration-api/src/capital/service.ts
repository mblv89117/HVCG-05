import { createHash, randomUUID } from 'node:crypto';
import {
  applyFactReview,
  applyMannyDecision,
  applyReviewToReviews,
  assertTransition,
  buildEvidenceReviewCards,
  buildUnderwritingSummary,
  classifyDocument,
  classifyDocumentName,
  classifyLenderMessage,
  commandKpis,
  compareOffers,
  consolidateMissingRequest,
  createFeeRecord,
  defaultClosingConditions,
  detectDuplicate,
  extractCapitalDocumentContent,
  FactReviewError,
  findDocumentByContentHash,
  findDocumentBySharePointItem,
  findFactInReviews,
  founderWorkloadForCards,
  ingestTypeAllowed,
  draftStrategy,
  evaHandoffAllowed,
  FINANCING_DISCLAIMER,
  generateChecklist,
  hasSourceRef,
  InvalidStageTransitionError,
  isCapitalClientCode,
  isCapitalStage,
  isMannyApprover,
  matchLenders,
  missingValue,
  organizationFreshness,
  overlayOpportunityFromReviews,
  overrideChecklistItem,
  prepareApplication,
  preserveAttribution,
  productFreshness,
  proposeFinancingStructures,
  reviewDocument,
  runDocumentIntelligence,
  runLenderMatch,
  sourcedLenderCatalog,
  STAGE_TO_LEGACY_FUNDING_STATUS,
  summarizeHistoricalLenderIntelligence,
  summarizeHvcgExperience,
  toQueueItem,
  buildMannyStrategyPackage,
  buildOutreachHistorySnapshot,
  isStrategyWorkbenchOpen,
  type Attribution,
  type CapitalOpportunity,
  type CapitalStage,
  type ChecklistItem,
  type DocumentIntelligenceOutput,
  type ExtractedFact,
  type FactReviewDecision,
  type LenderFreshness,
  type LenderProduct,
  type TransactionType,
} from '@hvcg/atlas-capital-core';
import type { AtlasPrincipal } from '../middleware/auth.ts';
import { canAccessClient } from './authz.ts';
import { CAPITAL_BACKEND_UNAVAILABLE, CapitalHttpError, conflict, forbidden, notFound, unprocessable } from './errors.ts';
import type { CapitalPersistence, CapitalState } from './store.ts';
import {
  assertFileBelongsToClient,
  assertSafeDriveIds,
  type CapitalFileSource,
} from './sharepoint/files.ts';

const TRANSACTION_TYPES: TransactionType[] = [
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
];

function nowIso(): string {
  return new Date().toISOString();
}

function opportunityClientIndex(state: CapitalState) {
  return state.opportunities.map((o) => ({
    id: o.id,
    clientCode: o.clientCode,
  }));
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

const CLIENT_SEND_KEYS = new Set(['send', 'sendtoclient', 'externalsend']);

function truthySendValue(v: unknown): boolean {
  if (v == null || v === false || v === 0) return false;
  if (typeof v === 'string' && /^(false|0|no)?$/i.test(v.trim())) return false;
  return true;
}

const ingestLocks = new Map<string, Promise<unknown>>();

function withIngestLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = ingestLocks.get(key) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  ingestLocks.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

function recordHasSendFlag(body: Record<string, unknown>): boolean {
  for (const [key, v] of Object.entries(body)) {
    if (CLIENT_SEND_KEYS.has(key.toLowerCase()) && truthySendValue(v)) return true;
  }
  return false;
}

/** Draft-only: case-insensitive send flags, including `{ options: { send } }`. */
function requestedClientSend(body: Record<string, unknown>): boolean {
  if (recordHasSendFlag(body)) return true;
  const nested = body.options;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return recordHasSendFlag(nested as Record<string, unknown>);
  }
  return false;
}

function persistIntelligence(state: CapitalState, id: string, intelligence: DocumentIntelligenceOutput): void {
  state.checklists[id] = intelligence.checklist;
  for (const next of intelligence.reviews) {
    state.reviews = state.reviews.filter((r) => r.documentId !== next.documentId);
    state.reviews.push(next);
  }
  if (intelligence.report.underwriting) {
    state.underwriting = state.underwriting.filter((u) => u.capitalOpportunityId !== id);
    state.underwriting.push(intelligence.report.underwriting);
  }
}

export function assertCapitalAccess(principal: AtlasPrincipal, clientCode: string): void {
  if (!canAccessClient(principal, clientCode)) {
    forbidden();
  }
}

export function visibleOpportunities(state: CapitalState, principal: AtlasPrincipal): CapitalOpportunity[] {
  return state.opportunities.filter((o) => canAccessClient(principal, o.clientCode));
}

function requireOpp(state: CapitalState, principal: AtlasPrincipal, id: string): CapitalOpportunity {
  const opp = state.opportunities.find((o) => o.id === id);
  if (!opp || !canAccessClient(principal, opp.clientCode)) notFound();
  return opp;
}

export class CapitalService {
  constructor(
    private readonly store: CapitalPersistence,
    private readonly files?: CapitalFileSource,
  ) {}

  async commandCenter(principal: AtlasPrincipal) {
    const state = await this.store.load();
    const opps = visibleOpportunities(state, principal);
    const checklists = new Map(opps.map((o) => [o.id, state.checklists[o.id] || []]));
    const offers = state.offers.filter((x) => opps.some((o) => o.id === x.capitalOpportunityId));
    const fees = state.fees.filter((f) => canAccessClient(principal, f.clientCode));
    const queues = opps.map((o) => toQueueItem(o, checklists.get(o.id) || []));
    return {
      kpis: commandKpis(opps, checklists, offers, fees),
      queues,
      disclaimer:
        'HVCG is not a lender. Financing outcomes are determined by third-party capital providers. AI output is unverified until a human confirms source documents.',
    };
  }

  async list(principal: AtlasPrincipal) {
    return { opportunities: visibleOpportunities(await this.store.load(), principal) };
  }

  async get(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opportunity = requireOpp(state, principal, id);
    return {
      opportunity,
      checklist: state.checklists[id] || [],
      documents: state.documents.filter((d) => d.capitalOpportunityId === id),
      reviews: state.reviews.filter((r) => r.capitalOpportunityId === id),
      strategy: state.strategies.find((s) => s.capitalOpportunityId === id) || null,
      underwriting: state.underwriting.find((u) => u.capitalOpportunityId === id) || null,
      submissions: state.submissions.filter((s) => s.capitalOpportunityId === id),
      offers: state.offers.filter((o) => o.capitalOpportunityId === id),
      closing: state.closing[id] || [],
    };
  }

  async create(principal: AtlasPrincipal, body: Record<string, unknown>) {
    const clientCode = asString(body.clientCode);
    if (!isCapitalClientCode(clientCode)) unprocessable('Canonical ClientCode required');
    assertCapitalAccess(principal, clientCode);
    const state = await this.store.load();
    const idempotencyKey = asString(body.idempotencyKey);
    if (idempotencyKey) {
      const existing = state.opportunities.find((o) => o.idempotencyKey === idempotencyKey);
      if (existing) {
        assertCapitalAccess(principal, existing.clientCode);
        return { opportunity: existing, created: false };
      }
    }
    const tx = asString(body.transactionType) as TransactionType;
    if (!TRANSACTION_TYPES.includes(tx)) unprocessable('Unknown transactionType');
    const need = asRecord(body.need);
    const business = asRecord(body.business);
    const amount = asNumber(need.requestedAmount) ?? asNumber(body.requestedAmount);
    const revenueRaw = asRecord(business.annualRevenue);
    const revenueValue = asNumber(revenueRaw.value) ?? asNumber(body.annualRevenue);
    const revenueVerification = asString(revenueRaw.verification) || asString(body.revenueVerification);
    const revenueSource = asRecord(revenueRaw.sourceRef);
    const t = nowIso();
    if (revenueVerification === 'VERIFIED') {
      const sourceRef = {
        sourceSystem: asString(revenueSource.sourceSystem),
        capturedAt: asString(revenueSource.capturedAt),
        sourceRecordId: asString(revenueSource.sourceRecordId) || undefined,
        capturedBy: asString(revenueSource.capturedBy) || undefined,
        field: asString(revenueSource.field) || 'annualRevenue',
      };
      if (!hasSourceRef(sourceRef) || revenueValue == null) {
        unprocessable('VERIFIED financials require sourceRef (sourceSystem + capturedAt)');
      }
    }
    const opportunity: CapitalOpportunity = {
      id: `cap-${randomUUID()}`,
      title: asString(body.title) || `${clientCode} capital need`,
      clientId: asString(body.clientId) || clientCode,
      clientCode,
      opportunityId: asString(body.opportunityId) || undefined,
      projectId: asString(body.projectId) || undefined,
      engagementId: asString(body.engagementId) || undefined,
      transactionType: tx,
      capitalTypeLegacy: STAGE_TO_LEGACY_FUNDING_STATUS.NeedIdentified,
      need: {
        requestedAmount: amount,
        purpose: asString(need.purpose) || asString(body.purpose) || undefined,
        useOfFunds: asString(need.useOfFunds) || asString(body.useOfFunds) || undefined,
        urgency: (asString(body.urgency) as CapitalOpportunity['need']['urgency']) || 'normal',
      },
      business: {
        industry: asString(business.industry) || asString(body.industry) || undefined,
        annualRevenue:
          revenueValue != null
            ? {
                value: revenueValue,
                verification:
                  revenueVerification === 'VERIFIED' &&
                  hasSourceRef({
                    sourceSystem: asString(revenueSource.sourceSystem),
                    capturedAt: asString(revenueSource.capturedAt),
                  })
                    ? 'VERIFIED'
                    : revenueVerification === 'MISSING'
                      ? 'MISSING'
                      : 'UNVERIFIED',
                confidence:
                  revenueVerification === 'VERIFIED' &&
                  hasSourceRef({
                    sourceSystem: asString(revenueSource.sourceSystem),
                    capturedAt: asString(revenueSource.capturedAt),
                  })
                    ? 1
                    : 0.4,
                ...(asString(revenueSource.sourceSystem)
                  ? {
                      sourceRef: {
                        sourceSystem: asString(revenueSource.sourceSystem),
                        capturedAt: asString(revenueSource.capturedAt) || t,
                        sourceRecordId: asString(revenueSource.sourceRecordId) || undefined,
                        capturedBy: asString(revenueSource.capturedBy) || undefined,
                        field: asString(revenueSource.field) || 'annualRevenue',
                      },
                    }
                  : {}),
              }
            : missingValue<number>(),
      },
      capitalProfile: {},
      transaction: {},
      stage: 'NeedIdentified',
      stageEnteredAt: t,
      ownerEmail: principal.email || principal.userId,
      nextAction: 'Qualify the capital need',
      nextActionOwner: principal.email,
      submissionReadiness: false,
      closingReadiness: false,
      lastMeaningfulActivityAt: t,
      clientApproval: 'NOT_REQUIRED',
      mannyStrategyApproval: 'NOT_REQUIRED',
      mannyShortlistApproval: 'NOT_REQUIRED',
      createdAt: t,
      updatedAt: t,
      idempotencyKey: idempotencyKey || undefined,
      handoffSource: asString(body.handoffSource) || 'Direct',
    };
    state.opportunities.push(opportunity);
    await this.store.save(state);
    return { opportunity, created: true };
  }

  async transition(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const to = asString(body.to) || asString(body.toStage) || asString(body.stage);
    if (!isCapitalStage(to)) unprocessable('Unknown stage');
    if (
      (to === 'StrategyApproved' || to === 'ReadyForSubmission') &&
      !isMannyApprover(principal.roles)
    ) {
      forbidden('HVCG Owner approval required for this stage');
    }
    try {
      assertTransition(opp.stage, to);
    } catch (err) {
      if (err instanceof InvalidStageTransitionError) conflict(err.message, 'invalid_stage_transition');
      throw err;
    }
    const t = nowIso();
    opp.stage = to as CapitalStage;
    opp.stageEnteredAt = t;
    opp.updatedAt = t;
    opp.lastMeaningfulActivityAt = t;
    opp.capitalTypeLegacy = STAGE_TO_LEGACY_FUNDING_STATUS[opp.stage];
    const next = asString(body.nextAction);
    if (next) opp.nextAction = next;
    const nextOwner = asString(body.nextActionOwner);
    if (nextOwner) opp.nextActionOwner = nextOwner;
    await this.store.save(state);
    return { opportunity: opp };
  }

  async updateNextAction(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const next = asString(body.nextAction);
    if (!next) unprocessable('nextAction required');
    opp.nextAction = next;
    const nextOwner = asString(body.nextActionOwner);
    if (nextOwner) opp.nextActionOwner = nextOwner;
    opp.updatedAt = nowIso();
    opp.lastMeaningfulActivityAt = opp.updatedAt;
    await this.store.save(state);
    return { opportunity: opp };
  }

  async generateChecklist(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const items = generateChecklist({
      transactionType: opp.transactionType,
      personalGuaranteeExpected: true,
      sba: opp.transactionType.startsWith('sba'),
      realEstateComponent: opp.transaction.realEstateComponent,
    });
    state.checklists[id] = items;
    if (opp.stage === 'NeedIdentified') {
      assertTransition(opp.stage, 'InitialQualification');
      opp.stage = 'InitialQualification';
      opp.stageEnteredAt = nowIso();
    }
    if (opp.stage === 'InitialQualification') {
      assertTransition(opp.stage, 'DocumentsRequested');
      opp.stage = 'DocumentsRequested';
      opp.stageEnteredAt = nowIso();
    }
    opp.updatedAt = nowIso();
    await this.store.save(state);
    return { checklist: state.checklists[id] || items };
  }

  async checklist(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    return { checklist: state.checklists[id] || [] };
  }

  async overrideItem(principal: AtlasPrincipal, id: string, itemId: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    const items = state.checklists[id] || [];
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) notFound('Checklist item not found');
    let patched: ChecklistItem;
    try {
      patched = overrideChecklistItem(items[idx], {
        status: (asString(body.status) as ChecklistItem['status']) || items[idx].status,
        notes: asString(body.notes) || items[idx].notes,
        overrideReason: asString(body.overrideReason),
        overrideBy: principal.email || principal.userId,
      });
    } catch (err) {
      unprocessable(err instanceof Error ? err.message : 'Checklist override requires an audit reason');
    }
    items[idx] = patched;
    await this.store.save(state);
    return { item: patched };
  }

  async addDocument(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const fileName = asString(body.fileName);
    if (!fileName) unprocessable('fileName required');
    const sha256 = asString(body.sha256) || undefined;
    const dup = detectDuplicate(state.documents.filter((d) => d.capitalOpportunityId === id), {
      sha256,
      fileName,
    });
    if (dup) {
      return { document: state.documents.find((d) => d.id === dup), duplicate: true, duplicateOf: dup };
    }
    const doc = {
      id: `doc-${randomUUID()}`,
      capitalOpportunityId: id,
      clientCode: opp.clientCode,
      checklistItemId: asString(body.checklistItemId) || undefined,
      documentType: asString(body.documentType) || classifyDocumentName(fileName).documentType,
      fileName,
      contentType: asString(body.contentType) || 'application/pdf',
      sizeBytes: asNumber(body.sizeBytes) || 0,
      sha256,
      version: 1,
      source: asString(body.source) || 'client-upload',
      associatedAt: nowIso(),
      associatedBy: principal.email || principal.userId,
      originalPreserved: true as const,
      webUrl: asString(body.webUrl) || undefined,
      driveId: asString(body.driveId) || undefined,
      itemId: asString(body.itemId) || undefined,
    };
    state.documents.push(doc);
    if (doc.checklistItemId) {
      const items = state.checklists[id] || [];
      const idx = items.findIndex((i) => i.id === doc.checklistItemId);
      if (idx >= 0) {
        const cur = items[idx];
        if (cur.status === 'MISSING' || cur.status === 'REQUESTED') {
          items[idx] = {
            ...cur,
            status: 'RECEIVED',
            receivedAt: doc.associatedAt,
            fileId: doc.id,
            fileLink: doc.webUrl,
            verification: cur.verification === 'MISSING' ? 'UNVERIFIED' : cur.verification,
          };
        }
      }
    }
    await this.store.save(state);
    return { document: doc, duplicate: false, duplicateOf: undefined };
  }

  async ingestSharePointFile(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    if (requestedClientSend(body)) {
      unprocessable('Client document requests are drafts only — no auto-send');
    }
    if (asString(body.webUrl) && !asString(body.driveId) && !asString(body.itemId)) {
      unprocessable('webUrl is not an ingest locator — supply driveId and itemId');
    }
    if (!this.files) {
      throw new CapitalHttpError(
        503,
        CAPITAL_BACKEND_UNAVAILABLE,
        'SharePoint file ingest is not configured',
      );
    }
    const driveId = asString(body.driveId);
    const itemId = asString(body.itemId);
    assertSafeDriveIds(driveId, itemId);
    return withIngestLock(`${id}:${driveId}:${itemId}`, async () => {
      const state = await this.store.load();
      const opp = requireOpp(state, principal, id);
      const meta = await this.files!.getItem(driveId, itemId);
      assertFileBelongsToClient(meta, opp.clientCode);
      if (!ingestTypeAllowed(meta.name, meta.mimeType)) {
        unprocessable('File type is not allowed for capital ingest');
      }
      const bytes = await this.files!.getContent(driveId, itemId);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const capturedAt = nowIso();
      const sourceVersion = meta.eTag || meta.modifiedAt;
      const extracted = extractCapitalDocumentContent({
        fileName: meta.name,
        bytes,
        mimeType: meta.mimeType,
        capturedAt,
        sourceRecordId: `${driveId}:${itemId}`,
      });
      const oppDocs = state.documents.filter((d) => d.capitalOpportunityId === id);
      const existingItem = findDocumentBySharePointItem(oppDocs, driveId, itemId);
      const actor = principal.email || principal.userId;
      const runIntel = (docId: string, incomingFacts: boolean, extraDocs = oppDocs) =>
        runDocumentIntelligence({
          opportunity: opp,
          checklist: state.checklists[id] || [],
          documents: extraDocs,
          incomingFactsByDocumentId:
            incomingFacts && extracted.facts.length ? { [docId]: extracted.facts } : undefined,
          incomingExtractionByDocumentId: {
            [docId]: {
              method: extracted.method,
              promptInjection: extracted.promptInjection,
              text: extracted.text,
            },
          },
          existingReviews: state.reviews.filter((r) => r.capitalOpportunityId === id),
          includeUnderwriting: body.includeUnderwriting !== false,
          createdBy: actor,
        });
      const payload = (
        doc: (typeof state.documents)[number],
        intelligence: DocumentIntelligenceOutput,
        flags: { duplicate: boolean; replayed?: boolean; versionChanged?: boolean; duplicateOf?: string },
      ) => ({
        document: doc,
        duplicate: flags.duplicate,
        duplicateOf: flags.duplicateOf,
        replayed: flags.replayed || false,
        versionChanged: flags.versionChanged || false,
        file: {
          driveId,
          itemId,
          fileName: meta.name,
          mimeType: meta.mimeType,
          size: bytes.length,
          sha256,
          webUrl: meta.webUrl,
          libraryClientCode: meta.libraryClientCode,
          sourceVersion,
        },
        extraction: {
          method: extracted.method,
          promptInjection: extracted.promptInjection,
          factCount: extracted.facts.length,
          error: extracted.error,
        },
        report: intelligence.report,
        checklist: intelligence.checklist,
        clientRequest: intelligence.report.clientRequest,
        clientRequestSendAttempted: false as const,
      });

      if (existingItem && existingItem.sha256 === sha256) {
        const intelligence = runIntel(existingItem.id, false);
        persistIntelligence(state, id, intelligence);
        await this.store.save(state);
        return payload(existingItem, intelligence, { duplicate: true, replayed: true, duplicateOf: existingItem.id });
      }

      if (existingItem && existingItem.sha256 !== sha256) {
        existingItem.version = (existingItem.version || 1) + 1;
        existingItem.sha256 = sha256;
        existingItem.sizeBytes = bytes.length;
        existingItem.fileName = meta.name;
        existingItem.contentType = meta.mimeType || existingItem.contentType;
        existingItem.sourceVersion = sourceVersion;
        existingItem.extractionMethod = extracted.method;
        existingItem.webUrl = meta.webUrl || existingItem.webUrl;
        const intelligence = runIntel(existingItem.id, true);
        persistIntelligence(state, id, intelligence);
        await this.store.save(state);
        return payload(existingItem, intelligence, { duplicate: false, versionChanged: true });
      }

      const sameHash = findDocumentByContentHash(oppDocs, sha256);
      const doc = {
        id: `doc-${randomUUID()}`,
        capitalOpportunityId: id,
        clientCode: opp.clientCode,
        documentType: classifyDocument({ fileName: meta.name, text: extracted.text }).documentType,
        fileName: meta.name,
        contentType: meta.mimeType || 'application/octet-stream',
        sizeBytes: bytes.length,
        sha256,
        version: 1,
        source: 'sharepoint-library',
        associatedAt: capturedAt,
        associatedBy: actor,
        originalPreserved: true as const,
        webUrl: meta.webUrl,
        driveId,
        itemId,
        sourceVersion,
        duplicateOf: sameHash?.id,
        extractionMethod: extracted.method,
      };
      state.documents.push(doc);
      const intelligence = runIntel(doc.id, !sameHash, [...oppDocs, doc]);
      persistIntelligence(state, id, intelligence);
      await this.store.save(state);
      return payload(doc, intelligence, {
        duplicate: Boolean(sameHash),
        duplicateOf: sameHash?.id,
      });
    });
  }

  async review(principal: AtlasPrincipal, id: string, docId: string, body: Record<string, unknown>) {
    if (requestedClientSend(body)) {
      unprocessable('Client document requests are drafts only — no auto-send');
    }
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const doc = state.documents.find((d) => d.id === docId && d.capitalOpportunityId === id);
    if (!doc) notFound('Document not found');
    const facts: ExtractedFact[] = Array.isArray(body.extractedFacts)
      ? body.extractedFacts.map((row) => {
          const f = asRecord(row);
          const src = asRecord(f.sourceRef);
          return {
            field: asString(f.field) || 'unknown',
            value: typeof f.value === 'number' ? f.value : asString(f.value) || null,
            verification: 'UNVERIFIED' as const,
            confidence: asNumber(f.confidence) ?? 0,
            sourceRef: {
              sourceSystem: asString(src.sourceSystem),
              capturedAt: asString(src.capturedAt),
              field: asString(src.field) || asString(f.field) || 'unknown',
              sourceRecordId: asString(src.sourceRecordId) || undefined,
            },
          };
        })
      : [];
    const intelligence = runDocumentIntelligence({
      opportunity: opp,
      checklist: state.checklists[id] || [],
      documents: state.documents.filter((d) => d.capitalOpportunityId === id),
      incomingFactsByDocumentId: facts.length ? { [docId]: facts } : undefined,
      existingReviews: state.reviews.filter((r) => r.capitalOpportunityId === id),
      includeUnderwriting: false,
      createdBy: principal.email || principal.userId,
    });
    state.checklists[id] = intelligence.checklist;
    for (const next of intelligence.reviews) {
      state.reviews = state.reviews.filter((r) => r.documentId !== next.documentId);
      state.reviews.push(next);
    }
    await this.store.save(state);
    const review =
      intelligence.reviews.find((r) => r.documentId === docId) ||
      reviewDocument({ document: doc, extractedFacts: facts });
    return { review, intelligence: intelligence.report };
  }

  async documentIntelligence(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    if (requestedClientSend(body)) {
      unprocessable('Client document requests are drafts only — no auto-send');
    }
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const incoming = asRecord(body.extractedFactsByDocumentId);
    const incomingFactsByDocumentId: Record<
      string,
      Array<{
        field: string;
        value: string | number | null;
        verification: 'UNVERIFIED';
        confidence: number;
        sourceRef: { sourceSystem: string; capturedAt: string; field?: string };
      }>
    > = {};
    for (const [docId, raw] of Object.entries(incoming)) {
      if (!Array.isArray(raw)) continue;
      incomingFactsByDocumentId[docId] = raw.flatMap((row) => {
        const f = asRecord(row);
        const sourceRef = {
          sourceSystem: asString(asRecord(f.sourceRef).sourceSystem),
          capturedAt: asString(asRecord(f.sourceRef).capturedAt),
          field: asString(asRecord(f.sourceRef).field) || asString(f.field) || 'unknown',
        };
        if (!hasSourceRef(sourceRef)) return [];
        return [
          {
            field: asString(f.field) || 'unknown',
            value: (typeof f.value === 'number' ? f.value : asString(f.value) || null) as string | number | null,
            verification: 'UNVERIFIED' as const,
            confidence: asNumber(f.confidence) ?? 0.4,
            sourceRef,
          },
        ];
      });
    }
    const intelligence = runDocumentIntelligence({
      opportunity: opp,
      checklist: state.checklists[id] || [],
      documents: state.documents.filter((d) => d.capitalOpportunityId === id),
      incomingFactsByDocumentId,
      existingReviews: state.reviews.filter((r) => r.capitalOpportunityId === id),
      includeUnderwriting: body.includeUnderwriting !== false,
      createdBy: principal.email || principal.userId,
    });
    state.checklists[id] = intelligence.checklist;
    for (const next of intelligence.reviews) {
      state.reviews = state.reviews.filter((r) => r.documentId !== next.documentId);
      state.reviews.push(next);
    }
    if (intelligence.report.underwriting) {
      state.underwriting = state.underwriting.filter((u) => u.capitalOpportunityId !== id);
      state.underwriting.push(intelligence.report.underwriting);
    }
    await this.store.save(state);
    return {
      report: intelligence.report,
      checklist: intelligence.checklist,
      clientRequest: intelligence.report.clientRequest,
      clientRequestSendAttempted: false as const,
    };
  }

  async missingRequest(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    return { request: consolidateMissingRequest(state.checklists[id] || [], opp.clientCode) };
  }

  async evidenceReview(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const reviews = state.reviews.filter((r) => r.capitalOpportunityId === id);
    const documents = state.documents.filter((d) => d.capitalOpportunityId === id);
    const cards = buildEvidenceReviewCards({ reviews, documents });
    return {
      opportunityId: opp.id,
      clientCode: opp.clientCode,
      cards,
      workload: founderWorkloadForCards(cards),
      authorization: { reviewerRole: 'HVCG Owner', aiCannotVerify: true },
      actions: ['VERIFY', 'CORRECT', 'REJECT'],
      clientRequestSendAttempted: false as const,
    };
  }

  async reviewFact(principal: AtlasPrincipal, id: string, factId: string, body: Record<string, unknown>) {
    return withIngestLock(`fact:${id}:${factId}`, () => this.reviewFactUnlocked(principal, id, factId, body));
  }

  private async reviewFactUnlocked(principal: AtlasPrincipal, id: string, factId: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    const located = findFactInReviews(state.reviews, factId);
    if (located) {
      const owner = state.opportunities.find((o) => o.id === located.review.capitalOpportunityId);
      if (owner && !canAccessClient(principal, owner.clientCode)) forbidden();
      if (owner && owner.id !== id) forbidden();
    }
    const opp = requireOpp(state, principal, id);
    if (!located || located.review.capitalOpportunityId !== id) notFound('Fact not found');
    const document = state.documents.find((d) => d.id === located.review.documentId);
    if (document && document.clientCode !== opp.clientCode) forbidden();
    const decision = asString(body.decision).toUpperCase();
    if (decision !== 'VERIFY' && decision !== 'CORRECT' && decision !== 'REJECT') {
      unprocessable('decision must be VERIFY, CORRECT, or REJECT');
    }
    if (body.sourceRef) forbidden('SourceRef substitution is not allowed');
    try {
      const applied = applyFactReview({
        fact: located.fact,
        decision: decision as FactReviewDecision,
        actor: principal.email || principal.userId,
        roles: principal.roles,
        correctedValue: typeof body.correctedValue === 'number' ? body.correctedValue : asString(body.correctedValue) || null,
        reason: asString(body.reason) || undefined,
      });
      state.reviews = applyReviewToReviews(state.reviews, factId, applied.fact);
      const auditRow = {
        id: `fra-${randomUUID()}`,
        clientCode: opp.clientCode,
        capitalOpportunityId: id,
        ...applied.audit,
        factId,
      };
      state.factReviews.push(auditRow);
      const reviews = state.reviews.filter((r) => r.capitalOpportunityId === id);
      const uw = buildUnderwritingSummary({
        opportunity: opp,
        checklist: state.checklists[id] || [],
        reviews,
        createdBy: principal.email || principal.userId,
      });
      state.underwriting = state.underwriting.filter((u) => u.capitalOpportunityId !== id);
      state.underwriting.push(uw);
      await this.store.save(state);
      return {
        fact: applied.fact,
        audit: auditRow,
        underwriting: uw,
        clientRequestSendAttempted: false as const,
      };
    } catch (err) {
      if (err instanceof FactReviewError) {
        if (err.code === 'unauthorized') forbidden(err.message);
        if (err.code === 'forbidden') forbidden(err.message);
        unprocessable(err.message);
      }
      throw err;
    }
  }

  async structures(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const overlaid = overlayOpportunityFromReviews(
      opp,
      state.reviews.filter((r) => r.capitalOpportunityId === id),
    );
    return {
      structures: proposeFinancingStructures(overlaid.opportunity),
      usedUnverifiedFacts: overlaid.opportunity.business.annualRevenue?.verification === 'UNVERIFIED',
      review: { status: 'PENDING_MANNY' as const, disclaimer: FINANCING_DISCLAIMER },
    };
  }

  async underwrite(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const uw = buildUnderwritingSummary({
      opportunity: overlayOpportunityFromReviews(
        opp,
        state.reviews.filter((r) => r.capitalOpportunityId === id),
      ).opportunity,
      checklist: state.checklists[id] || [],
      reviews: state.reviews.filter((r) => r.capitalOpportunityId === id),
      createdBy: principal.email || principal.userId,
    });
    state.underwriting = state.underwriting.filter((u) => u.capitalOpportunityId !== id);
    state.underwriting.push(uw);
    await this.store.save(state);
    return { underwriting: uw };
  }

  async strategy(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    if (!isStrategyWorkbenchOpen(opp.stage)) {
      throw new CapitalHttpError(
        403,
        'STRATEGY_STAGE_CLOSED',
        `Strategy workbench is closed at stage ${opp.stage}. Create or use a pre-submission opportunity. Submitted and later stages cannot draft a new strategy package.`,
      );
    }
    const uw =
      state.underwriting.find((u) => u.capitalOpportunityId === id) ||
      buildUnderwritingSummary({
        opportunity: opp,
        checklist: state.checklists[id] || [],
        reviews: [],
        createdBy: principal.email || principal.userId,
      });
    const run = runLenderMatch(
      overlayOpportunityFromReviews(opp, state.reviews.filter((r) => r.capitalOpportunityId === id)).opportunity,
      state.lenders,
      state.products,
      new Date(),
      { outreach: state.submissions, opportunityClientIndex: opportunityClientIndex(state) },
    );
    const strat = draftStrategy({ opportunity: opp, matches: run.matches, underwriting: uw });
    const mannyPackage = buildMannyStrategyPackage({
      opportunity: overlayOpportunityFromReviews(opp, state.reviews.filter((r) => r.capitalOpportunityId === id)).opportunity,
      matches: run.matches,
      checklist: state.checklists[id] || [],
      risks: strat.risks,
    });
    state.strategies = state.strategies.filter((s) => s.capitalOpportunityId !== id);
    state.strategies.push(strat);
    opp.stage = 'AwaitingMannyStrategyApproval';
    opp.stageEnteredAt = nowIso();
    opp.mannyStrategyApproval = 'PENDING';
    await this.store.save(state);
    return { strategy: strat, mannyPackage };
  }

  async strategyDecision(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    if (!isMannyApprover(principal.roles)) forbidden('HVCG Owner approval required');
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const strat = state.strategies.find((s) => s.capitalOpportunityId === id);
    if (!strat) notFound('Strategy not found');
    const decision = asString(body.decision);
    if (decision !== 'APPROVED' && decision !== 'REJECTED' && decision !== 'REVISE') {
      unprocessable('decision must be APPROVED, REJECTED, or REVISE');
    }
    const updated = applyMannyDecision(strat, decision, principal.email || principal.userId);
    Object.assign(strat, updated);
    opp.mannyStrategyApproval = updated.mannyApproval;
    if (decision === 'APPROVED') {
      try {
        assertTransition(opp.stage, 'StrategyApproved');
        opp.stage = 'StrategyApproved';
        opp.stageEnteredAt = nowIso();
      } catch (err) {
        if (err instanceof InvalidStageTransitionError) {
          opp.stage = 'StrategyApproved';
          opp.stageEnteredAt = nowIso();
        } else throw err;
      }
    } else if (decision === 'REVISE') {
      opp.stage = 'StrategyDrafted';
      opp.stageEnteredAt = nowIso();
    }
    await this.store.save(state);
    return { strategy: strat, opportunity: opp };
  }

  async addLender(principal: AtlasPrincipal, body: Record<string, unknown>) {
    if (!isMannyApprover(principal.roles)) forbidden('HVCG Owner approval required');
    const state = await this.store.load();
    const lender = {
      id: `ln-${randomUUID()}`,
      name: asString(body.name) || 'Unnamed lender',
      organizationType: asString(body.organizationType) || undefined,
      geography: asString(body.geography) || undefined,
    };
    state.lenders.push(lender);
    await this.store.save(state);
    return { lender };
  }

  async listLenders(_principal: AtlasPrincipal) {
    const state = await this.store.load();
    const catalog = sourcedLenderCatalog();
    return {
      lenders: state.lenders.map((lender) => ({
        ...lender,
        freshness: organizationFreshness(lender),
        products: state.products.filter((p) => p.lenderId === lender.id).map((p) => productFreshness(p)),
        historicalExperience: summarizeHvcgExperience(state.submissions, lender.id, lender.name),
        historicalIntelligence: summarizeHistoricalLenderIntelligence({
          outreach: state.submissions,
          lenderId: lender.id,
          lenderName: lender.name,
        }),
      })),
      outreachHistory: buildOutreachHistorySnapshot({
        outreach: state.submissions,
        lenders: state.lenders,
      }),
      criteria: catalog.criteria,
      review: { status: 'PENDING_MANNY' as const, disclaimer: FINANCING_DISCLAIMER },
      inventedCriteria: false,
    };
  }

  async outreachHistory(_principal: AtlasPrincipal) {
    const state = await this.store.load();
    return buildOutreachHistorySnapshot({
      outreach: state.submissions,
      lenders: state.lenders,
    });
  }

  async addProduct(principal: AtlasPrincipal, lenderId: string, body: Record<string, unknown>) {
    if (!isMannyApprover(principal.roles)) forbidden('HVCG Owner approval required');
    const state = await this.store.load();
    if (!state.lenders.some((l) => l.id === lenderId)) notFound('Lender not found');
    const freshnessRaw = asString(body.freshness);
    const freshness: LenderFreshness =
      freshnessRaw === 'CURRENT' || freshnessRaw === 'STALE' || freshnessRaw === 'UNKNOWN' ? freshnessRaw : 'UNKNOWN';
    const product: LenderProduct = {
      id: `pr-${randomUUID()}`,
      lenderId,
      productName: asString(body.productName) || 'Product',
      minAmount: asNumber(body.minAmount),
      maxAmount: asNumber(body.maxAmount),
      minRevenue: asNumber(body.minRevenue),
      freshness,
      lastVerifiedAt: asString(body.lastVerifiedAt) || undefined,
      source: asString(body.source) || undefined,
      verifiedBy: asString(body.verifiedBy) || undefined,
      confidence: asNumber(body.confidence),
      ...(typeof body.sbaParticipation === 'boolean' ? { sbaParticipation: body.sbaParticipation } : {}),
    };
    state.products.push(product);
    await this.store.save(state);
    return { product };
  }

  async match(principal: AtlasPrincipal, id: string, opts: { persistShortlistPending?: boolean } = {}) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const run = runLenderMatch(
      overlayOpportunityFromReviews(opp, state.reviews.filter((r) => r.capitalOpportunityId === id)).opportunity,
      state.lenders,
      state.products,
      new Date(),
      { outreach: state.submissions, opportunityClientIndex: opportunityClientIndex(state) },
    );
    if (
      opts.persistShortlistPending !== false &&
      (opp.stage === 'StrategyApproved' || opp.stage === 'LenderVendorResearch')
    ) {
      opp.stage = 'AwaitingMannyShortlistApproval';
      opp.stageEnteredAt = nowIso();
      opp.mannyShortlistApproval = 'PENDING';
      await this.store.save(state);
    }
    return {
      matches: run.matches,
      filteredOut: run.filteredOut,
      review: run.review,
      generatedAt: run.generatedAt,
      opportunity: opp,
    };
  }

  async shortlistDecision(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    if (!isMannyApprover(principal.roles)) forbidden('HVCG Owner approval required');
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const decision = asString(body.decision);
    if (decision === 'APPROVED') {
      opp.mannyShortlistApproval = 'APPROVED';
      opp.stage = 'ReadyForSubmission';
      opp.stageEnteredAt = nowIso();
      const lenderIds = Array.isArray(body.lenderIds) ? body.lenderIds.map((x) => String(x).trim()).filter(Boolean) : [];
      for (const lenderId of lenderIds) {
        const exists = state.submissions.some(
          (s) => s.capitalOpportunityId === id && s.lenderId === lenderId && s.status === 'draft',
        );
        if (exists) continue;
        state.submissions.push({
          id: `sub-${randomUUID()}`,
          capitalOpportunityId: id,
          lenderId,
          method: 'package',
          status: 'draft',
          documentIds: [],
          notes: 'Shortlist outreach — recorded only.',
        });
      }
    } else if (decision === 'REJECTED' || decision === 'REVISE') {
      opp.mannyShortlistApproval = decision === 'REJECTED' ? 'REJECTED' : 'REVISE';
      opp.stage = 'LenderVendorResearch';
    } else unprocessable('decision must be APPROVED, REJECTED, or REVISE');
    await this.store.save(state);
    return { opportunity: opp };
  }

  async application(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const lenderId = asString(body.lenderId);
    if (!lenderId) unprocessable('lenderId required');
    const pkg = prepareApplication({
      opportunity: opp,
      lenderId,
      productId: asString(body.productId) || undefined,
      fieldMap: {},
      documents: state.documents.filter((d) => d.capitalOpportunityId === id),
    });
    state.applications = state.applications.filter((a) => a.id !== pkg.id);
    state.applications.push(pkg);
    await this.store.save(state);
    return { application: pkg };
  }

  async submission(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    void body.externalSubmit;
    const lenderId = asString(body.lenderId) || 'unknown';
    const packageVersion = asString(body.packageVersion) || 'v1';
    const existing = state.submissions.find(
      (s) =>
        s.capitalOpportunityId === id &&
        s.lenderId === lenderId &&
        (s.packageVersion || 'v1') === packageVersion &&
        s.status === 'submitted',
    );
    if (existing) {
      return { submission: existing, recordedOnly: true, externalSubmitAttempted: false, externalSubmit: false, created: false };
    }
    if (
      opp.mannyStrategyApproval !== 'APPROVED' ||
      opp.mannyShortlistApproval !== 'APPROVED' ||
      opp.stage !== 'ReadyForSubmission'
    ) {
      forbidden('Submission requires Manny strategy and shortlist approval at ReadyForSubmission');
    }
    const sub = {
      id: `sub-${randomUUID()}`,
      capitalOpportunityId: id,
      lenderId,
      method: 'package' as const,
      status: 'submitted' as const,
      submittedAt: nowIso(),
      submittedBy: principal.email || principal.userId,
      confirmationNumber: asString(body.confirmationNumber) || undefined,
      packageVersion,
      documentIds: state.documents.filter((d) => d.capitalOpportunityId === id).map((d) => d.id),
      notes: 'Record only — no external portal submit. BL-C1.',
    };
    state.submissions.push(sub);
    if (opp.stage === 'ReadyForSubmission') {
      opp.stage = 'Submitted';
      opp.stageEnteredAt = nowIso();
    }
    await this.store.save(state);
    return { submission: sub, recordedOnly: true, externalSubmitAttempted: false, externalSubmit: false };
  }

  async classify(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    const classified = classifyLenderMessage(asString(body.text));
    return { classification: classified, communication: classified };
  }

  async addOffer(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    const offer = {
      id: `off-${randomUUID()}`,
      capitalOpportunityId: id,
      lenderId: asString(body.lenderId) || 'ln-unknown',
      lenderName: asString(body.lenderName) || 'Unknown lender',
      amount: asNumber(body.amount) ?? undefined,
      interestRate: asNumber(body.interestRate) ?? undefined,
      assumptions: Array.isArray(body.assumptions) ? body.assumptions.map((x) => String(x)) : [],
      createdAt: nowIso(),
    };
    state.offers.push(offer);
    await this.store.save(state);
    return { offer };
  }

  async compare(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    return compareOffers(state.offers.filter((o) => o.capitalOpportunityId === id));
  }

  async closing(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const items = defaultClosingConditions(opp.transactionType).map((c) => ({
      ...c,
      capitalOpportunityId: id,
    }));
    state.closing[id] = items;
    await this.store.save(state);
    return { closing: items, conditions: items };
  }

  async fee(principal: AtlasPrincipal, body: Record<string, unknown>) {
    const clientCode = asString(body.clientCode);
    if (!isCapitalClientCode(clientCode)) unprocessable('Canonical ClientCode required');
    assertCapitalAccess(principal, clientCode);
    const rec = createFeeRecord({
      clientCode,
      capitalOpportunityId: asString(body.capitalOpportunityId) || undefined,
      feeType: asString(body.feeType) || 'advisory',
      feeFormula: asString(body.feeFormula) || undefined,
      notes: asString(body.notes) || undefined,
    });
    const state = await this.store.load();
    state.fees.push(rec);
    await this.store.save(state);
    return { fee: rec };
  }

  async evaHandoff(principal: AtlasPrincipal, body: Record<string, unknown>) {
    const clientCode = asString(body.clientCode);
    if (!isCapitalClientCode(clientCode)) unprocessable('Canonical ClientCode required');
    assertCapitalAccess(principal, clientCode);
    const revenue = asNumber(body.annualRevenue);
    const route = evaHandoffAllowed(revenue);
    const attribution = preserveAttribution((body.attribution as Attribution) || {});
    const state = await this.store.load();
    state.attributions.push(attribution);
    if (route.route !== 'atlas_hvcg') {
      await this.store.save(state);
      return { route: route.route, created: false, opportunity: null, reason: route.reason };
    }
    const created = await this.create(principal, {
      ...body,
      clientCode,
      transactionType: asString(body.transactionType) || 'working_capital_loc',
      handoffSource: 'EVA',
      revenueVerification: 'UNVERIFIED',
    });
    return { route: route.route, ...created, reason: route.reason };
  }

  async copilotHandoff(principal: AtlasPrincipal, body: Record<string, unknown>) {
    const state = await this.store.load();
    const rec = {
      id: `acp-${randomUUID()}`,
      clientCode: asString(body.clientCode) || undefined,
      organizationName: asString(body.organizationName) || asString((body.organization as Record<string, unknown> | undefined)?.name),
      assessmentId: asString(body.assessmentId),
      recommendedPackage: asString(body.recommendedPackage),
      observationOnly: true as const,
      createdAt: nowIso(),
    };
    if (rec.clientCode) assertCapitalAccess(principal, rec.clientCode);
    state.copilotHandoffs.push(rec);
    await this.store.save(state);
    return {
      handoff: rec,
      mergedWithCapitalOperations: false,
      note: 'Agent Copilot creates AI implementation opportunities — not a capital diagnostic.',
    };
  }

  async attribution(principal: AtlasPrincipal, body: Record<string, unknown>) {
    if (!isMannyApprover(principal.roles)) forbidden('HVCG Owner approval required');
    const state = await this.store.load();
    const attr = preserveAttribution(body as Attribution);
    state.attributions.push(attr);
    await this.store.save(state);
    return { attribution: attr };
  }
}
