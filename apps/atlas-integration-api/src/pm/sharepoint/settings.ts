import { isGuid, isSharePointSiteId } from './ids.ts';

type EnvMap = Record<string, string | undefined>;

export class SharePointPmSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SharePointPmSettingsError';
  }
}

export const WORKSPACE_LIST_ENV: ReadonlyArray<{
  env: string;
  key:
    | 'communicationsListId'
    | 'meetingsListId'
    | 'engagementsListId'
    | 'deliverablesListId'
    | 'decisionsListId'
    | 'risksListId'
    | 'contactsListId'
    | 'vendorsListId'
    | 'referralsListId'
    | 'opportunitiesListId';
}> = [
  { env: 'INTEGRATION_PM_COMMUNICATIONS_LIST_ID', key: 'communicationsListId' },
  { env: 'INTEGRATION_PM_MEETINGS_LIST_ID', key: 'meetingsListId' },
  { env: 'INTEGRATION_PM_ENGAGEMENTS_LIST_ID', key: 'engagementsListId' },
  { env: 'INTEGRATION_PM_DELIVERABLES_LIST_ID', key: 'deliverablesListId' },
  { env: 'INTEGRATION_PM_DECISIONS_LIST_ID', key: 'decisionsListId' },
  { env: 'INTEGRATION_PM_RISKS_LIST_ID', key: 'risksListId' },
  { env: 'INTEGRATION_PM_CONTACTS_LIST_ID', key: 'contactsListId' },
  { env: 'INTEGRATION_PM_VENDORS_LIST_ID', key: 'vendorsListId' },
  { env: 'INTEGRATION_PM_REFERRALS_LIST_ID', key: 'referralsListId' },
  { env: 'INTEGRATION_PM_OPPORTUNITIES_LIST_ID', key: 'opportunitiesListId' },
];

export interface SharePointPmSettings {
  siteId: string;
  projectsListId: string;
  tasksListId: string;
  milestonesListId: string;
  clientsListId: string;
  /** Optional HVCG_Leads list for keyed website ingest. Unset keeps PM-only allowlist. */
  leadsListId?: string;
  /** Optional Atlas-owned HVCG_* lists. Unset → section reports SOURCE DATA NOT FOUND. */
  communicationsListId?: string;
  meetingsListId?: string;
  engagementsListId?: string;
  deliverablesListId?: string;
  decisionsListId?: string;
  risksListId?: string;
  contactsListId?: string;
  vendorsListId?: string;
  referralsListId?: string;
  opportunitiesListId?: string;
  managedIdentityClientId: string;
}

function optionalGuid(env: EnvMap, name: string): string | undefined {
  const value = (env[name] || '').trim();
  if (!value) return undefined;
  if (value === '*' || value.includes('*')) {
    throw new SharePointPmSettingsError(`Unsafe configuration: ${name} must not be a wildcard.`);
  }
  if (!isGuid(value)) {
    throw new SharePointPmSettingsError(`Unsafe configuration: ${name} is malformed.`);
  }
  return value;
}

export function resolveSharePointPmSettings(env: EnvMap): SharePointPmSettings {
  const siteId = (env.INTEGRATION_PM_SHAREPOINT_SITE_ID || '').trim();
  const projectsListId = (env.INTEGRATION_PM_PROJECTS_LIST_ID || '').trim();
  const tasksListId = (env.INTEGRATION_PM_TASKS_LIST_ID || '').trim();
  const milestonesListId = (env.INTEGRATION_PM_MILESTONES_LIST_ID || '').trim();
  const clientsListId = (env.INTEGRATION_PM_CLIENTS_LIST_ID || '').trim();
  const leadsListId = optionalGuid(env, 'INTEGRATION_PM_LEADS_LIST_ID');
  const managedIdentityClientId = (env.AZURE_CLIENT_ID || '').trim();
  const workspaceLists: Partial<SharePointPmSettings> = {};
  for (const row of WORKSPACE_LIST_ENV) {
    const id = optionalGuid(env, row.env);
    if (id) workspaceLists[row.key] = id;
  }

  const missing: string[] = [];
  if (!siteId) missing.push('INTEGRATION_PM_SHAREPOINT_SITE_ID');
  if (!projectsListId) missing.push('INTEGRATION_PM_PROJECTS_LIST_ID');
  if (!tasksListId) missing.push('INTEGRATION_PM_TASKS_LIST_ID');
  if (!milestonesListId) missing.push('INTEGRATION_PM_MILESTONES_LIST_ID');
  if (!clientsListId) missing.push('INTEGRATION_PM_CLIENTS_LIST_ID');
  if (!managedIdentityClientId) missing.push('AZURE_CLIENT_ID');
  if (missing.length) {
    throw new SharePointPmSettingsError(
      `Unsafe configuration: INTEGRATION_PM_BACKEND=sharepoint requires ${missing.join(', ')}.`,
    );
  }
  if (!isSharePointSiteId(siteId)) {
    throw new SharePointPmSettingsError(
      'Unsafe configuration: INTEGRATION_PM_SHAREPOINT_SITE_ID is malformed.',
    );
  }
  for (const [name, value] of [
    ['INTEGRATION_PM_PROJECTS_LIST_ID', projectsListId],
    ['INTEGRATION_PM_TASKS_LIST_ID', tasksListId],
    ['INTEGRATION_PM_MILESTONES_LIST_ID', milestonesListId],
    ['INTEGRATION_PM_CLIENTS_LIST_ID', clientsListId],
    ['AZURE_CLIENT_ID', managedIdentityClientId],
  ] as const) {
    if (value === '*' || value.includes('*')) {
      throw new SharePointPmSettingsError(`Unsafe configuration: ${name} must not be a wildcard.`);
    }
    if (!isGuid(value)) {
      throw new SharePointPmSettingsError(`Unsafe configuration: ${name} is malformed.`);
    }
  }
  const ids = [projectsListId, tasksListId, milestonesListId, clientsListId];
  if (leadsListId) ids.push(leadsListId);
  for (const id of Object.values(workspaceLists)) {
    if (typeof id === 'string' && id) ids.push(id);
  }
  if (new Set(ids).size !== ids.length) {
    throw new SharePointPmSettingsError(
      'Unsafe configuration: SharePoint PM list IDs must be distinct.',
    );
  }
  return {
    siteId,
    projectsListId,
    tasksListId,
    milestonesListId,
    clientsListId,
    ...(leadsListId ? { leadsListId } : {}),
    ...workspaceLists,
    managedIdentityClientId,
  };
}
