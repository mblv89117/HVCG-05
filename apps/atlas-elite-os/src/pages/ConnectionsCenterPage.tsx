import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  EmptyState,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Dropdown,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Tab,
  TabList,
  Text,
  Badge,
} from '@fluentui/react-components';
import {
  PlugConnectedRegular,
  ArrowSyncRegular,
  ShieldCheckmarkRegular,
  WarningRegular,
  SearchRegular,
  DatabaseRegular,
} from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { workspaceCatalog } from '../data/workspaces';
import {
  disconnectConnection,
  discoverConnection,
  fetchAudit,
  fetchConnections,
  fetchHealth,
  fetchInventory,
  fetchRegistry,
  fetchSyncJobs,
  rebuildClient360,
  ingestMicrosoftClient360,
  fetchExecutiveDashboard,
  reauthorizeConnection,
  startConnect,
  syncAll,
  syncConnection,
  verifyConnection,
  type AtlasHubAuthHeaders,
  type BusinessEntityId,
  type ExecutiveDashboard,
  type ConnectionSummary,
  type HubProviderId,
  type InventoryResponse,
  type MailboxType,
} from '../integrations/hub/api';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { baHealth } from '../integrations/hub/baApi';
import { HubHttpError } from '../integrations/hub/hubFetch';

type CenterTab =
  | 'connections'
  | 'inventory'
  | 'registry'
  | 'sync'
  | 'errors'
  | 'audit'
  | 'source-of-truth'
  | 'health';

const BUSINESS_ENTITIES: { value: BusinessEntityId; label: string }[] = [
  { value: 'HVCG', label: 'HVCG — High Value Capital Group' },
  { value: 'HVS', label: 'HVS — High Value Solution' },
  { value: 'legacy', label: 'Legacy / pre-rebrand' },
  { value: 'unknown', label: 'Unknown — refine later' },
];

type BaServiceCheck = {
  label: 'Available' | 'Unavailable';
  correlationId: string;
  ok?: boolean;
  status?: string;
  binding?: string;
  environment?: string;
};

function sanitizeBaHealth(result: Record<string, unknown>, fallbackCorrelation: string): BaServiceCheck {
  const ok = result.ok === true;
  const status = typeof result.status === 'string' ? result.status : undefined;
  const available = ok && (status === 'SUCCESS' || status === 'OK' || !status);
  return {
    label: available ? 'Available' : 'Unavailable',
    correlationId: typeof result.correlationId === 'string' ? result.correlationId : fallbackCorrelation,
    ok,
    status,
    binding: typeof result.binding === 'string' ? result.binding : undefined,
    environment: typeof result.environment === 'string' ? result.environment : undefined,
  };
}

const PROVIDER_BLURBS: Record<
  HubProviderId,
  { title: string; access: string; defaultMode: string }
> = {
  microsoft: {
    title: 'Microsoft 365',
    access:
      'Read-only Graph access: profile, mail metadata/content, calendar, contacts, SharePoint sites, OneDrive files. No send, delete, or modify unless separately approved.',
    defaultMode: 'Read-Only Discovery',
  },
  google: {
    title: 'Google Workspace',
    access:
      'Read-only Gmail, Drive, Calendar, and Contacts. No send, label, archive, or modify unless separately approved.',
    defaultMode: 'Read-Only Discovery',
  },
  github: {
    title: 'GitHub',
    access:
      'Repository read via GitHub App (preferred). Issues may be created only in Workflow Execution mode for Atlas-owned items. Repository selection is required.',
    defaultMode: 'Read-Only Discovery',
  },
};

