export type {
  AtlasIntegrationEnvelope,
  EnvelopeValidation,
  ModuleSource,
  ProvenanceConfidence,
} from './envelope.ts';
export { isCanonicalClientCode, validateEnvelope } from './envelope.ts';
export type {
  IntegrationId,
  IntegrationMaturityRecord,
  MaturityLevel,
} from './maturity.ts';
export {
  MATURITY_LADDER,
  WAVE3_TARGET_MATURITY,
  hasReached,
  maturityIndex,
} from './maturity.ts';
export {
  EVENT_360_CAMPAIGN_APPROVAL,
  EVENT_GCC_SYN01_OBSERVATION,
  EVENT_GCC_VALUE_SIGNAL,
  EVENT_LEAD_CLIENT_CONVERSION_PREPARE,
  EVENT_MRI_FINDINGS,
  SCHEMA_360_CAMPAIGN_APPROVAL,
  SCHEMA_GCC_VALUE_SIGNAL,
  SCHEMA_LEAD_CONVERSION_PREPARE,
  SCHEMA_MRI_FINDINGS,
} from './events.ts';

export * from './authority.ts';
