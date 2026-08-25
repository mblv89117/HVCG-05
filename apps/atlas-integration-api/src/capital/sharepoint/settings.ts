/**
 * Capital SharePoint Graph settings.
 *
 * Tenant documentation only — never used as runtime defaults:
 *   Site: INTEGRATION_PM_SHAREPOINT_SITE_ID (reuse env; do not hardcode GUID)
 *   HVCG_CapitalOpportunities 255763b8-7c44-446b-8290-adde5c3c6f66
 *   HVCG_DocumentRequests 89a421e9-3086-47ef-80c3-214500d3d92c
 *   HVCG_LenderOutreach c49d02bb-eab5-44b5-8232-714e30867887
 *   HVCG_Lenders 6b759f97-d074-4cc0-b3c7-c62c947fb74e
 *   HVCG_Clients = INTEGRATION_PM_CLIENTS_LIST_ID f60a7d4e-74d9-4b57-8c98-1a7b75d76104
 *
 * LIVE tenant columns are still thin. Stage / NextAction / Manny* /
 * SubmissionStatus may be missing until the owner adds them.
 * Checklist identity reuses TemplateItemKey (do not add ChecklistItemKey).
 * Do not create HVCG_CapitalStrategies or other new lists.
 */

import { isGuid, isSharePointSiteId } from '../../pm/sharepoint/ids.ts';

type EnvMap = Record<string, string | undefined>;

export class SharePointCapitalSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SharePointCapitalSettingsError';
  }
}

export interface SharePointCapitalSettings {
  siteId: string;
  opportunitiesListId: string;
  documentRequestsListId: string;
  lenderOutreachListId: string;
  lendersListId?: string;
  clientsListId?: string;
  managedIdentityClientId: string;
  allowSyntheticGraph: boolean;
  /** Additive column internal names that exist in the tenant. Unset = core fields only. */
  optionalColumns?: string[];
}

function parseFlag(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw === '') return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return defaultValue;
}

function assertGuid(name: string, value: string): void {
  if (value === '*' || value.includes('*')) {
    throw new SharePointCapitalSettingsError(`Unsafe configuration: ${name} must not be a wildcard.`);
  }
  if (!isGuid(value)) {
    throw new SharePointCapitalSettingsError(`Unsafe configuration: ${name} is malformed.`);
  }
}

export function resolveSharePointCapitalSettings(env: EnvMap): SharePointCapitalSettings {
  const siteId = (env.INTEGRATION_CAPITAL_SHAREPOINT_SITE_ID || env.INTEGRATION_PM_SHAREPOINT_SITE_ID || '').trim();
  const opportunitiesListId = (env.INTEGRATION_CAPITAL_OPPORTUNITIES_LIST_ID || '').trim();
  const documentRequestsListId = (env.INTEGRATION_CAPITAL_DOCUMENT_REQUESTS_LIST_ID || '').trim();
  const lenderOutreachListId = (env.INTEGRATION_CAPITAL_LENDER_OUTREACH_LIST_ID || '').trim();
  const lendersListId = (env.INTEGRATION_CAPITAL_LENDERS_LIST_ID || '').trim();
  const clientsListId = (env.INTEGRATION_CAPITAL_CLIENTS_LIST_ID || env.INTEGRATION_PM_CLIENTS_LIST_ID || '').trim();
  const managedIdentityClientId = (env.AZURE_CLIENT_ID || '').trim();
  const allowSyntheticGraph = parseFlag(env.INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH, false);
  const optionalRaw = (env.INTEGRATION_CAPITAL_OPTIONAL_COLUMNS || '').trim();

  const missing: string[] = [];
  if (!siteId) missing.push('INTEGRATION_CAPITAL_SHAREPOINT_SITE_ID (or INTEGRATION_PM_SHAREPOINT_SITE_ID)');
  if (!opportunitiesListId) missing.push('INTEGRATION_CAPITAL_OPPORTUNITIES_LIST_ID');
  if (!documentRequestsListId) missing.push('INTEGRATION_CAPITAL_DOCUMENT_REQUESTS_LIST_ID');
  if (!lenderOutreachListId) missing.push('INTEGRATION_CAPITAL_LENDER_OUTREACH_LIST_ID');
  if (!managedIdentityClientId) missing.push('AZURE_CLIENT_ID');
  if (missing.length) {
    throw new SharePointCapitalSettingsError(
      `Unsafe configuration: INTEGRATION_CAPITAL_BACKEND=sharepoint requires ${missing.join(', ')}.`,
    );
  }
  if (!isSharePointSiteId(siteId)) {
    throw new SharePointCapitalSettingsError(
      'Unsafe configuration: INTEGRATION_CAPITAL_SHAREPOINT_SITE_ID is malformed.',
    );
  }
  assertGuid('INTEGRATION_CAPITAL_OPPORTUNITIES_LIST_ID', opportunitiesListId);
  assertGuid('INTEGRATION_CAPITAL_DOCUMENT_REQUESTS_LIST_ID', documentRequestsListId);
  assertGuid('INTEGRATION_CAPITAL_LENDER_OUTREACH_LIST_ID', lenderOutreachListId);
  assertGuid('AZURE_CLIENT_ID', managedIdentityClientId);

  const ids = [opportunitiesListId, documentRequestsListId, lenderOutreachListId];
  if (lendersListId) {
    assertGuid('INTEGRATION_CAPITAL_LENDERS_LIST_ID', lendersListId);
    ids.push(lendersListId);
  }
  if (clientsListId) {
    assertGuid('INTEGRATION_CAPITAL_CLIENTS_LIST_ID', clientsListId);
    ids.push(clientsListId);
  }
  if (new Set(ids).size !== ids.length) {
    throw new SharePointCapitalSettingsError(
      'Unsafe configuration: SharePoint capital list IDs must be distinct.',
    );
  }

  let optionalColumns: string[] | undefined;
  if (optionalRaw) {
    if (optionalRaw === '*' || optionalRaw.includes('*')) {
      throw new SharePointCapitalSettingsError(
        'Unsafe configuration: INTEGRATION_CAPITAL_OPTIONAL_COLUMNS must not be a wildcard.',
      );
    }
    optionalColumns = optionalRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return {
    siteId,
    opportunitiesListId,
    documentRequestsListId,
    lenderOutreachListId,
    ...(lendersListId ? { lendersListId } : {}),
    ...(clientsListId ? { clientsListId } : {}),
    managedIdentityClientId,
    allowSyntheticGraph,
    ...(optionalColumns?.length ? { optionalColumns } : {}),
  };
}
