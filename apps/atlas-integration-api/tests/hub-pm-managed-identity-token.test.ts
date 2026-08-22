import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PmHttpError } from '../src/pm/sharepoint/errors.ts';
import {
  APP_SERVICE_MSI_API_VERSION,
  createManagedIdentityTokenProvider,
  GRAPH_TOKEN_RESOURCE,
} from '../src/pm/sharepoint/token.ts';
import { resolvePmBackend, UnsafeHubConfigurationError } from '../src/config.ts';

const CLIENT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const IDENTITY_ENDPOINT = 'http://127.0.0.1:8081/msi/token';
const IDENTITY_HEADER = 'test-identity-header-sentinel-do-not-leak';
const ACCESS_TOKEN = 'test-access-token-sentinel-do-not-leak';
const LINUX_ENDPOINT = 'http://169.254.129.2:8081/msi/token';

function expiresOn(secondsFromNow = 3600): string {
  return String(Math.floor(Date.now() / 1000) + secondsFromNow);
}

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...(headers || {}) },
  });
}

function platformEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    IDENTITY_ENDPOINT,
    IDENTITY_HEADER,
    ...overrides,
  };
}

function assertAcquisitionFailed(err: unknown): boolean {
  assert.ok(err instanceof PmHttpError);
  assert.equal(err.status, 503);
  assert.equal(err.code, 'PM_TOKEN_ACQUISITION_FAILED');
  assert.equal(err.message, 'Managed identity token acquisition failed.');
  const blob = `${err.message}\n${err.stack || ''}\n${JSON.stringify({ code: err.code, message: err.message })}`;
  assert.equal(blob.includes(IDENTITY_HEADER), false);
  assert.equal(blob.includes(ACCESS_TOKEN), false);
  return true;
}

