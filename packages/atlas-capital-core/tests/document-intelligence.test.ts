import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyIntelligenceToChecklist,
  CLASSIFICATION_LOW_CONFIDENCE,
  classifyDocumentName,
  detectEntityFromFileName,
  detectFreshness,
  detectPeriodFromFileName,
  evaluateCompletenessVsRequest,
  generateChecklist,
  isPromptInjectionFileName,
  OCR_STUBBED,
  runDocumentIntelligence,
  verifiedValue,
  type CapitalDocument,
  type CapitalOpportunity,
  type CompletenessVsRequestRow,
  type ExtractedFact,
} from '../src/index.ts';
import { SYNTHETIC_AS_OF, SYNTHETIC_DOCUMENTS as SYN } from './fixtures/synthetic-documents.ts';

function opp(over: Partial<CapitalOpportunity> = {}): CapitalOpportunity {
  const now = '2026-08-17T00:00:00.000Z';
  return {
    id: 'cap-docint-001',
    title: 'SYNTHETIC Capital Co working capital',
    clientId: 'client-syn-001',
    clientCode: 'SYN01',
    transactionType: 'working_capital_loc',
    need: { requestedAmount: 500_000, purpose: 'working capital' },
    business: {
      industry: 'wholesale',
      annualRevenue: verifiedValue(3_500_000, 'synthetic-fixture', now, 'qa'),
    },
    capitalProfile: {},
    transaction: { workingCapitalComponent: true },
    stage: 'DocumentsRequested',
    stageEnteredAt: now,
    ownerEmail: 'qa@example.com',
    submissionReadiness: false,
    closingReadiness: false,
    lastMeaningfulActivityAt: now,
    clientApproval: 'NOT_REQUIRED',
    mannyStrategyApproval: 'NOT_REQUIRED',
    mannyShortlistApproval: 'NOT_REQUIRED',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function doc(over: Partial<CapitalDocument> & Pick<CapitalDocument, 'id' | 'fileName'>): CapitalDocument {
  return {
    capitalOpportunityId: 'cap-docint-001',
    clientCode: 'SYN01',
    documentType: 'other',
    contentType: 'application/pdf',
    sizeBytes: 2048,
    version: 1,
    source: 'client-upload',
    associatedAt: '2026-08-17T00:00:00.000Z',
    associatedBy: 'qa',
    originalPreserved: true,
    ...over,
  };
}

describe('document intelligence — period / entity / stale', () => {
  it('derives period from filename with SourceRef and never VERIFIED', () => {
    const period = detectPeriodFromFileName('SYN01 Bank Statement 2026-03.pdf', '2026-08-17T00:00:00.000Z', 'doc-1');
    assert.equal(period.verification, 'DERIVED');
    assert.equal(period.periodEnd, '2026-03-31');
    assert.equal(period.sourceRef.sourceSystem, 'atlas-document-intelligence');
    assert.equal(period.sourceRef.field, 'fileName');
    assert.ok(period.sourceRef.capturedAt);
    assert.notEqual(period.verification, 'VERIFIED');
  });

  it('derives month-name YTD periods', () => {
    const period = detectPeriodFromFileName('P&L YTD June 2026.pdf', '2026-08-17T00:00:00.000Z');
    assert.equal(period.determined, true);
    assert.equal(period.periodEnd, '2026-06-30');
    assert.ok(period.periodLabel?.includes('YTD'));
  });

  it('marks YTD without a year as UNVERIFIED, not current', () => {
    const period = detectPeriodFromFileName('P&L YTD.pdf', '2026-08-17T00:00:00.000Z');
    assert.equal(period.verification, 'UNVERIFIED');
    assert.equal(period.determined, false);
  });

  it('matches SYN01 / title tokens and flags a foreign entity', () => {
    const o = opp();
    const match = detectEntityFromFileName('SYN01 Bank Statement June 2026.pdf', o, '2026-08-17T00:00:00.000Z', 'doc-1');
    assert.equal(match.matchesOpportunity, true);
    assert.equal(match.verification, 'DERIVED');
    const titleMatch = detectEntityFromFileName('SYNTHETIC Capital Co P&L YTD.pdf', o, '2026-08-17T00:00:00.000Z');
    assert.equal(titleMatch.matchesOpportunity, true);
    const foreign = detectEntityFromFileName('Acme Holdings AR Aging 2026-06.pdf', o, '2026-08-17T00:00:00.000Z');
    assert.equal(foreign.matchesOpportunity, false);
    assert.equal(foreign.entityName, 'Acme Holdings');
  });

  it('marks a 2024 bank statement stale as of Aug 2026', () => {
    const period = detectPeriodFromFileName('Bank Statement 2024-01.pdf', '2026-08-17T00:00:00.000Z');
    const fresh = detectFreshness({
      documentType: 'bank_statement',
      period,
      asOf: new Date('2026-08-17T00:00:00.000Z'),
      capturedAt: '2026-08-17T00:00:00.000Z',
      sourceRecordId: 'doc-1',
    });
    assert.equal(fresh.stale, true);
    assert.equal(fresh.determined, true);
    assert.equal(fresh.verification, 'DERIVED');
    assert.ok(fresh.sourceRef.field);
  });
});

describe('document intelligence pipeline', () => {
  it('runs collection through underwriting without promoting VERIFIED or sending the client', () => {
    const opportunity = opp();
    const checklist = generateChecklist({
      transactionType: opportunity.transactionType,
      personalGuaranteeExpected: true,
    });
    const documents = [
      doc({ id: 'doc-pl', fileName: 'SYNTHETIC Capital Co P&L YTD June 2026.pdf', sha256: 'aaa' }),
      doc({ id: 'doc-bank-old', fileName: 'SYN01 Bank Statement 2024-01.pdf', sha256: 'bbb' }),
      doc({ id: 'doc-foreign', fileName: 'Acme Holdings AR Aging 2026-06.pdf', sha256: 'ccc' }),
    ];
    const incoming: Record<string, ExtractedFact[]> = {
      'doc-pl': [
        {
          field: 'revenue',
          value: 9_999_999,
          verification: 'VERIFIED',
          confidence: 0.9,
          sourceRef: { sourceSystem: 'ai', capturedAt: '2026-08-17T00:00:00.000Z' },
        },
      ],
    };

    const { report, checklist: patched } = runDocumentIntelligence({
      opportunity,
      checklist,
      documents,
      incomingFactsByDocumentId: incoming,
      createdBy: 'qa@example.com',
      asOf: '2026-08-17T00:00:00.000Z',
    });

    assert.equal(report.clientRequestSendAttempted, false);
    assert.ok(report.clientRequest);
    assert.ok(report.disclaimer.toLowerCase().includes('unverified'));
    assert.equal(report.usedUnverifiedFacts, true);

    const pl = report.documents.find((d) => d.documentId === 'doc-pl');
    assert.ok(pl);
    assert.equal(pl.classification.documentType, 'pnl');
    assert.equal(pl.classification.verification, 'DERIVED');
    assert.ok(pl.classification.sourceRef.field);
    assert.equal(pl.extraction.ocr, OCR_STUBBED);
    assert.equal(pl.extraction.facts[0].verification, 'CONFLICTING');
    assert.ok(pl.extraction.facts[0].sourceRef.sourceSystem);
    assert.ok(pl.extraction.facts[0].sourceRef.capturedAt);
    assert.notEqual(pl.review.extractedFacts[0].verification, 'VERIFIED');

    const bank = report.documents.find((d) => d.documentId === 'doc-bank-old');
    assert.equal(bank?.freshness.stale, true);
    assert.equal(bank?.review.stale, true);

    assert.ok(report.conflicts.some((c) => c.field === 'revenue' && c.verification === 'CONFLICTING'));
    assert.ok(report.conflicts.some((c) => c.field === 'entityName'));
    assert.ok(report.missingDocuments.some((m) => m.itemKey === 'fin-bs-ytd'));
    assert.ok(report.completeness.percent < 100);
    assert.equal(report.completeness.verification, 'DERIVED');
    assert.ok(report.underwriting);

    assert.ok(patched.some((i) => i.itemKey === 'fin-pl-ytd' && i.status === 'NEEDS_REVIEW'));
    assert.ok(patched.some((i) => i.itemKey === 'bank-3mo' && (i.status === 'OUTDATED' || i.status === 'INCOMPLETE')));
    assert.ok(patched.every((i) => i.verification !== 'VERIFIED'));
    assert.ok(patched.every((i) => i.status !== 'ACCEPTED'));
    assert.ok(classifyDocumentName('Bank Statement June.pdf').documentType === 'bank_statement');
  });

  it('never auto-accepts and flags duplicates instead of dropping them', () => {
    const checklist = generateChecklist({ transactionType: 'sba' });
    const original = doc({ id: 'doc-a', fileName: 'formation.pdf', sha256: 'same' });
    const dup = doc({ id: 'doc-b', fileName: 'formation-copy.pdf', sha256: 'same' });
    const { report, checklist: patched } = runDocumentIntelligence({
      opportunity: opp({ transactionType: 'sba' }),
      checklist,
      documents: [original, dup],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: '2026-08-17T00:00:00.000Z',
    });
    const dupResult = report.documents.find((d) => d.documentId === 'doc-b');
    assert.equal(dupResult?.collection.duplicateOf, 'doc-a');
    assert.equal(dupResult?.review.duplicateOf, 'doc-a');
    assert.ok(patched.every((i) => i.status !== 'ACCEPTED'));
    assert.equal(report.clientRequestSendAttempted, false);
  });

  it('leaves human-accepted items accepted unless stale or conflicting', () => {
    const checklist = generateChecklist({ transactionType: 'working_capital_loc' });
    const formation = checklist.find((i) => i.itemKey === 'org-formation');
    assert.ok(formation);
    formation.status = 'ACCEPTED';
    formation.verification = 'VERIFIED';
    formation.overrideReason = 'Human accepted against source';
    formation.overrideBy = 'qa';
    const untouched = applyIntelligenceToChecklist(
      checklist,
      [],
      new Date('2026-08-17T00:00:00.000Z'),
      [],
    );
    const kept = untouched.find((i) => i.itemKey === 'org-formation');
    assert.equal(kept?.status, 'ACCEPTED');
    assert.equal(kept?.verification, 'VERIFIED');
  });

  it('drops extracted facts that omit SourceRef instead of inventing provenance', () => {
    const { report } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc({ id: 'doc-x', fileName: 'Debt Schedule 2026-06.pdf' })],
      incomingFactsByDocumentId: {
        'doc-x': [
          {
            field: 'totalDebt',
            value: 100,
            verification: 'UNVERIFIED',
            confidence: 0.4,
            sourceRef: { sourceSystem: '', capturedAt: '' },
          },
        ],
      },
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: '2026-08-17T00:00:00.000Z',
    });
    assert.equal(report.documents[0].extraction.facts.length, 0);
    assert.ok(report.documents[0].review.conflicts.some((c) => /sourceRef required/i.test(c)));
  });
});

