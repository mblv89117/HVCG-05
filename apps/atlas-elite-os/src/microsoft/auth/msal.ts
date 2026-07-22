import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';
import { microsoftConfig, isEntraConfigured, dataverseApiRoot } from '../config';

let pca: PublicClientApplication | null = null;
let initPromise: Promise<PublicClientApplication | null> | null = null;

export function getDataverseScopes(resource = microsoftConfig.dataverseUrl): string[] {
  return [`${resource.replace(/\/$/, '')}/.default`];
}

export function getGraphScopes(): string[] {
  return ['User.Read', 'Sites.Read.All', 'Files.Read.All', 'Calendars.Read', 'Mail.Read'];
}

export async function getMsal(): Promise<PublicClientApplication | null> {
  if (!isEntraConfigured()) return null;
  if (pca) return pca;
  if (!initPromise) {
    initPromise = (async () => {
      const instance = new PublicClientApplication({
        auth: {
          clientId: microsoftConfig.entraClientId,
          authority: `https://login.microsoftonline.com/${microsoftConfig.tenantId}`,
          redirectUri: microsoftConfig.redirectUri,
          postLogoutRedirectUri: microsoftConfig.postLogoutRedirectUri,
        },
        cache: {
          cacheLocation: 'sessionStorage',
          storeAuthStateInCookie: false,
        },
      });
      await instance.initialize();
      await instance.handleRedirectPromise().catch(() => null);
      pca = instance;
      return instance;
    })();
  }
  return initPromise;
}

export function getActiveAccount(instance: PublicClientApplication): AccountInfo | null {
  const active = instance.getActiveAccount();
  if (active) return active;
  const all = instance.getAllAccounts();
  if (all[0]) {
    instance.setActiveAccount(all[0]);
    return all[0];
  }
  return null;
}

export async function signInInteractive(): Promise<AccountInfo | null> {
  const instance = await getMsal();
  if (!instance) return null;
  const result = await instance.loginPopup({
    scopes: getDataverseScopes(),
    prompt: 'select_account',
  });
  if (result.account) instance.setActiveAccount(result.account);
  return result.account;
}

export async function signInRedirect(): Promise<void> {
  const instance = await getMsal();
  if (!instance) return;
  await instance.loginRedirect({ scopes: getDataverseScopes() });
}

export async function signOut(): Promise<void> {
  const instance = await getMsal();
  if (!instance) return;
  const account = getActiveAccount(instance);
  await instance.logoutPopup({ account: account ?? undefined });
}

export async function acquireToken(scopes: string[]): Promise<string | null> {
  const instance = await getMsal();
  if (!instance) return null;
  const account = getActiveAccount(instance);
  if (!account) return null;
  try {
    const silent: AuthenticationResult = await instance.acquireTokenSilent({ account, scopes });
    return silent.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const interactive = await instance.acquireTokenPopup({ account, scopes });
      return interactive.accessToken;
    }
    throw e;
  }
}

export async function acquireDataverseToken(): Promise<string | null> {
  return acquireToken(getDataverseScopes());
}

export async function acquireGraphToken(): Promise<string | null> {
  return acquireToken(getGraphScopes());
}

/**
 * Bearer for Atlas Integration Hub.
 * Use Entra ID token (aud = SPA client id). Never send Microsoft Graph
 * access tokens that include a JWT header `nonce` — the hub rejects those.
 */
export async function acquireHubBearerToken(): Promise<string | null> {
  const instance = await getMsal();
  if (!instance) return null;
  const account = getActiveAccount(instance);
  if (!account) return null;

  const request = {
    account,
    scopes: ['openid', 'profile', 'email'],
    forceRefresh: false,
  };

  try {
    const silent: AuthenticationResult = await instance.acquireTokenSilent(request);
    if (silent.idToken) return silent.idToken;
  } catch (e) {
    if (!(e instanceof InteractionRequiredAuthError)) {
      // Fall through to popup only for interaction-required; otherwise try once more with refresh
      try {
        const refreshed: AuthenticationResult = await instance.acquireTokenSilent({
          ...request,
          forceRefresh: true,
        });
        if (refreshed.idToken) return refreshed.idToken;
      } catch {
        /* continue */
      }
      if (!(e instanceof InteractionRequiredAuthError)) throw e;
    }
    const interactive = await instance.acquireTokenPopup({
      account,
      scopes: ['openid', 'profile', 'email'],
    });
    if (interactive.idToken) return interactive.idToken;
  }

  // No Graph access-token fallback — Graph tokens with nonce are rejected by the hub.
  return null;
}

export { dataverseApiRoot };