describe('App Service managed-identity token provider', () => {
  it('requests the platform IDENTITY_ENDPOINT with X-IDENTITY-HEADER, UAMI client_id, and Graph resource', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv(),
      fetch: async (input, init) => {
        calls.push({ url: String(input), init: init || {} });
        return jsonResponse(200, { access_token: ACCESS_TOKEN, expires_on: expiresOn() });
      },
    });

    const token = await provider.getToken();
    assert.equal(token, ACCESS_TOKEN);
    assert.equal(calls.length, 1);

    const url = new URL(calls[0].url);
    assert.equal(url.origin, 'http://127.0.0.1:8081');
    assert.equal(url.pathname, '/msi/token');
    assert.equal(url.searchParams.get('api-version'), APP_SERVICE_MSI_API_VERSION);
    assert.equal(url.searchParams.get('resource'), GRAPH_TOKEN_RESOURCE);
    assert.equal(url.searchParams.get('client_id'), CLIENT_ID);
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.redirect, 'manual');

    const headers = new Headers(calls[0].init.headers);
    assert.equal(headers.get('X-IDENTITY-HEADER'), IDENTITY_HEADER);
    assert.equal(headers.get('Metadata'), null);
    assert.equal(headers.get('Authorization'), null);
  });

  it('SharePoint production Graph token resource is Microsoft Graph, never the BA Application ID URI', () => {
    assert.equal(GRAPH_TOKEN_RESOURCE, 'https://graph.microsoft.com');
    assert.equal(GRAPH_TOKEN_RESOURCE.startsWith('api://'), false);
  });

  it('requests a custom resource URI when provided (Hub→BA Application ID URI)', async () => {
    const baResource = 'api://2bcfb552-6c82-488a-a487-246b162b8013';
    const calls: string[] = [];
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv(),
      resource: baResource,
      fetch: async (input) => {
        calls.push(String(input));
        return jsonResponse(200, { access_token: ACCESS_TOKEN, expires_on: expiresOn() });
      },
    });
    await provider.getToken();
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0]).searchParams.get('resource'), baResource);
    assert.equal(new URL(calls[0]).searchParams.get('client_id'), CLIENT_ID);
  });

  it('accepts the App Service Linux link-local token endpoint from IDENTITY_ENDPOINT', async () => {
    const calls: string[] = [];
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv({ IDENTITY_ENDPOINT: LINUX_ENDPOINT }),
      fetch: async (input) => {
        calls.push(String(input));
        return jsonResponse(200, { access_token: ACCESS_TOKEN, expires_on: expiresOn() });
      },
    });
    await provider.getToken();
    assert.ok(calls[0].startsWith('http://169.254.129.2:8081/msi/token?'));
  });

  it('ignores MANAGED_IDENTITY_ENDPOINT and never uses VM IMDS', async () => {
    const calls: string[] = [];
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv({
        MANAGED_IDENTITY_ENDPOINT: 'http://169.254.169.254/metadata/identity/oauth2/token',
      }),
      fetch: async (input) => {
        calls.push(String(input));
        return jsonResponse(200, { access_token: ACCESS_TOKEN, expires_on: expiresOn() });
      },
    });
    await provider.getToken();
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0]).host, '127.0.0.1:8081');
    assert.equal(calls[0].includes('169.254.169.254'), false);
  });

  it('fails closed when IDENTITY_ENDPOINT is missing and does not fetch', async () => {
    let fetched = 0;
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv({ IDENTITY_ENDPOINT: '' }),
      fetch: async () => {
        fetched += 1;
        return jsonResponse(200, { access_token: ACCESS_TOKEN, expires_on: expiresOn() });
      },
    });
    await assert.rejects(() => provider.getToken(), assertAcquisitionFailed);
    assert.equal(fetched, 0);
  });

  it('fails closed when IDENTITY_HEADER is missing and does not fetch', async () => {
    let fetched = 0;
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv({ IDENTITY_HEADER: '' }),
      fetch: async () => {
        fetched += 1;
        return jsonResponse(200, { access_token: ACCESS_TOKEN, expires_on: expiresOn() });
      },
    });
    await assert.rejects(() => provider.getToken(), assertAcquisitionFailed);
    assert.equal(fetched, 0);
  });

  it('fails closed when the identity endpoint is VM IMDS or a non-local host', async () => {
    const rejected = [
      'http://169.254.169.254/msi/token',
      'http://169.254.169.254/metadata/identity/oauth2/token',
      'http://example.com/msi/token',
      'https://127.0.0.1:8081/msi/token',
      'http://127.0.0.1:8081/admin',
    ];
    for (const IDENTITY_ENDPOINT of rejected) {
      let fetched = 0;
      const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
        env: platformEnv({ IDENTITY_ENDPOINT }),
        fetch: async () => {
          fetched += 1;
          return jsonResponse(200, { access_token: ACCESS_TOKEN, expires_on: expiresOn() });
        },
      });
      await assert.rejects(() => provider.getToken(), assertAcquisitionFailed);
      assert.equal(fetched, 0, IDENTITY_ENDPOINT);
    }
  });

  it('fails closed when the user-assigned client ID is missing or malformed', async () => {
    let fetched = 0;
    for (const clientId of ['', 'not-a-guid']) {
      const provider = createManagedIdentityTokenProvider(clientId, {
        env: platformEnv(),
        fetch: async () => {
          fetched += 1;
          return jsonResponse(200, { access_token: ACCESS_TOKEN, expires_on: expiresOn() });
        },
      });
      await assert.rejects(() => provider.getToken(), assertAcquisitionFailed);
    }
    assert.equal(fetched, 0);
  });

  it('SharePoint production mode rejects missing AZURE_CLIENT_ID at configuration time', () => {
    assert.throws(
      () =>
        resolvePmBackend({
          NODE_ENV: 'production',
          INTEGRATION_PM_BACKEND: 'sharepoint',
          INTEGRATION_PM_SHAREPOINT_SITE_ID:
            'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022',
          INTEGRATION_PM_PROJECTS_LIST_ID: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
          INTEGRATION_PM_TASKS_LIST_ID: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
          INTEGRATION_PM_MILESTONES_LIST_ID: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
          INTEGRATION_PM_CLIENTS_LIST_ID: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
        }),
      (err: unknown) =>
        err instanceof UnsafeHubConfigurationError && err.message.includes('AZURE_CLIENT_ID'),
    );
  });

  it('fails closed on malformed token responses', async () => {
    const bodies = [
      {},
      { expires_on: expiresOn() },
      { access_token: '', expires_on: expiresOn() },
      { access_token: ACCESS_TOKEN },
      { access_token: ACCESS_TOKEN, expires_on: 'not-a-time' },
      { access_token: ACCESS_TOKEN, expires_on: String(Math.floor(Date.now() / 1000) - 60) },
    ];
    for (const body of bodies) {
      const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
        env: platformEnv(),
        fetch: async () => jsonResponse(200, body),
      });
      await assert.rejects(() => provider.getToken(), assertAcquisitionFailed);
    }
  });

  it('fails closed on token-service 4xx without leaking the response body', async () => {
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv(),
      fetch: async () =>
        jsonResponse(400, { access_token: ACCESS_TOKEN, error: IDENTITY_HEADER }),
    });
    await assert.rejects(() => provider.getToken(), assertAcquisitionFailed);
  });

  it('fails closed on token-service 5xx without a second credential attempt', async () => {
    const urls: string[] = [];
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv(),
      fetch: async (input) => {
        urls.push(String(input));
        return jsonResponse(503, { error: 'unavailable' });
      },
    });
    await assert.rejects(() => provider.getToken(), assertAcquisitionFailed);
    assert.equal(urls.length, 1);
    assert.equal(new URL(urls[0]).host, '127.0.0.1:8081');
  });

  it('fails closed on timeout', async () => {
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv(),
      timeoutMs: 20,
      fetch: async (_input, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    });
    await assert.rejects(() => provider.getToken(), assertAcquisitionFailed);
  });

  it('does not follow redirects or forward X-IDENTITY-HEADER off the local endpoint', async () => {
    const calls: Array<{ url: string; headers: Headers }> = [];
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv(),
      fetch: async (input, init) => {
        calls.push({ url: String(input), headers: new Headers(init?.headers) });
        return new Response(null, {
          status: 302,
          headers: { Location: 'https://attacker.example/steal' },
        });
      },
    });
    await assert.rejects(() => provider.getToken(), assertAcquisitionFailed);
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0].url).hostname, '127.0.0.1');
    assert.equal(calls[0].headers.get('X-IDENTITY-HEADER'), IDENTITY_HEADER);
    assert.equal(
      calls.some((c) => c.url.includes('attacker.example')),
      false,
    );
  });

  it('does not fall back to another identity after a failed App Service token request', async () => {
    const urls: string[] = [];
    const provider = createManagedIdentityTokenProvider(CLIENT_ID, {
      env: platformEnv(),
      fetch: async (input) => {
        urls.push(String(input));
        return jsonResponse(401, { error: 'unauthorized' });
      },
    });
    await assert.rejects(() => provider.getToken(), assertAcquisitionFailed);
    assert.equal(urls.length, 1);
    assert.equal(urls[0].includes('login.microsoftonline.com'), false);
    assert.equal(urls[0].includes('169.254.169.254'), false);
  });
});
