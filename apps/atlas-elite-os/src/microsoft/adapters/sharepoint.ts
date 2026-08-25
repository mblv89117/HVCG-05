/**
 * SharePoint document adapter — thin façade over Graph for Atlas documents.
 * Prefer Graph Sites/Files APIs; do not use local filesystem storage.
 */
export {
  listSiteDocuments as listAtlasDocuments,
} from './graph';

export interface SharePointUploadIntent {
  /** Dev-only: uploads go through Graph; never store binaries in repo */
  fileName: string;
  folderPath?: string;
}

export function assertSharePointConfigured(siteUrl: string): void {
  if (!siteUrl) {
    throw new Error('SharePoint site URL missing. Set VITE_SHAREPOINT_SITE_URL for HVCG Development.');
  }
}
