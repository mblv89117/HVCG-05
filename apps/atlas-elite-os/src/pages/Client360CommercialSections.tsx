/**
 * Client 360 — internal Revenue / Migration sections.
 * Financial truth: never present Proposed as Collected.
 * Migration strategy is INTERNAL by default (not for client portal).
 */
import { AtlasCard, StatusChip } from '@hvcg/atlas-design-system';
import { Caption1, Text } from '@fluentui/react-components';

export type RevenueTruthBucket =
  | 'Contracted'
  | 'Invoiced'
  | 'Collected'
  | 'Proposed'
  | 'Recommended'
  | 'Pipeline';

export interface Client360RevenueSnapshot {
  clientCode: string;
  hvcgStatus: string;
  currentEngagements: string[];
  contractedEconomics: string;
  openOpportunities: string[];
  serviceLines: string[];
  offers: string[];
  diagnostics: string[];
  proposedEconomics: string;
  collectedRevenue: string;
  referralSource: string;
  expansionOpportunities: string[];
  buckets: Record<RevenueTruthBucket, string>;
}

export interface Client360MigrationSnapshot {
  applicable: boolean;
  legacyRelationship: string;
  historicalEntity: string;
  currentPricing: string;
  recommendedV2Structure: string;
  recommendedFutureEconomics: string;
  migrationAction: string;
  approvalState: string;
  clientCommunicationState: string;
  agreementState: string;
  effectiveDate: string;
  internalOnly: true;
}

/** Demo-safe internal snapshot — no invented collected revenue. */
export function buildInternalRevenueSnapshot(clientHint?: string): Client360RevenueSnapshot {
  const isAccg = (clientHint || '').toUpperCase().includes('ACCG') || (clientHint || '').toLowerCase().includes('american capital');
  return {
    clientCode: isAccg ? 'ACCG' : clientHint || 'PENDING',
    hvcgStatus: isAccg ? 'Active legacy client' : 'Prospect / engagement pending verification',
    currentEngagements: isAccg ? ['Legacy monthly retainer (protected)'] : ['None verified'],
    contractedEconomics: isAccg ? '$4,539/mo CURRENT CONTRACTED (protected)' : 'None verified',
    openOpportunities: isAccg ? ['Expansion evaluation (opp-accg-expansion-001)'] : ['See Revenue OS'],
    serviceLines: isAccg ? ['SL-FCFO (legacy)'] : ['Pending qualification'],
    offers: isAccg ? ['Recommended future: OFF-FCFO-OP (not contracted)'] : ['Pending Free Fit'],
    diagnostics: ['None completed in Client 360 snapshot'],
    proposedEconomics: 'Proposed ≠ Collected — see buckets',
    collectedRevenue: 'Awaiting verified source',
    referralSource: isAccg ? 'Existing Client' : 'Pending attribution',
    expansionOpportunities: isAccg ? ['V2 retainer alignment (owner-gated)'] : [],
    buckets: {
      Contracted: isAccg ? '$4,539/mo' : '—',
      Invoiced: 'Awaiting verified source',
      Collected: 'Awaiting verified source',
      Proposed: isAccg ? 'Future V2 recommendation only' : 'None',
      Recommended: isAccg ? 'V2 rate card recommendation (NOT contracted)' : 'Pending',
      Pipeline: 'See Revenue OS opportunities',
    },
  };
}

export function buildInternalMigrationSnapshot(clientHint?: string): Client360MigrationSnapshot {
  const isAccg = (clientHint || '').toUpperCase().includes('ACCG') || (clientHint || '').toLowerCase().includes('american capital');
  return {
    applicable: isAccg,
    legacyRelationship: isAccg ? 'HVS → HVCG legacy retainer' : 'N/A',
    historicalEntity: isAccg ? 'American Capital Consulting Group' : '—',
    currentPricing: isAccg ? '$4,539/mo contracted' : '—',
    recommendedV2Structure: isAccg ? 'OFF-FCFO-OP under HVCG-PRICE-2026-08-11-v2' : '—',
    recommendedFutureEconomics: isAccg ? 'Recommended future only — does not overwrite contracted' : '—',
    migrationAction: isAccg ? 'REPRICE (recommendation)' : '—',
    approvalState: 'NOT_REVIEWED / owner gate',
    clientCommunicationState: 'CLIENT_CONTACT_GATED (BL-C1)',
    agreementState: 'No client proposal sent',
    effectiveDate: 'Not set',
    internalOnly: true,
  };
}