function vsStatus(rows: CompletenessVsRequestRow[], documentId: string) {
  return rows.find((r) => r.documentId === documentId)?.status;
}

function aiFact(field: string, value: number): ExtractedFact {
  return {
    field,
    value,
    verification: 'VERIFIED',
    confidence: 0.92,
    sourceRef: { sourceSystem: 'ai', capturedAt: SYNTHETIC_AS_OF, field },
  };
}

describe('document classification — valid / wrong type / UNKNOWN / low-confidence', () => {
  it('classifies a valid P&L from filename as pnl with derived confidence', () => {
    const classified = classifyDocumentName(SYN.validPnl.fileName);
    assert.equal(classified.documentType, 'pnl');
    assert.ok(classified.confidence >= CLASSIFICATION_LOW_CONFIDENCE);
    const { report, completenessVsRequest, checklist: patched } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.validPnl)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    const hit = report.documents[0];
    assert.equal(hit.classification.documentType, 'pnl');
    assert.equal(hit.classification.verification, 'DERIVED');
    assert.equal(hit.extraction.ocr, OCR_STUBBED);
    assert.equal(hit.extraction.verification, 'MISSING');
    assert.equal(vsStatus(completenessVsRequest, SYN.validPnl.id), 'SATISFIED');
    assert.ok(report.completeness.percent < 100);
    assert.ok(patched.every((i) => i.status !== 'ACCEPTED'));
    assert.ok(patched.every((i) => i.verification !== 'VERIFIED'));
  });

  it('flags a P&L associated to the bank-statement request as NOT_MATCHED', () => {
    const { report, completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.wrongTypePnlAsBank)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    assert.equal(report.documents[0].classification.documentType, 'pnl');
    assert.equal(report.documents[0].collection.checklistItemId, 'chk-bank-3mo');
    assert.equal(report.documents[0].collection.suggestedItemKey, 'fin-pl-ytd');
    assert.equal(vsStatus(completenessVsRequest, SYN.wrongTypePnlAsBank.id), 'NOT_MATCHED');
  });

  it('maps unmatched filenames to UNKNOWN classification and UNKNOWN completeness', () => {
    const classified = classifyDocumentName(SYN.unknownScan.fileName);
    assert.equal(classified.documentType, 'other');
    assert.ok(classified.confidence < CLASSIFICATION_LOW_CONFIDENCE);
    const { report, completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.unknownScan)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    assert.equal(report.documents[0].classification.documentType, 'UNKNOWN');
    assert.equal(report.documents[0].classification.verification, 'UNVERIFIED');
    assert.equal(vsStatus(completenessVsRequest, SYN.unknownScan.id), 'UNKNOWN');
  });

  it('treats low-confidence scans as UNKNOWN, not a guessed type', () => {
    const classified = classifyDocumentName(SYN.lowConfidence.fileName);
    assert.ok(classified.confidence < CLASSIFICATION_LOW_CONFIDENCE);
    const { report, completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.lowConfidence)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    assert.equal(report.documents[0].classification.documentType, 'UNKNOWN');
    assert.ok(report.documents[0].classification.confidence < CLASSIFICATION_LOW_CONFIDENCE);
    assert.equal(vsStatus(completenessVsRequest, SYN.lowConfidence.id), 'UNKNOWN');
    assert.equal(report.documents[0].extraction.facts.length, 0);
  });
});

