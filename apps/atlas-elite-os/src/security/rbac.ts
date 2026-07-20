/**
 * Atlas Elite OS — role-aware access (production integration).
 *
 * Product roles (Owner directive):
 * - HVCG Owner
 * - HVCG Team Member
 * - Client Executive
 * - Client Team Member
 * - Read-Only Advisor
 * - Administrator
 *
 * Entra group object IDs map via VITE_ENTRA_GROUP_* env vars (no secrets).
 * Until Graph groups resolve, VITE_ATLAS_ROLE may override for Dev/UAT only.
 */

export type AtlasProductRole =
  | 'HVCG Owner'
  | 'HVCG Team Member'
  | 'Client Executive'
  | 'Client Team Member'
  | 'Read-Only Advisor'
  | 'Administrator';

/** @deprecated Prefer AtlasProductRole — kept for admin package compatibility */
export type AtlasRole =
  | AtlasProductRole
  | 'Owner'
  | 'Administrator'
  | 'Executive'
  | 'Operations'
  | 'Finance'
  | 'Advisor'
  | 'Guest';

export interface RoleCapabilities {
  admin: boolean;
  finance: boolean;
  clientWorkspace: boolean;
  hvcgInternal: boolean;
  communications: boolean;
  externalDraft: boolean;
  mutateApprovals: boolean;
  readOnly: boolean;
}

const PRODUCT_CAPABILITIES: Record<AtlasProductRole, RoleCapabilities> = {
  'HVCG Owner': {
    admin: true,
    finance: true,
    clientWorkspace: true,
    hvcgInternal: true,
    communications: true,
    externalDraft: true,
    mutateApprovals: true,
    readOnly: false,
  },
  Administrator: {
    admin: true,
    finance: true,
    clientWorkspace: true,
    hvcgInternal: true,
    communications: true,
    externalDraft: true,
    mutateApprovals: true,
    readOnly: false,
  },
  'HVCG Team Member': {
    admin: false,
    finance: true,
    clientWorkspace: true,
    hvcgInternal: true,
    communications: true,
    externalDraft: true,
    mutateApprovals: false,
    readOnly: false,
  },
  'Client Executive': {
    admin: false,
    finance: false,
    clientWorkspace: true,
    hvcgInternal: false,
    communications: true,
    externalDraft: false,
    mutateApprovals: false,
    readOnly: false,
  },
  'Client Team Member': {
    admin: false,
    finance: false,
    clientWorkspace: true,
    hvcgInternal: false,
    communications: true,
    externalDraft: false,
    mutateApprovals: false,
    readOnly: true,
  },
  'Read-Only Advisor': {
    admin: false,
    finance: false,
    clientWorkspace: true,
    hvcgInternal: false,
    communications: true,
    externalDraft: false,
    mutateApprovals: false,
    readOnly: true,
  },
};

/** Env / legacy aliases → product role */
const ALIAS_TO_PRODUCT: Record<string, AtlasProductRole> = {
  'HVCG Owner': 'HVCG Owner',
  Owner: 'HVCG Owner',
  owner: 'HVCG Owner',
  'hvcg-owner': 'HVCG Owner',
  Administrator: 'Administrator',
  administrator: 'Administrator',
  admin: 'Administrator',
  'HVCG Team Member': 'HVCG Team Member',
  Operations: 'HVCG Team Member',
  operations: 'HVCG Team Member',
  'hvcg-team': 'HVCG Team Member',
  Finance: 'HVCG Team Member',
  'Client Executive': 'Client Executive',
  Executive: 'Client Executive',
  'client-executive': 'Client Executive',
  'Client Team Member': 'Client Team Member',
  'client-team': 'Client Team Member',
  'Read-Only Advisor': 'Read-Only Advisor',
  Advisor: 'Read-Only Advisor',
  advisor: 'Read-Only Advisor',
  Guest: 'Read-Only Advisor',
};

export function normalizeProductRole(raw: string | undefined | null): AtlasProductRole {
  if (!raw) return 'HVCG Owner';
  return ALIAS_TO_PRODUCT[raw] || ALIAS_TO_PRODUCT[raw.trim()] || 'HVCG Owner';
}

