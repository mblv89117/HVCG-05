/**
 * Approved source records for Executive Intelligence.
 * Financial amounts for Colorado Craft Beef are intentionally absent.
 * HVCG portfolio mock figures remain labeled as repository mock / pending live bind.
 */

import type { SourceRecord } from '../types/intelligence'

export const GENERATED_AT = '2026-07-19T19:00:00-07:00'

export const atlasSources: SourceRecord[] = [
  {
    id: 'src-atlas-current-state',
    system: 'Project Atlas',
    entity: 'CURRENT_STATE',
    recordId: 'PROJECT_ATLAS/CURRENT_STATE.md',
    label: 'Atlas CURRENT_STATE — Track 1 FROZEN; Revenue Sprint 4 Phase 1 COMPLETE; Client Portal Sprint 1 COMPLETE; ECC Sprint 1 COMPLETE',
    evidenceKind: 'Verified',
    asOf: '2026-07-16T19:52:00Z',
  },
  {
    id: 'src-atlas-rc1',
    system: 'Project Atlas',
    entity: 'Release Candidate',
    recordId: 'RC-1',
    label: 'RC-1 locked — Track 1 freeze tag 3026159…',
    evidenceKind: 'Verified',
    asOf: '2026-07-16T03:08:00Z',
  },
  {
    id: 'src-revenue-tip',
    system: 'Revenue OS',
    entity: 'Activation Framework',
    recordId: '7fd8bf270dc080eea9a3326184707169a3b120ca',
    label: 'Revenue Sprint 4 Phase 1 tip on cursor/revenue-sprint4-activation',
    evidenceKind: 'Verified',
    asOf: '2026-07-16T00:00:00Z',
  },
  {
    id: 'src-portal-tip',
    system: 'Client Portal',
    entity: 'Sprint 1',
    recordId: '8c8806b1c9c01522c574c6d8ec28c5d6ea81aed7',
    label: 'Client Portal Sprint 1 tip on cursor/client-portal-sprint1',
    evidenceKind: 'Verified',
    asOf: '2026-07-16T00:00:00Z',
  },
  {
    id: 'src-ecc-tip',
    system: 'Operations',
    entity: 'Executive Command Center Sprint 1',
    recordId: '5bb42c252f5a8cd92d1b9a5e0a5319fde2e4c57b',
    label: 'ECC Sprint 1 COMPLETE on cursor/executive-command-center-sprint1',
    evidenceKind: 'Verified',
    asOf: '2026-07-16T19:59:00Z',
  },
]

export const ccbSources: SourceRecord[] = [
  {
    id: 'src-ccb-relationship',
    system: 'Client Portal',
    entity: 'Client',
    recordId: 'CCB / cli-ccb',
    label: 'Colorado Craft Beef — relationship history (HVS referral → HVCG transition)',
    evidenceKind: 'Verified',
    asOf: '2026-07-19T00:00:00Z',
  },
  {
    id: 'src-ccb-referral',
    system: 'Revenue OS',
    entity: 'ReferralPartner',
    recordId: 'rp-generational-group',
    label: 'Referral: Randy Kamin — Generational Group',
    evidenceKind: 'Verified',
    asOf: '2026-07-19T00:00:00Z',
  },
  {
    id: 'src-ccb-contact',
    system: 'Revenue OS',
    entity: 'Contact',
    recordId: 'ct-jeff-smith',
    label: 'Primary contact Jeff Smith — email/phone pending verified source',
    evidenceKind: 'Verified',
    asOf: '2026-07-19T00:00:00Z',
  },
  {
    id: 'src-ccb-opportunity',
    system: 'Revenue OS',
    entity: 'Opportunity',
    recordId: 'opp-ccb-blueprint-001',
    label: 'Opportunity at Blueprint stage — fee amounts pending verification',
    evidenceKind: 'Verified',
    asOf: '2026-07-19T17:00:00Z',
  },
  {
    id: 'src-ccb-objectives',
    system: 'Manual',
    entity: 'Owner directive',
    recordId: 'owner-product-build-2026-07-19',
    label: 'Capital objectives: growth capital + additional real estate; non-dilutive / agricultural themes',
    evidenceKind: 'Verified',
    asOf: '2026-07-19T00:00:00Z',
  },
  {
    id: 'src-ccb-finance-gap',
    system: 'Client Portal',
    entity: 'KPI',
    recordId: 'kpi-ccb-*',
    label: 'Financial KPIs — awaiting verified source (no dollar display)',
    evidenceKind: 'Pending verification',
    asOf: '2026-07-19T00:00:00Z',
  },
]

export const portfolioMockSources: SourceRecord[] = [
  {
    id: 'src-mock-pipeline',
    system: 'Operations',
    entity: 'CommandCenterData',
    recordId: 'portfolio.unbound',
    label: 'HVCG portfolio pipeline dollars — Awaiting verified source (Revenue OS / Dataverse bind)',
    evidenceKind: 'Pending verification',
    asOf: GENERATED_AT,
  },
  {
    id: 'src-mock-finance',
    system: 'Finance',
    entity: 'CommandCenterData',
    recordId: 'finance.unbound',
    label: 'HVCG financial KPIs — Awaiting verified source (Finance Intelligence bind)',
    evidenceKind: 'Pending verification',
    asOf: GENERATED_AT,
  },
]

/** Colorado Craft Beef — verified relationship facts only. No invented financial findings. */
export const coloradoCraftBeefVerified = {
  legalName: 'Colorado Craft Beef',
  clientCode: 'CCB',
  industry: 'Agriculture / Food Production',
  engagementStatus: 'Transitioning to HVCG',
  relationshipOwner: 'Manny Barela',
  primaryContact: 'Jeff Smith',
  referralSource: 'Randy Kamin — Generational Group',
  relationshipHistory: [
    'Original HVS referral',
    'Transitioning to HVCG',
    'Original need involved growth capital and additional real estate',
    'Prior financing discussion included non-dilutive and agricultural financing options',
  ],
  strategicContext: [
    'Capital advisory engagement under HVCG',
    'Blueprint presentation stage for advisory session',
    'Referral continuity with Generational Group maintained',
  ],
  capitalObjectives: ['Growth capital', 'Non-dilutive financing exploration', 'Agricultural financing options'],
  realEstateObjectives: ['Additional real estate financing'],
  blueprintStatus: 'Presented' as const,
  pipelineStage: 'Blueprint',
  knownNextActions: [
    'Present Blueprint engagement package',
    'Collect verified financial package before any facility sizing or valuation',
    'Confirm referral continuity with Generational Group (Randy Kamin)',
    'Sequence real-estate financing exploration after capital package readiness',
  ],
  missingOrPending: [
    'Verified financial package (no dollar amounts until received)',
    'Contact email/phone for Jeff Smith',
    'Fee / success-fee amounts',
    'Facility sizing and lender package',
    'Enterprise value / multiples',
    'Document room completion percentages',
  ],
  sources: ccbSources,
}
