export type {
  ClientIdentityMapping,
  DualResolveResult,
  MappingConfidence,
  ModuleSystem,
  ResolveFailure,
  ResolveOutcome,
  ResolveSuccess,
} from './types.ts';
export {
  CLIENT_GROUP_PREFIX,
  entraGroupForClientCode,
  isCanonicalClientCode,
} from './validate.ts';
export { ClientIdentityRegistry } from './registry.ts';
export {
  DEFAULT_IDENTITY_SEED,
  FIXTURE_CLIENT_IDENTITY_SEED,
  PRODUCTION_CLIENT_IDENTITY_SEED,
} from './seed.ts';
