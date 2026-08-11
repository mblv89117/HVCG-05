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
    lenderPackageStatus: 'NotStarted (submit blocked)',
    fundingOutcome: 'Not available',
  };
}

export function Client360CapitalSection({ clientHint }: { clientHint?: string }) {
  const snap = buildInternalCapitalSnapshot(clientHint);
  return (
    <AtlasCard title="Capital" subtitle="Internal Client 360 · readiness is advisory · not approval probability">
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
        Lender package: {snap.lenderPackageStatus}
      </Text>
      <Caption1 style={{ display: 'block', marginTop: 10 }}>
        Funding outcome: {snap.fundingOutcome} · HVCG does not guarantee financing approval
      </Caption1>
    </AtlasCard>
  );
}
