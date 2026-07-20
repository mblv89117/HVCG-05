/**
 * DEF-ELITE-004 / DEF-ELITE-009 — Role matrix enforcement.
 * Never default to Owner. Deny when role cannot be resolved.
 */

export type AtlasRole =
  | 'HVCG Owner'
  | 'HVCG Team Member'
  | 'Client Executive'
  | 'Client Team Member'
  | 'Read-Only Advisor'
  | 'Administrator'
  | 'Unauthenticated'
  | 'Unresolved';

export type Capability =
  | 'viewExecutiveHome'
  | 'viewClients'
  | 'viewClientDetail'
  | 'viewFinance'
  | 'mutateTasks'
  | 'mutateApprovals'
  | 'viewAdmin'
  | 'viewDocumentsConfidential';

const MATRIX: Record<
  Exclude<AtlasRole, 'Unauthenticated' | 'Unresolved'>,
  Record<Capability, boolean>
> = {
  'HVCG Owner': {
    viewExecutiveHome: true,
    viewClients: true,
    viewClientDetail: true,
    viewFinance: true,
    mutateTasks: true,
    mutateApprovals: true,
    viewAdmin: true,
    viewDocumentsConfidential: true,
  },
  'HVCG Team Member': {
    viewExecutiveHome: true,
    viewClients: true,
    viewClientDetail: true,
    viewFinance: true,
    mutateTasks: true,
    mutateApprovals: true,
    viewAdmin: false,
    viewDocumentsConfidential: true,
  },
  'Client Executive': {
    viewExecutiveHome: false,
    viewClients: true,
    viewClientDetail: true,
    viewFinance: false,
    mutateTasks: true,
    mutateApprovals: false,
    viewAdmin: false,
    viewDocumentsConfidential: false,
  },
  'Client Team Member': {
    viewExecutiveHome: false,
    viewClients: true,
    viewClientDetail: true,
    viewFinance: false,
    mutateTasks: true,
    mutateApprovals: false,
    viewAdmin: false,
    viewDocumentsConfidential: false,
  },
  'Read-Only Advisor': {
    viewExecutiveHome: true,
    viewClients: true,
    viewClientDetail: true,
    viewFinance: false,
    mutateTasks: false,
    mutateApprovals: false,
    viewAdmin: false,
    viewDocumentsConfidential: false,
  },
  Administrator: {
    viewExecutiveHome: true,
    viewClients: true,
    viewClientDetail: true,
    viewFinance: true,
    mutateTasks: true,
    mutateApprovals: true,
    viewAdmin: true,
    viewDocumentsConfidential: true,
  },
};

const ROLE_ALIASES: Record<string, AtlasRole> = {
  owner: 'HVCG Owner',
  'hvcg owner': 'HVCG Owner',
  'hvcg_owner': 'HVCG Owner',
  executive: 'HVCG Owner',
  'team member': 'HVCG Team Member',
  'hvcg team member': 'HVCG Team Member',
  'hvcg_team_member': 'HVCG Team Member',
  'client executive': 'Client Executive',
  'client_executive': 'Client Executive',
  'client team member': 'Client Team Member',
  'client_team_member': 'Client Team Member',
  advisor: 'Read-Only Advisor',
  'read-only advisor': 'Read-Only Advisor',
  'read_only_advisor': 'Read-Only Advisor',
  administrator: 'Administrator',
  admin: 'Administrator',
};

export function normalizeRole(raw: string | null | undefined): AtlasRole | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (ROLE_ALIASES[key]) return ROLE_ALIASES[key];
  const exact = (Object.keys(MATRIX) as AtlasRole[]).find((r) => r.toLowerCase() === key);
  return exact || null;
}

/**
 * Resolve role from identity claims.
 * QA may set VITE_ALLOW_ROLE_SIM=true + VITE_ATLAS_ROLE_SIM=<role> in non-production only.
 * Never defaults to Owner.
 */
export function resolveAtlasRole(input: {
  signedIn: boolean;
  idTokenClaims?: Record<string, unknown> | null;
  environment: string;
}): AtlasRole {
  if (!input.signedIn) return 'Unauthenticated';

  const allowSim =
    import.meta.env.VITE_ALLOW_ROLE_SIM === 'true' && input.environment !== 'production';
  if (allowSim) {
    const sim = normalizeRole(String(import.meta.env.VITE_ATLAS_ROLE_SIM || ''));
    if (sim && sim !== 'Unauthenticated' && sim !== 'Unresolved') return sim;
  }

  const claims = input.idTokenClaims || {};
  const candidates: unknown[] = [
    claims.extension_AtlasRole,
    claims.atlas_role,
    claims.roles,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      for (const item of c) {
        const n = normalizeRole(String(item));
        if (n) return n;
      }
    } else if (typeof c === 'string') {
      const n = normalizeRole(c);
      if (n) return n;
    }
  }

  return 'Unresolved';
}

export function can(role: AtlasRole, capability: Capability): boolean {
  if (role === 'Unauthenticated' || role === 'Unresolved') return false;
  return MATRIX[role][capability];
}

export function canAccessAdmin(role: AtlasRole): boolean {
  return can(role, 'viewAdmin');
}

export function canViewFinance(role: AtlasRole): boolean {
  return can(role, 'viewFinance');
}

export function canMutateTasks(role: AtlasRole): boolean {
  return can(role, 'mutateTasks');
}

export function canMutateApprovals(role: AtlasRole): boolean {
  return can(role, 'mutateApprovals');
}

export function canViewClients(role: AtlasRole): boolean {
  return can(role, 'viewClients');
}

/** @deprecated Use resolveAtlasRole — kept only to fail closed if called */
export function atlasRole(): AtlasRole {
  return 'Unresolved';
}