describe('document intelligence — wrong entity / wrong period / stale / duplicate', () => {
  it('flags a foreign SYN* entity as WRONG_ENTITY', () => {
    const { report, completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.wrongEntity)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    assert.equal(report.documents[0].entity.matchesOpportunity, false);
    assert.ok(report.conflicts.some((c) => c.field === 'entityName' && c.verification === 'CONFLICTING'));
    assert.equal(vsStatus(completenessVsRequest, SYN.wrongEntity.id), 'WRONG_ENTITY');
  });

  it('flags a 2024 YTD P&L against a 2026 request as WRONG_PERIOD', () => {
    const checklist = generateChecklist({ transactionType: 'working_capital_loc' });
    const pl = checklist.find((i) => i.itemKey === 'fin-pl-ytd');
    assert.ok(pl);
    pl.currentThrough = '2026-07-31';
    const { report, completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist,
      documents: [doc(SYN.wrongPeriodPnl)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    assert.equal(report.documents[0].classification.documentType, 'pnl');
    assert.equal(report.documents[0].period.periodEnd, '2024-06-30');
    assert.equal(vsStatus(completenessVsRequest, SYN.wrongPeriodPnl.id), 'WRONG_PERIOD');
  });

  it('marks a January 2026 bank statement stale as of August 2026 (OUTDATED)', () => {
    const { report, completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.staleBank)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    assert.equal(report.documents[0].freshness.stale, true);
    assert.equal(report.documents[0].freshness.verification, 'DERIVED');
    assert.equal(vsStatus(completenessVsRequest, SYN.staleBank.id), 'OUTDATED');
    const bank = report.documents[0];
    assert.notEqual(evaluateCompletenessVsRequest({ result: bank }), 'SATISFIED');
  });

  it('flags duplicates instead of dropping them (LIKELY_SATISFIED_NEEDS_REVIEW)', () => {
    const { report, completenessVsRequest, checklist: patched } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.duplicateOriginal), doc(SYN.duplicateCopy)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    const copy = report.documents.find((d) => d.documentId === SYN.duplicateCopy.id);
    assert.equal(copy?.collection.duplicateOf, SYN.duplicateOriginal.id);
    assert.equal(vsStatus(completenessVsRequest, SYN.duplicateCopy.id), 'LIKELY_SATISFIED_NEEDS_REVIEW');
    assert.ok(patched.every((i) => i.status !== 'ACCEPTED'));
  });
});

describe('document intelligence — SATISFIED vs OUTDATED vs CONFLICTING completeness', () => {
  it('SATISFIED does not auto-accept, verify, or invent revenue', () => {
    const { report, completenessVsRequest, checklist: patched } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.validFormation)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    assert.equal(vsStatus(completenessVsRequest, SYN.validFormation.id), 'SATISFIED');
    assert.equal(report.documents[0].extraction.facts.length, 0);
    assert.equal(report.completeness.verification, 'DERIVED');
    assert.ok(report.completeness.percent < 100);
    assert.equal(report.usedUnverifiedFacts, true);
    assert.ok(patched.every((i) => i.status !== 'ACCEPTED'));
    assert.ok(patched.every((i) => i.verification !== 'VERIFIED'));
  });

  it('keeps AI revenue UNVERIFIED and grades the request CONFLICTING when it disagrees with Atlas', () => {
    const { report, completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.conflictPnlLeft), doc(SYN.conflictPnlRight)],
      incomingFactsByDocumentId: {
        [SYN.conflictPnlLeft.id]: [aiFact('revenue', 1_000_000)],
        [SYN.conflictPnlRight.id]: [aiFact('revenue', 2_000_000)],
      },
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    assert.equal(vsStatus(completenessVsRequest, SYN.conflictPnlLeft.id), 'CONFLICTING');
    assert.equal(vsStatus(completenessVsRequest, SYN.conflictPnlRight.id), 'CONFLICTING');
    for (const d of report.documents) {
      assert.equal(d.extraction.facts[0].verification, 'CONFLICTING');
      assert.notEqual(d.extraction.facts[0].value, 3_500_000);
    }
    assert.ok(report.conflicts.some((c) => c.field === 'revenue' && c.verification === 'CONFLICTING'));
    assert.equal(report.usedUnverifiedFacts, true);
  });

  it('grades aligned but unverified AI extraction as LIKELY_SATISFIED_NEEDS_REVIEW, not SATISFIED', () => {
    const { report, completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.validPnl)],
      incomingFactsByDocumentId: {
        [SYN.validPnl.id]: [aiFact('revenue', 3_500_000)],
      },
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    assert.equal(report.documents[0].extraction.facts[0].verification, 'UNVERIFIED');
    assert.equal(vsStatus(completenessVsRequest, SYN.validPnl.id), 'LIKELY_SATISFIED_NEEDS_REVIEW');
    assert.notEqual(vsStatus(completenessVsRequest, SYN.validPnl.id), 'SATISFIED');
  });

  it('grades a single current bank month as INCOMPLETE against the 3-month request', () => {
    const { completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.validBankJuly)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    assert.equal(vsStatus(completenessVsRequest, SYN.validBankJuly.id), 'INCOMPLETE');
  });
});

