import { isGuid, isSharePointSiteId } from './ids.ts';

type EnvMap = Record<string, string | undefined>;

export class SharePointPmSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SharePointPmSettingsError';
  }
}

export interface SharePointPmSettings {
  siteId: string;
  projectsListId: string;
  tasksListId: string;
  milestonesListId: string;
  clientsListId: string;
  managedIdentityClientId: string;
}

export function resolveSharePointPmSettings(env: EnvMap): SharePointPmSettings {
  const siteId = (env.INTEGRATION_PM_SHAREPOINT_SITE_ID || '').trim();
  const projectsListId = (env.INTEGRATION_PM_PROJECTS_LIST_ID || '').trim();
  const tasksListId = (env.INTEGRATION_PM_TASKS_LIST_ID || '').trim();
  const milestonesListId = (env.INTEGRATION_PM_MILESTONES_LIST_ID || '').trim();
  const clientsListId = (env.INTEGRATION_PM_CLIENTS_LIST_ID || '').trim();
  const managedIdentityClientId = (env.AZURE_CLIENT_ID || '').trim();

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
    managedIdentityClientId,
  };
}
