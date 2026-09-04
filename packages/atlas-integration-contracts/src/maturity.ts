/** Integration maturity ladder — do not stop at RECEIVE_ONLY. */
export const MATURITY_LADDER = [
  'CONTRACT_IDENTIFIED',
  'SCHEMA_VALIDATED',
  'AUTHENTICATED',
  'CLIENTCODE_MAPPED',
  'IDEMPOTENT',
  'RECEIVE_ONLY',
  'OBSERVATION_LIVE',
  'END_TO_END_VALIDATED',
  'BIDIRECTIONAL_IF_REQUIRED',
  'POLICY_GATED_ACTION',
  'BUSINESS_USEFUL',
] as const;

export type MaturityLevel = (typeof MATURITY_LADDER)[number];

export type IntegrationId =
  | 'website_eva_to_atlas'
  | 'copilot_mri_to_atlas'
  | 'gcc_to_atlas'
  | 'growth360_to_atlas';

export type IntegrationMaturityRecord = {
  id: IntegrationId;
  level: MaturityLevel;
  notes: string;
  updatedAt: string;
};

export const WAVE3_TARGET_MATURITY: readonly IntegrationMaturityRecord[] = [
  {
    id: 'website_eva_to_atlas',
    level: 'CLIENTCODE_MAPPED',
    notes: 'Lead upsert E2E exists; Wave 3 adds Lead→Client conversion prepare + ClientCode.',
    updatedAt: '2026-09-04T21:00:00.000Z',
  },
  {
    id: 'copilot_mri_to_atlas',
    level: 'CLIENTCODE_MAPPED',
    notes: 'MRI findings ingest to Hub observation + optional HVCG_Leads prepare (human review).',
    updatedAt: '2026-09-04T21:00:00.000Z',
  },
  {
    id: 'gcc_to_atlas',
    level: 'OBSERVATION_LIVE',
    notes: 'HMAC module ingest + ClientCode map + SYN01 observation; auto-provision false.',
    updatedAt: '2026-09-04T21:00:00.000Z',
  },
  {
    id: 'growth360_to_atlas',
    level: 'RECEIVE_ONLY',
    notes: 'Hub ingest of 360_campaign_approval_v1 with HFD01; canExecute remains false.',
    updatedAt: '2026-09-04T21:00:00.000Z',
  },
];

export function maturityIndex(level: MaturityLevel): number {
  return MATURITY_LADDER.indexOf(level);
}

export function hasReached(current: MaturityLevel, target: MaturityLevel): boolean {
  return maturityIndex(current) >= maturityIndex(target);
}
