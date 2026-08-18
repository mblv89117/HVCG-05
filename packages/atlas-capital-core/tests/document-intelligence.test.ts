import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyIntelligenceToChecklist,
  classifyDocumentName,
  detectEntityFromFileName,
  detectFreshness,
  detectPeriodFromFileName,
  generateChecklist,
  OCR_STUBBED,
  runDocumentIntelligence,
  verifiedValue,
  type CapitalDocument,
  type CapitalOpportunity,
  type ExtractedFact,
} from '../src/index.ts';

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
