/**
 * Client Workspace V1 — ClientCode canonical. Not Client 360.
 * Empty / ungranted sections are labeled, not presented as working.
 */
import { useCallback, useEffect, useState } from 'react';
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
import {
  fetchClientWorkspace,
  refreshClientBrief,
  type ClientWorkspace,
  type CompletenessCell,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { projectDetailPath } from '../routing/projectId';
import { isCanonicalClientCode } from '../security/clientCode';

function toneFor(status?: CompletenessCell['status']): 'success' | 'warning' | 'info' {
  if (status === 'COMPLETE') return 'success';
  if (status === 'BLOCKED_AMBIGUOUS_IDENTITY') return 'warning';
  return 'warning';
}

function labelFor(status?: CompletenessCell['status']): string {
  if (status === 'COMPLETE') return 'COMPLETE';
  if (status === 'BLOCKED_AMBIGUOUS_IDENTITY') return 'BLOCKED — AMBIGUOUS IDENTITY';
  return 'PARTIAL — SOURCE DATA NOT FOUND';
}

function SectionEmpty({ title, reason }: { title: string; reason?: string }) {
  return (
    <EmptyState
      title={title}
      description={reason || 'This section is not populated. It is not a working empty panel.'}
    />
  );
}

export function LiveClientDetailPage({ clientId }: { clientId: string }) {
  const { account, ready } = useMicrosoftAuth();
  const auth = useHubAuth();
  const [tab, setTab] = useState('overview');
  const [workspace, setWorkspace] = useState<ClientWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [c360Deferred, setC360Deferred] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    setC360Deferred(false);
    try {
      if (!isCanonicalClientCode(clientId)) {
        setWorkspace(null);
        setC360Deferred(true);
        return;
      }
      const data = await fetchClientWorkspace({ ...auth, clientIds: [clientId] }, clientId);
      setWorkspace(data.workspace);
    } catch (err) {
      setError(String(err));
      setWorkspace(null);
    } finally {
      setBusy(false);
    }
  }, [auth, clientId]);

  useEffect(() => {
    if (!ready) return;
    if (!account) {
      setWorkspace(null);
      setError(null);
      setBusy(false);
      return;
    }
    if (!auth.accessToken) return;
    void refresh();
  }, [refresh, ready, account, auth.accessToken]);

  if (c360Deferred && !busy) {
    return (
      <ModuleScaffold title="Client" subtitle="Client 360 deferred" showPendingBanner={false}>
        <AtlasCard title="Client 360 mapping is deferred">
          <Text>
            Client 360 identifiers are not mapped to HVCG_Clients.ClientCode. This route is fail-closed
            and does not block the Clients directory.
          </Text>
          <Link to="/clients">
            <Button appearance="primary" style={{ marginTop: 12 }}>
              Back to SharePoint clients
            </Button>
          </Link>
        </AtlasCard>
      </ModuleScaffold>
    );
  }

  if (!workspace && !busy && error) {
    return (
      <ModuleScaffold title="Client" subtitle="Client Workspace V1" showPendingBanner={false}>
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

  const title = workspace?.overview.displayName || workspace?.client.displayName || 'Client';
  const code = workspace?.overview.clientCode || clientId;
  const completeness = workspace?.completeness || {};

  return (
    <ModuleScaffold
      title={title}
      subtitle={`Client Workspace V1 · ${code} · Client 360 fail-closed`}
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
          <Button
            appearance="secondary"
            disabled={busy || !workspace}
            onClick={() =>
              void refreshClientBrief(auth, clientId).then((data) => setWorkspace(data.workspace))
            }
          >
            Refresh AI brief
          </Button>
          <Link to="/clients">
            <Button appearance="secondary">All clients</Button>
          </Link>
        </div>
      }
    >
      <FilterToolbar>
        <StatusChip label={code} tone="info" />
        <StatusChip label={workspace?.overview.clientStage || 'stage unknown'} tone="info" />
        <StatusChip label={`${workspace?.projects.length || 0} projects`} tone="gold" />
        <StatusChip label={`${workspace?.tasks.length || 0} open tasks`} tone="gold" />
        {busy ? <Spinner size="tiny" /> : null}
        <Caption1>Evidence from entitled HVCG_* lists. Ungranted sources are labeled, not faked.</Caption1>
      </FilterToolbar>

      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(String(d.value))} aria-label="Client workspace">
        <Tab value="overview">Overview</Tab>
        <Tab value="projects">Projects</Tab>
        <Tab value="tasks">Tasks</Tab>
        <Tab value="documents">Documents</Tab>
        <Tab value="communications">Communications</Tab>
        <Tab value="meetings">Meetings</Tab>
        <Tab value="engagements">Engagements</Tab>
        <Tab value="deliverables">Deliverables</Tab>
        <Tab value="decisions">Decisions / Risks</Tab>
        <Tab value="timeline">Timeline</Tab>
        <Tab value="brief">AI brief</Tab>
      </TabList>

      {tab === 'overview' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <AtlasCard title="Identity" subtitle="HVCG_Clients.ClientCode">
            <Text>
              {title}
              {workspace?.overview.dba ? ` · DBA ${workspace.overview.dba}` : ''}
            </Text>
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Industry: {workspace?.overview.industry || '—'} · Engagement:{' '}
              {workspace?.overview.engagementType || '—'} · Health:{' '}
              {workspace?.overview.overallHealth || '—'}
            </Caption1>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Source org: {workspace?.overview.sourceOrg || 'HVCG (unlabeled)'} · Last contact:{' '}
              {workspace?.overview.lastMeaningfulContact?.slice(0, 10) || '—'}
            </Caption1>
          </AtlasCard>
          <AtlasCard title="Completeness dashboard">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(completeness).map(([key, cell]) => (
                <StatusChip
                  key={key}
                  label={`${key}: ${labelFor(cell.status)} (${cell.count})`}
                  tone={toneFor(cell.status)}
                />
              ))}
            </div>
          </AtlasCard>
          <AtlasCard title="Next actions" subtitle="Traced to Atlas evidence">
            {(workspace?.nextActions || []).length ? (
              <ul>
                {(workspace?.nextActions || []).map((a) => (
                  <li key={`${a.text}-${a.evidence[0]?.id || ''}`}>
                    <Text size={300}>{a.text}</Text>
                    <Caption1 style={{ display: 'block' }}>
                      {a.evidence.map((e) => `${e.source} ${e.field || ''}`.trim()).join(' · ')}
                    </Caption1>
                  </li>
                ))}
              </ul>
            ) : (
              <SectionEmpty title="No evidenced next actions" />
            )}
          </AtlasCard>
        </div>
      ) : null}

      {tab === 'projects' ? (
        <AtlasCard title="Projects" subtitle="HVCG_Projects">
          {!workspace?.projects.length ? (
            <SectionEmpty
              title="No entitled projects for this ClientCode"
              reason="HVCG_Projects was queried. No project rows matched this client."
            />
          ) : (
            <DataTable
              ariaLabel="Client projects"
              getRowKey={(r) => r.id}
              rows={workspace.projects}
              columns={[
                {
                  key: 'name',
                  header: 'Project',
                  render: (r) => {
                    const path = projectDetailPath(r.id);
                    return path ? <Link to={path}>{r.name}</Link> : r.name;
                  },
                },
                { key: 'status', header: 'Status', render: (r) => <StatusChip label={r.status} tone="info" /> },
                { key: 'next', header: 'Next action', render: (r) => r.nextAction || '—' },
              ]}
            />
          )}
        </AtlasCard>
      ) : null}

      {tab === 'tasks' ? (
        <AtlasCard title="Open tasks" subtitle="HVCG_Tasks — current/open only">
          {!workspace?.tasks.length ? (
            <SectionEmpty
              title="No open tasks"
              reason="HVCG_Tasks was queried. Past completed work is history, not this queue."
            />
          ) : (
            workspace.tasks.map((t) => (
              <Caption1 key={t.id} style={{ display: 'block', padding: '6px 0' }}>
                {t.title} · {t.status}
                {t.dueDate ? ` · due ${t.dueDate.slice(0, 10)}` : ''}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'documents' ? (
        <AtlasCard title="Documents" subtitle="M365 remains SoR — Atlas indexes links only">
          {!workspace?.documents.items.length ? (
            <SectionEmpty title="No document links" reason={workspace?.documents.reason} />
          ) : (
            workspace.documents.items.map((d) => (
              <Caption1 key={d.id} style={{ display: 'block', padding: '6px 0' }}>
                {d.webUrl ? (
                  <a href={d.webUrl} target="_blank" rel="noreferrer">
                    {d.title} <OpenRegular />
                  </a>
                ) : (
                  d.title
                )}{' '}
                · {d.source}
              </Caption1>
            ))
          )}
          {workspace?.documents.reason ? (
            <Caption1 style={{ display: 'block', marginTop: 8 }}>{workspace.documents.reason}</Caption1>
          ) : null}
        </AtlasCard>
      ) : null}

      {tab === 'communications' ? (
        <AtlasCard title="Communications" subtitle="Outlook remains email SoR — Atlas is an index">
          {!workspace?.communications.queried ? (
            <SectionEmpty title="Communications index not available" reason={workspace?.communications.reason} />
          ) : !workspace.communications.items.length ? (
            <SectionEmpty title="No indexed communications" reason="HVCG_Communications was queried." />
          ) : (
            workspace.communications.items.map((row) => (
              <Caption1 key={String(row.id)} style={{ display: 'block', padding: '6px 0' }}>
                {String(row.title || 'Communication')}
                {row.date ? ` · ${String(row.date).slice(0, 10)}` : ''}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'meetings' ? (
        <AtlasCard title="Meetings" subtitle="HVCG_Meetings + calendar reconcile when granted">
          {!workspace?.meetings.queried ? (
            <SectionEmpty title="Meetings source not available" reason={workspace?.meetings.reason} />
          ) : !workspace.meetings.items.length ? (
            <SectionEmpty title="No meetings recorded" reason="HVCG_Meetings was queried." />
          ) : (
            workspace.meetings.items.map((row) => (
              <Caption1 key={String(row.id)} style={{ display: 'block', padding: '6px 0' }}>
                {String(row.title || 'Meeting')}
                {row.date ? ` · ${String(row.date).slice(0, 10)}` : ''}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'engagements' ? (
        <AtlasCard title="Engagements" subtitle="HVCG_Engagements">
          {!workspace?.engagements.queried ? (
            <SectionEmpty title="Engagements source not available" reason={workspace?.engagements.reason} />
          ) : !workspace.engagements.items.length ? (
            <SectionEmpty title="No engagements recorded" reason="HVCG_Engagements was queried." />
          ) : (
            workspace.engagements.items.map((row) => (
              <Caption1 key={String(row.id)} style={{ display: 'block', padding: '6px 0' }}>
                {String(row.title || 'Engagement')} {row.status ? `· ${String(row.status)}` : ''}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'deliverables' ? (
        <AtlasCard title="Deliverables" subtitle="HVCG_Deliverables">
          {!workspace?.deliverables.queried ? (
            <SectionEmpty title="Deliverables source not available" reason={workspace?.deliverables.reason} />
          ) : !workspace.deliverables.items.length ? (
            <SectionEmpty title="No deliverables recorded" reason="HVCG_Deliverables was queried." />
          ) : (
            workspace.deliverables.items.map((row) => (
              <Caption1 key={String(row.id)} style={{ display: 'block', padding: '6px 0' }}>
                {String(row.title || 'Deliverable')} {row.status ? `· ${String(row.status)}` : ''}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'decisions' ? (
        <AtlasCard title="Decisions / Risks" subtitle="Evidence only — not invented">
          {!workspace?.decisionsRisks.queried ? (
            <SectionEmpty title="Decisions and risks not available" reason={workspace?.decisionsRisks.reason} />
          ) : !workspace.decisionsRisks.items.length ? (
            <SectionEmpty title="No evidenced decisions or risks" reason="Granted registers were queried." />
          ) : (
            workspace.decisionsRisks.items.map((row) => (
              <Caption1 key={String(row.id)} style={{ display: 'block', padding: '6px 0' }}>
                {String(row.title || 'Item')} {row.status ? `· ${String(row.status)}` : ''}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'timeline' ? (
        <AtlasCard title="Timeline" subtitle="Origin labeled from Atlas lists">
          {!workspace?.timeline.length ? (
            <SectionEmpty title="No timeline events" reason="No dated project or task activity for this ClientCode." />
          ) : (
            workspace.timeline.map((t) => (
              <Caption1 key={`${t.source}-${t.id}-${t.at}`} style={{ display: 'block', padding: '4px 0' }}>
                {t.at.slice(0, 10)} · {t.kind} · {t.title} · {t.source}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'brief' ? (
        <AtlasCard title="AI current-state brief" subtitle="Derived · refreshable · not an authorization record">
          <Caption1 style={{ display: 'block', marginBottom: 8 }}>
            Generated {workspace?.brief.generatedAt || '—'} · Every statement traces to Atlas/M365 evidence
          </Caption1>
          {(workspace?.brief.statements || []).map((s, i) => (
            <div key={`${i}-${s.text.slice(0, 24)}`} style={{ marginBottom: 10 }}>
              <Text size={300}>{s.text}</Text>
              <Caption1 style={{ display: 'block' }}>
                {s.evidence.map((e) => `${e.source}${e.field ? '.' + e.field : ''}#${e.id}`).join(' · ') ||
                  'no evidence'}
              </Caption1>
            </div>
          ))}
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}
