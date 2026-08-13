/**
 * Production PM Graph token: user-assigned managed identity via IMDS.
 * Explicit client ID required. No Azure CLI / VS / DefaultAzureCredential fallback.
 * Tests inject a mock provider; they never call IMDS.
 */

import { pmInfrastructureError } from './errors.ts';

export interface PmGraphTokenProvider {
  getToken(): Promise<string>;
}

const IMDS =
  'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://graph.microsoft.com';

export function createManagedIdentityTokenProvider(clientId: string): PmGraphTokenProvider {
  return {
    async getToken() {
      const url = `${IMDS}&client_id=${encodeURIComponent(clientId)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      try {
        const resp = await fetch(url, {
          headers: { Metadata: 'true' },
          signal: controller.signal,
        });
        if (!resp.ok) {
          throw pmInfrastructureError('PM_TOKEN_ACQUISITION_FAILED', 'Managed identity token acquisition failed.');
        }
        const json = (await resp.json()) as { access_token?: unknown };
        if (typeof json.access_token !== 'string' || !json.access_token) {
          throw pmInfrastructureError('PM_TOKEN_ACQUISITION_FAILED', 'Managed identity token acquisition failed.');
        }
        return json.access_token;
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err) throw err;
        throw pmInfrastructureError('PM_TOKEN_ACQUISITION_FAILED', 'Managed identity token acquisition failed.');
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
