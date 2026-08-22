/**
 * Entitled staff knowledge inventory via Hub SharePoint MI lists.
 * Does not call Graph sites search. Does not copy binaries into Atlas.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isFileIndexRow } from './fabric/fileIndex.ts';
import { classifyHubClientRow, type KnowledgeProvenance } from './knowledgeClassification.ts';
import type { SharePointPmService } from './repository.ts';

export type KnowledgeLedgerItem = {
  id: string;
  clientCode: string;
  title: string;
  webUrl?: string;
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

export async function buildKnowledgeLedger(
  service: SharePointPmService,
  principal: AtlasPrincipal,
): Promise<{
  kind: 'knowledge_ledger_v1';
  source: 'sharepoint_hub_mi';
  graphSitesSearch: false;
  binariesInAtlas: false;
  queried: true;
  clientsQueried: string[];
  count: number;
  empty: boolean;
  items: KnowledgeLedgerItem[];
  honestEmpty: boolean;
}> {
  const clients = await service.listAuthorizedClients(principal);
  const items: KnowledgeLedgerItem[] = [];
  const clientsQueried: string[] = [];
  for (const client of clients) {
    clientsQueried.push(client.clientCode);
    const classified = classifyHubClientRow(client);
    if (client.sharePointLibraryUrl) {
      items.push({
        id: `library-${client.clientCode}`,
        clientCode: client.clientCode,
        title: 'Client SharePoint library',
        webUrl: client.sharePointLibraryUrl,
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
    const extras = await service.listWorkspaceCollections(principal, client.clientCode);
    for (const row of extras.communications.items) {
      if (!isFileIndexRow(row)) continue;
      items.push({
        id: String(row.id),
        clientCode: client.clientCode,
        title: String(row.title || row.id),
        webUrl: typeof row.webUrl === 'string' ? row.webUrl : undefined,
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
  return {
    kind: 'knowledge_ledger_v1',
    source: 'sharepoint_hub_mi',
    graphSitesSearch: false,
    binariesInAtlas: false,
    queried: true,
    clientsQueried,
    count: items.length,
    empty: items.length === 0,
    items,
    honestEmpty: items.length === 0,
  };
}