export function Client360RevenueSection({ clientHint }: { clientHint?: string }) {
  const snap = buildInternalRevenueSnapshot(clientHint);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <AtlasCard title="Revenue / Commercial" subtitle="Internal Client 360 · financial truth enforced">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <StatusChip label={snap.hvcgStatus} tone="gold" />
          <StatusChip label={`Client ${snap.clientCode}`} tone="neutral" />
        </div>
        <Text size={300} style={{ display: 'block' }}>
          Current engagements: {snap.currentEngagements.join('; ') || '—'}
        </Text>
        <Text size={300} style={{ display: 'block', marginTop: 6 }}>
          Contracted economics: {snap.contractedEconomics}
        </Text>
        <Text size={300} style={{ display: 'block', marginTop: 6 }}>
          Open opportunities: {snap.openOpportunities.join('; ')}
        </Text>
        <Text size={300} style={{ display: 'block', marginTop: 6 }}>
          Service lines: {snap.serviceLines.join('; ')}
        </Text>
        <Text size={300} style={{ display: 'block', marginTop: 6 }}>
          Offers: {snap.offers.join('; ')}
        </Text>
        <Text size={300} style={{ display: 'block', marginTop: 6 }}>
          Diagnostics: {snap.diagnostics.join('; ')}
        </Text>
        <Text size={300} style={{ display: 'block', marginTop: 6 }}>
          Referral source: {snap.referralSource}
        </Text>
        <Caption1 style={{ display: 'block', marginTop: 12 }}>
          Collected revenue: {snap.collectedRevenue} (never inferred from Proposed)
        </Caption1>
      </AtlasCard>
      <AtlasCard title="Financial truth buckets" subtitle="Contracted · Invoiced · Collected · Proposed · Recommended · Pipeline">
        {(Object.keys(snap.buckets) as RevenueTruthBucket[]).map((k) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0' }}>
            <Text weight="semibold" size={300}>
              {k}
            </Text>
            <Caption1>{snap.buckets[k]}</Caption1>
          </div>
        ))}
      </AtlasCard>
    </div>
  );
}

export function Client360MigrationSection({ clientHint }: { clientHint?: string }) {
  const snap = buildInternalMigrationSnapshot(clientHint);
  if (!snap.applicable) {
    return (
      <AtlasCard title="Migration" subtitle="Internal only">
        <Caption1>No active migration record for this client.</Caption1>
      </AtlasCard>
    );
  }
  return (
    <AtlasCard title="Migration" subtitle="INTERNAL — not exposed to client portal">
      <Caption1 style={{ display: 'block', marginBottom: 8, color: '#8a1c1c' }}>
        Internal strategy only · BL-C1 gates client communication
      </Caption1>
      <Text size={300} style={{ display: 'block' }}>
        Legacy relationship: {snap.legacyRelationship}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Historical entity: {snap.historicalEntity}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Current pricing: {snap.currentPricing}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Recommended V2 structure: {snap.recommendedV2Structure}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Recommended future economics: {snap.recommendedFutureEconomics}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Action: {snap.migrationAction} · Approval: {snap.approvalState}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Client communication: {snap.clientCommunicationState}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Agreement: {snap.agreementState} · Effective: {snap.effectiveDate}
      </Text>
    </AtlasCard>
  );
}

export interface Client360CapitalSnapshot {
  capitalNeed: string;
  requestedAmount: string;
  financingType: string;
  diagnosticStatus: string;
  readinessScore: string;
  documentCompleteness: string;
  keyConcerns: string[];
  keyStrengths: string[];
  recommendedFundingPath: string;
  activeCapitalOpportunities: string[];
  lenderPackageStatus: string;
  fundingOutcome: string;
}

export function buildInternalCapitalSnapshot(clientHint?: string): Client360CapitalSnapshot {
  const label = clientHint || 'Client';
  return {
    capitalNeed: 'Pending verified capital request',
    requestedAmount: 'Awaiting verified source',
    financingType: '—',
    diagnosticStatus: 'Not started / bind Capital Diagnostic when authorized',
    readinessScore: 'Not yet calculated',
    documentCompleteness: 'Not yet calculated',
    keyConcerns: [],
    keyStrengths: [],
    recommendedFundingPath: 'Pending human-approved recommendation',
    activeCapitalOpportunities: [`See Capital workbench for ${label}`],
    lenderPackageStatus: 'Package version — Completeness — QA — Approval — Data Room (internal)',
    fundingOutcome: 'Requested/Submitted/Approved/Funded distinctions enforced when available',
  };
}

