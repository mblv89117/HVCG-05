/**
 * Static Web Apps Microsoft sign-in navigation.
 *
 * Fallback only when the Elite SPA Entra client is not configured.
 * Primary hosted sign-in is MSAL (Hub access_as_user). Forcing
 * /.auth/login/aad on this Free SWA returns 401 at
 * identity.7.azurestaticapps.net/.auth/login/done because no SWA
 * invitations/users are configured.
 */

export function getSafePostLoginRedirect(href = window.location.href): string {
  try {
    const current = new URL(href);
    if (current.origin !== window.location.origin) {
      return `${window.location.origin}/`;
    }
    return current.toString();
  } catch {
    return `${window.location.origin}/`;
  }
}

export function buildSwaMicrosoftSignInUrl(href = window.location.href): string {
  const redirect = encodeURIComponent(getSafePostLoginRedirect(href));
  return `/.auth/login/aad?post_login_redirect_uri=${redirect}`;
}

/** True when hosted behind Azure Static Web Apps Easy Auth (not local Vite). */
export function shouldUseSwaSignInNavigation(hostname = window.location.hostname): boolean {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
  return (
    hostname.endsWith('.azurestaticapps.net') ||
    hostname.endsWith('.azurestaticapps.dev') ||
    hostname.includes('highvaluecapitalgroup')
  );
}

/**
 * Start one full-page SWA AAD login. Synchronous navigation — no hooks, no await.
 */
export function beginSwaMicrosoftSignIn(href = window.location.href): void {
  window.location.assign(buildSwaMicrosoftSignInUrl(href));
}
