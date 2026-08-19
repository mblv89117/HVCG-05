// Dataverse token acquisition for HVCG Development (Development/UAT provisioning).
// Uses MSAL device-code flow with a disk-persisted cache so sign-in happens
// at most once per session; afterwards tokens refresh silently.
import { PublicClientApplication } from '@azure/msal-node';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', '.token-cache.json');

export const TENANT_ID = '3df46563-86f3-4414-87fd-84ba967741ef';
export const DEV_RESOURCE = 'https://org1131a2b0.crm.dynamics.com';
// Microsoft Azure CLI public client (device-code capable, pre-consented in most tenants).
const CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';

const cachePlugin = {
  beforeCacheAccess: async (ctx) => {
    if (existsSync(CACHE_PATH)) ctx.tokenCache.deserialize(readFileSync(CACHE_PATH, 'utf8'));
  },
  afterCacheAccess: async (ctx) => {
    if (ctx.cacheHasChanged) writeFileSync(CACHE_PATH, ctx.tokenCache.serialize());
  },
};

const pca = new PublicClientApplication({
  auth: { clientId: CLIENT_ID, authority: `https://login.microsoftonline.com/${TENANT_ID}` },
  cache: { cachePlugin },
});

const SCOPES = [`${DEV_RESOURCE}/.default`];

export async function getToken() {
  const accounts = await pca.getTokenCache().getAllAccounts();
  if (accounts.length) {
    try {
      const res = await pca.acquireTokenSilent({ account: accounts[0], scopes: SCOPES });
      if (res?.accessToken) return res.accessToken;
    } catch {
      // fall through to device code
    }
  }
  const res = await pca.acquireTokenByDeviceCode({
    scopes: SCOPES,
    deviceCodeCallback: (info) => {
      console.log('\n=== MICROSOFT SIGN-IN REQUIRED (one time) ===');
      console.log(info.message);
      console.log('=============================================\n');
    },
  });
  if (!res?.accessToken) throw new Error('Failed to acquire Dataverse token');
  return res.accessToken;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  getToken().then((t) => {
    console.log('TOKEN_OK len=' + t.length);
  }).catch((e) => { console.error('TOKEN_FAIL', e.message); process.exit(1); });
}
