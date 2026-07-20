/**
 * Role-based access — Entra group mapping comes later.
 * Until Graph group claims are wired, Owner/Executive is the default signed-in profile.
 */

export type AtlasRole = 'Owner' | 'Executive' | 'Operations' | 'Finance' | 'Advisor' | 'Guest';

const ROLE_CAPABILITIES: Record<AtlasRole, { admin: boolean; finance: boolean; clientDemo: boolean }> = {
  Owner: { admin: true, finance: true, clientDemo: true },
  Executive: { admin: true, finance: true, clientDemo: true },
  Operations: { admin: false, finance: false, clientDemo: true },
  Finance: { admin: false, finance: true, clientDemo: false },
  Advisor: { admin: false, finance: false, clientDemo: true },
  Guest: { admin: false, finance: false, clientDemo: false },
};

/** Default role for HVCG daily use until Entra app roles are configured */
export function atlasRole(): AtlasRole {
  const fromEnv = (import.meta.env.VITE_ATLAS_ROLE as AtlasRole | undefined) || 'Owner';
  return ROLE_CAPABILITIES[fromEnv] ? fromEnv : 'Owner';
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
