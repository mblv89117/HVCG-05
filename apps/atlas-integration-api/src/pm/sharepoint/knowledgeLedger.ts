/**
 * Entitled staff knowledge inventory via Hub SharePoint MI lists.
 * Does not call Graph sites search. Does not copy binaries into Atlas.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { authoritativeSourceUrl, isFileIndexRow } from './fabric/fileIndex.ts';
import { classifyHubClientRow, type KnowledgeProvenance } from './knowledgeClassification.ts';
import type { SharePointPmService } from './repository.ts';

export type KnowledgeLedgerItem = {
  id: string;
  clientCode: string;
  title: string;
  webUrl?: string;
  modifiedAt?: string;
  kind: string;
  source: string;
  classification: 'SYNTHETIC_QA' | 'CLIENT' | 'READ_ONLY_CLIENT';
  entityKind: 'client' | 'synthetic_qa' | 'vendor_referral' | 'reference_tenant' | 'unknown_code';
  provenanceLabel: KnowledgeProvenance;
  provenance: {
    list: string;
    queriedVia: 'hub_sharepoint_mi';
    graphSitesSearch: false;
    binariesInAtlas: false;
  };
};

const FILE_INDEX_UNFINISHED =
  'HVCG_Communications file-index walk did not complete. documents=SOURCE_UNAVAILABLE.';

export type KnowledgeLedger = {
  kind: 'knowledge_ledger_v1';
  source: 'sharepoint_hub_mi';
  graphSitesSearch: false;
  binariesInAtlas: false;
  /** False when any entitled communications walk is unfinished. */
  queried: boolean;
  /** ClientCodes whose communications walk finished. Unfinished walks are omitted. */
  clientsQueried: string[];
  unfinishedClientCodes: string[];
  count: number;
  /** True only for a finished walk that returned no ledger rows. */
  empty: boolean;
  items: KnowledgeLedgerItem[];
  /** True only for a finished empty index. An unfinished walk is not an empty inventory. */
  honestEmpty: boolean;
  availability?: 'SOURCE_UNAVAILABLE';
  status?: 'SOURCE_UNAVAILABLE';
  reason?: string;
};

export async function buildKnowledgeLedger(
  service: SharePointPmService,
  principal: AtlasPrincipal,
): Promise<KnowledgeLedger> {
  const clients = await service.listAuthorizedClients(principal);
  const items: KnowledgeLedgerItem[] = [];
  const clientsQueried: string[] = [];
  const unfinishedClientCodes: string[] = [];
  const reasons = new Set<string>();
  for (const client of clients) {
    const classified = classifyHubClientRow(client);
    const extras = await service.listWorkspaceCollections(principal, client.clientCode);
    if (extras.communications.status === 'SOURCE_UNAVAILABLE') {
      unfinishedClientCodes.push(client.clientCode);
      reasons.add(extras.communications.reason || FILE_INDEX_UNFINISHED);
      continue;
    }
    clientsQueried.push(client.clientCode);
    if (client.sharePointLibraryUrl) {
      items.push({
        id: `library-${client.clientCode}`,
        clientCode: client.clientCode,
        title: 'Client SharePoint library',
        webUrl: authoritativeSourceUrl(client.sharePointLibraryUrl),
        kind: 'library',
        source: 'HVCG_Clients.SharePointLibraryUrl',
        classification: classified.classification,
        entityKind: classified.entityKind,
        provenanceLabel: 'CONFIRMED',
        provenance: {
          list: 'HVCG_Clients',
          queriedVia: 'hub_sharepoint_mi',
          graphSitesSearch: false,
          binariesInAtlas: false,
        },
      });
    }
    for (const row of extras.communications.items) {
      if (!isFileIndexRow(row)) continue;
      items.push({
        id: String(row.id),
        clientCode: client.clientCode,
        title: String(row.title || row.id),
        webUrl: authoritativeSourceUrl(typeof row.webUrl === 'string' ? row.webUrl : undefined),
        modifiedAt: typeof row.date === 'string' && row.date.trim() ? row.date : undefined,
        kind: String(row.summary || '').includes('RESTRICTED') ? 'restricted-file' : 'file',
        source: 'HVCG_Communications/file-index',
        classification: classified.classification,
        entityKind: classified.entityKind,
        provenanceLabel: 'CONFIRMED',
        provenance: {
          list: 'HVCG_Communications',
          queriedVia: 'hub_sharepoint_mi',
          graphSitesSearch: false,
          binariesInAtlas: false,
        },
      });
    }
  }
  const indexUnfinished = unfinishedClientCodes.length > 0;
  const finishedEmpty = !indexUnfinished && items.length === 0;
  const unfinishedReason = [...reasons].join(' ').trim();
  const reason = /documents=SOURCE_UNAVAILABLE/.test(unfinishedReason)
    ? unfinishedReason
    : unfinishedReason
      ? `${unfinishedReason} documents=SOURCE_UNAVAILABLE.`
      : FILE_INDEX_UNFINISHED;
  return {
    kind: 'knowledge_ledger_v1',
    source: 'sharepoint_hub_mi',
    graphSitesSearch: false,
    binariesInAtlas: false,
    queried: !indexUnfinished,
    clientsQueried,
    unfinishedClientCodes,
    count: items.length,
    empty: finishedEmpty,
    items,
    honestEmpty: finishedEmpty,
    ...(indexUnfinished
      ? {
          availability: 'SOURCE_UNAVAILABLE' as const,
          status: 'SOURCE_UNAVAILABLE' as const,
          reason,
        }
      : {}),
  };
}
