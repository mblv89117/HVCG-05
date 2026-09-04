/**
 * Cross-module Atlas message envelope (Wave 3).
 * Unknown ClientCode must fail closed at the Hub boundary.
 */

export type AuthorityClass =
  | 'OBSERVE'
  | 'RECOMMEND'
  | 'PREPARE'
  | 'EXECUTE_WITH_APPROVAL'
  | 'POLICY_BASED_AUTONOMOUS_EXECUTION'
  | 'PROHIBITED_WITHOUT_HUMAN_AUTHORIZATION';

export type ProvenanceConfidence = 'VERIFIED' | 'ESTIMATED' | 'INFERRED';

export type ModuleSource =
  | 'website_eva'
  | 'growth_command_center'
  | 'growth_360'
  | 'copilot_mri'
  | 'atlas_hub'
  | 'atlas_elite';


export type AtlasIntegrationEnvelope = {
  clientCode: string;
  source: ModuleSource;
  sourceRecordId: string;
  schemaVersion: string;
  eventType: string;
  timestamp: string;
  provenance: {
    system: string;
    observedAt: string;
    confidence: ProvenanceConfidence;
  };
  confidence: ProvenanceConfidence;
  correlationId: string;
  idempotencyKey: string;
  actor: string;
  authorityClass: AuthorityClass;
  payload: Record<string, unknown>;
};

const CLIENT_CODE_RE = /^[A-Z][A-Z0-9]{2,15}$/;

export function isCanonicalClientCode(raw: unknown): raw is string {
  return typeof raw === 'string' && CLIENT_CODE_RE.test(raw);
}

export type EnvelopeValidation =
  | { ok: true; envelope: AtlasIntegrationEnvelope }
  | { ok: false; reason: string };

export function validateEnvelope(raw: unknown): EnvelopeValidation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'ENVELOPE_NOT_OBJECT' };
  }
  const e = raw as Record<string, unknown>;
  if (!isCanonicalClientCode(e.clientCode)) {
    return { ok: false, reason: 'UNKNOWN_OR_MALFORMED_CLIENT_CODE' };
  }
  for (const key of [
    'source',
    'sourceRecordId',
    'schemaVersion',
    'eventType',
    'timestamp',
    'correlationId',
    'idempotencyKey',
    'actor',
    'authorityClass',
  ] as const) {
    if (typeof e[key] !== 'string' || !(e[key] as string).trim()) {
      return { ok: false, reason: `MISSING_${key.toUpperCase()}` };
    }
  }
  if (!e.provenance || typeof e.provenance !== 'object') {
    return { ok: false, reason: 'MISSING_PROVENANCE' };
  }
  if (!e.payload || typeof e.payload !== 'object' || Array.isArray(e.payload)) {
    return { ok: false, reason: 'MISSING_PAYLOAD' };
  }
  const confidence = e.confidence;
  if (confidence !== 'VERIFIED' && confidence !== 'ESTIMATED' && confidence !== 'INFERRED') {
    return { ok: false, reason: 'INVALID_CONFIDENCE' };
  }
  return { ok: true, envelope: e as AtlasIntegrationEnvelope };
}