export function Client360CapitalSection({ clientHint }: { clientHint?: string }) {
  const snap = buildInternalCapitalSnapshot(clientHint);
  return (
    <AtlasCard title="Capital" subtitle="Internal · readiness + package · not portal-exposed strategy">
      <Text size={300} style={{ display: 'block' }}>
        Capital need: {snap.capitalNeed}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Requested amount: {snap.requestedAmount}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Financing type: {snap.financingType}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Diagnostic: {snap.diagnosticStatus}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Readiness score: {snap.readinessScore}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Document completeness: {snap.documentCompleteness}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Funding path: {snap.recommendedFundingPath}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Opportunities: {snap.activeCapitalOpportunities.join('; ')}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Lender-Ready Package: {snap.lenderPackageStatus}
      </Text>
      <Caption1 style={{ display: 'block', marginTop: 10 }}>
        Funding outcome: {snap.fundingOutcome} · Approved ≠ Funded ≠ Collected · HVCG does not guarantee financing
      </Caption1>
      <Caption1 style={{ display: 'block', marginTop: 6 }}>
        Internal-only: lender concerns, AI reasoning, pricing strategy, lender targeting — not client-portal default.
      </Caption1>
    </AtlasCard>
  );
}

/** Sprint 7 — Client 360 Finance / Fractional CFO (internal). No fabricated live balances. */
export interface Client360FinanceSnapshot {
  cfoEngagementStatus: string;
  offerCode: string;
  latestPeriod: string;
  revenue: string;
  cash: string;
  forecastStatus: string;
  forecastEndingCash: string;
  ar: string;
  ap: string;
  debt: string;
  workingCapital: string;
  kpiStatus: string;
  wip: string;
  budgetVariance: string;
  financialIssues: string[];
  capitalReadinessMonitor: string;
  latestAdvisorReview: string;
  dataAdapterStatus: string;
  disclaimer: string;
}

export function buildInternalFinanceSnapshot(clientHint?: string): Client360FinanceSnapshot {
  const isAccg =
    (clientHint || '').toUpperCase().includes('ACCG') ||
    (clientHint || '').toLowerCase().includes('american capital');
  return {
    cfoEngagementStatus: isAccg ? 'Legacy retainer active — V2 CFO cadence optional / gated' : 'No verified CFO Engagement bound',
    offerCode: 'OFF-FCFO-OP',
    latestPeriod: 'Awaiting verified period close',
    revenue: 'Awaiting verified source',
    cash: 'PENDING_LIVE_SOURCE (bank / ledger)',
    forecastStatus: 'Not started',
    forecastEndingCash: '—',
    ar: 'Awaiting verified AR aging',
    ap: 'Awaiting verified AP aging',
    debt: 'Awaiting debt schedule',
    workingCapital: 'INSUFFICIENT_DATA until CA/CL verified',
    kpiStatus: 'Targets not invented — require client/HVCG/sourced origin',
    wip: isAccg ? 'NOT_APPLICABLE (service firm default)' : 'Conditional — set on engagement',
    budgetVariance: 'No approved budget bound',
    financialIssues: [],
    capitalReadinessMonitor: 'Stable / not monitored until engagement enables it',
    latestAdvisorReview: 'None recorded',
    dataAdapterStatus: 'PENDING_LIVE_SOURCE — QBO/Plaid not represented as connected',
    disclaimer: 'Advisory management view — not CPA attestation. HVCG invoice domain ≠ client AR/AP.',
  };
}

