/**
 * HVCG/HVS business file index — metadata + link only.
 * Known SharePoint libraries and Manny OneDrive. No binary copy.
 * No tenant-wide /sites?search=. Restricted = metadata + link + classification.
 */

import { isCanonicalClientCode } from '../../../entitlements/clientCode.ts';
import { classifyDriveItem, type ClientHint } from './classify.ts';
import { fileIndexSummary } from './fileIndex.ts';
import type { FabricGraphClient } from './graph.ts';
import type { SharePointPmService } from '../repository.ts';

export const HVCG_BUSINESS_SITE_IDS = [
  'highvaluecapitalgroup.sharepoint.com,92b2d35f-6f09-4ec2-8cba-28469e3588d9,ddc8e675-aa6a-46f8-9fd6-86f91dce728e',
  'highvaluecapitalgroup.sharepoint.com,13848203-7444-449a-9634-bb84f4dca619,ddc8e675-aa6a-46f8-9fd6-86f91dce728e',
  'highvaluecapitalgroup.sharepoint.com,fad8d314-86fb-4b40-8c44-f879429adb2c,ddc8e675-aa6a-46f8-9fd6-86f91dce728e',
] as const;

export const HVCG_BUSINESS_SITE_PATHS = [
  'highvaluecapitalgroup.sharepoint.com:/sites/HVCG-Clients',
  'highvaluecapitalgroup.sharepoint.com:/sites/HVCG-Knowledge',
  'highvaluecapitalgroup.sharepoint.com:/sites/HighValueCapitalGroup',
] as const;

const SEARCH_PATHS = [
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients',
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge',
  'https://highvaluecapitalgroup.sharepoint.com/sites/HighValueCapitalGroup',
];

const BUSINESS_URL_RE =
  /highvaluecapitalgroup\.sharepoint\.com\/sites\/(HVCG-Clients|HVCG-Knowledge|HighValueCapitalGroup|HVCG)/i;
const CLIENT_LIB_RE = /\bHVCG_([A-Z]{2,8}\d{2})\b/;
const GROUP_NAME_RE = /\b(hvcg|hvs|high value)\b/i;

const MAX_DRIVES = 16;
const MAX_DELTA_PAGES = 6;
const MAX_SEARCH_QUERIES = 6;
const MAX_ITEMS_PER_RUN = 200;
const PAGE_SIZE = 50;

export interface SharePointFileCheckpoint {
  drives: Record<string, { deltaLink?: string; scannedAt?: string }>;
  searchFrom: number;
}

export function emptySharePointCheckpoint(): SharePointFileCheckpoint {
  return { drives: {}, searchFrom: 0 };
}

function asArray(json: Record<string, unknown>): Record<string, unknown>[] {
  const value = json.value;
  return Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object')
    : [];
}

function nextLink(json: Record<string, unknown>): string | null {
  return typeof json['@odata.nextLink'] === 'string' ? json['@odata.nextLink'] : null;
}

function deltaLink(json: Record<string, unknown>): string | null {
  return typeof json['@odata.deltaLink'] === 'string' ? json['@odata.deltaLink'] : null;
}

function isBusinessUrl(webUrl?: string): boolean {
  if (!webUrl) return false;
  return BUSINESS_URL_RE.test(webUrl) || CLIENT_LIB_RE.test(webUrl);
}

