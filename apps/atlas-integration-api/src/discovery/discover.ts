/**
 * Post-auth discovery of mailboxes, sites, drives, teams, orgs, repos.
 * Each connection keeps its own discovered inventory — never overwrites peers.
 */

import type {
  BusinessEntityId,
  DiscoveredResource,
  MailboxType,
  ProviderId,
} from '@hvcg/atlas-integration-core';
import { extractDomain, inferBusinessEntity } from '@hvcg/atlas-integration-core';
import { graphFetch } from '../oauth/microsoft.ts';
import type { IntegrationRepository } from '../store/repository.ts';
import { nowIso } from '../connectors/context.ts';

function rid(): string {
  return crypto.randomUUID();
}

function resource(partial: Omit<DiscoveredResource, 'id' | 'discoveredAt'>): DiscoveredResource {
  return { ...partial, id: rid(), discoveredAt: nowIso() };
}

export async function discoverMicrosoftResources(
  repo: IntegrationRepository,
  connectionId: string,
  accessToken: string,
): Promise<DiscoveredResource[]> {
  const conn = repo.getConnection(connectionId);
  if (!conn) throw new Error('Connection not found');
  const found: DiscoveredResource[] = [];
  const entity = (conn.businessEntity || 'unknown') as BusinessEntityId;
  const push = (r: Omit<DiscoveredResource, 'id' | 'discoveredAt' | 'connectionId' | 'providerId'>) => {
    found.push(
      resource({
        ...r,
        connectionId,
        providerId: 'microsoft',
        businessEntity: r.businessEntity || entity,
        selected: r.selected ?? false,
      }),
    );
  };

  // Primary mailbox
  push({
    resourceType: 'mailbox',
    resourceId: conn.accountEmail || conn.id,
    displayName: conn.accountDisplayName || conn.accountName,
    mailboxType: 'user',
    selected: true,
    metadata: { primary: true },
  });

  // Mail folders (incl. archive)
  try {
    const folders = await graphFetch<{
      value: Array<{ id: string; displayName: string; parentFolderId?: string }>;
    }>(accessToken, '/me/mailFolders?$top=100&$select=id,displayName,parentFolderId');
    for (const f of folders.value || []) {
      const isArchive = /archive/i.test(f.displayName);
      push({
        resourceType: 'mailFolder',
        resourceId: f.id,
        displayName: f.displayName,
        mailboxType: isArchive ? 'archive' : 'user',
        selected: ['Inbox', 'Sent Items', 'Archive'].includes(f.displayName) || isArchive,
      });
    }
  } catch {
    /* continue */
  }

  // Proxy / shared mailbox addresses the user can open (when Graph exposes them)
  try {
    const settings = await graphFetch<{
      userPurpose?: string;
      externalAudience?: string;
    }>(accessToken, '/me/mailboxSettings');
    if (settings?.userPurpose) {
      push({
        resourceType: 'mailboxSettings',
        resourceId: 'mailboxSettings',
        displayName: `Mailbox purpose: ${settings.userPurpose}`,
        mailboxType: 'user',
        selected: false,
        metadata: settings as Record<string, unknown>,
      });
    }
  } catch {
    /* MailboxSettings.Read may be missing — recorded as discovery gap */
    push({
      resourceType: 'discoveryGap',
      resourceId: 'shared-mailbox-enum',
      displayName: 'Shared mailbox directory enumeration',
      mailboxType: 'shared',
      selected: false,
      metadata: {
        blocker: 'Requires Directory.Read.All or MailboxSettings.Read + admin-granted shared access list',
        nextAction: 'Owner: add Directory.Read.All (delegated) and re-consent, or manually Add shared mailbox',
      },
    });
  }

  // People / contacts hinting at aliases and related accounts
  try {
    const people = await graphFetch<{
      value: Array<{ id: string; displayName?: string; scoredEmailAddresses?: Array<{ address: string }> }>;
    }>(accessToken, '/me/people?$top=50');
    for (const p of people.value || []) {
      for (const addr of p.scoredEmailAddresses || []) {
        const domain = extractDomain(addr.address);
        const guess = inferBusinessEntity({ email: addr.address, domain });
        if (guess === 'HVS' || guess === 'HVCG' || guess === 'legacy') {
          push({
            resourceType: 'relatedMailbox',
            resourceId: addr.address,
            displayName: `${p.displayName || addr.address} (${guess})`,
            mailboxType: 'alias',
            businessEntity: guess,
            selected: false,
            metadata: { requiresSeparateConnection: true },
          });
        }
      }
    }
  } catch {
    /* People.Read may be missing */
  }

  // OneDrive / drives
  try {
    const drives = await graphFetch<{
      value: Array<{ id: string; name: string; driveType?: string; webUrl?: string }>;
    }>(accessToken, '/me/drives?$top=50');
    for (const d of drives.value || []) {
      push({
        resourceType: 'drive',
        resourceId: d.id,
        displayName: d.name,
        webUrl: d.webUrl,
        mailboxType: 'n/a',
        selected: true,
        metadata: { driveType: d.driveType },
      });
    }
  } catch {
    /* continue */
  }

  // SharePoint sites
  try {
    const sites = await graphFetch<{
      value: Array<{ id: string; displayName?: string; name?: string; webUrl?: string }>;
    }>(accessToken, '/sites?search=*&$top=50');
    for (const s of sites.value || []) {
      push({
        resourceType: 'site',
        resourceId: s.id,
        displayName: s.displayName || s.name || s.id,
        webUrl: s.webUrl,
        mailboxType: 'n/a',
        selected: /high.?value|hvcg|hvs|atlas/i.test(s.displayName || s.name || ''),
        metadata: {},
      });
      // Libraries per site (best-effort, capped)
      try {
        const drives = await graphFetch<{
          value: Array<{ id: string; name: string; webUrl?: string }>;
        }>(accessToken, `/sites/${s.id}/drives?$top=20`);
        for (const lib of drives.value || []) {
          push({
            resourceType: 'documentLibrary',
            resourceId: lib.id,
            displayName: `${s.displayName || s.name} / ${lib.name}`,
            webUrl: lib.webUrl,
            path: s.webUrl,
            mailboxType: 'n/a',
            selected: false,
          });
        }
      } catch {
        /* skip site libraries */
      }
    }
  } catch {
    push({
      resourceType: 'discoveryGap',
      resourceId: 'sites-search',
      displayName: 'SharePoint site search',
      selected: false,
      metadata: { blocker: 'Sites.Read.All required or search failed' },
    });
  }

  // Groups (M365 groups often back shared mailboxes / Teams)
  try {
    const groups = await graphFetch<{
      value: Array<{ id: string; displayName?: string; mail?: string; groupTypes?: string[] }>;
    }>(accessToken, '/me/memberOf?$top=50');
    for (const g of groups.value || []) {
      const isUnified = (g.groupTypes || []).includes('Unified');
      push({
        resourceType: isUnified ? 'microsoft365Group' : 'directoryGroup',
        resourceId: g.id,
        displayName: g.displayName || g.mail || g.id,
        mailboxType: g.mail ? 'group' : 'n/a',
        selected: false,
        metadata: { mail: g.mail },
      });
    }
  } catch {
    push({
      resourceType: 'discoveryGap',
      resourceId: 'memberOf',
      displayName: 'Group / shared mailbox membership',
      mailboxType: 'group',
      selected: false,
      metadata: {
        blocker: 'GroupMember.Read.All or Directory.Read.All recommended for full enumeration',
      },
    });
  }

  // Teams (optional scope)
  try {
    const teams = await graphFetch<{
      value: Array<{ id: string; displayName?: string }>;
    }>(accessToken, '/me/joinedTeams?$top=50');
    for (const t of teams.value || []) {
      push({
        resourceType: 'team',
        resourceId: t.id,
        displayName: t.displayName || t.id,
        mailboxType: 'n/a',
        selected: false,
      });
    }
  } catch {
    push({
      resourceType: 'discoveryGap',
      resourceId: 'teams',
      displayName: 'Teams teams & channels',
      selected: false,
      metadata: {
        blocker: 'Team.ReadBasic.All not granted yet',
        nextAction: 'Owner: add Team.ReadBasic.All and ChannelMessage.Read.All when ready for Priority 4',
      },
    });
  }

  repo.replaceDiscoveredResources(connectionId, found);
  const selected = found.filter((r) => r.selected).map((r) => ({
    resourceType: r.resourceType,
    resourceId: r.resourceId,
    displayName: r.displayName,
    path: r.path,
    webUrl: r.webUrl,
    mailboxType: r.mailboxType as MailboxType | undefined,
    businessEntity: r.businessEntity,
    selected: true,
    metadata: r.metadata,
  }));
  repo.upsertConnection({
    ...conn,
    recordsDiscovered: found.length,
    discoveryCompletedAt: nowIso(),
    resourceSelections: selected.length ? selected : conn.resourceSelections,
    updatedAt: nowIso(),
  });
  return found;
}

