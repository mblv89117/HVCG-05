import { acquireGraphToken } from '../auth/msal';
import { microsoftConfig } from '../config';
import type { DocumentRef, GraphProfile, Sourced } from '../types';

async function graphFetch<T>(path: string): Promise<T> {
  const token = await acquireGraphToken();
  if (!token) throw new Error('Graph token unavailable — sign in and consent Graph scopes.');
  const url = path.startsWith('http') ? path : `${microsoftConfig.graphUrl}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph ${res.status}: ${text.slice(0, 240)}`);
  }
  return res.json() as Promise<T>;
}

export async function getMyProfile(): Promise<Sourced<GraphProfile>> {
  const me = await graphFetch<{ displayName: string; mail?: string; userPrincipalName?: string }>('me');
  return {
    data: {
      displayName: me.displayName,
      mail: me.mail,
      userPrincipalName: me.userPrincipalName,
      source: 'Live',
    },
    source: 'Live',
    detail: 'Microsoft Graph /me (Development permissions)',
    lastUpdated: new Date().toISOString(),
  };
}

/** SharePoint / OneDrive documents via Graph — Dev site must be configured. */
export async function listSiteDocuments(top = 20): Promise<Sourced<DocumentRef[]>> {
  if (!microsoftConfig.sharePointSiteUrl) {
    return {
      data: [],
      source: 'Unavailable',
      detail: 'VITE_SHAREPOINT_SITE_URL not configured',
    };
  }
  // Resolve site by path then list default document library root children
  const host = new URL(microsoftConfig.sharePointSiteUrl).hostname;
  const pathname = new URL(microsoftConfig.sharePointSiteUrl).pathname;
  const site = await graphFetch<{ id: string }>(
    `sites/${host}:${pathname}`,
  );
  const drive = await graphFetch<{ value: { id: string; name: string }[] }>(
    `sites/${site.id}/drives`,
  );
  const primary = drive.value?.[0];
  if (!primary) {
    return { data: [], source: 'Unavailable', detail: 'No drives on SharePoint site' };
  }
  const children = await graphFetch<{
    value: { id: string; name: string; webUrl: string; lastModifiedDateTime?: string }[];
  }>(`drives/${primary.id}/root/children?$top=${top}`);

  return {
    data: (children.value || []).map((f) => ({
      id: f.id,
      name: f.name,
      webUrl: f.webUrl,
      lastModified: f.lastModifiedDateTime,
      source: 'Live',
    })),
    source: 'Live',
    detail: `SharePoint · ${microsoftConfig.sharePointSiteUrl}`,
    lastUpdated: new Date().toISOString(),
  };
}

export async function listUpcomingEvents(top = 5): Promise<Sourced<{ id: string; subject: string; start: string }[]>> {
  if (microsoftConfig.blockLiveClientComms) {
    // Calendar read is internal — allowed; outbound mail remains blocked elsewhere.
  }
  const json = await graphFetch<{
    value: { id: string; subject: string; start: { dateTime: string } }[];
  }>(`me/events?$select=id,subject,start&$orderby=start/dateTime&$top=${top}`);
  return {
    data: (json.value || []).map((e) => ({
      id: e.id,
      subject: e.subject,
      start: e.start?.dateTime || '',
    })),
    source: 'Live',
    detail: 'Outlook calendar via Graph (read-only)',
  };
}
