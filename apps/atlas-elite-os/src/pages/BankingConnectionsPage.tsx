import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { ConnectionSummary } from '@hvcg/atlas-plaid-contracts';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useWorkspaceContext } from '../state/WorkspaceContext';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { workspaceCatalog } from '../data/workspaces';
import {
  createLinkToken,
  disconnectConnection,
  exchangePublicToken,
  fetchCashSnapshot,
  fetchConnections,
  syncConnection,
  type AtlasPlaidAuthHeaders,
} from '../integrations/plaid/api';

const CONSENT_VERSION = 'atlas-plaid-consent-v1';
const CONSENT_TEXT =
  'I authorize High Value Capital Group (Atlas) to connect to my business bank account(s) via Plaid to retrieve account ownership, balances, transactions, liabilities, and statement metadata for financial advisory purposes. Atlas never receives or stores my online banking password. I may disconnect at any time.';

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (public_token: string, metadata: unknown) => void;
        onExit?: (err: unknown, metadata: unknown) => void;
      }) => { open: () => void; exit: () => void };
    };
  }
}

function clientCodeFor(workspaceId: string): string {
  if (workspaceId === 'ws-ccb') return 'CCB';
  if (workspaceId === 'ws-hvcg') return 'HVCG';
  return workspaceId.toUpperCase().replace(/^WS-/, '');
}

function money(n: number | null, currency?: string | null) {
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(n);
  } catch {
    return String(n);
  }
}

function statusTone(s: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (s === 'Connected') return 'success';
  if (s === 'Syncing' || s === 'NeedsReauthorization') return 'warning';
  if (s === 'Error') return 'danger';
  return 'neutral';
}

