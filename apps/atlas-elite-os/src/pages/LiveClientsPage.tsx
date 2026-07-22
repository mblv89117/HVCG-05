import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  EmptyState,
  FilterToolbar,
} from '@hvcg/atlas-design-system';
import { Button, Caption1, Input, Spinner, Text } from '@fluentui/react-components';
import { ArrowSyncRegular, SearchRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import {
  fetchClient360,
  ingestMicrosoftClient360,
  type Client360Candidate,
} from '../integrations/hub/api';
import { useHubAuth } from '../integrations/hub/useHubAuth';

function toneForLifecycle(lifecycle?: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (lifecycle) {
    case 'active':
      return 'success';
    case 'prospect':
      return 'info';
    case 'former':
      return 'warning';
    default:
      return 'neutral';
  }
}

/**
 * Live Clients portfolio — sourced from Client 360 (Microsoft-backed), not demo catalog.
 */
export function ClientsPage() {
  const { account, ready } = useMicrosoftAuth();
  const auth = useHubAuth();
  const [clients, setClients] = useState<Client360Candidate[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchClient360(auth);
      setClients(data.clients || []);
      setDataSource(data.source);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, [auth]);

  const reinjest = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await ingestMicrosoftClient360(auth);
      await refresh();
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }, [auth, refresh]);

  useEffect(() => {
    if (!ready) return;
    // Signed-out: never request hub or snapshot; clear any prior rows.
    if (!account) {
      setClients([]);
      setDataSource('');
      setError(null);
      setBusy(false);
      return;
    }
    if (!auth.accessToken) return;
    void refresh();
  }, [refresh, ready, account, auth.accessToken]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const hay = [
        c.displayName,
        c.legalName,
        c.lifecycle,
        ...(c.emails || []),
        ...(c.domains || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [clients, query]);

  return (
    <ModuleScaffold
      title="Clients"
      subtitle="Live Client 360 portfolio from Microsoft 365 — not demonstration data."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
          <Button appearance="primary" onClick={() => void reinjest()} disabled={busy}>
            Re-ingest Microsoft
          </Button>
        </div>
      }
    >
      {error ? (
        <AtlasCard title="Client 360 error">
          <Text>{error}</Text>
        </AtlasCard>
      ) : null}

      <FilterToolbar>
        <StatusChip label={`${filtered.length} / ${clients.length} clients`} tone="info" />
        {dataSource ? (
          <StatusChip
            label={dataSource === 'hub' ? 'Live hub' : dataSource === 'snapshot' ? 'Snapshot fallback' : 'Signed out'}
            tone={dataSource === 'hub' ? 'success' : 'warning'}
          />
        ) : null}
        <Input
          contentBefore={<SearchRegular />}
          placeholder="Search name, email, domain…"
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          style={{ minWidth: 240 }}
        />
        {busy ? <Spinner size="tiny" /> : null}
        <Caption1>Open a row for Client 360 detail</Caption1>
      </FilterToolbar>

      {clients.length === 0 && !busy ? (
        <EmptyState
          title="No Client 360 records yet"
          description="Run Re-ingest Microsoft or open Connections Center and sync mailboxes first."
        />
      ) : (
        <AtlasCard title="Client portfolio (live)" variant="quiet">
          <DataTable
            ariaLabel="Live clients"
            getRowKey={(r) => r.id}
            rows={filtered}
            columns={[
              {
                key: 'name',
                header: 'Client',
                render: (r) => (
                  <Link to={`/clients/${r.id}`} style={{ fontWeight: 600 }}>
                    {r.displayName || r.legalName || r.id}
                  </Link>
                ),
              },
              {
                key: 'lifecycle',
                header: 'Lifecycle',
                render: (r) => (
                  <StatusChip label={r.lifecycle || 'unknown'} tone={toneForLifecycle(r.lifecycle)} />
                ),
              },
              {
                key: 'complete',
                header: 'Completeness',
                render: (r) => `${Math.round(r.completenessScore || 0)}%`,
              },
              {
                key: 'email',
                header: 'Primary email',
                render: (r) => (r.emails && r.emails[0]) || '—',
              },
              {
                key: 'domain',
                header: 'Domain',
                render: (r) => (r.domains && r.domains[0]) || '—',
              },
              {
                key: 'docs',
                header: 'Docs',
                render: (r) => String((r.associations?.documents || []).length),
              },
              {
                key: 'emails',
                header: 'Emails',
                render: (r) => String((r.associations?.emails || []).length),
              },
            ]}
          />
        </AtlasCard>
      )}
    </ModuleScaffold>
  );
}
