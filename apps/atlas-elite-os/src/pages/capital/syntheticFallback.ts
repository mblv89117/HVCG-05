/**
 * Labeled SYNTHETIC demonstration data for Capital Command Center.
 * Not a live client. Not production facts. Never present as live financials.
 */

import type {
  CapitalKpis,
  CapitalOpportunity,
  CapitalOpportunityDetail,
  ChecklistItem,
  ClosingCondition,
  CreateOpportunityInput,
  FeeRecord,
  FinancingStrategy,
  LenderMatch,
  LenderSubmission,
  MissingDocumentRequest,
  QueueItem,
  StrategyDecision,
  TermSheetOffer,
  UnderwritingSummary,
  WorkQueue,
} from './capitalApi';

const FINANCING_DISCLAIMER =
  'HVCG is not a lender. Financing outcomes are determined by third-party lenders and capital providers. HVCG does not guarantee approval, terms, or funding.';
const AI_DISCLAIMER =
  'AI drafts are unverified until a human confirms them against source documents. They are not verified financial data.';

export const SYNTHETIC_BANNER =
  'Synthetic demonstration data — not a live client. Not production facts.';

const NOW = '2026-08-17T18:00:00.000Z';

export interface SyntheticCommandCenter {
  kpis: CapitalKpis;
  items: QueueItem[];
  generatedAt: string;
}

interface Store {
  details: Map<string, CapitalOpportunityDetail>;
}

let store: Store | null = null;

