import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  EmptyState,
  FilterToolbar,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
} from '@fluentui/react-components';
import { AddRegular, ArrowSyncRegular, SearchRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import {
  fetchPmClients,
  fetchPmProjects,
  HubHttpError,
  type PmClient,
  type PmProject,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { displayNextAction, isBootstrapNextAction } from '../operating/projectDisplay';
import { ATLAS_STATUS, atlasStatusDisplay } from '../ui/statusLanguage';
import { microsoftConfig } from '../microsoft/config';

type LoadFailure = { kind: 'auth' | 'forbidden' | 'error'; message: string };

const ATLAS_LABELS = new Set<string>(Object.values(ATLAS_STATUS));

const ROW_LINK: CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  display: 'block',
  minHeight: 20,
};

function dayStamp(iso?: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso.slice(0, 10) || null;
  return new Date(t).toISOString().slice(0, 10);
}

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function projectsForClient(projects: PmProject[], client: PmClient): PmProject[] {
  const code = client.clientCode || client.id;
  return projects.filter(
    (p) => p.clientCode === code || p.clientId === code || p.clientId === client.id,
  );
}

function primaryOwner(related: PmProject[]): string | null {
  const names = [...new Set(related.map((p) => p.ownerName).filter(Boolean))];
  if (!names.length) return null;
  return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
}

function primaryNextAction(related: PmProject[]): string | null {
  const real = related.find((p) => !isBootstrapNextAction(p.nextAction));
  if (real?.nextAction) return displayNextAction(real.nextAction);
  return null;
}

function isStalled(client: PmClient, related: PmProject[]): boolean {
  const age = daysSince(client.lastMeaningfulContact);
  if (age === null || age < 30) return false;
  return related.every((p) => isBootstrapNextAction(p.nextAction));
}

function clientHref(client: PmClient): string {
  return `/clients/${encodeURIComponent(client.clientCode || client.id)}`;
}

function titleFromToken(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Title Case ATLAS_STATUS when mapped; otherwise Title Case the raw token. Never invent a status. */
function stageDisplay(raw?: string) {
  const mapped = atlasStatusDisplay(raw);
  if (!mapped) return null;
  if (ATLAS_LABELS.has(mapped.label)) return mapped;
  return { label: titleFromToken(mapped.label), tone: mapped.tone };
}

function classifyHubError(err: unknown): LoadFailure {
  const status = err instanceof HubHttpError ? err.status : (err as { status?: number }).status;
  if (status === 401) {
    return {
      kind: 'auth',
      message: 'Authentication failed talking to Integration Hub (401). Bearer was missing or rejected.',
    };
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      message: 'Authenticated but not authorized for HVCG_Clients (403).',
    };
  }
  return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
}

function ClientRowLink({ client, children }: { client: PmClient; children: ReactNode }) {
  return (
    <Link to={clientHref(client)} style={ROW_LINK}>
      {children}
    </Link>
  );
}

function contactCell(iso?: string) {
  const date = dayStamp(iso);
  if (!date) return { date: '—', age: null as string | null, stale: false };
  const age = daysSince(iso);
  if (age === null) return { date, age: null, stale: false };
  if (age === 0) return { date, age: 'Today', stale: false };
  if (age === 1) return { date, age: '1d', stale: false };
  return { date, age: `${age}d`, stale: age >= 14 };
}

/**
 * Clients directory — SharePoint HVCG_Clients (ClientCode canonical).
 * Does not depend on Client 360. Client 360 fail-closed must not block this page.
 */
export function ClientsPage() {
  const { account, ready, signIn } = useMicrosoftAuth();
  const auth = useHubAuth();
  const [clients, setClients] = useState<PmClient[]>([]);
  const [projects, setProjects] = useState<PmProject[]>([]);
  const [query, setQuery] = useState('');
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [busy, setBusy] = useState(true);
  const [dataSource, setDataSource] = useState<string>('');

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setBusy(false);
      setFailure({
        kind: 'auth',
        message: 'Microsoft sign-in required (Bearer token missing)',
      });
      setClients([]);
      setProjects([]);
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const [clientData, projectData] = await Promise.all([
        fetchPmClients(auth),
        fetchPmProjects(auth).catch(() => ({ projects: [] as PmProject[] })),
      ]);
      setClients(clientData.clients || []);
      setProjects(projectData.projects || []);
      setDataSource(clientData.source || 'sharepoint');
    } catch (err) {
      setFailure(classifyHubError(err));
      setClients([]);
      setProjects([]);
    } finally {
      setBusy(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!ready) return;
    if (!account) {
      setClients([]);
      setProjects([]);
      setDataSource('');
      setFailure(null);
      setBusy(false);
      return;
    }
    if (!auth.tokenReady) return;
    void refresh();
  }, [refresh, ready, account, auth.tokenReady, auth.hasBearer]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = !q
      ? clients
      : clients.filter((c) => {
          const hay = [
            c.clientCode,
            c.displayName,
            c.id,
            c.clientStage,
            c.engagementType,
            c.dba,
            c.industry,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        });
    return [...rows].sort((a, b) => {
      const relatedA = projectsForClient(projects, a);
      const relatedB = projectsForClient(projects, b);
      const stalledA = isStalled(a, relatedA) ? 1 : 0;
      const stalledB = isStalled(b, relatedB) ? 1 : 0;
      if (stalledA !== stalledB) return stalledB - stalledA;
      const ageA = daysSince(a.lastMeaningfulContact);
      const ageB = daysSince(b.lastMeaningfulContact);
      if (ageA === null && ageB === null) return (a.displayName || '').localeCompare(b.displayName || '');
      if (ageA === null) return 1;
      if (ageB === null) return -1;
      return ageB - ageA;
    });
  }, [clients, projects, query]);

  const operator = useMemo(() => {
    const stageCounts = new Map<string, number>();
    const owners = new Set<string>();
    let withNext = 0;
    let stalled = 0;
    let staleContact = 0;
    for (const c of clients) {
      const stage = stageDisplay(c.clientStage);
      if (stage) stageCounts.set(stage.label, (stageCounts.get(stage.label) || 0) + 1);
      const related = projectsForClient(projects, c);
      const owner = primaryOwner(related);
      if (owner) owners.add(owner.split(' +')[0]);
      if (primaryNextAction(related)) withNext += 1;
      if (isStalled(c, related)) stalled += 1;
      const age = daysSince(c.lastMeaningfulContact);
      if (age !== null && age >= 14) staleContact += 1;
    }
    return { stageCounts, owners, withNext, stalled, staleContact };
  }, [clients, projects]);

  if (!ready) {
    return (
      <ModuleScaffold title="Clients" subtitle="Preparing Microsoft session…" showPendingBanner={false}>
        <Spinner label="Loading session…" />
      </ModuleScaffold>
    );
  }

  if (!account) {
    return (
      <ModuleScaffold title="Clients" subtitle="Sign in to see authorized clients" showPendingBanner={false}>
        <EmptyState
          title="Sign in required"
          description="Authorized HVCG_Clients are listed after Microsoft sign-in. Client 360 is not used."
        />
        <Button appearance="primary" onClick={() => void signIn()}>
          Sign in with Microsoft
        </Button>
      </ModuleScaffold>
    );
  }

  if (auth.bootstrapStatus === 'interaction_required') {
    return (
      <ModuleScaffold
        title="Clients"
        subtitle="Integration Hub authorization required"
        showPendingBanner={false}
      >
        <EmptyState
          title="Authorize Atlas Integration Hub"
          description={
            auth.bootstrapMessage ||
            'Your Microsoft session is active, but Atlas still needs a Hub API access token for HVCG_Clients.'
          }
        />
        <Button appearance="primary" onClick={() => void auth.authorizeHub()}>
          Authorize Atlas Integration Hub
        </Button>
      </ModuleScaffold>
    );
  }

  if (!auth.hasBearer && auth.tokenReady) {
    return (
      <ModuleScaffold title="Clients" subtitle="Hub token required" showPendingBanner={false}>
        <EmptyState
          title="Microsoft sign-in required"
          description={
            auth.bootstrapMessage ||
            'Atlas could not acquire an Integration Hub access token. HVCG_Clients stay unread until a Bearer is present.'
          }
        />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'auth' && clients.length === 0) {
    return (
      <ModuleScaffold title="Clients" subtitle="Hub rejected the request" showPendingBanner={false}>
        <EmptyState title="Sign-in required" description={failure.message} />
        <Button appearance="primary" onClick={() => void refresh()}>
          Retry with Hub bearer
        </Button>
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'forbidden' && clients.length === 0) {
    return (
      <ModuleScaffold title="Clients" subtitle="403" showPendingBanner={false}>
        <EmptyState
          title="Access denied"
          description={failure.message}
        />
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title="Clients"
      subtitle="Authorized clients · ClientCode is canonical. Client 360 is deferred."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {microsoftConfig.environment === 'local' || microsoftConfig.environment === 'development' ? (
            <Link to="/clients/intake">
              <Button appearance="secondary" icon={<AddRegular />}>
                Dev prospect intake
              </Button>
            </Link>
          ) : null}
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
        </div>
      }
    >
      <Caption1 style={{ display: 'block' }}>
        Production clients come from Hub <code>/api/pm/clients</code>. Prospect intake on this app is the
        Development BA adapter — not production HVCG_Leads. Website ingest writes HVCG_Leads; there is no
        operator GET on that list here.
      </Caption1>

      {failure?.kind === 'error' ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Clients directory unavailable</MessageBarTitle>
            {failure.message}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <FilterToolbar>
        <StatusChip label={`${filtered.length} / ${clients.length} clients`} tone="info" />
        {dataSource ? (
          <StatusChip
            label={dataSource === 'sharepoint' ? 'Clients directory' : dataSource}
            tone={dataSource === 'sharepoint' ? 'success' : 'warning'}
          />
        ) : null}
        {operator.stalled ? (
          <StatusChip label={`${ATLAS_STATUS.needsAction} · ${operator.stalled}`} tone="warning" />
        ) : null}
        {operator.staleContact ? (
          <StatusChip
            label={`Last contact ≥14d · ${operator.staleContact}`}
            tone={atlasStatusDisplay(ATLAS_STATUS.needsAction)?.tone || 'warning'}
          />
        ) : null}
        {operator.withNext ? (
          <StatusChip label={`Next action · ${operator.withNext}`} tone="gold" />
        ) : null}
        {operator.owners.size ? (
          <StatusChip label={`Owner · ${operator.owners.size}`} tone="info" />
        ) : null}
        {[...operator.stageCounts.entries()].map(([stage, count]) => (
          <StatusChip key={stage} label={`${stage} · ${count}`} tone="neutral" />
        ))}
        <Input
          contentBefore={<SearchRegular />}
          placeholder="Search ClientCode, name, stage…"
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          style={{ minWidth: 220 }}
        />
        {busy ? <Spinner size="tiny" /> : null}
      </FilterToolbar>

      {busy && clients.length === 0 && !failure ? (
        <Spinner label="Loading authorized clients…" />
      ) : failure?.kind === 'error' && clients.length === 0 ? (
        <EmptyState
          title="Clients directory unavailable"
          description="This is not an empty book of business. Hub /api/pm/clients failed; entitled HVCG_Clients were not returned."
        />
      ) : clients.length === 0 ? (
        <EmptyState
          title="No authorized clients"
          description="Authorized HVCG_Clients for your entitlements. Client 360 records are not shown."
        />
      ) : (
        <AtlasCard title="Authorized clients" variant="quiet">
          <DataTable
            ariaLabel="Authorized HVCG clients"
            getRowKey={(r) => r.clientCode || r.id}
            rows={filtered}
            emptyTitle="No clients match this search"
            emptyDescription="Clear the search to see every entitled HVCG_Clients record."
            columns={[
              {
                key: 'client',
                header: 'Client',
                sticky: 'left',
                width: 220,
                render: (r) => (
                  <ClientRowLink client={r}>
                    <span style={{ fontWeight: 600 }}>{r.displayName || r.clientCode || r.id}</span>
                    <Caption1 style={{ display: 'block' }}>{r.clientCode || r.id}</Caption1>
                  </ClientRowLink>
                ),
              },
              {
                key: 'stage',
                header: 'Stage',
                width: 140,
                render: (r) => {
                  const chip = stageDisplay(r.clientStage);
                  return (
                    <ClientRowLink client={r}>
                      {chip ? <StatusChip label={chip.label} tone={chip.tone} /> : <Caption1>—</Caption1>}
                    </ClientRowLink>
                  );
                },
              },
              {
                key: 'next',
                header: 'Next action',
                render: (r) => (
                  <ClientRowLink client={r}>
                    {primaryNextAction(projectsForClient(projects, r)) || '—'}
                  </ClientRowLink>
                ),
              },
              {
                key: 'stalled',
                header: 'Stalled',
                width: 140,
                render: (r) => {
                  const stalled = isStalled(r, projectsForClient(projects, r));
                  return (
                    <ClientRowLink client={r}>
                      {stalled ? (
                        <StatusChip label={ATLAS_STATUS.needsAction} tone="warning" />
                      ) : (
                        <Caption1>—</Caption1>
                      )}
                    </ClientRowLink>
                  );
                },
              },
              {
                key: 'owner',
                header: 'Owner',
                width: 140,
                render: (r) => (
                  <ClientRowLink client={r}>
                    {primaryOwner(projectsForClient(projects, r)) || '—'}
                  </ClientRowLink>
                ),
              },
              {
                key: 'contact',
                header: 'Last contact',
                width: 140,
                render: (r) => {
                  const cell = contactCell(r.lastMeaningfulContact);
                  return (
                    <ClientRowLink client={r}>
                      {cell.date}
                      {cell.age ? (
                        <Caption1
                          style={{
                            display: 'block',
                            color: cell.stale ? '#B45309' : undefined,
                          }}
                        >
                          {cell.age}
                        </Caption1>
                      ) : null}
                    </ClientRowLink>
                  );
                },
              },
            ]}
          />
        </AtlasCard>
      )}
    </ModuleScaffold>
  );
}
