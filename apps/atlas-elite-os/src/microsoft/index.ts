/**
 * Microsoft service façade — premium UI talks only through these adapters.
 */
export * as dataverse from './adapters/dataverse';
export * as graph from './adapters/graph';
export * as sharepoint from './adapters/sharepoint';
export * as powerAutomate from './adapters/powerAutomate';
export { microsoftConfig, isEntraConfigured, loadMicrosoftConfig } from './config';
export {
  getMsal,
  signInInteractive,
  signInRedirect,
  signOut,
  acquireDataverseToken,
  acquireGraphToken,
  acquireHubBearerToken,
  getHubApiScopes,
  getActiveAccount,
} from './auth/msal';