export function capabilitiesFor(role: AtlasRole = atlasRole()): RoleCapabilities {
  const product = normalizeProductRole(role);
  return PRODUCT_CAPABILITIES[product];
}

/**
 * Synchronous role for first paint.
 * Prefer RoleContext (async Graph) when available.
 */
let resolvedRoleOverride: AtlasProductRole | null = null;

export function setResolvedAtlasRole(role: AtlasProductRole | null): void {
  resolvedRoleOverride = role;
}

export function atlasRole(): AtlasRole {
  if (resolvedRoleOverride) return resolvedRoleOverride;
  const fromEnv = import.meta.env.VITE_ATLAS_ROLE as string | undefined;
  return normalizeProductRole(fromEnv || 'HVCG Owner');
}

export function productRole(role: AtlasRole = atlasRole()): AtlasProductRole {
  return normalizeProductRole(role);
}

export function canAccessAdmin(role: AtlasRole = atlasRole()): boolean {
  return capabilitiesFor(role).admin;
}

export function canViewFinance(role: AtlasRole = atlasRole()): boolean {
  return capabilitiesFor(role).finance;
}

export function canOpenClientDemo(role: AtlasRole = atlasRole()): boolean {
  return capabilitiesFor(role).clientWorkspace;
}

export function canViewHvcgInternal(role: AtlasRole = atlasRole()): boolean {
  return capabilitiesFor(role).hvcgInternal;
}

export function canViewCommunications(role: AtlasRole = atlasRole()): boolean {
  return capabilitiesFor(role).communications;
}

export function canPrepareExternalDraft(role: AtlasRole = atlasRole()): boolean {
  return capabilitiesFor(role).externalDraft;
}

export function canMutateApprovals(role: AtlasRole = atlasRole()): boolean {
  return capabilitiesFor(role).mutateApprovals;
}

export function isReadOnlyRole(role: AtlasRole = atlasRole()): boolean {
  return capabilitiesFor(role).readOnly;
}

/** Entra security group object IDs (public directory IDs — not secrets) */
export function entraGroupRoleMap(): Partial<Record<AtlasProductRole, string>> {
  return {
    'HVCG Owner': (import.meta.env.VITE_ENTRA_GROUP_HVCG_OWNER || '').trim() || undefined,
    Administrator: (import.meta.env.VITE_ENTRA_GROUP_ADMINISTRATOR || '').trim() || undefined,
    'HVCG Team Member': (import.meta.env.VITE_ENTRA_GROUP_HVCG_TEAM || '').trim() || undefined,
    'Client Executive': (import.meta.env.VITE_ENTRA_GROUP_CLIENT_EXECUTIVE || '').trim() || undefined,
    'Client Team Member': (import.meta.env.VITE_ENTRA_GROUP_CLIENT_TEAM || '').trim() || undefined,
    'Read-Only Advisor': (import.meta.env.VITE_ENTRA_GROUP_READ_ONLY_ADVISOR || '').trim() || undefined,
  };
}

/**
 * Resolve highest-privilege product role from Graph transitive member group IDs.
 * Priority: Administrator → HVCG Owner → HVCG Team → Client Executive → Client Team → Read-Only Advisor
 */
export function resolveRoleFromGroupIds(groupIds: string[]): AtlasProductRole | null {
  const map = entraGroupRoleMap();
  const set = new Set(groupIds.map((g) => g.toLowerCase()));
  const order: AtlasProductRole[] = [
    'Administrator',
    'HVCG Owner',
    'HVCG Team Member',
    'Client Executive',
    'Client Team Member',
    'Read-Only Advisor',
  ];
  for (const role of order) {
    const gid = map[role];
    if (gid && set.has(gid.toLowerCase())) return role;
  }
  return null;
}

/** Nav items allowed for role */
export function navAllowed(itemId: string, role: AtlasRole = atlasRole()): boolean {
  const caps = capabilitiesFor(role);
  if (itemId === 'admin') return caps.admin;
  if (itemId === 'financials' || itemId === 'revenue' || itemId === 'ev') return caps.finance || caps.hvcgInternal;
  if (!caps.hvcgInternal && (itemId === 'capital' || itemId === 'ai')) {
    // Client roles may still see capital readiness on their workspace; capital module OK
    return itemId === 'capital' ? caps.clientWorkspace : false;
  }
  return true;
}
