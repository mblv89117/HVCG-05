/**
 * Server-side staff client entitlement resolver.
 *
 * Verified Entra oid → membership in approved HVCG-Client-{ClientCode} groups
 * → canonical ClientCode allow-list. Never returns '*'. Fail closed.
 */

import { isCanonicalClientCode } from './clientCode.ts';
import { checkMemberGroups } from './graphMembership.ts';
import type { AppConfig } from '../config.ts';

const OID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isEntraOid(raw: string | null | undefined): raw is string {
  return typeof raw === 'string' && OID_RE.test(raw);
}

export type MembershipLookup = (
  oid: string,
  groupIds: string[],
) => Promise<string[] | 'failed'>;

export interface EntitlementCacheEntry {
  codes: string[];
  expiresAtMs: number;
}

export class ClientEntitlementResolver {
  private readonly cache = new Map<string, EntitlementCacheEntry>();

  constructor(
    private readonly approvedGroups: ReadonlyMap<string, string>,
    private readonly lookup: MembershipLookup,
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  clearCache(): void {
    this.cache.clear();
  }

  /** Test helper: seed a derived cache entry. */
  seedCache(oid: string, codes: string[], expiresAtMs: number): void {
    this.cache.set(oid, { codes: [...codes], expiresAtMs });
  }

  cacheGet(oid: string): EntitlementCacheEntry | undefined {
    return this.cache.get(oid);
  }

  async resolveAllowedClientIds(oid: string | undefined): Promise<string[]> {
    if (!isEntraOid(oid)) return [];
    const now = this.now();
    const cached = this.cache.get(oid);
    if (cached && cached.expiresAtMs > now) {
      return [...cached.codes];
    }

    const groupIds = [...this.approvedGroups.keys()];
    if (!groupIds.length) return [];

    let memberIds: string[] | 'failed';
    try {
      memberIds = await this.lookup(oid, groupIds);
    } catch {
      return [];
    }
    if (memberIds === 'failed') {
      this.cache.delete(oid);
      return [];
    }

    const codes = new Set<string>();
    for (const groupId of memberIds) {
      const code = this.approvedGroups.get(groupId);
      if (!code || !isCanonicalClientCode(code) || code === '*') continue;
      codes.add(code);
    }
    const list = [...codes].sort();
    this.remember(oid, list, now);
    return list;
  }

  private remember(oid: string, codes: string[], now: number): void {
    if (this.ttlMs <= 0) return;
    if (this.cache.size >= this.maxEntries) {
      const first = this.cache.keys().next().value;
      if (first) this.cache.delete(first);
    }
    this.cache.set(oid, { codes: [...codes], expiresAtMs: now + this.ttlMs });
  }
}

const resolversByConfig = new WeakMap<object, ClientEntitlementResolver>();

export function createDefaultEntitlementResolver(cfg: AppConfig): ClientEntitlementResolver {
  return new ClientEntitlementResolver(
    cfg.clientEntitlement.approvedGroups,
    (oid, groupIds) => checkMemberGroups(cfg, oid, groupIds),
    cfg.clientEntitlement.cacheTtlMs,
    cfg.clientEntitlement.cacheMaxEntries,
  );
}

function resolverFor(cfg: AppConfig): ClientEntitlementResolver {
  let resolver = resolversByConfig.get(cfg);
  if (!resolver) {
    resolver = createDefaultEntitlementResolver(cfg);
    resolversByConfig.set(cfg, resolver);
  }
  return resolver;
}

export async function resolveAllowedClientIdsFromConfig(
  oid: string | undefined,
  cfg: AppConfig,
): Promise<string[]> {
  if (cfg.resolveAllowedClientIds) {
    try {
      const raw = await cfg.resolveAllowedClientIds(oid);
      return sanitizeResolvedCodes(raw);
    } catch {
      return [];
    }
  }
  if (!cfg.clientEntitlement.enabled) return [];
  return resolverFor(cfg).resolveAllowedClientIds(oid);
}

export function sanitizeResolvedCodes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    if (item === '*') continue;
    if (!isCanonicalClientCode(item)) continue;
    out.add(item);
  }
  return [...out].sort();
}
