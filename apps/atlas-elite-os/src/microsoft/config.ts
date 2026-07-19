/**
 * Microsoft environment configuration for Atlas Elite OS.
 * Local Development | HVCG Development | Staging | Production
 * Secrets never live in source — only VITE_* public IDs and URLs.
 */

export type AtlasEnvironmentName = 'local' | 'development' | 'staging' | 'production';

export interface AtlasMicrosoftConfig {
  environment: AtlasEnvironmentName;
  /** Display banner */
  environmentBanner: string;
  /** Entra tenant (HVCG) */
  tenantId: string;
  /** SPA app registration client ID (public) */
  entraClientId: string;
  /** SPA redirect URI after login */
  redirectUri: string;
  /** Post-logout redirect */
  postLogoutRedirectUri: string;
  /** Dataverse org URL */
  dataverseUrl: string;
  /** Dataverse API version */
  dataverseApiVersion: string;
  /** Microsoft Graph base */
  graphUrl: string;
  /** SharePoint site URL for Atlas documents (Dev) */
  sharePointSiteUrl: string;
  /** Power Automate HTTP trigger base (Dev only; empty = disabled) */
  powerAutomateBaseUrl: string;
  /** Hosted app public URL (SWA / App Service) */
  hostedAppUrl: string;
  /** Allow labeled sample fallback when Microsoft data unavailable */
  allowSampleFallback: boolean;
  /** Block live client communications (always true outside explicit Production gates) */
  blockLiveClientComms: boolean;
}

const HVCG_TENANT = '3df46563-86f3-4414-87fd-84ba967741ef';
const DEV_DATAVERSE = 'https://org1131a2b0.crm.dynamics.com';

function env(name: string, fallback = ''): string {
  const v = (import.meta as ImportMeta & { env: Record<string, string> }).env?.[name];
  return (v ?? fallback).trim();
}

function resolveEnvironment(): AtlasEnvironmentName {
  const raw = env('VITE_ATLAS_ENV', 'local').toLowerCase();
  if (raw === 'development' || raw === 'dev') return 'development';
  if (raw === 'staging') return 'staging';
  if (raw === 'production' || raw === 'prod') return 'production';
  return 'local';
}

export function loadMicrosoftConfig(): AtlasMicrosoftConfig {
  const environment = resolveEnvironment();
  const isProd = environment === 'production';

  const config: AtlasMicrosoftConfig = {
    environment,
    environmentBanner:
      environment === 'production'
        ? 'PRODUCTION — OWNER GATES REQUIRED'
        : environment === 'staging'
          ? 'STAGING — NO LIVE CLIENT ACTIONS'
          : 'DEVELOPMENT / UAT — NO LIVE CLIENT ACTIONS',
    tenantId: env('VITE_ENTRA_TENANT_ID', HVCG_TENANT),
    entraClientId: env('VITE_ENTRA_CLIENT_ID', ''),
    redirectUri: env('VITE_REDIRECT_URI', typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5180'),
    postLogoutRedirectUri: env(
      'VITE_POST_LOGOUT_REDIRECT_URI',
      typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5180',
    ),
    dataverseUrl: env('VITE_DATAVERSE_URL', DEV_DATAVERSE).replace(/\/$/, ''),
    dataverseApiVersion: env('VITE_DATAVERSE_API_VERSION', 'v9.2'),
    graphUrl: env('VITE_GRAPH_URL', 'https://graph.microsoft.com/v1.0'),
    sharePointSiteUrl: env('VITE_SHAREPOINT_SITE_URL', ''),
    powerAutomateBaseUrl: env('VITE_POWER_AUTOMATE_BASE_URL', ''),
    hostedAppUrl: env('VITE_HOSTED_APP_URL', ''),
    allowSampleFallback: env('VITE_ALLOW_SAMPLE_FALLBACK', environment === 'local' || environment === 'development' ? 'true' : 'false') === 'true',
    blockLiveClientComms: env('VITE_BLOCK_LIVE_CLIENT_COMMS', isProd ? 'true' : 'true') === 'true',
  };

  if (isProd && !config.blockLiveClientComms) {
    throw new Error('Live client communications cannot be enabled without an explicit Production gate.');
  }

  return config;
}

export const microsoftConfig = loadMicrosoftConfig();

export function dataverseApiRoot(cfg = microsoftConfig): string {
  return `${cfg.dataverseUrl}/api/data/${cfg.dataverseApiVersion}`;
}

export function isEntraConfigured(cfg = microsoftConfig): boolean {
  return Boolean(cfg.entraClientId && cfg.tenantId);
}