export function Client360FinanceSection({ clientHint }: { clientHint?: string }) {
  const snap = buildInternalFinanceSnapshot(clientHint);
  return (
    <AtlasCard title="Finance / Fractional CFO" subtitle="Internal Client 360 · provenance enforced · BL-C1">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <StatusChip label={snap.cfoEngagementStatus} tone="gold" />
        <StatusChip label={snap.offerCode} tone="neutral" />
        <StatusChip label={snap.dataAdapterStatus} tone="warning" />
      </div>
      <Text size={300} style={{ display: 'block' }}>
        Latest period: {snap.latestPeriod}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Revenue: {snap.revenue}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Cash: {snap.cash}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        13-week forecast: {snap.forecastStatus} · ending cash {snap.forecastEndingCash}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        AR: {snap.ar} · AP: {snap.ap} · Debt: {snap.debt}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Working capital: {snap.workingCapital}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        KPIs: {snap.kpiStatus}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        WIP: {snap.wip}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Budget variance: {snap.budgetVariance}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Issues: {snap.financialIssues.length ? snap.financialIssues.join('; ') : 'None recorded'}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Capital Readiness monitor: {snap.capitalReadinessMonitor}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Latest advisor review: {snap.latestAdvisorReview}
      </Text>
      <Caption1 style={{ display: 'block', marginTop: 10 }}>{snap.disclaimer}</Caption1>
      <Caption1 style={{ display: 'block', marginTop: 6 }}>
        Pricing from canonical catalog — not hard-coded. No auto client / bookkeeper / CPA send.
      </Caption1>
    </AtlasCard>
  );
}

/** Sprint 8 — Client 360 Procurement (internal). */
export interface Client360ProcurementSnapshot {
  engagementStatus: string;
  offerCodes: string;
  readinessStatus: string;
  registrationStatus: string;
  activeNaics: string;
  capabilityStatement: string;
  certifications: string;
  activePursuits: string;
  proposalStatus: string;
  contractAwards: string;
  capitalCfoFlags: string;
  nextActions: string[];
  disclaimer: string;
}

export function buildInternalProcurementSnapshot(clientHint?: string): Client360ProcurementSnapshot {
  const isAccg =
    (clientHint || '').toUpperCase().includes('ACCG') ||
    (clientHint || '').toLowerCase().includes('american capital');
  return {
    engagementStatus: isAccg ? 'Procurement upsell eligible — contracted economics protected' : 'No verified Procurement Engagement bound',
    offerCodes: 'OFF-PROC-READY / OFF-GOV-SETUP',
    readinessStatus: 'UNKNOWN until assessment',
    registrationStatus: 'NOT_STARTED / gated',
    activeNaics: 'Awaiting advisor + client confirmation',
    capabilityStatement: 'No approved version',
    certifications: 'Awaiting verified registry',
    activePursuits: 'None verified',
    proposalStatus: 'Not started',
    contractAwards: 'None — forecast ≠ award',
    capitalCfoFlags: 'None',
    nextActions: ['Open Procurement workbench when engagement authorized'],
    disclaimer: 'HVCG does not guarantee awards. Registration preparation ≠ submission. Internal bid strategy not portal-exposed.',
  };
}

export function Client360ProcurementSection({ clientHint }: { clientHint?: string }) {
  const snap = buildInternalProcurementSnapshot(clientHint);
  return (
    <AtlasCard title="Procurement" subtitle="Internal Client 360 · BL-C1 · submission gated">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <StatusChip label={snap.engagementStatus} tone="gold" />
        <StatusChip label={snap.readinessStatus} tone="neutral" />
        <StatusChip label={snap.registrationStatus} tone="warning" />
      </div>
      <Text size={300} style={{ display: 'block' }}>
        Offers: {snap.offerCodes}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        NAICS: {snap.activeNaics}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Capability statement: {snap.capabilityStatement}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Certifications: {snap.certifications}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Active pursuits: {snap.activePursuits}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Proposal status: {snap.proposalStatus}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Awards: {snap.contractAwards}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Capital / CFO flags: {snap.capitalCfoFlags}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Next: {snap.nextActions.join('; ')}
      </Text>
      <Caption1 style={{ display: 'block', marginTop: 10 }}>{snap.disclaimer}</Caption1>
    </AtlasCard>
  );
}

/** Sprint 9 — Client 360 Risk (internal, elevated). Distinct from ops project risks. */
export interface Client360RiskSnapshot {
  openMatters: string;
  riskLevel: string;
  deadlines: string;
  amountAtRisk: string;
  documentStatus: string;
  professionalReview: string;
  claims: string;
  recovery: string;
  latestOutcome: string;
  nextAction: string;
  disclaimer: string;
}

