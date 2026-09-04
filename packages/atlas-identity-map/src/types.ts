/**
 * Atlas ClientCode identity fabric.
 * Canonical business key: HVCG_Clients.ClientCode.
 * Local module IDs are retained; unknown ClientCode fails closed.
 */

export type ModuleSystem =
  | 'atlas_sharepoint'
  | 'entra_group'
  | 'gcc'
  | 'growth_360'
  | 'copilot_mri'
  | 'website_lead'
  | 'client360'
  | 'entity_location'
  | 'user';

export type MappingConfidence = 'VERIFIED' | 'ESTIMATED' | 'INFERRED';

/** Additive mapping row — never deletes local module IDs. */
export type ClientIdentityMapping = {
  clientCode: string;
  displayName: string;
  entraGroupDisplayName: string;
  hvcgClientsItemId?: string | null;
  gccOrganizationId?: string | null;
  growth360OrganizationId?: string | null;
  growth360Slug?: string | null;
  copilotOrganizationId?: string | null;
  /** Trusted Client 360 UUID only — never inferred from name/email/domain */
  client360Id?: string | null;
  websiteLeadProspectKey?: string | null;
  entityLocationKeys?: string[];
  userKeys?: string[];
  confidence: MappingConfidence;
  notes?: string;
  updatedAt: string;
};

export type DualResolveResult = {
  clientCode: string;
  mapping: ClientIdentityMapping;
  resolvedFrom: ModuleSystem;
  localId: string;
};

export type ResolveFailure = {
  ok: false;
  reason: 'UNKNOWN_CLIENT_CODE' | 'UNKNOWN_LOCAL_ID' | 'MALFORMED_CLIENT_CODE' | 'AMBIGUOUS';
  detail: string;
};

export type ResolveSuccess = {
  ok: true;
  result: DualResolveResult;
};

export type ResolveOutcome = ResolveSuccess | ResolveFailure;
