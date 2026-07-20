import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Checkbox,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  Caption1,
} from '@fluentui/react-components';
import type { QboConnectionSummary } from '@hvcg/atlas-qbo-contracts';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useWorkspaceContext } from '../state/WorkspaceContext';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { workspaceCatalog } from '../data/workspaces';
import {
  disconnectConnection,
  fetchAccountingSnapshot,
  fetchConnections,
  startOAuth,
  syncConnection,
  type AtlasQboAuthHeaders,
} from '../integrations/qbo/api';

const CONSENT_VERSION = 'atlas-qbo-consent-v1';
const CONSENT_TEXT =
  'I authorize High Value Capital Group (Atlas) to connect to this client\'s QuickBooks Online company to retrieve chart of accounts, customers, vendors, invoices, bills, payments, deposits, journal entries, products/services, classes, locations, and financial reports for financial advisory purposes. Atlas does not modify QuickBooks data in Phase 1 (read-only). I may disconnect at any time.';

function clientCodeFor(workspaceId: string): string {
  if (workspaceId === 'ws-ccb') return 'CCB';
  if (workspaceId === 'ws-hvcg') return 'HVCG';
  return workspaceId.toUpperCase().replace(/^WS-/, '');
}

function money(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function statusTone(s: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (s === 'Connected' || s === 'authorized' || s === 'valid' || s === 'succeeded') return 'success';
  if (s === 'Syncing' || s === 'NeedsReauthorization' || s === 'expiring_soon' || s === 'running' || s === 'partial')
    return 'warning';
  if (s === 'Error' || s === 'failed' || s === 'revoked' || s === 'expired') return 'danger';
  return 'neutral';
}

function healthLabel(c: QboConnectionSummary): string {
  if (c.health.healthy) return 'Healthy';
  if (c.status === 'NeedsReauthorization') return 'Needs reconnect';
  if (c.syncStatus === 'interrupted') return 'Interrupted (resumable)';
  if (c.errorMessage) return 'Degraded';
  return 'Check status';
}

export function AccountingConnectionsPage() {
  const { workspaceId, workspaceName } = useWorkspaceContext();
  const { account } = useMicrosoftAuth();
  const { role } = useAtlasRole();
  const clientCode = clientCodeFor(workspaceId);
  const [searchParams, setSearchParams] = useSearchParams();

  const auth: AtlasQboAuthHeaders = useMemo(() => {
    const allClientIds = workspaceCatalog.map((w) => w.id);
    return {
      userId: account?.localAccountId || account?.homeAccountId || 'local-dev-user',
      organizationId: 'org-hvcg',
      clientIds: allClientIds,
      email: account?.username,
      roles: [role === 'Unauthenticated' ? 'Guest' : role],
    };
  }, [account, role]);

  const [connections, setConnections] = useState<QboConnectionSummary[]>([]);
  const [qboConfigured, setQboConfigured] = useState<boolean | null>(null);
  const [oauthStatus, setOauthStatus] = useState<string>('unknown');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [snapshot, setSnapshot] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConnections(auth, workspaceId);
      setConnections(data.connections || []);
      setQboConfigured(data.qboConfigured);
      setOauthStatus(data.oauthStatus);
      const snap = await fetchAccountingSnapshot(auth, workspaceId, clientCode);
      setSnapshot(snap);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 503) {
        setQboConfigured(false);
        setOauthStatus('not_configured');
        setError(
          'QuickBooks is not configured yet. Owner must place Sandbox credentials in Key Vault / local .secrets/qbo.env (never in chat). UI will not fake a successful connection.',
        );
      } else if (status === undefined && e instanceof TypeError) {
        setError(
          'QuickBooks API unreachable at http://127.0.0.1:8788. Start with: npm run start -w @hvcg/atlas-qbo-api (after loading .secrets/qbo.env).',
        );
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load accounting connections');
      }
    } finally {
      setLoading(false);
    }
  }, [auth, workspaceId, clientCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const qbo = searchParams.get('qbo');
    if (!qbo) return;
    if (qbo === 'connected') {
      setInfo('QuickBooks company connected. Initial synchronization attempted.');
      void refresh();
    } else if (qbo === 'error') {
      setError(`OAuth did not complete (${searchParams.get('reason') || 'unknown'}).`);
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, refresh]);

  async function onConnect(mode: 'connect' | 'reconnect' = 'connect', connectionId?: string) {
    setError(null);
    setInfo(null);
    if (!consentChecked && mode === 'connect') {
      setError('Accept the consent disclosure before connecting QuickBooks.');
      return;
    }
    setBusy(mode === 'reconnect' ? `reconnect:${connectionId}` : 'oauth');
    try {
      const { authorizeUrl } = await startOAuth(auth, {
        clientId: workspaceId,
        clientCode,
        consentAcceptedAt: new Date().toISOString(),
        consentVersion: CONSENT_VERSION,
        mode,
        connectionId,
      });
      window.location.assign(authorizeUrl);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 503) {
        setError('Cannot start QuickBooks OAuth: API credentials not configured. See QuickBooksOwnerActions.md.');
      } else {
        setError(e instanceof Error ? e.message : 'OAuth start failed');
      }
      setBusy(null);
    }
  }

  async function onManualSync(connectionId: string) {
    setBusy(connectionId);
    setError(null);
    try {
      await syncConnection(auth, workspaceId, connectionId, true);
      setInfo('Manual synchronization complete (or resumed from checkpoint).');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(null);
    }
  }

  async function onDisconnect(connectionId: string) {
    if (
      !window.confirm(
        'Disconnect this QuickBooks company from Atlas? Tokens will be revoked. Audit history is retained. Plaid bank data is unaffected.',
      )
    ) {
      return;
    }
    setBusy(connectionId);
    try {
      await disconnectConnection(auth, workspaceId, connectionId, 'user_disconnect');
      setInfo('QuickBooks company disconnected.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setBusy(null);
    }
  }

  const imported =
    snapshot &&
    typeof snapshot === 'object' &&
    'provenance' in (snapshot as object) &&
    (snapshot as { provenance: string }).provenance === 'ImportedAccounting'
      ? (snapshot as {
          companyName: string | null;
          accountCount: number;
          invoiceOpenTotal: number | null;
          billOpenTotal: number | null;
          connectionCount: number;
        })
      : null;

  const entityRows = connections.flatMap((c) =>
    c.entitySummaries.map((e) => ({
      id: `${c.connectionId}:${e.entity}`,
      company: c.company.companyName,
      entity: e.entity,
      count: e.recordCount,
      checkpoint: e.lastCheckpoint ? new Date(e.lastCheckpoint).toLocaleString() : '—',
      status: e.status,
    })),
  );

  return (
    <ModuleScaffold
      title="Accounting Connections"
      subtitle={`QuickBooks Online · ${workspaceName} (${clientCode}). Lineage: ImportedAccounting — never overwrites Plaid VerifiedBank.`}
      showPendingBanner={false}
      actions={
        <Button
          appearance="primary"
          disabled={busy !== null || loading}
          onClick={() => void onConnect('connect')}
        >
          {busy === 'oauth' ? 'Redirecting…' : 'Connect QuickBooks'}
        </Button>
      }
    >
      <MessageBar intent="info">
        <MessageBarBody>
          <MessageBarTitle>Sandbox until Production GO</MessageBarTitle>
          Secrets load from Azure Key Vault or local `.secrets/qbo.env` — never paste into chat. Banking
          remains on <Link to="/banking">Banking Connections</Link> (Plaid).
        </MessageBarBody>
      </MessageBar>

      <AtlasCard title="Consent & privacy" subtitle={CONSENT_VERSION}>
        <Text>{CONSENT_TEXT}</Text>
        <ul>
          <li>Phase 1 is read-only — Atlas does not post journals or payments to QuickBooks.</li>
          <li>Access and refresh tokens are encrypted server-side; the browser never sees them.</li>
          <li>Source lineage for all imported records: QuickBooks → ImportedAccounting.</li>
          <li>You may disconnect at any time. Refresh tokens are revoked with Intuit when possible.</li>
        </ul>
        <Checkbox
          label={`I agree to the disclosure above (${CONSENT_VERSION})`}
          checked={consentChecked}
          onChange={(_, d) => setConsentChecked(Boolean(d.checked))}
        />
      </AtlasCard>

      <AtlasCard title="Integration status">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <div>
            <Caption1>OAuth status</Caption1>
            <div>
              <StatusChip
                tone={statusTone(oauthStatus === 'ready' || oauthStatus === 'authorized' ? 'authorized' : oauthStatus)}
                label={oauthStatus}
              />
            </div>
          </div>
          <div>
            <Caption1>Credentials configured</Caption1>
            <Text weight="semibold">
              {qboConfigured == null ? 'Checking…' : qboConfigured ? 'Yes' : 'No — see Owner Actions'}
            </Text>
          </div>
          <div>
            <Caption1>API</Caption1>
            <Text weight="semibold">http://127.0.0.1:8788</Text>
          </div>
        </div>
      </AtlasCard>

      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Accounting connection</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {info ? (
        <MessageBar intent="success">
          <MessageBarBody>{info}</MessageBarBody>
        </MessageBar>
      ) : null}

      <AtlasCard title="Imported accounting snapshot" subtitle="Shown only when provenance is ImportedAccounting">
        {imported ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            <div>
              <Caption1>Company</Caption1>
              <Text weight="semibold">{imported.companyName || '—'}</Text>
            </div>
            <div>
              <Caption1>Chart of accounts</Caption1>
              <Text weight="semibold">{imported.accountCount}</Text>
            </div>
            <div>
              <Caption1>Open invoices</Caption1>
              <Text weight="semibold">{money(imported.invoiceOpenTotal)}</Text>
            </div>
            <div>
              <Caption1>Open bills</Caption1>
              <Text weight="semibold">{money(imported.billOpenTotal)}</Text>
            </div>
          </div>
        ) : (
          <Text>
            No imported accounting data yet — connect a QuickBooks company after Sandbox credentials are
            configured. Plaid cash is never shown here.
          </Text>
        )}
      </AtlasCard>

      <AtlasCard title="Connected companies" subtitle={loading ? 'Loading…' : undefined}>
        {!loading && connections.length === 0 ? (
          <Text>No QuickBooks companies connected. Use Connect QuickBooks after accepting consent.</Text>
        ) : null}
        {connections.map((c) => (
          <div key={c.connectionId} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Text weight="semibold">{c.company.companyName}</Text>
              <StatusChip tone={statusTone(c.status)} label={c.status} />
              <StatusChip tone={statusTone(c.syncStatus)} label={`Sync: ${c.syncStatus}`} />
              <StatusChip tone={c.health.healthy ? 'success' : 'warning'} label={healthLabel(c)} />
            </div>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              <Caption1>Realm ID: {c.company.realmId}</Caption1>
              <Caption1>OAuth: {c.oauthStatus}</Caption1>
              <Caption1>Token: {c.tokenStatus}</Caption1>
              <Caption1>
                Last sync:{' '}
                {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString() : 'Not yet synchronized'}
              </Caption1>
            </div>
            {c.health.lastErrorMessage ? (
              <MessageBar intent="warning" style={{ marginTop: 8 }}>
                <MessageBarBody>{c.health.lastErrorMessage}</MessageBarBody>
              </MessageBar>
            ) : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {c.status === 'NeedsReauthorization' ? (
                <Button
                  size="small"
                  disabled={busy !== null}
                  onClick={() => void onConnect('reconnect', c.connectionId)}
                >
                  Reconnect
                </Button>
              ) : null}
              <Button
                size="small"
                disabled={busy !== null || c.status === 'Disconnected'}
                onClick={() => void onManualSync(c.connectionId)}
              >
                {busy === c.connectionId ? 'Syncing…' : 'Manual Sync'}
              </Button>
              <Button
                size="small"
                appearance="secondary"
                disabled={busy !== null || c.status === 'Disconnected'}
                onClick={() => void onDisconnect(c.connectionId)}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ))}
      </AtlasCard>

      {entityRows.length > 0 ? (
        <AtlasCard title="Synced entities" subtitle="Incremental CDC + report snapshots">
          <DataTable
            ariaLabel="QBO synced entities"
            getRowKey={(r) => r.id}
            rows={entityRows}
            columns={[
              { key: 'company', header: 'Company', render: (r) => r.company },
              { key: 'entity', header: 'Entity', render: (r) => r.entity },
              { key: 'count', header: 'Records', render: (r) => String(r.count) },
              { key: 'checkpoint', header: 'Checkpoint', render: (r) => r.checkpoint },
              { key: 'status', header: 'Status', render: (r) => r.status },
            ]}
          />
        </AtlasCard>
      ) : null}

      <AtlasCard title="Related surfaces">
        <Text>
          Use <Link to="/banking">Banking Connections</Link> for Plaid. Financial Intelligence at{' '}
          <Link to="/financials">/financials</Link> must keep bank vs accounting lineages distinct.
        </Text>
      </AtlasCard>
    </ModuleScaffold>
  );
}