export function BankingConnectionsPage() {
  const { workspaceId, workspaceName } = useWorkspaceContext();
  const { account } = useMicrosoftAuth();
  const { role } = useAtlasRole();
  const clientCode = clientCodeFor(workspaceId);

  const auth: AtlasPlaidAuthHeaders = useMemo(() => {
    const allClientIds = workspaceCatalog.map((w) => w.id);
    return {
      userId: account?.localAccountId || account?.homeAccountId || 'local-dev-user',
      organizationId: 'org-hvcg',
      clientIds: allClientIds,
      email: account?.username,
      roles: [role === 'Unauthenticated' ? 'Guest' : role],
    };
  }, [account, role]);

  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [cash, setCash] = useState<unknown>(null);
  const [linkReady, setLinkReady] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConnections(auth, workspaceId);
      setConnections(data.connections || []);
      const snap = await fetchCashSnapshot(auth, workspaceId, clientCode);
      setCash(snap);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 503) {
        setError(
          'Plaid is not configured yet. Owner must place Sandbox credentials in Key Vault / local .secrets (never in chat). UI will not fake a successful connection.',
        );
      } else if (status === undefined && e instanceof TypeError) {
        setError(
          'Plaid API unreachable at http://127.0.0.1:8787. Start with: npm run start -w @hvcg/atlas-plaid-api (after loading .secrets/plaid.env).',
        );
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load connections');
      }
    } finally {
      setLoading(false);
    }
  }, [auth, workspaceId, clientCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (window.Plaid) {
      setLinkReady(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    s.async = true;
    s.onload = () => setLinkReady(true);
    s.onerror = () => setError('Unable to load Plaid Link script');
    document.body.appendChild(s);
  }, []);

  async function openLink(mode: 'connect' | 'reconnect' = 'connect') {
    setError(null);
    setInfo(null);
    if (!consentChecked && mode === 'connect') {
      setError('Accept the consent disclosure before connecting a bank account.');
      return;
    }
    if (!linkReady || !window.Plaid) {
      setError('Plaid Link is not ready. Check network access to cdn.plaid.com.');
      return;
    }
    setBusy('link');
    try {
      const { linkToken } = await createLinkToken(auth, workspaceId);
      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: (publicToken) => {
          void (async () => {
            try {
              setBusy('exchange');
              await exchangePublicToken(auth, {
                clientId: workspaceId,
                clientCode,
                publicToken,
                consentAcceptedAt: new Date().toISOString(),
                consentVersion: CONSENT_VERSION,
              });
              setInfo('Bank connected. Initial synchronization completed.');
              await refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Token exchange failed');
            } finally {
              setBusy(null);
            }
          })();
        },
        onExit: (err) => {
          setBusy(null);
          if (err) setError('Plaid Link closed before completion');
        },
      });
      handler.open();
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 503) {
        setError('Cannot open Plaid Link: API credentials not configured. See OWNER_ACTIONS_PLAID.md.');
      } else {
        setError(e instanceof Error ? e.message : 'Link token failed');
      }
      setBusy(null);
    }
  }

  async function onRefresh(connectionId: string) {
    setBusy(connectionId);
    setError(null);
    try {
      await syncConnection(auth, workspaceId, connectionId);
      setInfo('Synchronization complete.');
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
        'Disconnect this bank institution from Atlas? Future sync will stop. Audit history is retained.',
      )
    ) {
      return;
    }
    setBusy(connectionId);
    try {
      await disconnectConnection(auth, workspaceId, connectionId, 'user_disconnect');
      setInfo('Institution disconnected.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setBusy(null);
    }
  }

  const accountRows = connections.flatMap((c) =>
    c.accounts.map((a) => ({
      id: a.accountId,
      institution: c.institution.name,
      status: c.status,
      name: a.name,
      type: `${a.type}${a.subtype ? ` / ${a.subtype}` : ''}`,
      mask: a.mask,
      current: money(a.currentBalance, a.isoCurrencyCode),
      available: money(a.availableBalance, a.isoCurrencyCode),
      provenance: a.provenance,
      connectionId: c.connectionId,
    })),
  );

  const verifiedCash =
    cash &&
    typeof cash === 'object' &&
    'provenance' in (cash as object) &&
    (cash as { provenance: string }).provenance === 'VerifiedBank'
      ? (cash as {
          totalCurrentBalance: number;
          totalAvailableBalance: number | null;
          accountCount: number;
          institutionCount: number;
        })
      : null;

  return (
    <ModuleScaffold
      title="Banking Connections"
      subtitle={`Plaid Sandbox · ${workspaceName} (${clientCode}). Source lineage: bank vs accounting kept distinct.`}
      showPendingBanner={false}
      actions={
        <Button
          appearance="primary"
          disabled={busy !== null || loading}
          onClick={() => void openLink('connect')}
        >
          {busy === 'link' || busy === 'exchange' ? 'Connecting…' : 'Connect Bank Account'}
        </Button>
      }
    >
      <MessageBar intent="info">
        <MessageBarBody>
          <MessageBarTitle>Sandbox only until QA GO</MessageBarTitle>
          Live Production Plaid is blocked. Secrets must be loaded from Azure Key Vault or local
          `.secrets/plaid.env` — never pasted into chat.
        </MessageBarBody>
      </MessageBar>

      <AtlasCard title="Consent & privacy" subtitle={CONSENT_VERSION}>
        <Text>{CONSENT_TEXT}</Text>
        <ul>
          <li>Atlas never receives or stores your online banking password.</li>
          <li>Approved products: Auth, Balance, Identity, Liabilities, Statements, Transactions.</li>
          <li>Atlas does not move money or initiate payments through this connection.</li>
          <li>You may disconnect at any time. Access tokens are revoked server-side.</li>
        </ul>
        <Checkbox
          label={`I agree to the disclosure above (${CONSENT_VERSION})`}
          checked={consentChecked}
          onChange={(_, d) => setConsentChecked(Boolean(d.checked))}
        />
      </AtlasCard>

      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Banking connection</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {info ? (
        <MessageBar intent="success">
          <MessageBarBody>{info}</MessageBarBody>
        </MessageBar>
      ) : null}

      <AtlasCard title="Verified cash snapshot" subtitle="Shown only when provenance is VerifiedBank">
        {verifiedCash ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            <div>
              <Caption1>Current balance (Verified bank data)</Caption1>
              <Text weight="semibold">{money(verifiedCash.totalCurrentBalance)}</Text>
            </div>
            <div>
              <Caption1>Available</Caption1>
              <Text weight="semibold">{money(verifiedCash.totalAvailableBalance)}</Text>
            </div>
            <div>
              <Caption1>Accounts / Institutions</Caption1>
              <Text weight="semibold">
                {verifiedCash.accountCount} / {verifiedCash.institutionCount}
              </Text>
            </div>
          </div>
        ) : (
          <Text>No verified bank data yet — connect an institution after Sandbox credentials are configured.</Text>
        )}
      </AtlasCard>

      <AtlasCard title="Connected institutions" subtitle={loading ? 'Loading…' : undefined}>
        {!loading && connections.length === 0 ? (
          <Text>No banks connected yet. Use Connect Bank Account after accepting consent.</Text>
        ) : null}
        {connections.map((c) => (
          <div key={c.connectionId} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Text weight="semibold">{c.institution.name}</Text>
              <StatusChip tone={statusTone(c.status)} label={c.status} />
              <Caption1>
                Last synced: {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString() : 'Not yet synchronized'}
              </Caption1>
              {c.status === 'NeedsReauthorization' ? (
                <Button size="small" disabled={busy !== null} onClick={() => void openLink('reconnect')}>
                  Reconnect
                </Button>
              ) : null}
              <Button
                size="small"
                disabled={busy !== null || c.status === 'Disconnected'}
                onClick={() => void onRefresh(c.connectionId)}
              >
                {busy === c.connectionId ? 'Syncing…' : 'Refresh'}
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
        {accountRows.length > 0 ? (
          <DataTable
            ariaLabel="Bank accounts"
            getRowKey={(r) => r.id}
            rows={accountRows}
            columns={[
              { key: 'institution', header: 'Institution', render: (r) => r.institution },
              { key: 'name', header: 'Account', render: (r) => r.name },
              { key: 'type', header: 'Type', render: (r) => r.type },
              { key: 'mask', header: 'Last 4', render: (r) => `•••• ${r.mask}` },
              { key: 'current', header: 'Current', render: (r) => r.current },
              { key: 'available', header: 'Available', render: (r) => r.available },
              { key: 'provenance', header: 'Provenance', render: (r) => r.provenance },
            ]}
          />
        ) : null}
      </AtlasCard>
    </ModuleScaffold>
  );
}