export async function indexBusinessFiles(opts: {
  service: SharePointPmService;
  fabric: FabricGraphClient;
  clients: ClientHint[];
  checkpoint: SharePointFileCheckpoint;
  notes: string[];
}): Promise<{ files: number; skipped: number; restricted: number; checkpoint: SharePointFileCheckpoint }> {
  const indexed = { files: 0, skipped: 0, restricted: 0 };
  const cp: SharePointFileCheckpoint = {
    drives: { ...opts.checkpoint.drives },
    searchFrom: opts.checkpoint.searchFrom || 0,
  };

  const writeItem = async (item: {
    id?: string;
    name?: string;
    webUrl?: string;
    parentPath?: string;
    isFile?: boolean;
    isLibraryRoot?: boolean;
  }) => {
    if (indexed.files + indexed.restricted >= MAX_ITEMS_PER_RUN) return;
    const itemId = item.id || '';
    const name = item.name || '';
    if (!itemId || !name) return;
    if (!item.isFile && !item.isLibraryRoot) return;
    const classified = classifyDriveItem(
      { name, webUrl: item.webUrl, parentPath: item.parentPath },
      opts.clients,
    );
    if (classified.ingest === 'skip' && !isBusinessUrl(item.webUrl)) {
      indexed.skipped += 1;
      return;
    }
    const clientCode =
      classified.clientCode && isCanonicalClientCode(classified.clientCode)
        ? classified.clientCode
        : undefined;
    const internalUnclassified =
      classified.ingest === 'skip' && isBusinessUrl(item.webUrl) && !clientCode;
    if (classified.ingest === 'skip' && !internalUnclassified) {
      indexed.skipped += 1;
      return;
    }
    const restricted = classified.ingest === 'metadata_link';
    if (restricted) indexed.restricted += 1;
    const key = `file:${itemId}`;
    await opts.service.upsertCommunicationIndex({
      title: name.slice(0, 255),
      summary: fileIndexSummary({ restricted, webUrl: item.webUrl, idempotencyKey: key }),
      clientCode,
      channel: 'Other',
      webUrl: item.webUrl,
      sourceMessageId: itemId,
      classification: internalUnclassified ? 'INTERNAL' : classified.classification,
      provenanceSource: 'sharepoint-file',
      sourceOrg: 'HVCG',
      idempotencyKey: key,
    });
    indexed.files += 1;
  };

  const siteIds = new Set<string>(HVCG_BUSINESS_SITE_IDS);
  for (const path of HVCG_BUSINESS_SITE_PATHS) {
    const { status, json } = await opts.fabric.getJson(`/v1.0/sites/${path}?$select=id,webUrl,displayName`);
    if (status === 200 && typeof json.id === 'string') siteIds.add(json.id);
    else opts.notes.push(`Site path ${path} HTTP ${status}.`);
  }

  const groups = await opts.fabric.getJson(
    '/v1.0/groups?$select=id,displayName,groupTypes&$top=25',
  );
  if (groups.status === 200) {
    for (const g of asArray(groups.json)) {
      const name = typeof g.displayName === 'string' ? g.displayName : '';
      const types = Array.isArray(g.groupTypes) ? g.groupTypes.map(String) : [];
      if (!types.includes('Unified') || !GROUP_NAME_RE.test(name)) continue;
      const id = typeof g.id === 'string' ? g.id : '';
      if (!id) continue;
      const site = await opts.fabric.getJson(`/v1.0/groups/${id}/sites/root?$select=id,webUrl`);
      if (site.status === 200 && typeof site.json.id === 'string' && isBusinessUrl(String(site.json.webUrl || ''))) {
        siteIds.add(site.json.id);
      }
    }
  } else {
    opts.notes.push(`Group site discovery HTTP ${groups.status}.`);
  }

  let drivesSeen = 0;
  for (const siteId of siteIds) {
    if (drivesSeen >= MAX_DRIVES) break;
    const drives = await opts.fabric.getJson(`/v1.0/sites/${siteId}/drives?$select=id,name,webUrl`);
    if (drives.status !== 200) {
      opts.notes.push(`Drives for site ${siteId.slice(0, 40)} HTTP ${drives.status}.`);
      continue;
    }
    for (const drive of asArray(drives.json)) {
      if (drivesSeen >= MAX_DRIVES) break;
      const driveId = typeof drive.id === 'string' ? drive.id : '';
      const driveName = typeof drive.name === 'string' ? drive.name : '';
      const driveUrl = typeof drive.webUrl === 'string' ? drive.webUrl : undefined;
      if (!driveId) continue;
      drivesSeen += 1;
      const lib = CLIENT_LIB_RE.exec(driveName) || CLIENT_LIB_RE.exec(driveUrl || '');
      if (lib && opts.clients.some((c) => c.clientCode === lib[1])) {
        await writeItem({
          id: `library:${driveId}`,
          name: driveName,
          webUrl: driveUrl,
          parentPath: driveName,
          isLibraryRoot: true,
        });
      }
      const prior = cp.drives[driveId]?.deltaLink;
      let url =
        prior ||
        `/v1.0/drives/${driveId}/root/delta?$select=id,name,file,folder,webUrl,parentReference&$top=${PAGE_SIZE}`;
      for (let page = 0; page < MAX_DELTA_PAGES && url; page += 1) {
        const { status, json } = await opts.fabric.getJson(url);
        if (status !== 200) {
          opts.notes.push(`Drive ${driveName || driveId} delta HTTP ${status}.`);
          break;
        }
        for (const item of asArray(json)) {
          const parent = item.parentReference && typeof item.parentReference === 'object'
            ? String((item.parentReference as { path?: string }).path || '')
            : '';
          await writeItem({
            id: typeof item.id === 'string' ? item.id : undefined,
            name: typeof item.name === 'string' ? item.name : undefined,
            webUrl: typeof item.webUrl === 'string' ? item.webUrl : undefined,
            parentPath: `${driveName} ${parent}`,
            isFile: Boolean(item.file),
          });
        }
        const next = deltaLink(json) || nextLink(json);
        if (typeof json['@odata.deltaLink'] === 'string') {
          cp.drives[driveId] = { deltaLink: json['@odata.deltaLink'], scannedAt: new Date().toISOString() };
          url = null;
        } else {
          url = next;
        }
      }
    }
  }

  for (let i = 0; i < SEARCH_PATHS.length && i < MAX_SEARCH_QUERIES; i += 1) {
    const path = SEARCH_PATHS[i];
    const { status, json } = await opts.fabric.postJson('/v1.0/search/query', {
      requests: [
        {
          entityTypes: ['driveItem'],
          query: { queryString: `path:"${path}" AND isDocument=true` },
          from: cp.searchFrom,
          size: 25,
        },
      ],
    });
    if (status !== 200) {
      opts.notes.push(`File search ${path} HTTP ${status}.`);
      continue;
    }
    for (const resource of extractSearchDriveItems(json)) {
      await writeItem({
        id: resource.id,
        name: resource.name,
        webUrl: resource.webUrl,
        parentPath: resource.parentPath,
        isFile: true,
      });
    }
  }
  cp.searchFrom = 0;

  return { ...indexed, checkpoint: cp };
}

