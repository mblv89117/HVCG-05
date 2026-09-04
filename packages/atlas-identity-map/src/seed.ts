/**
 * Seed identity mappings for known production ClientCodes.
 * Module local IDs stay null until verified (fail-closed).
 * Demo/synthetic IDs are INFERRED and must not authorize production alone.
 *
 * Production codes (Entra HVCG-Client-*): ACCG01, CCB01, CPL01, HFD01, KAVA01, LIEN01, PDG01
 */
import type { ClientIdentityMapping } from './types.ts';
import { entraGroupForClientCode } from './validate.ts';

const NOW = '2026-09-04T20:00:00.000Z';

function row(
  partial: Omit<ClientIdentityMapping, 'entraGroupDisplayName' | 'updatedAt'> & {
    updatedAt?: string;
  },
): ClientIdentityMapping {
  const group = entraGroupForClientCode(partial.clientCode);
  if (!group) throw new Error(`Invalid ClientCode in seed: ${partial.clientCode}`);
  return {
    ...partial,
    entraGroupDisplayName: group,
    updatedAt: partial.updatedAt ?? NOW,
  };
}

/** Production ClientCodes present in Entra HVCG-Client-* groups. */
export const PRODUCTION_CLIENT_IDENTITY_SEED: readonly ClientIdentityMapping[] = [
  row({
    clientCode: 'ACCG01',
    displayName: 'ACCG',
    confidence: 'VERIFIED',
    notes: 'Production Entra group exists; ACCG read-only posture on Hub.',
  }),
  row({
    clientCode: 'CCB01',
    displayName: 'Colorado Craft Beef',
    confidence: 'VERIFIED',
  }),
  row({
    clientCode: 'CPL01',
    displayName: "Christie's Place",
    confidence: 'VERIFIED',
  }),
  row({
    clientCode: 'HFD01',
    displayName: 'Hart Family Dental',
    growth360Slug: 'hart-family-dental',
    confidence: 'VERIFIED',
    notes: '360 slug mapped; UUID filled when dual-resolve validates against live org row.',
  }),
  row({
    clientCode: 'KAVA01',
    displayName: "That's Kava LLC",
    confidence: 'VERIFIED',
  }),
  row({
    clientCode: 'LIEN01',
    displayName: 'Lien Partners',
    confidence: 'VERIFIED',
  }),
  row({
    clientCode: 'PDG01',
    displayName: 'Prodigy Games',
    confidence: 'VERIFIED',
  }),
];

/**
 * Non-production observation fixtures for contract tests only.
 * client360 fixture UUID must NOT collide with hub-client360-scope CLIENT_A/B.
 */
export const FIXTURE_CLIENT_IDENTITY_SEED: readonly ClientIdentityMapping[] = [
  row({
    clientCode: 'SYN01',
    displayName: 'Synthetic Observation Client',
    gccOrganizationId: 'org-syn01',
    confidence: 'INFERRED',
    notes: 'GCC contract fixture only — not a production entitlement.',
  }),
  row({
    clientCode: 'MRI01',
    displayName: 'MRI Demo Meridian',
    copilotOrganizationId: 'org-meridian',
    confidence: 'INFERRED',
    notes: 'Copilot demo org mapping for dual-resolve tests — not production.',
  }),
  row({
    clientCode: 'T360A',
    displayName: 'Client360 Map Fixture A',
    client360Id: 'cccccccc-cccc-cccc-cccc-cccccccc0003',
    confidence: 'VERIFIED',
    notes: 'Trusted Client360 UUID fixture for isolation tests (not CLIENT_A/B).',
  }),
];

export const DEFAULT_IDENTITY_SEED: readonly ClientIdentityMapping[] = [
  ...PRODUCTION_CLIENT_IDENTITY_SEED,
  ...FIXTURE_CLIENT_IDENTITY_SEED,
];