describe('document intelligence — prompt-injection filename is content, not authority', () => {
  it('classifies "ignore instructions" as UNKNOWN and does not invent revenue', () => {
    assert.equal(isPromptInjectionFileName(SYN.promptInjection.fileName), true);
    const { report, completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.promptInjection), doc(SYN.promptInjectionRevenue)],
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    for (const d of report.documents) {
      assert.equal(d.classification.documentType, 'UNKNOWN');
      assert.equal(d.classification.verification, 'UNVERIFIED');
      assert.equal(d.extraction.facts.length, 0);
      assert.equal(vsStatus(completenessVsRequest, d.documentId), 'UNKNOWN');
      assert.equal(
        d.extraction.facts.some((f) => f.field === 'revenue'),
        false,
      );
    }
    assert.equal(report.clientRequestSendAttempted, false);
  });

  it('still reads type tokens as content, but never SATISFIES from an injection filename', () => {
    const classified = classifyDocumentName(SYN.promptInjectionWithType.fileName);
    assert.equal(classified.documentType, 'bank_statement');
    const { report, completenessVsRequest } = runDocumentIntelligence({
      opportunity: opp(),
      checklist: generateChecklist({ transactionType: 'working_capital_loc' }),
      documents: [doc(SYN.promptInjectionWithType)],
      incomingFactsByDocumentId: {
        [SYN.promptInjectionWithType.id]: [aiFact('revenue', 99_000_000)],
      },
      includeUnderwriting: false,
      createdBy: 'qa',
      asOf: SYNTHETIC_AS_OF,
    });
    const hit = report.documents[0];
    assert.equal(hit.classification.documentType, 'bank_statement');
    assert.equal(vsStatus(completenessVsRequest, SYN.promptInjectionWithType.id), 'UNKNOWN');
    assert.notEqual(hit.extraction.facts[0]?.verification, 'VERIFIED');
    assert.notEqual(vsStatus(completenessVsRequest, SYN.promptInjectionWithType.id), 'SATISFIED');
    assert.equal(report.clientRequestSendAttempted, false);
  });
});
