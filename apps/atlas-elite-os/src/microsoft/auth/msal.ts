import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
  InteractionRequiredAuthError,
  BrowserAuthError,
} from '@azure/msal-browser';
import { microsoftConfig, isEntraConfigured, dataverseApiRoot } from '../config';

let pca: PublicClientApplication | null = null;
let initPromise: Promise<PublicClientApplication | null> | null = null;
/** Serialize interactive MSAL calls — never run concurrent popups. */
let interactiveLock: Promise<unknown> = Promise.resolve();

export function getDataverseScopes(resource = microsoftConfig.dataverseUrl): string[] {
  return [`${resource.replace(/\/$/, '')}/.default`];
}

export function getGraphScopes(): string[] {
  return ['User.Read', 'Sites.Read.All', 'Files.Read.All', 'Calendars.Read', 'Mail.Read'];
}

/**
 * Bearer for Atlas Integration Hub.
 * Returns AuthenticationResult.accessToken for the Hub API delegated scope.
 * Never returns idToken, Graph tokens, or SPA-only ID-token audiences.
 */
export function getHubApiScopes(): string[] {
  const scope = (microsoftConfig.integrationHubApiScope || '').trim();
  if (!scope || scope.startsWith('openid') || !scope.includes('/')) {
    throw new Error(
      'VITE_INTEGRATION_HUB_API_SCOPE must be an API delegated scope (api://<hub-app-id>/access_as_user).',
    );
  }
  return [scope];
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
      // Exactly once per PCA lifetime.
      const redirectResult = await instance.handleRedirectPromise().catch(() => null);
      if (redirectResult?.account) {
        instance.setActiveAccount(redirectResult.account);
      }
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

async function withInteractiveLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = interactiveLock.then(fn, fn);
  interactiveLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sanitizeMsalError(e: unknown): string {
  if (e instanceof BrowserAuthError || e instanceof InteractionRequiredAuthError) {
    return `${e.errorCode || e.name}: ${e.message}`.slice(0, 240);
  }
  if (e instanceof Error) return e.message.slice(0, 240);
  return String(e).slice(0, 240);
}

export async function signInInteractive(): Promise<AccountInfo | null> {
  const instance = await getMsal();
  if (!instance) return null;
  return withInteractiveLock(async () => {
    const result = await instance.loginPopup({
      scopes: getDataverseScopes(),
      prompt: 'select_account',
    });
    if (result.account) instance.setActiveAccount(result.account);
    return result.account;
  });
}

export async function signInRedirect(): Promise<void> {
  const instance = await getMsal();
  if (!instance) return;
  await instance.loginRedirect({ scopes: getDataverseScopes() });
}

/**
 * Attempt SSO bootstrap using a login hint from SWA /.auth/me (hint only — not authorization).
 * Does not open popups. Returns the account when silent SSO succeeds.
 */
export async function trySsoSilent(loginHint?: string): Promise<AccountInfo | null> {
  const instance = await getMsal();
  if (!instance) return null;
  if (getActiveAccount(instance)) return getActiveAccount(instance);
  if (!loginHint) return null;
  try {
    const result = await instance.ssoSilent({
      loginHint,
      scopes: ['openid', 'profile', 'email'],
    });
    if (result.account) {
      instance.setActiveAccount(result.account);
      return result.account;
    }
  } catch {
    /* interaction required / no session — caller shows explicit action */
  }
  return getActiveAccount(instance);
}

export async function signOut(): Promise<void> {
  const instance = await getMsal();
  if (!instance) return;
  const account = getActiveAccount(instance);
  await withInteractiveLock(async () => {
    await instance.logoutPopup({ account: account ?? undefined });
  });
}

export async function acquireToken(scopes: string[]): Promise<string | null> {
  const instance = await getMsal();
  if (!instance) return null;
  const account = getActiveAccount(instance);
  if (!account) return null;
  try {
    const silent: AuthenticationResult = await instance.acquireTokenSilent({ account, scopes });
    return silent.accessToken || null;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      return withInteractiveLock(async () => {
        const interactive = await instance.acquireTokenPopup({ account, scopes });
        return interactive.accessToken || null;
      });
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

export type HubTokenAcquisition =
  | { status: 'ok'; accessToken: string }
  | { status: 'no_account' }
  | { status: 'interaction_required'; message: string }
  | { status: 'error'; message: string; category: string };

/**
 * Silent Hub API access-token acquisition only.
 * Never attaches idToken. Never opens a popup (no gesture loops on hard refresh).
 */
export async function acquireHubAccessTokenSilent(): Promise<HubTokenAcquisition> {
  try {
    const scopes = getHubApiScopes();
    const instance = await getMsal();
    if (!instance) {
      return { status: 'error', message: 'Entra is not configured', category: 'entra_unconfigured' };
    }
    const account = getActiveAccount(instance);
    if (!account) return { status: 'no_account' };

    try {
      const silent: AuthenticationResult = await instance.acquireTokenSilent({
        account,
        scopes,
        forceRefresh: false,
      });
      if (!silent.accessToken) {
        return {
          status: 'error',
          message: 'Silent acquisition returned no accessToken',
          category: 'missing_access_token',
        };
      }
      return { status: 'ok', accessToken: silent.accessToken };
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        return {
          status: 'interaction_required',
          message: 'Authorize Atlas Integration Hub to continue loading Projects and operating data.',
        };
      }
      return {
        status: 'error',
        message: sanitizeMsalError(e),
        category: 'silent_failed',
      };
    }
  } catch (e) {
    return {
      status: 'error',
      message: sanitizeMsalError(e),
      category: 'hub_scope_config',
    };
  }
}

/**
 * Interactive Hub token — call only from an explicit user click.
 */
export async function acquireHubAccessTokenInteractive(): Promise<HubTokenAcquisition> {
  try {
    const scopes = getHubApiScopes();
    const instance = await getMsal();
    if (!instance) {
      return { status: 'error', message: 'Entra is not configured', category: 'entra_unconfigured' };
    }
    const account = getActiveAccount(instance);
    if (!account) return { status: 'no_account' };

    return withInteractiveLock(async () => {
      try {
        const interactive = await instance.acquireTokenPopup({ account, scopes });
        if (!interactive.accessToken) {
          return {
            status: 'error',
            message: 'Interactive acquisition returned no accessToken',
            category: 'missing_access_token',
          };
        }
        return { status: 'ok', accessToken: interactive.accessToken };
      } catch (e) {
        if (e instanceof InteractionRequiredAuthError || e instanceof BrowserAuthError) {
          return {
            status: 'interaction_required',
            message: sanitizeMsalError(e),
          };
        }
        return {
          status: 'error',
          message: sanitizeMsalError(e),
          category: 'interactive_failed',
        };
      }
    });
  } catch (e) {
    return {
      status: 'error',
      message: sanitizeMsalError(e),
      category: 'hub_scope_config',
    };
  }
}

/** @deprecated Prefer acquireHubAccessTokenSilent / Interactive — kept for adapters that expect a string. */
export async function acquireHubBearerToken(): Promise<string | null> {
  const result = await acquireHubAccessTokenSilent();
  return result.status === 'ok' ? result.accessToken : null;
}

export { dataverseApiRoot };
