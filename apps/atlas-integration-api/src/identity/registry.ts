/**
 * Hub-side ClientCode identity fabric singleton.
 * Additive mappings only; unknown ClientCode fail-closed.
 */
import {
  ClientIdentityRegistry,
  DEFAULT_IDENTITY_SEED,
  type ClientIdentityMapping,
  type ModuleSystem,
  type ResolveOutcome,
} from '@hvcg/atlas-identity-map';

let registry = new ClientIdentityRegistry(DEFAULT_IDENTITY_SEED);

export function getIdentityRegistry(): ClientIdentityRegistry {
  return registry;
}

/** Test/harness only — replace seed without mutating production defaults in place. */
export function resetIdentityRegistry(rows?: readonly ClientIdentityMapping[]): void {
  registry = new ClientIdentityRegistry(rows ?? DEFAULT_IDENTITY_SEED);
}

export function resolveClientCode(input: {
  clientCode?: string | null;
  system?: ModuleSystem;
  localId?: string | null;
}): ResolveOutcome {
  return registry.dualResolve(input);
}

export function resolveClient360IdToClientCode(client360Id: string): string | null {
  const outcome = registry.resolveFromLocal('client360', client360Id);
  return outcome.ok ? outcome.result.clientCode : null;
}