export async function discoverGoogleResources(
  repo: IntegrationRepository,
  connectionId: string,
  accessToken: string,
): Promise<DiscoveredResource[]> {
  const conn = repo.getConnection(connectionId);
  if (!conn) throw new Error('Connection not found');
  const found: DiscoveredResource[] = [];
  const entity = (conn.businessEntity || 'unknown') as BusinessEntityId;

  found.push(
    resource({
      connectionId,
      providerId: 'google',
      resourceType: 'gmail',
      resourceId: conn.accountEmail || 'me',
      displayName: conn.accountEmail || 'Gmail',
      mailboxType: 'user',
      businessEntity: entity,
      selected: true,
    }),
  );

  try {
    const about = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (about.ok) {
      const json = (await about.json()) as { user?: { emailAddress?: string; displayName?: string } };
      found.push(
        resource({
          connectionId,
          providerId: 'google',
          resourceType: 'drive',
          resourceId: 'my-drive',
          displayName: `My Drive (${json.user?.emailAddress || 'me'})`,
          mailboxType: 'n/a',
          businessEntity: entity,
          selected: true,
        }),
      );
    }
  } catch {
    /* continue */
  }

  try {
    const drives = await fetch(
      'https://www.googleapis.com/drive/v3/drives?pageSize=50',
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (drives.ok) {
      const json = (await drives.json()) as { drives?: Array<{ id: string; name: string }> };
      for (const d of json.drives || []) {
        found.push(
          resource({
            connectionId,
            providerId: 'google',
            resourceType: 'sharedDrive',
            resourceId: d.id,
            displayName: d.name,
            mailboxType: 'n/a',
            businessEntity: entity,
            selected: true,
          }),
        );
      }
    }
  } catch {
    found.push(
      resource({
        connectionId,
        providerId: 'google',
        resourceType: 'discoveryGap',
        resourceId: 'shared-drives',
        displayName: 'Shared Drives enumeration',
        selected: false,
        businessEntity: entity,
        metadata: { blocker: 'drive.readonly may not list Shared Drives without drive scope + Workspace' },
      }),
    );
  }

  repo.replaceDiscoveredResources(connectionId, found);
  repo.upsertConnection({
    ...conn,
    recordsDiscovered: found.length,
    discoveryCompletedAt: nowIso(),
    updatedAt: nowIso(),
  });
  return found;
}

export async function discoverGitHubResources(
  repo: IntegrationRepository,
  connectionId: string,
  accessToken: string,
): Promise<DiscoveredResource[]> {
  const conn = repo.getConnection(connectionId);
  if (!conn) throw new Error('Connection not found');
  const found: DiscoveredResource[] = [];
  const entity = (conn.businessEntity || 'HVCG') as BusinessEntityId;
  const headers = {
    authorization: `Bearer ${accessToken}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'Atlas-Integration-Hub',
  };

  try {
    const userResp = await fetch('https://api.github.com/user', { headers });
    if (userResp.ok) {
      const user = (await userResp.json()) as { login: string; id: number };
      found.push(
        resource({
          connectionId,
          providerId: 'github',
          resourceType: 'githubUser',
          resourceId: String(user.id),
          displayName: user.login,
          mailboxType: 'n/a',
          businessEntity: entity,
          selected: true,
        }),
      );
    }
  } catch {
    /* continue */
  }

  try {
    const orgsResp = await fetch('https://api.github.com/user/orgs?per_page=50', { headers });
    if (orgsResp.ok) {
      const orgs = (await orgsResp.json()) as Array<{ id: number; login: string }>;
      for (const o of orgs) {
        found.push(
          resource({
            connectionId,
            providerId: 'github',
            resourceType: 'githubOrg',
            resourceId: String(o.id),
            displayName: o.login,
            mailboxType: 'organization',
            businessEntity: entity,
            selected: true,
          }),
        );
      }
    }
  } catch {
    /* continue */
  }

  try {
    const reposResp = await fetch('https://api.github.com/user/repos?per_page=50&affiliation=owner,organization_member', {
      headers,
    });
    if (reposResp.ok) {
      const repos = (await reposResp.json()) as Array<{
        id: number;
        full_name: string;
        private: boolean;
        html_url: string;
      }>;
      for (const r of repos) {
        found.push(
          resource({
            connectionId,
            providerId: 'github',
            resourceType: 'repository',
            resourceId: String(r.id),
            displayName: r.full_name,
            webUrl: r.html_url,
            mailboxType: 'n/a',
            businessEntity: entity,
            selected: false,
            metadata: { private: r.private },
          }),
        );
      }
    }
  } catch {
    /* continue */
  }

  repo.replaceDiscoveredResources(connectionId, found);
  repo.upsertConnection({
    ...conn,
    recordsDiscovered: found.length,
    discoveryCompletedAt: nowIso(),
    updatedAt: nowIso(),
  });
  return found;
}

export async function runDiscoveryForConnection(
  repo: IntegrationRepository,
  connectionId: string,
): Promise<DiscoveredResource[]> {
  const conn = repo.getConnection(connectionId);
  if (!conn) throw new Error('Connection not found');
  const creds = repo.getCredentials(connectionId);
  if (!creds?.accessToken) throw new Error('No credentials');

  const provider = conn.providerId as ProviderId;
  if (provider === 'microsoft') {
    return discoverMicrosoftResources(repo, connectionId, creds.accessToken);
  }
  if (provider === 'google') {
    return discoverGoogleResources(repo, connectionId, creds.accessToken);
  }
  if (provider === 'github') {
    return discoverGitHubResources(repo, connectionId, creds.accessToken);
  }
  return [];
}
