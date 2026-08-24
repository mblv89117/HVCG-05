/**
 * First-class entitled meeting operating records on authorizedSearch.
 *
 * OPEN_SOURCE: ADAPT already-authorized extras.meetings / HVCG_Meetings /
 * search hits kind=meeting after ClientCode entitlement.
 * REJECT a second Graph calendar query, transcript fetch, calendar product,
 * SDK, or queue. Never invent transcript text, binaries, SAS, or anonymous URLs.
 */

import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { authoritativeSourceUrl } from '../sharepoint/fabric/fileIndex.ts';
import type {
  AskAtlasClassification,
  AtlasAuthorizedSearchHit,
  MeetingOperatingPayload,
  MeetingOperatingRecord,
} from './types.ts';

/** Keep first-class meeting lists bounded so search stays small. */
export const MEETING_OPERATING_RECORD_PAGE_SIZE = 20;

export function emptyMeetingOperatingPayload(): MeetingOperatingPayload {
  return {
    kind: 'meeting_operating_record_v1',
    policyClass: 'READ_AUTO',
    invented: false,
    items: [],
  };
}

function meetingClassification(
  row: AtlasAuthorizedSearchHit,
): AskAtlasClassification | 'HONEST_EMPTY' {
  if (
    row.classification === 'CONFIRMED' ||
    row.classification === 'LIKELY' ||
    row.classification === 'PROPOSED' ||
    row.classification === 'HONEST_EMPTY'
  ) {
    return row.classification;
  }
  if (
    row.provenance === 'CONFIRMED' ||
    row.provenance === 'LIKELY' ||
    row.provenance === 'PROPOSED' ||
    row.provenance === 'HONEST_EMPTY'
  ) {
    return row.provenance;
  }
  return 'PROPOSED';
}

function entitledToSeeMeeting(
  clientCode: string | undefined,
  entitled: ReadonlySet<string>,
): boolean {
  if (!entitled.size) return true;
  if (!clientCode) return false;
  return entitled.has(clientCode);
}

/**
 * Copy already-authorized meeting hits into meeting_operating_record_v1.
 * Isolation uses entitledClientCodes. webUrl must pass authoritativeSourceUrl.
 * No downloadUrl. No transcript text. No binaries.
 */
export function composeMeetingOperatingRecords(
  hits: AtlasAuthorizedSearchHit[],
  entitledClientCodes: readonly string[] = [],
): MeetingOperatingPayload {
  const entitled = new Set(
    entitledClientCodes.map((code) => code.trim()).filter((code) => isCanonicalClientCode(code)),
  );
  const items: MeetingOperatingRecord[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (items.length >= MEETING_OPERATING_RECORD_PAGE_SIZE) break;
    if (hit.kind !== 'meeting') continue;
    const clientCode =
      hit.clientCode && isCanonicalClientCode(hit.clientCode) ? hit.clientCode : undefined;
    if (!entitledToSeeMeeting(clientCode, entitled)) continue;
    const key = (hit.sourceEventId || '').trim() || hit.id;
    if (seen.has(key) || seen.has(hit.id)) continue;
    seen.add(key);
    seen.add(hit.id);
    const webUrl = authoritativeSourceUrl(hit.webUrl);
    const date = (hit.modifiedAt || '').trim() || undefined;
    const sourceEventId = (hit.sourceEventId || '').trim() || undefined;
    items.push({
      id: hit.id,
      title: hit.title,
      ...(clientCode ? { clientCode } : {}),
      ...(date ? { date } : {}),
      classification: meetingClassification(hit),
      source: hit.source || 'HVCG_Meetings',
      invented: false,
      ...(webUrl ? { webUrl } : {}),
      ...(sourceEventId ? { sourceEventId } : {}),
    });
  }
  return {
    kind: 'meeting_operating_record_v1',
    policyClass: 'READ_AUTO',
    invented: false,
    items,
  };
}
