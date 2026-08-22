/**
 * Production connector mixed-content policy (Gate 11R-3D / S5).
 *
 * Connector search and mixed-content sync stay disabled in production until
 * the approved SharePoint source-container → ClientCode mapping model exists.
 * There is no environment flag that re-enables these paths.
 *
 * Ownership still applies in every environment. Production denial happens
 * after ownership authorization and before any provider token use.
 */

export const CONNECTOR_SEARCH_DISABLED_IN_PRODUCTION = 'CONNECTOR_SEARCH_DISABLED_IN_PRODUCTION';
export const CONNECTOR_SYNC_DISABLED_IN_PRODUCTION = 'CONNECTOR_SYNC_DISABLED_IN_PRODUCTION';

export function isProductionRuntime(isProduction: boolean): boolean {
  return isProduction === true;
}

export function isConnectorSearchDisabled(isProduction: boolean): boolean {
  return isProductionRuntime(isProduction);
}

export function isConnectorSyncDisabled(isProduction: boolean): boolean {
  return isProductionRuntime(isProduction);
}
