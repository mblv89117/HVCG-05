/**
 * Role-based access for Executive Dashboard release.
 * Entra group mapping comes later; VITE_ATLAS_ROLE selects the profile.
 *
 * Release roles (canonical):
 * - HVCG Owner
 * - HVCG Team Member
 * - Client Executive
 * - Client Team Member
 * - Read-Only Advisor
 * - Administrator
 */

import { REVENUE_CAPABILITIES, canRevenue } from '../data/revenuePipeline';

export type AtlasRole =
  | 'HVCG Owner'
  | 'HVCG Team Member'
  | 'Client Executive'
  | 'Client Team Member'
  | 'Read-Only Advisor'
  | 'Administrator';

/** Legacy / shorthand env values → canonical release roles */
const ROLE_ALIASES: Record<string, AtlasRole> = {
  Owner: 'HVCG Owner',
  Executive: 'HVCG Owner',
  Operations: 'HVCG Team Member',
  Finance: 'HVCG Team Member',
  Advisor: 'Read-Only Advisor',
  Guest: 'Client Team Member',
  Administrator: 'Administrator',
  Admin: 'Administrator',
  'HVCG Owner': 'HVCG Owner',
  'HVCG Team Member': 'HVCG Team Member',
  'Client Executive': 'Client Executive',
  'Client Team Member': 'Client Team Member',
  'Read-Only Advisor': 'Read-Only Advisor',
};

type RoleCaps = {
  admin: boolean;
  finance: boolean;
  clientDemo: boolean;
  revenue: boolean;
  revenueMutate: boolean;
};

const ROLE_CAPABILITIES: Record<AtlasRole, RoleCaps> = {
  'HVCG Owner': { admin: true, finance: true, clientDemo: true, revenue: true, revenueMutate: true },
  Administrator: { admin: true, finance: true, clientDemo: true, revenue: true, revenueMutate: true },
  'HVCG Team Member': {
    admin: false,
    finance: true,
    clientDemo: true,
    revenue: true,
    revenueMutate: true,
  },
  'Client Executive': {
    admin: false,
    finance: false,
    clientDemo: true,
    revenue: false,
    revenueMutate: false,
  },
  'Client Team Member': {
    admin: false,
    finance: false,
    clientDemo: true,
    revenue: false,
    revenueMutate: false,
  },
  'Read-Only Advisor': {
    admin: false,
    finance: false,
    clientDemo: true,
    revenue: true,
    revenueMutate: false,
  },
};

const READ_ONLY_CAPABILITIES: Array<keyof typeof REVENUE_CAPABILITIES> = [
  'viewWeightedPipeline',
  'identifyStale',
];

const TEAM_MEMBER_DENIED: Array<keyof typeof REVENUE_CAPABILITIES> = [
  'convertLead',
  'markWonLost',
  'manageReferrals',
  'forecastRevenue',
];

export function normalizeAtlasRole(raw: string | undefined): AtlasRole {
  if (!raw) return 'HVCG Owner';
  if (ROLE_ALIASES[raw]) return ROLE_ALIASES[raw];
  if ((ROLE_CAPABILITIES as Record<string, RoleCaps>)[raw]) return raw as AtlasRole;
  return 'HVCG Owner';
}

/** Default role for HVCG daily use until Entra app roles are configured */
export function atlasRole(): AtlasRole {
  return normalizeAtlasRole(import.meta.env.VITE_ATLAS_ROLE as string | undefined);
}

export function canAccessAdmin(role: AtlasRole = atlasRole()): boolean {
  return ROLE_CAPABILITIES[role].admin;
}

export function canViewFinance(role: AtlasRole = atlasRole()): boolean {
  return ROLE_CAPABILITIES[role].finance;
}

export function canOpenClientDemo(role: AtlasRole = atlasRole()): boolean {
  return ROLE_CAPABILITIES[role].clientDemo;
}

export function canAccessRevenue(role: AtlasRole = atlasRole()): boolean {
  return ROLE_CAPABILITIES[role].revenue;
}

export function canMutateRevenue(role: AtlasRole = atlasRole()): boolean {
  return ROLE_CAPABILITIES[role].revenueMutate;
}

export function canRevenueCapability(
  capability: keyof typeof REVENUE_CAPABILITIES,
  role: AtlasRole = atlasRole()
): boolean {
  if (!canAccessRevenue(role)) return false;

  if (role === 'Read-Only Advisor') {
    return READ_ONLY_CAPABILITIES.includes(capability);
  }

  if (role === 'HVCG Team Member') {
    if (TEAM_MEMBER_DENIED.includes(capability)) return false;
    return (
      canRevenue(capability, 'Advisor') ||
      canRevenue(capability, 'Operations') ||
      canRevenue(capability, 'Finance')
    );
  }

  // HVCG Owner + Administrator: full Owner matrix
  return canRevenue(capability, 'Owner');
}
