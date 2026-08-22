import {
  IntegrationRegistry,
  unsupportedOf,
  type AdapterAction,
  type IntegrationAdapter,
  type ProviderId,
} from '@hvcg/atlas-integration-core';
import type { AppConfig } from '../config.ts';
import type { IntegrationRepository } from '../store/repository.ts';
import { createGitHubAdapter } from './github/adapter.ts';
import { createGoogleAdapter } from './google/adapter.ts';
import { createMicrosoftAdapter, type MicrosoftAdapter } from './microsoft/adapter.ts';
import type { AdapterDeps } from './context.ts';
import type { GoogleAdapter } from './google/adapter.ts';
import type { GitHubAdapter } from './github/adapter.ts';

export type ProviderAdapter = MicrosoftAdapter | GoogleAdapter | GitHubAdapter;

export interface OAuthCompletingAdapter {
  completeOAuth(code: string, stateId: string): Promise<{ connectionId: string }>;
}

const MICROSOFT_ACTIONS: AdapterAction[] = [
  'connect',
  'disconnect',
  'verifyConnection',
  'refreshAuthentication',
  'getConnectionStatus',
  'listResources',
  'searchRecords',
  'fetchRecord',
  'fetchChanges',
  'downloadFile',
  'syncNow',
  'getSyncHistory',
  'getErrors',
];

const GOOGLE_ACTIONS: AdapterAction[] = [...MICROSOFT_ACTIONS];

const GITHUB_ACTIONS: AdapterAction[] = [
  'connect',
  'disconnect',
  'verifyConnection',
  'refreshAuthentication',
  'getConnectionStatus',
  'listResources',
  'searchRecords',
  'fetchRecord',
  'createRecord',
  'processWebhook',
  'syncNow',
  'getSyncHistory',
  'getErrors',
];

export interface AppRegistry {
  registry: IntegrationRegistry;
  adapters: Map<ProviderId, ProviderAdapter>;
  deps: AdapterDeps;
}

export function buildRegistry(config: AppConfig, repo: IntegrationRepository): AppRegistry {
  const deps: AdapterDeps = { config, repo };
  const registry = new IntegrationRegistry();
  const adapters = new Map<ProviderId, ProviderAdapter>();

  const microsoft = createMicrosoftAdapter(deps);
  registry.register(
    {
      providerId: 'microsoft',
      providerName: 'Microsoft 365',
      adapterVersion: microsoft.adapterVersion,
      authenticationType: ['oauth2_delegated'],
      availableActions: MICROSOFT_ACTIONS,
      unsupportedActions: unsupportedOf(MICROSOFT_ACTIONS),
      requiredPermissions: MICROSOFT_SCOPES,
      optionalPermissions: [],
      webhookSupport: false,
      deltaSyncSupport: true,
      rateLimits: { requestsPerMinute: 600, notes: 'Graph throttling applies' },
      healthCheckEndpoint: 'https://graph.microsoft.com/v1.0/me',
      documentationLink: 'https://learn.microsoft.com/graph/',
      owner: 'Atlas Platform',
      deploymentStatus: 'development',
      defaultPermissionMode: 'read_only_discovery',
    },
    microsoft as IntegrationAdapter,
  );
  adapters.set('microsoft', microsoft);

  const google = createGoogleAdapter(deps);
  registry.register(
    {
      providerId: 'google',
      providerName: 'Google Workspace',
      adapterVersion: google.adapterVersion,
      authenticationType: ['oauth2_delegated'],
      availableActions: GOOGLE_ACTIONS,
      unsupportedActions: unsupportedOf(GOOGLE_ACTIONS),
      requiredPermissions: [
        'gmail.readonly',
        'drive.readonly',
        'calendar.readonly',
        'contacts.readonly',
      ],
      optionalPermissions: [],
      webhookSupport: false,
      deltaSyncSupport: true,
      rateLimits: { requestsPerMinute: 300 },
      documentationLink: 'https://developers.google.com/workspace',
      owner: 'Atlas Platform',
      deploymentStatus: 'development',
      defaultPermissionMode: 'read_only_discovery',
    },
    google as IntegrationAdapter,
  );
  adapters.set('google', google);

  const github = createGitHubAdapter(deps);
  registry.register(
    {
      providerId: 'github',
      providerName: 'GitHub',
      adapterVersion: github.adapterVersion,
      authenticationType: ['github_app', 'oauth2_delegated'],
      availableActions: GITHUB_ACTIONS,
      unsupportedActions: unsupportedOf(GITHUB_ACTIONS),
      requiredPermissions: ['read:user', 'repo'],
      optionalPermissions: ['workflow'],
      webhookSupport: true,
      deltaSyncSupport: false,
      rateLimits: { requestsPerMinute: 60 },
      documentationLink: 'https://docs.github.com/en/apps',
      owner: 'Atlas Platform',
      deploymentStatus: 'development',
      defaultPermissionMode: 'read_only_discovery',
    },
    github as IntegrationAdapter,
  );
  adapters.set('github', github);

  return { registry, adapters, deps };
}

const MICROSOFT_SCOPES = [
  'openid',
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Calendars.Read',
  'Contacts.Read',
  'Files.Read.All',
  'Sites.Read.All',
];

export function getProviderAdapter(
  app: AppRegistry,
  providerId: ProviderId,
): ProviderAdapter | undefined {
  return app.adapters.get(providerId);
}

export function completeOAuthForProvider(
  app: AppRegistry,
  providerId: ProviderId,
  code: string,
  state: string,
): Promise<{ connectionId: string }> {
  const adapter = app.adapters.get(providerId);
  if (!adapter || !('completeOAuth' in adapter)) {
    throw new Error(`OAuth completion not supported for ${providerId}`);
  }
  return (adapter as OAuthCompletingAdapter).completeOAuth(code, state);
}
