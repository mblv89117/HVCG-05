/**
 * Live Client 360 detail — Microsoft-backed, HVS link-first documents.
 * Demo workspace catalog is not used for identity or documents.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  EmptyState,
  FilterToolbar,
} from '@hvcg/atlas-design-system';
import { Button, Caption1, Spinner, Text, Tab, TabList } from '@fluentui/react-components';
import { ArrowSyncRegular, OpenRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import {
  fetchClient360Detail,
  fetchClient360Documents,
  type AtlasHubAuthHeaders,
  type Client360Candidate,
  type Client360Document,
} from '../integrations/hub/api';

function useHubAuth(): AtlasHubAuthHeaders {
  const { account } = useMicrosoftAuth();
  const { role } = useAtlasRole();
  return useMemo(
    () => ({
      userId: account?.localAccountId || account?.homeAccountId || 'local-dev-user',
      organizationId: 'org-hvcg',
      clientIds: [/* scoped below */],
      email: account?.username,
      roles: [role === 'Unauthenticated' ? 'Guest' : role],
    }),
    [account, role],
  );
}

export function LiveClientDetailPage({ clientId }: { clientId: string }) {
  const auth = useHubAuth();
  const [tab, setTab] = useState('overview');
  const [client, setClient] = useState<Client360Candidate | null>(null);
  const [docs, setDocs] = useState<Client360Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const scoped = { ...auth, clientIds: [clientId] };
      const detail = await fetchClient360Detail(scoped, clientId);
      setClient(detail.client);
      const d = await fetchClient360Documents(scoped, clientId);
      setDocs(d.documents || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, [auth, clientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hvsTimeline = useMemo(
    () =>
      (client?.timeline || []).filter((t) =>
        (client?.sourceRefs || []).some(
          (s) => s.sourceRecordId === t.sourceRecordId && s.businessEntity === 'HVS',
        ),
      ),
    [client],
  );

  if (!client && !busy && error) {
    return (
      <ModuleScaffold title="Client" subtitle="Client 360" showPendingBanner={false}>
        <AtlasCard title="Error">
          <Text>{error}</Text>
          <Link to="/clients">
            <Button appearance="primary" style={{ marginTop: 12 }}>
              Back to clients
            </Button>
          </Link>
        </AtlasCard>
      </ModuleScaffold>
    );
  }

  const title = client?.displayName || client?.legalName || 'Client';

  return (
    <ModuleScaffold
      title={title}
      subtitle="Live Client 360 · HVS OneDrive link-first (originals unchanged)"
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
          <Link to="/clients">
            <Button appearance="secondary">All clients</Button>
          </Link>
        </div>
      }
    >
      <FilterToolbar>
        <StatusChip label={client?.lifecycle || '…'} tone="info" />
        <StatusChip
          label={`${Math.round(client?.completenessScore || 0)}% complete`}
          tone="success"
        />
        <StatusChip label={`${docs.length} linked docs`} tone="gold" />
        {busy ? <Spinner size="tiny" /> : null}
        <Caption1>Restricted files are omitted from this list</Caption1>
      </FilterToolbar>

      <TabList
        selectedValue={tab}
        onTabSelect={(_, d) => setTab(String(d.value))}
        aria-label="Client sections"
      >
        <Tab value="overview">Overview</Tab>
        <Tab value="documents">Documents (HVS)</Tab>
        <Tab value="timeline">Timeline</Tab>
      </TabList>

      {tab === 'overview' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <AtlasCard title="Identity" subtitle="Canonical Client 360">
            <Text>
              {client?.legalName || client?.displayName}
              {client?.domains?.length ? ` · ${client.domains.join(', ')}` : ''}
            </Text>
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Emails: {(client?.emails || []).slice(0, 5).join(', ') || '—'}
            </Caption1>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Entities: {(client?.businessEntities || []).join(', ') || '—'}
            </Caption1>
          </AtlasCard>
          <AtlasCard title="Next actions">
            {(client?.recommendedNextActions || []).length ? (
              <ul>
                {(client?.recommendedNextActions || []).map((a) => (
                  <li key={a}>
                    <Text size={300}>{a}</Text>
                  </li>
                ))}
              </ul>
            ) : (
              <Text size={300}>No recommended actions yet.</Text>
            )}
          </AtlasCard>
        </div>
      ) : null}

      {tab === 'documents' ? (
        docs.length === 0 && !busy ? (
          <EmptyState
            title="No linked HVS documents yet"
            description="Run HVS inventory link-first import, then refresh."
          />
        ) : (
          <AtlasCard
            title="HVS OneDrive (secure source links)"
            subtitle="Opens original HVS file — Atlas does not move or delete source files"
            variant="quiet"
          >
            <DataTable
              ariaLabel="HVS linked documents"
              getRowKey={(r) => r.id}
              rows={docs}
              columns={[
                {
                  key: 'title',
                  header: 'File',
                  render: (r) => (
                    <span style={{ fontWeight: 600 }}>
                      {r.webUrl ? (
                        <a href={String(r.webUrl)} target="_blank" rel="noreferrer">
                          {r.title} <OpenRegular />
                        </a>
                      ) : (
                        r.title
                      )}
                    </span>
                  ),
                },
                {
                  key: 'class',
                  header: 'Classification',
                  render: (r) => String(r.classification || r.kind || '—'),
                },
                {
                  key: 'status',
                  header: 'Migration',
                  render: (r) => (
                    <StatusChip label={String(r.migrationStatus || 'link_only')} tone="info" />
                  ),
                },
                {
                  key: 'tenant',
                  header: 'Source',
                  render: (r) => `${r.sourceTenant || 'HVS'}`,
                },
              ]}
            />
          </AtlasCard>
        )
      ) : null}

      {tab === 'timeline' ? (
        <AtlasCard title="HVS activity" subtitle="From linked source refs">
          {hvsTimeline.length === 0 ? (
            <Text size={300}>No HVS timeline events yet.</Text>
          ) : (
            <ul>
              {hvsTimeline.slice(0, 40).map((t) => (
                <li key={`${t.sourceRecordId}-${t.at}`}>
                  <Caption1>
                    {t.at?.slice(0, 10)} · {t.kind}
                  </Caption1>
                  <Text size={300}> {t.title}</Text>
                </li>
              ))}
            </ul>
          )}
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}
