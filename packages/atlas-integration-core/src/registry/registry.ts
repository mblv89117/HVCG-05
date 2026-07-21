import type { AdapterAction, ProviderId } from '../types/provider.ts';
import type { IntegrationRegistryEntry } from '../types/records.ts';
import type { IntegrationAdapter } from '../types/adapter.ts';

const ALL_ACTIONS: AdapterAction[] = [
  'connect',
  'disconnect',
  'verifyConnection',
  'refreshAuthentication',
  'getConnectionStatus',
  'listResources',
  'searchRecords',
  'fetchRecord',
  'fetchChanges',
  'createRecord',
  'updateRecord',
  'uploadFile',
  'downloadFile',
  'subscribeToChanges',
  'processWebhook',
  'syncNow',
  'getSyncHistory',
  'getErrors',
];

export class IntegrationRegistry {
  private entries = new Map<ProviderId, IntegrationRegistryEntry>();
  private adapters = new Map<ProviderId, IntegrationAdapter>();

  register(entry: IntegrationRegistryEntry, adapter: IntegrationAdapter): void {
    if (entry.providerId !== adapter.providerId) {
      throw new Error('Registry entry providerId must match adapter.providerId');
    }
    this.entries.set(entry.providerId, entry);
    this.adapters.set(entry.providerId, adapter);
  }

  get(providerId: ProviderId): IntegrationRegistryEntry | undefined {
    return this.entries.get(providerId);
  }

  getAdapter(providerId: ProviderId): IntegrationAdapter | undefined {
    return this.adapters.get(providerId);
  }

  list(): IntegrationRegistryEntry[] {
    return [...this.entries.values()].sort((a, b) =>
      a.providerName.localeCompare(b.providerName),
    );
  }

  listAdapters(): IntegrationAdapter[] {
    return [...this.adapters.values()];
  }
}

export function unsupportedOf(supported: AdapterAction[]): AdapterAction[] {
  return ALL_ACTIONS.filter((a) => !supported.includes(a));
}

export { ALL_ACTIONS };