function isoDaysAgo(days: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function isoDaysFromNow(days: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function opportunity(partial: Partial<CapitalOpportunity> & Pick<CapitalOpportunity, 'id' | 'title' | 'stage'>): CapitalOpportunity {
  return {
    clientId: `client-${partial.id}`,
    clientCode: 'SYN01',
    companyName: 'SYNTHETIC demonstration company',
    transactionType: 'working_capital_loc',
    need: { requestedAmount: null, purpose: 'working capital' },
    business: {
      industry: 'manufacturing',
      annualRevenue: { value: null, verification: 'MISSING', notes: 'Not a live client financial' },
    },
    capitalProfile: {},
    stageEnteredAt: isoDaysAgo(5),
    ownerEmail: 'manny@hvcg.example',
    submissionReadiness: false,
    closingReadiness: false,
    lastMeaningfulActivityAt: isoDaysAgo(1),
    clientApproval: 'NOT_REQUIRED',
    mannyStrategyApproval: 'NOT_REQUIRED',
    mannyShortlistApproval: 'NOT_REQUIRED',
    createdAt: isoDaysAgo(12),
    updatedAt: isoDaysAgo(1),
    ...partial,
    need: { requestedAmount: null, purpose: 'working capital', ...partial.need },
  };
}

function checklist(id: string, rows: Array<Partial<ChecklistItem> & Pick<ChecklistItem, 'itemKey' | 'name' | 'status'>>): ChecklistItem[] {
  return rows.map((row, idx) => ({
    id: `${id}-ck-${idx + 1}`,
    category: row.category || 'Financials',
    requiredness: row.requiredness || 'REQUIRED',
    responsibleParty: row.responsibleParty || 'client',
    verification: row.verification || (row.status === 'ACCEPTED' ? 'VERIFIED' : 'MISSING'),
    ...row,
  }));
}

function queueItem(detail: CapitalOpportunityDetail, queue: WorkQueue, agingDays: number, aging: QueueItem['aging']): QueueItem {
  const o = detail.opportunity;
  return {
    opportunityId: o.id,
    title: o.title,
    clientCode: o.clientCode,
    companyName: o.companyName,
    stage: o.stage,
    queue,
    nextAction: o.nextAction,
    nextActionOwner: o.nextActionOwner,
    due: o.nextActionDue,
    agingDays,
    aging,
    blocker: o.blockers,
    requestedAmount: o.need.requestedAmount,
    transactionType: o.transactionType,
  };
}

function strategyFor(o: CapitalOpportunity, matches: LenderMatch[], approval: FinancingStrategy['mannyApproval']): FinancingStrategy {
  return {
    id: `strat-${o.id}`,
    capitalOpportunityId: o.id,
    clientCode: o.clientCode,
    needSummary: `${o.companyName} — ${o.need.requestedAmount != null ? 'requested amount recorded in synthetic fixture only' : 'amount TBD'} · ${o.need.purpose || o.transactionType}`,
    paths: [
      { rank: 1, name: 'Existing lender expansion', rationale: 'Check current relationships before new outreach.' },
      { rank: 2, name: 'Primary product path matching request type', rationale: `Transaction type ${o.transactionType}. Decision support only.` },
      { rank: 3, name: 'Fallback / specialty', rationale: 'Use only if primary path is ineligible or criteria are stale.' },
    ],
    strengths: ['Demonstration strengths only — not verified client facts'],
    risks: ['Criteria incomplete until source documents are confirmed'],
    missingInformation: ['Verified financial statements', 'Confirmed use of funds'],
    lenderCandidates: matches.filter((m) => m.band === 'BEST_FIT' || m.band === 'POSSIBLE'),
    rationale: 'Decision support only. Manny approval required before this is an HVCG recommendation.',
    mannyApproval: approval,
    createdAt: isoDaysAgo(2),
    disclaimer: `${AI_DISCLAIMER} ${FINANCING_DISCLAIMER}`,
  };
}

function underwriting(id: string): UnderwritingSummary {
  return {
    id: `uw-${id}`,
    sections: {
      request: 'SYNTHETIC underwriting narrative — not extracted from a live client file.',
      cashFlow: 'Cash-flow observations are withheld until a verified source document is confirmed.',
      leverage: 'Leverage not calculated — inputs are missing or unverified.',
    },
    missingInformation: ['Year-to-date P&L (accepted)', 'Three months of bank statements'],
    expectedQuestions: ['Use of funds detail', 'Existing lender relationship status'],
    potentialStructures: ['Working capital line', 'Term loan fallback — not a recommendation'],
    recommendedNextSteps: ['Send consolidated missing-document request', 'Do not treat this draft as verified underwriting'],
    usedUnverifiedFacts: true,
    createdAt: isoDaysAgo(2),
    createdBy: 'atlas-ai-draft',
    disclaimer: `${AI_DISCLAIMER} ${FINANCING_DISCLAIMER}`,
  };
}

function matchesFor(nameSuffix: string): LenderMatch[] {
  return [
    {
      lenderId: `ln-syn-${nameSuffix}-1`,
      lenderName: 'SYNTHETIC Regional Bank (demo lender record)',
      productId: `pr-syn-${nameSuffix}-1`,
      productName: 'Working capital LOC (demo product)',
      band: 'POSSIBLE',
      reasons: ['Amount band overlaps demo product range', 'Industry not on a restricted list in the demo sheet'],
      missingCriteria: ['Verified annual revenue'],
      stale: false,
    },
    {
      lenderId: `ln-syn-${nameSuffix}-2`,
      lenderName: 'SYNTHETIC Specialty Finance (demo lender record)',
      productId: `pr-syn-${nameSuffix}-2`,
      productName: 'ABL / AR (demo product)',
      band: 'UNKNOWN',
      reasons: ['Criteria incomplete — cannot score BEST_FIT'],
      missingCriteria: ['AR eligibility confirmation', 'Product last-verified date'],
      stale: true,
    },
  ];
}

function closingDefaults(id: string): ClosingCondition[] {
  return [
    { id: `${id}-cl-1`, name: 'Final underwriting clearance', owner: 'hvcg', status: 'open' },
    { id: `${id}-cl-2`, name: 'Entity documentation current', owner: 'client', status: 'in_progress' },
    { id: `${id}-cl-3`, name: 'Insurance binders', owner: 'client', status: 'open' },
    { id: `${id}-cl-4`, name: 'Funding instructions', owner: 'lender', status: 'open' },
  ];
}

function demoFee(id: string): FeeRecord {
  return {
    id: `${id}-fee-1`,
    feeType: 'advisory_success',
    feeFormula: 'Per executed HVCG agreement — not calculated here',
    earnedEvent: 'Funding by a third-party lender (not an HVCG lending event)',
    approvalStatus: 'PENDING',
    invoiceStatus: 'not_invoiced',
    paymentStatus: 'unpaid',
    legalComplianceReviewRequired: true,
    notes: 'LEGAL / COMPLIANCE REVIEW REQUIRED. Success fee ≠ funded capital. HVCG is not a lender.',
  };
}

function missingFrom(items: ChecklistItem[], clientCode: string): MissingDocumentRequest | null {
  const open = items.filter(
    (i) =>
      i.requiredness !== 'OPTIONAL' &&
      i.status !== 'ACCEPTED' &&
      i.status !== 'NOT_APPLICABLE',
  );
  if (!open.length) return null;
  return {
    subject: `${clientCode} — outstanding capital documents (${open.length}) [SYNTHETIC]`,
    items: open.map((i) => ({ name: i.name, category: i.category, status: i.status, deficiency: i.deficiency })),
    body: [
      'Please provide the following items in one package (do not send piecemeal unless an item is delayed):',
      ...open.map((i, idx) => `${idx + 1}. ${i.name}`),
      '',
      'Upload to the secure HVCG client repository. Original files only — do not edit source PDFs.',
      '',
      SYNTHETIC_BANNER,
    ].join('\n'),
  };
}

function seed(): Store {
  const details = new Map<string, CapitalOpportunityDetail>();

  const attn = opportunity({
    id: 'cap-syn-attn',
    title: 'SYNTHETIC Apex Manufacturing — working capital need',
    clientCode: 'SYN01',
    companyName: 'SYNTHETIC Apex Manufacturing',
    transactionType: 'working_capital_loc',
    stage: 'NeedIdentified',
    stageEnteredAt: isoDaysAgo(9),
    need: { requestedAmount: 750_000, purpose: 'working capital', useOfFunds: 'payroll and inventory (demo only)', urgency: 'high' },
    nextAction: 'Complete initial qualification with Manny',
    nextActionOwner: 'Manny',
    nextActionDue: isoDaysAgo(2),
    blockers: 'Need statement incomplete — do not size a facility',
    notes: SYNTHETIC_BANNER,
  });
  const attnChecklist = checklist(attn.id, [
    { itemKey: 'fin-pl-ytd', name: 'Year-to-date profit & loss', status: 'MISSING', category: 'Current Financials' },
    { itemKey: 'bank-3mo', name: 'Business bank statements (3 months)', status: 'MISSING', category: 'Bank Statements' },
  ]);
  details.set(attn.id, {
    opportunity: attn,
    checklist: attnChecklist,
    documents: [],
    underwriting: null,
    strategy: null,
    matches: [],
    application: null,
    submissions: [],
    offers: [],
    closing: [],
    fees: [],
    missingRequest: missingFrom(attnChecklist, attn.clientCode),
  });

  const client = opportunity({
    id: 'cap-syn-client',
    title: 'SYNTHETIC Harbor Foods — SBA package documents',
    clientCode: 'SYN02',
    companyName: 'SYNTHETIC Harbor Foods',
    transactionType: 'sba',
    stage: 'DocumentsRequested',
    stageEnteredAt: isoDaysAgo(16),
    need: { requestedAmount: 1_200_000, purpose: 'SBA 7(a) working capital (demo path only)' },
    nextAction: 'Client to upload remaining required documents',
    nextActionOwner: 'Client',
    nextActionDue: isoDaysAgo(4),
    blockers: 'Required documents outstanding',
    mannyStrategyApproval: 'NOT_REQUIRED',
  });
  const clientChecklist = checklist(client.id, [
    { itemKey: 'org-formation', name: 'Formation / organizational documents', status: 'ACCEPTED', category: 'Corporate', verification: 'VERIFIED', responsibleParty: 'client' },
    { itemKey: 'fin-pl-ytd', name: 'Year-to-date profit & loss', status: 'REQUESTED', category: 'Current Financials', deficiency: 'Not received' },
    { itemKey: 'fin-tax-3yr', name: 'Business tax returns (3 years)', status: 'INCOMPLETE', category: 'Tax Returns', deficiency: 'Year 3 missing' },
    { itemKey: 'sba-1919', name: 'SBA Form 1919 (demo checklist item)', status: 'MISSING', category: 'SBA' },
  ]);
  details.set(client.id, {
    opportunity: client,
    checklist: clientChecklist,
    documents: [
      {
        id: `${client.id}-doc-1`,
        fileName: 'SYNTHETIC-Harbor-Articles.pdf',
        documentType: 'formation',
        source: 'client-upload-demo',
        associatedAt: isoDaysAgo(10),
        associatedBy: 'demo',
        verification: 'VERIFIED',
      },
    ],
    underwriting: null,
    strategy: null,
    matches: [],
    application: null,
    submissions: [],
    offers: [],
    closing: [],
    fees: [],
    missingRequest: missingFrom(clientChecklist, client.clientCode),
  });

  const lender = opportunity({
    id: 'cap-syn-lender',
    title: 'SYNTHETIC Ridge Equipment — submitted to demo lender',
    clientCode: 'SYN03',
    companyName: 'SYNTHETIC Ridge Equipment',
    transactionType: 'equipment',
    stage: 'Submitted',
    stageEnteredAt: isoDaysAgo(8),
    need: { requestedAmount: 420_000, purpose: 'equipment', useOfFunds: 'CNC replacement (demo)' },
    nextAction: 'Follow up for lender acknowledgment',
    nextActionOwner: 'HVCG',
    nextActionDue: isoDaysFromNow(2),
    mannyStrategyApproval: 'APPROVED',
    mannyShortlistApproval: 'APPROVED',
    submissionReadiness: true,
  });
  const lenderMatches = matchesFor('ridge');
  const submissions: LenderSubmission[] = [
    {
      id: `${lender.id}-sub-1`,
      lenderId: lenderMatches[0].lenderId,
      lenderName: lenderMatches[0].lenderName,
      method: 'package',
      status: 'submitted',
      submittedAt: isoDaysAgo(8),
      submittedBy: 'demo-operator',
      confirmationNumber: 'SYN-SUB-00421',
      notes: 'Demo submission record. HVCG did not underwrite or fund this request.',
    },
  ];
  details.set(lender.id, {
    opportunity: lender,
    checklist: checklist(lender.id, [
      { itemKey: 'eq-invoice', name: 'Equipment invoice / quote', status: 'ACCEPTED', category: 'Equipment', verification: 'VERIFIED' },
      { itemKey: 'fin-pl-ytd', name: 'Year-to-date profit & loss', status: 'ACCEPTED', category: 'Current Financials', verification: 'VERIFIED' },
    ]),
    documents: [
      {
        id: `${lender.id}-doc-1`,
        fileName: 'SYNTHETIC-Ridge-Equipment-Quote.pdf',
        documentType: 'equipment_quote',
        source: 'client-upload-demo',
        associatedAt: isoDaysAgo(14),
        associatedBy: 'demo',
        verification: 'VERIFIED',
      },
    ],
    underwriting: underwriting(lender.id),
    strategy: strategyFor(lender, lenderMatches, 'APPROVED'),
    matches: lenderMatches,
    application: {
      id: `app-${lender.id}`,
      lenderId: lenderMatches[0].lenderId,
      productId: lenderMatches[0].productId,
      populatedFields: {
        requestedAmount: { value: 420_000, verification: 'UNVERIFIED' },
        clientCode: { value: 'SYN03', verification: 'VERIFIED' },
      },
      missingFields: [],
      attachedDocumentIds: [`${lender.id}-doc-1`],
      status: 'PREPARED',
      createdAt: isoDaysAgo(9),
    },
    submissions,
    offers: [],
    closing: [],
    fees: [demoFee(lender.id)],
    missingRequest: null,
  });

  const mannyStrat = opportunity({
    id: 'cap-syn-manny-strategy',
    title: 'SYNTHETIC Cedar Logistics — strategy pending Manny',
    clientCode: 'SYN04',
    companyName: 'SYNTHETIC Cedar Logistics',
    transactionType: 'conventional_bank_loan',
    stage: 'AwaitingMannyStrategyApproval',
    stageEnteredAt: isoDaysAgo(3),
    need: { requestedAmount: 2_000_000, purpose: 'refinance + working capital (demo)' },
    nextAction: 'Manny: approve, revise, or reject financing strategy',
    nextActionOwner: 'Manny',
    nextActionDue: isoDaysFromNow(1),
    mannyStrategyApproval: 'PENDING',
    risk: 'AI draft uses unverified facts — do not send to a lender',
  });
  const mannyStratMatches = matchesFor('cedar');
  details.set(mannyStrat.id, {
    opportunity: mannyStrat,
    checklist: checklist(mannyStrat.id, [
      { itemKey: 'fin-pl-ytd', name: 'Year-to-date profit & loss', status: 'ACCEPTED', category: 'Current Financials', verification: 'UNVERIFIED' },
      { itemKey: 'fin-bs-ytd', name: 'Year-to-date balance sheet', status: 'NEEDS_REVIEW', category: 'Current Financials' },
    ]),
    documents: [],
    underwriting: underwriting(mannyStrat.id),
    strategy: strategyFor(mannyStrat, mannyStratMatches, 'PENDING'),
    matches: mannyStratMatches,
    application: null,
    submissions: [],
    offers: [],
    closing: [],
    fees: [],
    missingRequest: null,
  });

  const mannyShort = opportunity({
    id: 'cap-syn-manny-shortlist',
    title: 'SYNTHETIC Northline Medical — shortlist pending Manny',
    clientCode: 'SYN05',
    companyName: 'SYNTHETIC Northline Medical',
    transactionType: 'sba_working_capital',
    stage: 'AwaitingMannyShortlistApproval',
    stageEnteredAt: isoDaysAgo(4),
    need: { requestedAmount: 900_000, purpose: 'SBA working capital (demo path only)' },
    nextAction: 'Manny: approve, revise, or reject lender shortlist',
    nextActionOwner: 'Manny',
    nextActionDue: isoDaysFromNow(0),
    mannyStrategyApproval: 'APPROVED',
    mannyShortlistApproval: 'PENDING',
  });
  const mannyShortMatches: LenderMatch[] = [
    {
      lenderId: 'ln-syn-north-1',
      lenderName: 'SYNTHETIC Preferred SBA Partner (demo)',
      productId: 'pr-syn-north-1',
      productName: 'SBA 7(a) WC (demo product)',
      band: 'POSSIBLE',
      reasons: ['Product category matches request type in the demo sheet'],
      missingCriteria: ['DSCR minimum not recorded on product'],
      stale: false,
    },
    {
      lenderId: 'ln-syn-north-2',
      lenderName: 'SYNTHETIC Credit Union (demo)',
      productId: 'pr-syn-north-2',
      productName: 'Member business LOC (demo product)',
      band: 'LOW_FIT',
      reasons: ['Geography on demo product is incomplete'],
      missingCriteria: ['Service-area confirmation'],
      stale: true,
    },
  ];
  details.set(mannyShort.id, {
    opportunity: mannyShort,
    checklist: checklist(mannyShort.id, [
      { itemKey: 'fin-pl-ytd', name: 'Year-to-date profit & loss', status: 'ACCEPTED', category: 'Current Financials', verification: 'UNVERIFIED' },
    ]),
    documents: [],
    underwriting: underwriting(mannyShort.id),
    strategy: { ...strategyFor(mannyShort, mannyShortMatches, 'APPROVED'), approvedBy: 'manny@hvcg.example', approvedAt: isoDaysAgo(6) },
    matches: mannyShortMatches,
    application: null,
    submissions: [],
    offers: [],
    closing: [],
    fees: [],
    missingRequest: null,
  });

  const offersOpp = opportunity({
    id: 'cap-syn-offers',
    title: 'SYNTHETIC Westbrook Packaging — term sheets in',
    clientCode: 'SYN06',
    companyName: 'SYNTHETIC Westbrook Packaging',
    transactionType: 'asset_based_lending',
    stage: 'TermSheetOfferReceived',
    stageEnteredAt: isoDaysAgo(2),
    need: { requestedAmount: 1_500_000, purpose: 'ABL revolver (demo)' },
    nextAction: 'Compare offers with client — no recommendation until Manny confirms',
    nextActionOwner: 'Manny',
    nextActionDue: isoDaysFromNow(3),
    mannyStrategyApproval: 'APPROVED',
    mannyShortlistApproval: 'APPROVED',
  });
  const offers: TermSheetOffer[] = [
    {
      id: `${offersOpp.id}-off-1`,
      lenderId: 'ln-syn-west-1',
      lenderName: 'SYNTHETIC ABL Shop A (demo)',
      product: 'AR revolver (demo)',
      amount: 1_400_000,
      interestRate: 9.25,
      termMonths: 24,
      estimatedPayment: undefined,
      origination: 1.0,
      assumptions: ['Demo rate is not effective cost', 'Advance rate not confirmed'],
      createdAt: isoDaysAgo(2),
      conditions: 'Demo conditions only — not a live offer',
    },
    {
      id: `${offersOpp.id}-off-2`,
      lenderId: 'ln-syn-west-2',
      lenderName: 'SYNTHETIC ABL Shop B (demo)',
      product: 'AR + inventory (demo)',
      amount: 1_250_000,
      interestRate: 8.75,
      termMonths: 36,
      origination: 1.5,
      assumptions: ['Inventory eligibility unknown', 'Not comparable without fees and covenants'],
      createdAt: isoDaysAgo(1),
    },
  ];
  details.set(offersOpp.id, {
    opportunity: offersOpp,
    checklist: checklist(offersOpp.id, [
      { itemKey: 'ar-aging', name: 'AR aging', status: 'ACCEPTED', category: 'Collateral', verification: 'UNVERIFIED' },
    ]),
    documents: [],
    underwriting: underwriting(offersOpp.id),
    strategy: strategyFor(offersOpp, matchesFor('west'), 'APPROVED'),
    matches: matchesFor('west'),
    application: null,
    submissions: [
      {
        id: `${offersOpp.id}-sub-1`,
        lenderId: 'ln-syn-west-1',
        lenderName: 'SYNTHETIC ABL Shop A (demo)',
        method: 'email',
        status: 'offer',
        submittedAt: isoDaysAgo(12),
        notes: 'Demo tracking row',
      },
    ],
    offers,
    closing: [],
    fees: [demoFee(offersOpp.id)],
    missingRequest: null,
  });

  const closing = opportunity({
    id: 'cap-syn-closing',
    title: 'SYNTHETIC Pinecrest Services — closing conditions',
    clientCode: 'SYN07',
    companyName: 'SYNTHETIC Pinecrest Services',
    transactionType: 'commercial_real_estate',
    stage: 'Closing',
    stageEnteredAt: isoDaysAgo(6),
    need: { requestedAmount: 3_400_000, purpose: 'owner-occupied CRE (demo)' },
    nextAction: 'Clear open closing conditions',
    nextActionOwner: 'HVCG + client',
    nextActionDue: isoDaysFromNow(5),
    closingReadiness: false,
    mannyStrategyApproval: 'APPROVED',
    mannyShortlistApproval: 'APPROVED',
    blockers: 'Insurance binder outstanding',
  });
  details.set(closing.id, {
    opportunity: closing,
    checklist: checklist(closing.id, [
      { itemKey: 'org-formation', name: 'Formation / organizational documents', status: 'ACCEPTED', category: 'Corporate', verification: 'VERIFIED' },
    ]),
    documents: [],
    underwriting: underwriting(closing.id),
    strategy: strategyFor(closing, matchesFor('pine'), 'APPROVED'),
    matches: matchesFor('pine'),
    application: null,
    submissions: [],
    offers: [
      {
        id: `${closing.id}-off-1`,
        lenderId: 'ln-syn-pine-1',
        lenderName: 'SYNTHETIC CRE Bank (demo)',
        product: 'Owner-occupied CRE (demo)',
        amount: 3_200_000,
        assumptions: ['Demo offer — not a live commitment'],
        createdAt: isoDaysAgo(10),
      },
    ],
    closing: closingDefaults(closing.id).map((c, i) =>
      i === 1 ? { ...c, status: 'in_progress', blocker: 'Waiting on client insurance' } : c,
    ),
    fees: [demoFee(closing.id)],
    missingRequest: null,
  });

  const funded = opportunity({
    id: 'cap-syn-funded',
    title: 'SYNTHETIC Oak Street Dental — recently funded (demo)',
    clientCode: 'SYN08',
    companyName: 'SYNTHETIC Oak Street Dental',
    transactionType: 'sba_express',
    stage: 'Funded',
    stageEnteredAt: isoDaysAgo(11),
    need: { requestedAmount: 350_000, purpose: 'practice working capital (demo)' },
    nextAction: 'Confirm HVCG fee against executed agreement',
    nextActionOwner: 'Manny',
    nextActionDue: isoDaysFromNow(7),
    closingReadiness: true,
    submissionReadiness: true,
    mannyStrategyApproval: 'APPROVED',
    mannyShortlistApproval: 'APPROVED',
    notes: 'Funded by a third-party lender in this demonstration. HVCG did not lend.',
  });
  details.set(funded.id, {
    opportunity: funded,
    checklist: checklist(funded.id, [
      { itemKey: 'fin-pl-ytd', name: 'Year-to-date profit & loss', status: 'ACCEPTED', category: 'Current Financials', verification: 'UNVERIFIED' },
    ]),
    documents: [],
    underwriting: underwriting(funded.id),
    strategy: strategyFor(funded, matchesFor('oak'), 'APPROVED'),
    matches: matchesFor('oak'),
    application: null,
    submissions: [
      {
        id: `${funded.id}-sub-1`,
        lenderId: 'ln-syn-oak-1',
        lenderName: 'SYNTHETIC SBA Express Bank (demo)',
        method: 'package',
        status: 'offer',
        submittedAt: isoDaysAgo(40),
        notes: 'Demo funded tracking',
      },
    ],
    offers: [],
    closing: closingDefaults(funded.id).map((c) => ({ ...c, status: 'satisfied' })),
    fees: [
      {
        ...demoFee(funded.id),
        approvalStatus: 'PENDING',
        invoiceStatus: 'not_invoiced',
        paymentStatus: 'unpaid',
        notes: 'LEGAL / COMPLIANCE REVIEW REQUIRED. Earned event is third-party funding — not HVCG collected cash.',
      },
    ],
    missingRequest: null,
  });

  return { details };
}

function getStore(): Store {
  if (!store) store = seed();
  return store;
}

function rebuildKpis(items: QueueItem[], details: Map<string, CapitalOpportunityDetail>): CapitalKpis {
  const now = Date.parse(NOW);
  const live = [...details.values()]
    .map((d) => d.opportunity)
    .filter((o) => o.stage !== 'Declined' && o.stage !== 'Withdrawn' && o.stage !== 'ClosedArchived' && o.stage !== 'Funded');
  const all = [...details.values()];
  return {
    activeOpportunities: live.length,
    totalRequested: live.reduce((s, o) => s + (o.need.requestedAmount || 0), 0),
    documentsBlocked: all.reduce(
      (s, d) =>
        s +
        d.checklist.filter(
          (i) => i.requiredness !== 'OPTIONAL' && i.status !== 'ACCEPTED' && i.status !== 'NOT_APPLICABLE',
        ).length,
      0,
    ),
    clientActionsOverdue: items.filter((i) => i.queue === 'AWAITING_CLIENT' && i.due && Date.parse(i.due) < now).length,
    lenderResponsesDue: items.filter((i) => i.queue === 'AWAITING_LENDER').length,
    mannyApprovalsRequired: items.filter((i) => i.queue === 'AWAITING_MANNY').length,
    offersReceived: all.reduce((s, d) => s + d.offers.length, 0),
    transactionsClosing: items.filter((i) => i.queue === 'CLOSING').length,
    recentlyFunded: items.filter((i) => i.queue === 'FUNDED').length,
    feeReceivableOpen: all.reduce(
      (s, d) => s + d.fees.filter((f) => f.paymentStatus !== 'paid' && f.invoiceStatus !== 'void').length,
      0,
    ),
    readyForSubmission: items.filter((i) => i.queue === 'READY_FOR_SUBMISSION').length,
    rfiOverdue: items.filter((i) => i.queue === 'RFI_OVERDUE').length,
    complianceReviewRequired: items.filter((i) => i.queue === 'COMPLIANCE_REVIEW').length,
  };
}

function itemsFromStore(s: Store): QueueItem[] {
  const now = new Date(NOW);
  return [...s.details.values()].map((d) => {
    const meta = inferQueue(d);
    const entered = Date.parse(d.opportunity.stageEnteredAt);
    const agingDays = Number.isFinite(entered)
      ? Math.max(0, Math.floor((now.getTime() - entered) / 86_400_000))
      : meta.agingDays;
    const dueMs = d.opportunity.nextActionDue ? Date.parse(d.opportunity.nextActionDue) : NaN;
    let aging: QueueItem['aging'] = 'fresh';
    if (Number.isFinite(dueMs) && dueMs < now.getTime()) aging = agingDays >= 7 ? 'critical' : 'overdue';
    else if (agingDays >= 14) aging = 'overdue';
    else if (agingDays >= 7) aging = 'watch';
    return queueItem(d, meta.queue, agingDays, aging);
  });
}

function inferQueue(d: CapitalOpportunityDetail): { queue: WorkQueue; agingDays: number; aging: QueueItem['aging'] } {
  const stage = d.opportunity.stage;
  if (stage === 'Funded' || stage === 'ClosedArchived') return { queue: 'FUNDED', agingDays: 0, aging: 'fresh' };
  if (stage === 'Closing') return { queue: 'CLOSING', agingDays: 0, aging: 'fresh' };
  if (stage === 'TermSheetOfferReceived' || stage === 'OfferComparison' || stage === 'ClientDecision') {
    return { queue: 'OFFERS_RECEIVED', agingDays: 0, aging: 'fresh' };
  }
  if (stage === 'AwaitingMannyStrategyApproval' || stage === 'AwaitingMannyShortlistApproval') {
    return { queue: 'AWAITING_MANNY', agingDays: 0, aging: 'watch' };
  }
  if (
    stage === 'Submitted' ||
    stage === 'Underwriting' ||
    stage === 'AdditionalInformationRequested' ||
    stage === 'LenderVendorResearch'
  ) {
    return { queue: 'AWAITING_LENDER', agingDays: 0, aging: 'watch' };
  }
  if (stage === 'DocumentsRequested' || stage === 'DocumentsInProgress') {
    return { queue: 'AWAITING_CLIENT', agingDays: 0, aging: 'watch' };
  }
  return { queue: 'NEEDS_ATTENTION', agingDays: 0, aging: 'fresh' };
}

export function getSyntheticCommandCenter(): SyntheticCommandCenter {
  const s = getStore();
  const items = itemsFromStore(s);
  return {
    kpis: rebuildKpis(items, s.details),
    items,
    generatedAt: NOW,
  };
}

export function getSyntheticOpportunity(id: string): CapitalOpportunityDetail {
  const found = getStore().details.get(id);
  if (!found) {
    throw new Error(`Synthetic capital opportunity not found: ${id}`);
  }
  return found;
}

export function getSyntheticMissingRequest(id: string): MissingDocumentRequest | null {
  return getSyntheticOpportunity(id).missingRequest;
}

export function addSyntheticOpportunity(input: CreateOpportunityInput): CapitalOpportunity {
  const id = `cap-syn-new-${Date.now()}`;
  const opp = opportunity({
    id,
    title: input.title.startsWith('SYNTHETIC') ? input.title : `SYNTHETIC ${input.title}`,
    clientCode: input.clientCode || 'SYN99',
    clientId: input.clientId || `client-${id}`,
    companyName: `SYNTHETIC ${input.clientCode || 'new demonstration'}`,
    transactionType: input.transactionType || 'working_capital_loc',
    stage: 'NeedIdentified',
    need: {
      requestedAmount: input.requestedAmount ?? null,
      purpose: input.purpose || 'demonstration intake',
    },
    nextAction: 'Complete initial qualification',
    nextActionOwner: 'Manny',
    notes: SYNTHETIC_BANNER,
  });
  const ck = checklist(id, [
    { itemKey: 'fin-pl-ytd', name: 'Year-to-date profit & loss', status: 'MISSING', category: 'Current Financials' },
    { itemKey: 'org-formation', name: 'Formation / organizational documents', status: 'MISSING', category: 'Corporate' },
  ]);
  getStore().details.set(id, {
    opportunity: opp,
    checklist: ck,
    documents: [],
    underwriting: null,
    strategy: null,
    matches: [],
    application: null,
    submissions: [],
    offers: [],
    closing: [],
    fees: [],
    missingRequest: missingFrom(ck, opp.clientCode),
  });
  return opp;
}

function patch(id: string, mutate: (detail: CapitalOpportunityDetail) => CapitalOpportunityDetail): CapitalOpportunityDetail {
  const current = getSyntheticOpportunity(id);
  const next = mutate({
    ...current,
    opportunity: { ...current.opportunity, updatedAt: new Date().toISOString() },
  });
  getStore().details.set(id, next);
  return next;
}

export function applySyntheticTransition(id: string, toStage: string): CapitalOpportunityDetail {
  return patch(id, (d) => ({
    ...d,
    opportunity: {
      ...d.opportunity,
      stage: toStage,
      stageEnteredAt: new Date().toISOString(),
      lastMeaningfulActivityAt: new Date().toISOString(),
    },
  }));
}

export function applySyntheticStrategyDecision(id: string, decision: StrategyDecision): CapitalOpportunityDetail {
  const approval = decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : 'REVISE';
  const nextStage =
    decision === 'APPROVED'
      ? 'StrategyApproved'
      : decision === 'REVISE'
        ? 'StrategyDrafted'
        : 'AwaitingMannyStrategyApproval';
  return patch(id, (d) => ({
    ...d,
    opportunity: {
      ...d.opportunity,
      mannyStrategyApproval: approval,
      stage: nextStage,
      stageEnteredAt: new Date().toISOString(),
      nextAction:
        decision === 'APPROVED'
          ? 'Begin lender / vendor research'
          : decision === 'REVISE'
            ? 'Revise financing strategy for Manny'
            : 'Strategy rejected — capture rationale before any lender contact',
      nextActionOwner: decision === 'APPROVED' ? 'HVCG' : 'Manny',
      lastMeaningfulActivityAt: new Date().toISOString(),
    },
    strategy: d.strategy
      ? {
          ...d.strategy,
          mannyApproval: approval,
          approvedBy: 'manny@hvcg.example',
          approvedAt: new Date().toISOString(),
        }
      : d.strategy,
  }));
}

export function applySyntheticShortlistDecision(id: string, decision: StrategyDecision): CapitalOpportunityDetail {
  const approval = decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : 'REVISE';
  const nextStage =
    decision === 'APPROVED'
      ? 'ReadyForSubmission'
      : decision === 'REVISE'
        ? 'LenderVendorResearch'
        : 'AwaitingMannyShortlistApproval';
  return patch(id, (d) => ({
    ...d,
    opportunity: {
      ...d.opportunity,
      mannyShortlistApproval: approval,
      stage: nextStage,
      stageEnteredAt: new Date().toISOString(),
      nextAction:
        decision === 'APPROVED'
          ? 'Prepare application package — do not submit until Manny confirms'
          : decision === 'REVISE'
            ? 'Revise lender shortlist for Manny'
            : 'Shortlist rejected — do not contact lenders on this list',
      nextActionOwner: decision === 'APPROVED' ? 'HVCG' : 'Manny',
      lastMeaningfulActivityAt: new Date().toISOString(),
    },
  }));
}
