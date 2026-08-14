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
import { AddRegular, ArrowSyncRegular, SearchRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { fetchPmClients, type PmClient } from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';

/**
 * Clients directory — SharePoint HVCG_Clients (ClientCode canonical).
 * Does not depend on Client 360. Client 360 fail-closed must not block this page.
 */
export function ClientsPage() {
  const { account, ready } = useMicrosoftAuth();
  const auth = useHubAuth();
  const [clients, setClients] = useState<PmClient[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setBusy(false);
      setError('Microsoft sign-in required (Bearer token missing)');
      setClients([]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await fetchPmClients(auth);
      setClients(data.clients || []);
      setDataSource(data.source || 'sharepoint');
    } catch (err) {
      setError(String(err));
      setClients([]);
    } finally {
      setBusy(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!ready) return;
    if (!account) {
      setClients([]);
      setDataSource('');
      setError(null);
      setBusy(false);
      return;
    }
    if (!auth.tokenReady) return;
    void refresh();
  }, [refresh, ready, account, auth.tokenReady, auth.hasBearer]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const hay = [c.clientCode, c.displayName, c.id].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [clients, query]);

  return (
    <ModuleScaffold
      title="Clients"
      subtitle="Authorized SharePoint HVCG_Clients — ClientCode is canonical. Client 360 is not used."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/clients/intake">
            <Button appearance="secondary" icon={<AddRegular />}>
              New Prospect
            </Button>
          </Link>
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
        </div>
      }
    >
      <Caption1 style={{ display: 'block', marginBottom: 12 }}>
        Client 360 mapping is deferred (fail-closed). This directory is SharePoint HVCG_Clients only.
      </Caption1>

      {error ? (
        <AtlasCard title="Clients directory error">
          <Text>{error}</Text>
        </AtlasCard>
      ) : null}

      <FilterToolbar>
        <StatusChip label={`${filtered.length} / ${clients.length} clients`} tone="info" />
        {dataSource ? (
          <StatusChip
            label={dataSource === 'sharepoint' ? 'SharePoint HVCG_Clients' : dataSource}
            tone={dataSource === 'sharepoint' ? 'success' : 'warning'}
          />
        ) : null}
        <Input
          contentBefore={<SearchRegular />}
          placeholder="Search ClientCode or name…"
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          style={{ minWidth: 240 }}
        />
        {busy ? <Spinner size="tiny" /> : null}
      </FilterToolbar>

      {clients.length === 0 && !busy ? (
        <EmptyState
          title="No authorized clients"
          description="This list is SharePoint HVCG_Clients filtered by your HVCG-Client-* entitlements. Client 360 records are not shown here."
        />
      ) : (
        <AtlasCard title="Authorized clients" variant="quiet">
          <DataTable
            ariaLabel="Authorized HVCG clients"
            getRowKey={(r) => r.clientCode || r.id}
            rows={filtered}
            columns={[
              {
                key: 'code',
                header: 'ClientCode',
                render: (r) => (
                  <Link to={`/clients/${encodeURIComponent(r.clientCode || r.id)}`} style={{ fontWeight: 600 }}>
                    {r.clientCode || r.id}
                  </Link>
                ),
              },
              {
                key: 'name',
                header: 'Name',
                render: (r) => r.displayName || r.clientCode || r.id,
              },
              {
                key: 'source',
                header: 'Source',
                render: (r) => <StatusChip label={r.source || 'sharepoint'} tone="success" />,
              },
            ]}
          />
        </AtlasCard>
      )}
    </ModuleScaffold>
  );
}