export function extractSearchDriveItems(json: Record<string, unknown>): Array<{
  id?: string;
  name?: string;
  webUrl?: string;
  parentPath?: string;
}> {
  const out: Array<{ id?: string; name?: string; webUrl?: string; parentPath?: string }> = [];
  const responses = Array.isArray(json.value) ? json.value : [];
  for (const resp of responses) {
    if (!resp || typeof resp !== 'object') continue;
    const containers = Array.isArray((resp as { hitsContainers?: unknown }).hitsContainers)
      ? ((resp as { hitsContainers: unknown[] }).hitsContainers)
      : [];
    for (const container of containers) {
      if (!container || typeof container !== 'object') continue;
      const hits = Array.isArray((container as { hits?: unknown }).hits)
        ? ((container as { hits: unknown[] }).hits)
        : [];
      for (const hit of hits) {
        if (!hit || typeof hit !== 'object') continue;
        const resource = (hit as { resource?: Record<string, unknown> }).resource;
        if (!resource) continue;
        const parent = resource.parentReference && typeof resource.parentReference === 'object'
          ? String((resource.parentReference as { path?: string }).path || '')
          : '';
        out.push({
          id: typeof resource.id === 'string' ? resource.id : undefined,
          name: typeof resource.name === 'string' ? resource.name : undefined,
          webUrl: typeof resource.webUrl === 'string' ? resource.webUrl : undefined,
          parentPath: parent,
        });
      }
    }
  }
  return out;
}
