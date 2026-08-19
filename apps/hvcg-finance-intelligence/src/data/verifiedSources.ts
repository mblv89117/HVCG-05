/**
 * Approved Atlas / product source catalog for Finance Intelligence.
 * Colorado Craft Beef: relationship facts only — no invented financial dollars.
 */

import type { SourceRecord } from '../types'

export const GENERATED_AT = '2026-07-19T19:00:00-07:00'
export const REPORTING_PERIOD = '2026-Q2 (demo calendar)'
export const PRIOR_PERIOD = '2026-Q1 (demo calendar)'

export const atlasSources: SourceRecord[] = [
  {
    id: 'src-atlas-finance-ops',
    system: 'Finance Operations',
    entity: 'Sprint 1 Phase 1',
    recordId: 'c287508ab775d61e3ae49332dbecbb74f76689e3',
    label: 'Finance Operations Sprint 1 — mock financial OS (MRR/ARR/AR/cash engines)',
    evidenceKind: 'Repository-derived',
    asOf: '2026-07-16T20:48:00Z',
  },
  {
    id: 'src-atlas-rc1',
    system: 'Project Atlas',
    entity: 'Release Candidate',
    recordId: 'RC-1',
    label: 'RC-1 locked — Track 1 FROZEN; production unmodified by Finance Intelligence',
    evidenceKind: 'Verified',
    asOf: '2026-07-16T03:08:00Z',
  },
  {
    id: 'src-finance-ops-mock-store',
    system: 'Finance Operations',
    entity: 'mockStore',
    recordId: 'apps/hvcg-finance-operations/src/data/mockStore.ts',
    label: 'HVCG demo ledger figures used as Mock demo baseline (not live GL)',
    evidenceKind: 'Mock demo',
    asOf: '2026-07-16T20:00:00Z',
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
    label: 'Objectives: growth capital + additional real estate; non-dilutive / agricultural themes',
    evidenceKind: 'Verified',
    asOf: '2026-07-19T00:00:00Z',
  },
  {
    id: 'src-ccb-finance-gate',
    system: 'Project Atlas',
    entity: 'Finance Intelligence rule',
    recordId: 'CCB-FINANCIAL-GATE',
    label: 'No verified CCB revenue, EBITDA, cash, AR, AP, or EV dollars in approved Atlas sources',
    evidenceKind: 'Verified',
    asOf: '2026-07-19T19:00:00Z',
  },
]

export const hvcgDemoSources: SourceRecord[] = [
  {
    id: 'src-hvcg-demo-revenue',
    system: 'Finance Intelligence',
    entity: 'Demo KPI pack',
    recordId: 'HVCG-DEMO-Q2',
    label: 'HVCG internal demo pack derived from Finance Ops mock store — Mock demo only',
    evidenceKind: 'Mock demo',
    asOf: GENERATED_AT,
  },
  {
    id: 'src-stripe-mock',
    system: 'Stripe (mock)',
    entity: 'Payment status',
    recordId: 'mock-stripe',
    label: 'Stripe connector — ConfigOnly / mocked receipts',
    evidenceKind: 'Mock demo',
    asOf: GENERATED_AT,
  },
  {
    id: 'src-qbo-mock',
    system: 'QuickBooks (config-only)',
    entity: 'External accounting id',
    recordId: 'mock-qbo',
    label: 'QuickBooks — id mirror only; not a live GL',
    evidenceKind: 'Pending verification',
    asOf: GENERATED_AT,
  },
  {
    id: 'src-mercury-mock',
    system: 'Mercury (mock)',
    entity: 'Cash position',
    recordId: 'mock-mercury',
    label: 'Mercury cash snapshot — mocked',
    evidenceKind: 'Mock demo',
    asOf: GENERATED_AT,
  },
]

export const allSources: SourceRecord[] = [...atlasSources, ...ccbSources, ...hvcgDemoSources]

export function sourceById(id: string): SourceRecord | undefined {
  return allSources.find((s) => s.id === id)
}