export function buildInternalRiskSnapshot(clientHint?: string): Client360RiskSnapshot {
  const hint = (clientHint || '').toLowerCase();
  const isProdigy = hint.includes('prodigy');
  const isKava = hint.includes('kava');
  const isAccg = hint.includes('accg') || hint.includes('american capital');
  return {
    openMatters: isProdigy || isKava ? 'Candidate Risk engagement — verify before binding' : 'No verified Risk Matter bound',
    riskLevel: 'UNKNOWN until assessment',
    deadlines: 'None verified',
    amountAtRisk: 'Awaiting verified source — do not invent',
    documentStatus: 'Unknown',
    professionalReview: 'Not started',
    claims: isProdigy ? 'Risk/Recovery formalization candidate' : 'None',
    recovery: 'Claimed ≠ Approved ≠ Paid ≠ Collected',
    latestOutcome: 'None',
    nextAction: isAccg
      ? 'Any Risk engagement must preserve $4,539/mo contracted — no silent reprice'
      : 'Open Risk workbench when engagement authorized',
    disclaimer:
      'Elevated access. HVCG is not counsel/CPA/insurer. Ops project Risks tab ≠ Risk Matters. Employee/legal materials need tighter permissions.',
  };
}

export function Client360RiskSection({ clientHint }: { clientHint?: string }) {
  const snap = buildInternalRiskSnapshot(clientHint);
  return (
    <AtlasCard title="Risk & Claims" subtitle="Internal · elevated · distinct from ops HVCG_Risks">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <StatusChip label={snap.openMatters} tone="gold" />
        <StatusChip label={snap.riskLevel} tone="warning" />
      </div>
      <Text size={300} style={{ display: 'block' }}>
        Deadlines: {snap.deadlines}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Amount at risk: {snap.amountAtRisk}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Documents: {snap.documentStatus}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Professional review: {snap.professionalReview}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Claims / recovery: {snap.claims} · {snap.recovery}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Latest outcome: {snap.latestOutcome}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Next: {snap.nextAction}
      </Text>
      <Caption1 style={{ display: 'block', marginTop: 10 }}>{snap.disclaimer}</Caption1>
    </AtlasCard>
  );
}

/** Sprint 10 — Client 360 Growth OS (internal). */
export interface Client360GrowthSnapshot {
  engagementStatus: string;
  plan: string;
  topPriorities: string;
  kpiHealth: string;
  majorIssues: string;
  commitments: string;
  decisions: string;
  sopStatus: string;
  automationOpportunities: string;
  crossDomain: string;
  nextReview: string;
  disclaimer: string;
}

export function buildInternalGrowthSnapshot(clientHint?: string): Client360GrowthSnapshot {
  return {
    engagementStatus: clientHint ? `No verified Growth Engagement bound for ${clientHint}` : 'No verified Growth Engagement bound',
    plan: 'No active 90-day plan',
    topPriorities: '—',
    kpiHealth: 'NO_DATA until sources bound',
    majorIssues: 'None recorded',
    commitments: 'None recorded',
    decisions: 'See Decisions register when bound',
    sopStatus: 'Coverage unknown',
    automationOpportunities: 'Candidates only — no auto-deploy',
    crossDomain: 'Cash→CFO · Pipeline→Revenue · Capital · Procurement · Risk (restricted)',
    nextReview: 'Not scheduled',
    disclaimer: 'Growth OS orchestrates visibility. Domain SoRs remain authoritative. BL-C1 blocks auto client send.',
  };
}

export function Client360GrowthSection({ clientHint }: { clientHint?: string }) {
  const snap = buildInternalGrowthSnapshot(clientHint);
  return (
    <AtlasCard title="Growth Operating System" subtitle="Internal Client 360 · not a second Client 360">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <StatusChip label={snap.engagementStatus} tone="gold" />
        <StatusChip label={snap.kpiHealth} tone="neutral" />
      </div>
      <Text size={300} style={{ display: 'block' }}>
        90-day plan: {snap.plan}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Top priorities: {snap.topPriorities}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Issues / commitments: {snap.majorIssues} · {snap.commitments}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Decisions / SOPs: {snap.decisions} · {snap.sopStatus}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Automations: {snap.automationOpportunities}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Cross-domain: {snap.crossDomain}
      </Text>
      <Text size={300} style={{ display: 'block', marginTop: 6 }}>
        Next operating review: {snap.nextReview}
      </Text>
      <Caption1 style={{ display: 'block', marginTop: 10 }}>{snap.disclaimer}</Caption1>
    </AtlasCard>
  );
}