function statusTone(s: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (s === 'Connected') return 'success';
  if (s === 'Syncing' || s === 'NeedsReauthorization' || s === 'Connecting') return 'warning';
  if (s === 'Error' || s === 'Revoked') return 'danger';
  return 'neutral';
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ConnectionsCenterPage() {
  const { account } = useMicrosoftAuth();
  const { role, can } = useAtlasRole();
  const [tab, setTab] = useState<CenterTab>('connections');
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [registry, setRegistry] = useState<Awaited<ReturnType<typeof fetchRegistry>>['providers']>(
    [],
  );
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [audit, setAudit] = useState<unknown[]>([]);
  const [syncJobs, setSyncJobs] = useState<unknown[]>([]);
  const [hubHealth, setHubHealth] = useState<{ ok: boolean; providers?: Record<string, boolean> } | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [wizardProvider, setWizardProvider] = useState<HubProviderId | null>(null);
  const [wizardMailboxType, setWizardMailboxType] = useState<MailboxType>('user');
  const [businessEntity, setBusinessEntity] = useState<BusinessEntityId>('HVCG');
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [executiveDashboard, setExecutiveDashboard] = useState<ExecutiveDashboard | null>(null);
  const [baCheck, setBaCheck] = useState<BaServiceCheck | null>(null);
  const [baBusy, setBaBusy] = useState(false);

  const auth = useHubAuth();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, reg, conns] = await Promise.all([
        fetchHealth().catch(() => ({ ok: false })),
        fetchRegistry(auth),
        fetchConnections(auth),
      ]);
      setHubHealth(health);
      setRegistry(reg.providers || []);
      setConnections(conns.connections || []);
      // Do not call /api/admin/dashboard here: HVCG Owner is not entitled (403) and
      // the browser would log it on the supported BA Health workflow. Counts come from connections.
      setSelectedId((prev) => prev || conns.connections?.[0]?.id || null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Integration Hub unreachable. Start atlas-integration-api on :8790.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) return;
    void fetchSyncJobs(auth, selectedId)
      .then((r) => setSyncJobs((r as { jobs?: unknown[] }).jobs || (r as { syncJobs?: unknown[] }).syncJobs || []))
      .catch(() => setSyncJobs([]));
  }, [auth, selectedId]);

  useEffect(() => {
    if (tab !== 'audit') return;
    void fetchAudit(auth, 40)
      .then((r) => setAudit((r as { events?: unknown[] }).events || []))
      .catch(() => setAudit([]));
  }, [auth, tab]);

  useEffect(() => {
    if (tab !== 'inventory') return;
    void fetchInventory(auth)
      .then(setInventory)
      .catch(() => setInventory(null));
  }, [auth, tab, connections.length]);

  const checkBusinessAnalyst = useCallback(async () => {
    setBaBusy(true);
    setError(null);
    try {
      await baHealth(auth, 'CORR-G11R-6H-HUB-BA-PING');
      const correlationId = 'CORR-G11R-6H-ELITE-HUB-BA-PING';
      const result = (await baHealth(auth, correlationId)) as Record<string, unknown>;
      setBaCheck(sanitizeBaHealth(result, correlationId));
    } catch (e) {
      const body =
        e instanceof HubHttpError && e.body && typeof e.body === 'object'
          ? (e.body as Record<string, unknown>)
          : {};
      setBaCheck(
        sanitizeBaHealth(
          { ...body, ok: false, status: typeof body.status === 'string' ? body.status : 'UNAVAILABLE' },
          'CORR-G11R-6H-ELITE-HUB-BA-PING',
        ),
      );
      setError(e instanceof Error ? e.message : 'Business Analyst check failed');
    } finally {
      setBaBusy(false);
    }
  }, [auth]);

  const selected = connections.find((c) => c.id === selectedId) || null;

  async function runConnect(
    provider: HubProviderId,
    opts?: { mailboxType?: MailboxType; accountLabel?: string },
  ) {
    setBusy(`connect-${provider}`);
    setError(null);
    setInfo(null);
    try {
      const result = await startConnect(auth, provider, {
        permissionMode: 'read_only_discovery',
        businessEntity,
        mailboxType: opts?.mailboxType || wizardMailboxType,
        accountLabel: opts?.accountLabel,
      });
      if (result.authorizationUrl) {
        setInfo(`Opening ${PROVIDER_BLURBS[provider].title} consent… Complete sign-in, then return here.`);
        window.open(result.authorizationUrl, '_blank', 'noopener,noreferrer');
      } else if (result.connection) {
        setInfo(`${PROVIDER_BLURBS[provider].title} connected.`);
        await refresh();
      } else {
        setInfo(result.message || 'Connect initiated. Configure provider credentials if auth URL is missing.');
      }
      setWizardProvider(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connect failed');
    } finally {
      setBusy(null);
    }
  }

  async function runAction(
    label: string,
    fn: () => Promise<unknown>,
  ) {
    setBusy(label);
    setError(null);
    setInfo(null);
    try {
      const result = await fn();
      if (
        result &&
        typeof result === 'object' &&
        'authorizationUrl' in result &&
        typeof (result as { authorizationUrl?: string }).authorizationUrl === 'string'
      ) {
        window.open(
          (result as { authorizationUrl: string }).authorizationUrl,
          '_blank',
          'noopener,noreferrer',
        );
        setInfo('Reauthorization opened in a new window.');
      } else {
        setInfo(`${label} completed.`);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${label} failed`);
    } finally {
      setBusy(null);
    }
  }

  if (!can('viewAdmin') && role !== 'HVCG Owner' && role !== 'Administrator') {
    return (
      <ModuleScaffold
        title="Connections Center"
        subtitle="Universal Integration Layer"
        showPendingBanner={false}
      >
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Administrator access required</MessageBarTitle>
            Only HVCG Owner / Administrator roles can manage integrations.
          </MessageBarBody>
        </MessageBar>
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title="Connections Center"
      subtitle="Multi-account integrations — each Microsoft, Google, or GitHub login is stored separately"
      showPendingBanner={false}
      actions={
        <Button appearance="secondary" onClick={() => void refresh()} disabled={loading}>
          Refresh
        </Button>
      }
    >
      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Integration error</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {info ? (
        <MessageBar intent="info">
          <MessageBarBody>{info}</MessageBarBody>
        </MessageBar>
      ) : null}

      <AtlasCard>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusChip
            tone={hubHealth?.ok ? 'success' : 'danger'}
            label={hubHealth?.ok ? 'Hub online' : 'Hub offline'}
          />
          {hubHealth?.providers
            ? Object.entries(hubHealth.providers).map(([k, v]) => (
                <Badge key={k} appearance="outline" color={v ? 'success' : 'warning'}>
                  {k}: {v ? 'configured' : 'needs credentials'}
                </Badge>
              ))
            : null}
          {dashboard ? (
            <Caption1>
              Connections: {String(dashboard.connectionCount ?? connections.length)} · Sync jobs:{' '}
              {String(dashboard.syncJobCount ?? '—')} · Open errors:{' '}
              {String(dashboard.openErrorCount ?? '—')}
            </Caption1>
          ) : null}
        </div>
      </AtlasCard>

      <TabList
        selectedValue={tab}
        onTabSelect={(_, d) => setTab(d.value as CenterTab)}
      >
        <Tab value="connections">Connections</Tab>
        <Tab value="inventory">Inventory</Tab>
        <Tab value="registry">Integrations</Tab>
        <Tab value="sync">Sync Jobs</Tab>
        <Tab value="errors">Errors</Tab>
        <Tab value="audit">Audit Log</Tab>
        <Tab value="source-of-truth">Source of Truth</Tab>
        <Tab value="health">Health</Tab>
      </TabList>

      {tab === 'connections' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <MessageBar intent="info">
            <MessageBarBody>
              <MessageBarTitle>Multiple Microsoft accounts allowed</MessageBarTitle>
              Adding another Microsoft login creates a new connection — it does not replace Manuel
              Barela or any existing mailbox. Use the account picker to sign in as a different user
              or shared-mailbox delegate.
            </MessageBarBody>
          </MessageBar>

          <AtlasCard>
            <Text weight="semibold">Add an account</Text>
            <Caption1 style={{ display: 'block', marginTop: 4, marginBottom: 12 }}>
              Select the legal entity, then start authorization. New connections default to
              Read-Only Discovery.
            </Caption1>
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div>
                <Caption1>Business entity</Caption1>
                <Dropdown
                  aria-label="Business entity"
                  value={
                    BUSINESS_ENTITIES.find((e) => e.value === businessEntity)?.label ||
                    String(businessEntity)
                  }
                  selectedOptions={[businessEntity]}
                  onOptionSelect={(_, data) => {
                    if (data.optionValue) setBusinessEntity(data.optionValue as BusinessEntityId);
                  }}
                  style={{ minWidth: 280 }}
                >
                  {BUSINESS_ENTITIES.map((e) => (
                    <Option key={e.value} value={e.value} text={e.label}>
                      {e.label}
                    </Option>
                  ))}
                </Dropdown>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                appearance="primary"
                icon={<PlugConnectedRegular />}
                disabled={busy !== null}
                onClick={() => {
                  setWizardMailboxType('user');
                  setWizardProvider('microsoft');
                }}
              >
                Add Microsoft account
              </Button>
              <Button
                appearance="primary"
                icon={<PlugConnectedRegular />}
                disabled={busy !== null}
                onClick={() => {
                  setWizardMailboxType('shared');
                  setWizardProvider('microsoft');
                }}
              >
                Add shared mailbox (Microsoft)
              </Button>
              <Button
                appearance="primary"
                icon={<PlugConnectedRegular />}
                disabled={busy !== null}
                onClick={() => {
                  setWizardMailboxType('user');
                  setWizardProvider('google');
                }}
              >
                Add Google account
              </Button>
              <Button
                appearance="primary"
                icon={<PlugConnectedRegular />}
                disabled={busy !== null}
                onClick={() => {
                  setWizardMailboxType('n/a');
                  setWizardProvider('github');
                }}
              >
                Add GitHub organization
              </Button>
              <Button
                appearance="secondary"
                disabled
                title="Accounting and cloud storage connectors are scaffold-only in this release"
              >
                Add storage / accounting (coming soon)
              </Button>
            </div>
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Storage, QuickBooks, Mercury, and similar systems will appear here when Phase 5
              connectors are enabled.
            </Caption1>
          </AtlasCard>

          {wizardProvider ? (
            <AtlasCard>
              <Text weight="semibold">Setup wizard — {PROVIDER_BLURBS[wizardProvider].title}</Text>
              <ol style={{ margin: '12px 0', paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Provider: {PROVIDER_BLURBS[wizardProvider].title}</li>
                <li>Business entity: {businessEntity}</li>
                {wizardProvider === 'microsoft' ? (
                  <li>Mailbox type: {wizardMailboxType}</li>
                ) : null}
                <li>Access requested: {PROVIDER_BLURBS[wizardProvider].access}</li>
                <li>Permission mode: {PROVIDER_BLURBS[wizardProvider].defaultMode}</li>
                <li>
                  Complete OAuth / App installation — choose a different account than any already
                  connected
                </li>
                <li>Return here — verify, run discovery, then validation sync</li>
              </ol>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  appearance="primary"
                  disabled={busy !== null}
                  onClick={() =>
                    void runConnect(wizardProvider, { mailboxType: wizardMailboxType })
                  }
                >
                  {busy === `connect-${wizardProvider}` ? 'Starting…' : 'Begin authorization'}
                </Button>
                <Button appearance="secondary" onClick={() => setWizardProvider(null)}>
                  Cancel
                </Button>
              </div>
            </AtlasCard>
          ) : null}

          {connections.length === 0 && !loading ? (
            <AtlasCard variant="quiet">
              <EmptyState
                title="No integrations connected"
                description="Connect Microsoft 365, Google Workspace, or GitHub to begin discovery sync."
              />
            </AtlasCard>
          ) : (
            <DataTable<ConnectionSummary>
              columns={[
                {
                  key: 'entity',
                  header: 'Entity',
                  render: (r) => r.businessEntity || 'unknown',
                },
                { key: 'provider', header: 'Provider', render: (r) => r.providerName },
                {
                  key: 'email',
                  header: 'Account email',
                  render: (r) => r.accountEmail || r.accountName,
                },
                {
                  key: 'tenant',
                  header: 'Tenant / Org',
                  render: (r) => r.tenantOrOrg || '—',
                },
                {
                  key: 'mailbox',
                  header: 'Mailbox type',
                  render: (r) => r.mailboxType || 'n/a',
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => <StatusChip tone={statusTone(r.status)} label={r.status} />,
                },
                {
                  key: 'sync',
                  header: 'Last sync',
                  render: (r) => fmt(r.lastSuccessfulSyncAt),
                },
                {
                  key: 'discovered',
                  header: 'Discovered',
                  render: (r) => String(r.recordsDiscovered ?? '—'),
                },
                {
                  key: 'imported',
                  header: 'Imported',
                  render: (r) => String(r.recordsImported ?? '—'),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (c) => (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          icon={<SearchRegular />}
                          disabled={busy !== null}
                          onClick={() =>
                            void runAction('Discovery', () => discoverConnection(auth, c.id))
                          }
                        >
                          Run discovery
                        </Button>
                        <Button
                          size="small"
                          icon={<ShieldCheckmarkRegular />}
                          disabled={busy !== null}
                          onClick={() =>
                            void runAction('Verify', () => verifyConnection(auth, c.id))
                          }
                        >
                          Verify
                        </Button>
                        <Button
                          size="small"
                          icon={<ArrowSyncRegular />}
                          disabled={busy !== null}
                          onClick={() => void runAction('Sync', () => syncConnection(auth, c.id))}
                        >
                          Sync
                        </Button>
                        {c.requiresReauthorization ? (
                          <Button
                            size="small"
                            icon={<WarningRegular />}
                            disabled={busy !== null}
                            onClick={() =>
                              void runAction('Reauthorize', () => reauthorizeConnection(auth, c.id))
                            }
                          >
                            Reauthorize
                          </Button>
                        ) : null}
                        <Button
                          size="small"
                          appearance="subtle"
                          disabled={busy !== null}
                          onClick={() =>
                            void runAction('Disconnect', () => disconnectConnection(auth, c.id))
                          }
                        >
                          Disconnect
                        </Button>
                        <Button size="small" appearance="transparent" onClick={() => setSelectedId(c.id)}>
                          Details
                        </Button>
                      </div>
                    ),
                },
              ]}
              rows={connections}
              getRowKey={(r) => r.id}
            />
          )}

          {selected ? (
            <AtlasCard>
              <Text weight="semibold">Connection detail</Text>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <Detail label="Entity" value={selected.businessEntity || 'unknown'} />
                <Detail label="Provider" value={selected.providerName} />
                <Detail label="Account email" value={selected.accountEmail || selected.accountName} />
                <Detail label="Display name" value={selected.accountDisplayName || '—'} />
                <Detail label="Tenant / Org" value={selected.tenantOrOrg || '—'} />
                <Detail label="Mailbox type" value={selected.mailboxType || 'n/a'} />
                <Detail label="Discovered records" value={String(selected.recordsDiscovered ?? '—')} />
                <Detail label="Imported records" value={String(selected.recordsImported ?? '—')} />
                <Detail label="Owner" value={selected.ownerUserId} />
                <Detail label="Auth type" value={selected.authType} />
                <Detail label="Environment" value={selected.environment} />
                <Detail label="Connected" value={fmt(selected.connectedAt)} />
                <Detail label="Last token refresh" value={fmt(selected.lastTokenRefreshAt)} />
                <Detail label="Last successful sync" value={fmt(selected.lastSuccessfulSyncAt)} />
                <Detail label="Next scheduled sync" value={fmt(selected.nextScheduledSyncAt)} />
                <Detail label="Error state" value={selected.errorState || 'None'} />
                <Detail
                  label="Reauth required"
                  value={selected.requiresReauthorization ? 'Yes' : 'No'}
                />
                <Detail label="Auto sync" value={selected.autoSyncEnabled ? 'Enabled' : 'Disabled'} />
              </div>
              <Caption1 style={{ display: 'block', marginTop: 12 }}>
                Scopes: {selected.scopes.length ? selected.scopes.join(', ') : '—'}
              </Caption1>
            </AtlasCard>
          ) : null}
          <AtlasCard>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Text weight="semibold">Batch operations</Text>
              <Button
                appearance="primary"
                icon={<DatabaseRegular />}
                disabled={busy !== null || connections.length === 0}
                onClick={() =>
                  void runAction('Microsoft Client 360 ingest', async () => {
                    const result = await ingestMicrosoftClient360(auth);
                    setExecutiveDashboard(result.dashboard);
                    return result;
                  })
                }
              >
                Ingest Microsoft → Client 360
              </Button>
              <Button
                appearance="secondary"
                icon={<ArrowSyncRegular />}
                disabled={busy !== null || connections.length === 0}
                onClick={() => void runAction('Sync all', () => syncAll(auth))}
              >
                Sync all connections
              </Button>
              <Button
                appearance="secondary"
                icon={<DatabaseRegular />}
                disabled={busy !== null}
                onClick={() =>
                  void runAction('Rebuild Client 360', async () => {
                    const result = await rebuildClient360(auth);
                    if (result.dashboard) setExecutiveDashboard(result.dashboard);
                    else {
                      const dash = await fetchExecutiveDashboard(auth).catch(() => null);
                      if (dash?.dashboard) setExecutiveDashboard(dash.dashboard);
                    }
                    return result;
                  })
                }
              >
                Rebuild Client 360
              </Button>
            </div>
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Deep sync paginates Outlook mail (Inbox/Sent/Archive), calendar, contacts, OneDrive,
              selected SharePoint sites, and Teams metadata across all Microsoft accounts, then
              rebuilds the unified Client 360 database with entity resolution.
            </Caption1>
          </AtlasCard>
          {executiveDashboard ? (
            <AtlasCard>
              <Text weight="semibold">Client 360 Executive Dashboard</Text>
              <Caption1 style={{ display: 'block', marginTop: 4 }}>
                Generated {fmt(executiveDashboard.generatedAt)} · Avg completeness{' '}
                {executiveDashboard.averageCompletenessScore}%
              </Caption1>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 12,
                  marginTop: 12,
                }}
              >
                {(
                  [
                    ['Total clients', executiveDashboard.totalClientsDiscovered],
                    ['Active', executiveDashboard.activeClients],
                    ['Former', executiveDashboard.formerClients],
                    ['Prospects', executiveDashboard.prospects],
                    ['Emails', executiveDashboard.emailsIndexed],
                    ['Documents', executiveDashboard.documentsIndexed],
                    ['Attachments', executiveDashboard.attachmentsIndexed],
                    ['Meetings', executiveDashboard.meetingsIndexed],
                    ['Contacts', executiveDashboard.contactsIndexed],
                    ['Duplicates', executiveDashboard.duplicateCandidates],
                    ['Needs review', executiveDashboard.clientsNeedingReview],
                    ['Source records', executiveDashboard.sourceRecordsIndexed],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <Caption1>{label}</Caption1>
                    <Text weight="semibold" style={{ display: 'block', fontSize: 20 }}>
                      {value}
                    </Text>
                  </div>
                ))}
              </div>
              {executiveDashboard.topIncompleteClients.length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <Caption1>Lowest completeness (needs attention)</Caption1>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                    {executiveDashboard.topIncompleteClients.slice(0, 8).map((c) => (
                      <li key={c.id}>
                        <Text>
                          {c.displayName} — {c.completenessScore}% · missing{' '}
                          {c.missingInformation.slice(0, 3).join(', ') || '—'}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </AtlasCard>
          ) : null}
        </div>
      ) : null}

      {tab === 'inventory' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <AtlasCard>
            <Text weight="semibold">Multi-account inventory</Text>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Served from GET /api/inventory — all active connections across HVS, HVCG, and legacy
              entities.
            </Caption1>
            {inventory?.summary ? (
              <Caption1 style={{ display: 'block', marginTop: 8 }}>
                Total: {String(inventory.summary.connectionCount ?? inventory.connections.length)}{' '}
                connections · Discovered resources:{' '}
                {String(inventory.summary.discoveredResources ?? '—')}
              </Caption1>
            ) : null}
          </AtlasCard>
          {inventory && inventory.connections.length > 0 ? (
            <DataTable<(typeof inventory.connections)[0]>
              columns={[
                { key: 'entity', header: 'Entity', render: (r) => r.businessEntity || 'unknown' },
                { key: 'provider', header: 'Provider', render: (r) => r.provider },
                {
                  key: 'email',
                  header: 'Account email',
                  render: (r) => r.accountEmail || r.accountDisplayName || '—',
                },
                { key: 'tenant', header: 'Tenant / Org', render: (r) => r.tenantOrOrg || '—' },
                { key: 'mailbox', header: 'Mailbox type', render: (r) => r.mailboxType || 'n/a' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => <StatusChip tone={statusTone(r.status)} label={r.status} />,
                },
                { key: 'sync', header: 'Last sync', render: (r) => fmt(r.lastSuccessfulSyncAt) },
                {
                  key: 'discovered',
                  header: 'Discovered',
                  render: (r) => String(r.recordsDiscovered ?? '—'),
                },
                {
                  key: 'imported',
                  header: 'Imported',
                  render: (r) => String(r.recordsImported ?? '—'),
                },
              ]}
              rows={inventory.connections}
              getRowKey={(r) => r.id}
            />
          ) : (
            <AtlasCard variant="quiet">
              <EmptyState
                title="No inventory yet"
                description="Connect accounts on the Connections tab, then return here."
              />
            </AtlasCard>
          )}
        </div>
      ) : null}

      {tab === 'registry' ? (
        <DataTable<(typeof registry)[0]>
          columns={[
            { key: 'name', header: 'Provider', render: (r) => r.providerName },
            {
              key: 'status',
              header: 'Deployment',
              render: (r) => r.deploymentStatus,
            },
            {
              key: 'auth',
              header: 'Auth',
              render: (r) => r.authenticationType.join(', '),
            },
            {
              key: 'delta',
              header: 'Delta sync',
              render: (r) => (r.deltaSyncSupport ? 'Yes' : 'No'),
            },
            {
              key: 'webhook',
              header: 'Webhooks',
              render: (r) => (r.webhookSupport ? 'Yes' : 'No'),
            },
            {
              key: 'mode',
              header: 'Default mode',
              render: (r) => r.defaultPermissionMode,
            },
          ]}
          rows={registry}
          getRowKey={(r) => r.providerId}
        />
      ) : null}

      {tab === 'sync' ? (
        <AtlasCard>
          <Text weight="semibold">Sync jobs {selected ? `· ${selected.providerName}` : ''}</Text>
          {syncJobs.length === 0 ? (
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Select a connection and run Sync to create jobs.
            </Caption1>
          ) : (
            <pre style={{ marginTop: 12, fontSize: 12, overflow: 'auto' }}>
              {JSON.stringify(syncJobs, null, 2)}
            </pre>
          )}
        </AtlasCard>
      ) : null}

      {tab === 'errors' ? (
        <AtlasCard>
          <Text weight="semibold">Synchronization errors</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Failed jobs retry with exponential backoff. Dead-lettered items appear after max
            attempts. A failed connector does not stop unrelated connectors.
          </Caption1>
          {selected?.errorState ? (
            <MessageBar intent="warning" style={{ marginTop: 12 }}>
              <MessageBarBody>{selected.errorState}</MessageBarBody>
            </MessageBar>
          ) : (
            <Caption1 style={{ display: 'block', marginTop: 12 }}>No open error state on selected connection.</Caption1>
          )}
        </AtlasCard>
      ) : null}

      {tab === 'audit' ? (
        <AtlasCard>
          <Text weight="semibold">Audit log</Text>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Tokens and secrets are never written to audit output.
          </Caption1>
          <pre style={{ marginTop: 12, fontSize: 12, overflow: 'auto', maxHeight: 420 }}>
            {JSON.stringify(audit, null, 2)}
          </pre>
        </AtlasCard>
      ) : null}

      {tab === 'source-of-truth' ? (
        <AtlasCard>
          <Text weight="semibold">Source-of-truth rules</Text>
          <ul style={{ marginTop: 12, lineHeight: 1.6 }}>
            <li>Original email remains authoritative in Outlook or Gmail.</li>
            <li>
              Original documents remain authoritative in SharePoint, OneDrive, Google Drive, or
              originating systems.
            </li>
            <li>Atlas may store a copy, index, metadata, summary, or reference.</li>
            <li>Atlas-generated tasks may be authoritative in Atlas and synced outbound.</li>
            <li>Accounting balances remain authoritative in the accounting platform.</li>
            <li>Signed contracts remain authoritative in e-signature / source systems.</li>
          </ul>
          <Caption1>
            Full field-level rules are served from GET /api/integrations/source-of-truth
          </Caption1>
        </AtlasCard>
      ) : null}

      {tab === 'health' ? (
        <AtlasCard>
          <Text weight="semibold">Integration health</Text>
          <pre style={{ marginTop: 12, fontSize: 12, overflow: 'auto' }}>
            {JSON.stringify({ hub: hubHealth, dashboard, selected }, null, 2)}
          </pre>
          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            <Text weight="semibold">Business Analyst Service</Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button appearance="primary" disabled={baBusy} onClick={() => void checkBusinessAnalyst()}>
                {baBusy ? 'Checking…' : 'Check'}
              </Button>
              {baCheck ? (
                <StatusChip
                  label={baCheck.label}
                  tone={baCheck.label === 'Available' ? 'success' : 'danger'}
                />
              ) : null}
            </div>
            {baCheck ? (
              <Caption1>
                {baCheck.status || 'no-status'}
                {baCheck.binding ? ` · ${baCheck.binding}` : ''}
                {baCheck.environment ? ` · ${baCheck.environment}` : ''}
                {` · ${baCheck.correlationId}`}
              </Caption1>
            ) : (
              <Caption1>Read-only Hub `/api/ba/health` ping. No business data.</Caption1>
            )}
          </div>
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Caption1>{label}</Caption1>
      <Text style={{ display: 'block' }}>{value}</Text>
    </div>
  );
}
