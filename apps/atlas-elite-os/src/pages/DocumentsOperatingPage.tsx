import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AtlasCard, DataTable, EmptyState, FilterToolbar, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Dropdown,
  Input,
  Option,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { OpenRegular, SearchRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import {
  fetchPmDocuments,
  type OperatingDocument,
} from '../integrations/hub/pmApi';
import { fetchClient360 } from '../integrations/hub/api';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { projectDetailPath } from '../routing/projectId';

export function DocumentsOperatingPage() {
  const auth = useHubAuth();
  const [docs, setDocs] = useState<OperatingDocument[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [sites, setSites] = useState<{ commandCenter: string; clients: string } | null>(null);
  const [restrictedOmitted, setRestrictedOmitted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [clientId, setClientId] = useState('all');
  const [projectId, setProjectId] = useState('all');
  const [docType, setDocType] = useState('all');
  const [confidentiality, setConfidentiality] = useState('all');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docRes, c360] = await Promise.all([
        fetchPmDocuments(auth, {
          clientId: clientId === 'all' ? undefined : clientId,
          projectId: projectId === 'all' ? undefined : projectId,
          q: query.trim() || undefined,
          type: docType === 'all' ? undefined : docType,
          confidentiality: confidentiality === 'all' ? undefined : confidentiality,
        }),
        fetchClient360(auth).catch(() => ({ clients: [] as Array<{ id: string; displayName: string }> })),
      ]);
      setDocs(docRes.documents || []);
      setRestrictedOmitted(docRes.restrictedOmitted || 0);
      setSites(docRes.sharePointSites || null);
      setClients(
        (c360.clients || []).map((c: { id: string; displayName: string }) => ({
          id: c.id,
          name: c.displayName,
        })),
      );
    } catch (err) {
      setError(String(err));
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [auth, clientId, projectId, query, docType, confidentiality]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of docs) {
      if (d.projectId && d.projectName) map.set(d.projectId, d.projectName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [docs]);

  return (
    <ModuleScaffold
      title="Documents"
      subtitle="Authorized HVCG and client documents from SharePoint / OneDrive — link-first, permissions preserved."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button appearance="secondary" onClick={() => void refresh()}>
            Refresh
          </Button>
          {sites?.clients ? (
            <Button
              appearance="primary"
              icon={<OpenRegular />}
              onClick={() => window.open(sites.clients, '_blank', 'noopener,noreferrer')}
            >
              Open HVCG-Clients
            </Button>
          ) : null}
          {sites?.commandCenter ? (
            <Button
              appearance="secondary"
              icon={<OpenRegular />}
              onClick={() => window.open(sites.commandCenter, '_blank', 'noopener,noreferrer')}
            >
              Open Command Center site
            </Button>
          ) : null}
        </div>
      }
    >
      <FilterToolbar>
        <Input
          appearance="outline"
          contentBefore={<SearchRegular />}
          placeholder="Search documents…"
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          style={{ minWidth: 220 }}
          aria-label="Search documents"
        />
        <Dropdown
          value={clientId === 'all' ? 'All clients' : clients.find((c) => c.id === clientId)?.name || clientId}
          selectedOptions={[clientId]}
          onOptionSelect={(_, d) => setClientId(String(d.optionValue || 'all'))}
        >
          <Option value="all">All clients</Option>
          {clients.map((c) => (
            <Option key={c.id} value={c.id}>
              {c.name}
            </Option>
          ))}
        </Dropdown>
        <Dropdown
          value={
            projectId === 'all'
              ? 'All projects'
              : projects.find((p) => p.id === projectId)?.name || projectId
          }
          selectedOptions={[projectId]}
          onOptionSelect={(_, d) => setProjectId(String(d.optionValue || 'all'))}
        >
          <Option value="all">All projects</Option>
          {projects.map((p) => (
            <Option key={p.id} value={p.id}>
              {p.name}
            </Option>
          ))}
        </Dropdown>
        <Dropdown
          value={docType === 'all' ? 'All types' : docType}
          selectedOptions={[docType]}
          onOptionSelect={(_, d) => setDocType(String(d.optionValue || 'all'))}
        >
          <Option value="all">All types</Option>
          <Option value="proposal">proposal</Option>
          <Option value="agreement">agreement</Option>
          <Option value="invoice">invoice</Option>
          <Option value="financial">financial</Option>
          <Option value="legal">legal</Option>
        </Dropdown>
        <Dropdown
          value={confidentiality === 'all' ? 'All confidentiality' : confidentiality}
          selectedOptions={[confidentiality]}
          onOptionSelect={(_, d) => setConfidentiality(String(d.optionValue || 'all'))}
        >
          <Option value="all">All confidentiality</Option>
          <Option value="general">general</Option>
          <Option value="internal">internal</Option>
          <Option value="restricted">restricted</Option>
        </Dropdown>
        <Caption1>
          {docs.length} shown
          {restrictedOmitted ? ` · ${restrictedOmitted} restricted omitted` : ''}
        </Caption1>
      </FilterToolbar>

      {error ? (
        <AtlasCard title="Access or connection error">
          <Text>{error}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Document URLs are only returned for authorized Microsoft sessions. Restricted files stay
            omitted unless explicitly requested by an owner-authorized path.
          </Caption1>
        </AtlasCard>
      ) : null}

      {loading ? (
        <Spinner label="Loading documents…" />
      ) : docs.length === 0 ? (
        <EmptyState
          title="No documents linked yet"
          description="Run Client 360 Microsoft ingest to index HVS/HVCG document links, or open the SharePoint client libraries to upload in the approved location."
        />
      ) : (
        <DataTable
          ariaLabel="Operating documents"
          getRowKey={(r) => r.id}
          rows={docs}
          columns={[
            {
              key: 'title',
              header: 'Document',
              render: (r) =>
                r.webUrl ? (
                  <a href={r.webUrl} target="_blank" rel="noreferrer">
                    {r.title} <OpenRegular />
                  </a>
                ) : (
                  <span>
                    {r.title}{' '}
                    <StatusChip label="No URL" tone="warning" />
                  </span>
                ),
            },
            {
              key: 'client',
              header: 'Client',
              render: (r) =>
                r.clientId ? <Link to={`/clients/${r.clientId}`}>{r.clientName}</Link> : '—',
            },
            {
              key: 'project',
              header: 'Project',
              render: (r) => {
                const path = projectDetailPath(r.projectId);
                return path && r.projectName ? <Link to={path}>{r.projectName}</Link> : '—';
              },
            },
            {
              key: 'type',
              header: 'Type',
              render: (r) => r.classification || r.kind,
            },
            {
              key: 'conf',
              header: 'Confidentiality',
              render: (r) => <StatusChip label={r.confidentiality} tone="info" />,
            },
            { key: 'ver', header: 'Version', render: (r) => r.version || '—' },
            { key: 'owner', header: 'Owner', render: (r) => r.owner || '—' },
            {
              key: 'mod',
              header: 'Modified',
              render: (r) => (r.modifiedAt ? String(r.modifiedAt).slice(0, 10) : '—'),
            },
          ]}
        />
      )}

      <AtlasCard title="Upload guidance" variant="quiet">
        <Text>
          Upload files in the approved SharePoint library for the client (HVCG-Clients site). Atlas
          indexes authorized links and does not copy restricted files into a public frontend store.
        </Text>
      </AtlasCard>
    </ModuleScaffold>
  );
}
