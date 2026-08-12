/**
 * Live Client 360 detail — Microsoft-backed workspace with PM operating sections.
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
import {
  Button,
  Caption1,
  Spinner,
  Text,
  Tab,
  TabList,
  Input,
  Field,
} from '@fluentui/react-components';
import { ArrowSyncRegular, OpenRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import {
  fetchClient360Detail,
  fetchClient360Documents,
  type Client360Candidate,
  type Client360Document,
} from '../integrations/hub/api';
import {
  createPmDecision,
  createPmNote,
  createPmProject,
  createPmTask,
  createPmMilestone,
  fetchClientPmWorkspace,
  type PmProject,
  type PmTask,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { projectDetailPath } from '../routing/projectId';
import {
  Client360CapitalSection,
  Client360FinanceSection,
  Client360MigrationSection,
  Client360ProcurementSection,
  Client360RevenueSection,
  Client360RiskSection,
} from './Client360CommercialSections';

export function LiveClientDetailPage({ clientId }: { clientId: string }) {
  const { account, ready } = useMicrosoftAuth();
  const auth = useHubAuth();
  const [tab, setTab] = useState('overview');
  const [client, setClient] = useState<Client360Candidate | null>(null);
  const [docs, setDocs] = useState<Client360Document[]>([]);
  const [projects, setProjects] = useState<PmProject[]>([]);
  const [tasks, setTasks] = useState<PmTask[]>([]);
  const [notes, setNotes] = useState<Array<{ id: string; body: string }>>([]);
  const [decisions, setDecisions] = useState<Array<{ id: string; title: string; status: string }>>(
    [],
  );
  const [deliverables, setDeliverables] = useState<Array<{ id: string; name: string; status: string }>>(
    [],
  );
  const [meetings, setMeetings] = useState<Array<{ id?: string; title: string; at?: string; kind?: string }>>(
    [],
  );
  const [approvals, setApprovals] = useState<PmTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const scoped = { ...auth, clientIds: [clientId] };
      const detail = await fetchClient360Detail(scoped, clientId);
      setClient(detail.client);
      const d = await fetchClient360Documents(scoped, clientId);
      setDocs(d.documents || []);
      try {
        const ws = (await fetchClientPmWorkspace(auth, clientId)) as {
          workspace: {
            projects?: PmProject[];
            openTasks?: PmTask[];
            notes?: Array<{ id: string; body: string }>;
            ownerDecisions?: Array<{ id: string; title: string; status: string }>;
            deliverables?: Array<{ id: string; name: string; status: string }>;
            meetings?: Array<{ id?: string; title: string; at?: string; kind?: string }>;
          };
        };
        const w = ws.workspace || {};
        setProjects(w.projects || []);
        setTasks(w.openTasks || []);
        setNotes(w.notes || []);
        setDecisions(w.ownerDecisions || []);
        setDeliverables(w.deliverables || []);
        setMeetings(w.meetings || []);
        setApprovals((w.openTasks || []).filter((t) => t.status === 'needs_owner_approval'));
      } catch {
        setProjects([]);
        setTasks([]);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, [auth, clientId]);

  useEffect(() => {
    if (!ready) return;
    if (!account) {
      setClient(null);
      setDocs([]);
      setError(null);
      setBusy(false);
      return;
    }
    if (!auth.accessToken) return;
    void refresh();
  }, [refresh, ready, account, auth.accessToken]);

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
  const sharePointClients =
    'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients';

  return (
    <ModuleScaffold
      title={title}
      subtitle="Live Client 360 · projects, tasks, documents, and operating work"
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
          <Button
            appearance="secondary"
            icon={<OpenRegular />}
            onClick={() => window.open(sharePointClients, '_blank', 'noopener,noreferrer')}
          >
            Open SharePoint workspace
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
        <StatusChip label={`${projects.length} projects`} tone="gold" />
        <StatusChip label={`${docs.length} linked docs`} tone="gold" />
        {busy ? <Spinner size="tiny" /> : null}
        <Caption1>Restricted files are omitted from document lists</Caption1>
      </FilterToolbar>

      <TabList
        selectedValue={tab}
        onTabSelect={(_, d) => setTab(String(d.value))}
        aria-label="Client sections"
      >
        <Tab value="overview">Overview</Tab>
        <Tab value="health">Health</Tab>
        <Tab value="projects">Projects</Tab>
        <Tab value="tasks">Tasks</Tab>
        <Tab value="documents">Documents</Tab>
        <Tab value="meetings">Meetings</Tab>
        <Tab value="financials">Financials</Tab>
        <Tab value="revenue">Revenue</Tab>
        <Tab value="migration">Migration</Tab>
        <Tab value="capital">Capital</Tab>
        <Tab value="procurement">Procurement</Tab>
        <Tab value="risk">Risk</Tab>
        <Tab value="deliverables">Deliverables</Tab>
        <Tab value="approvals">Approvals</Tab>
        <Tab value="notes">Notes</Tab>
        <Tab value="decisions">Decisions</Tab>
        <Tab value="activity">Activity</Tab>
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

      {tab === 'health' ? (
        <AtlasCard title="Client health">
          <Text>
            Completeness {Math.round(client?.completenessScore || 0)}%. Missing information:{' '}
            {(client?.missingInformation || []).join('; ') || 'None listed'}.
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Open projects: {projects.length} · Open tasks: {tasks.length} · Linked documents:{' '}
            {docs.length}
          </Caption1>
        </AtlasCard>
      ) : null}

      {tab === 'projects' ? (
        <AtlasCard title="Projects">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input
              placeholder="New project name"
              value={projectName}
              onChange={(_, d) => setProjectName(d.value)}
              style={{ flex: 1 }}
            />
            <Button
              appearance="primary"
              disabled={!projectName.trim() || busy}
              onClick={() =>
                void createPmProject(auth, {
                  name: projectName.trim(),
                  clientId,
                  clientName: title,
                  ownerName: 'Manny Barela',
                  ownerId: 'person-manny',
                  nextAction: 'Define first milestone',
                }).then(() => {
                  setProjectName('');
                  return refresh();
                })
              }
            >
              Create project
            </Button>
          </div>
          {projects.length === 0 ? (
            <EmptyState
              title="No projects have been created for this client."
              description="Create a project to begin tracking milestones, tasks, and deliverables."
            />
          ) : (
            <DataTable
              ariaLabel="Client projects"
              getRowKey={(r) => r.id}
              rows={projects}
              columns={[
                {
                  key: 'name',
                  header: 'Project',
                  render: (r) => {
                    const path = projectDetailPath(r.id);
                    return path ? <Link to={path}>{r.name}</Link> : r.name;
                  },
                },
                { key: 'owner', header: 'Owner', render: (r) => r.ownerName },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => <StatusChip label={r.status} tone="info" />,
                },
                { key: 'next', header: 'Next action', render: (r) => r.nextAction || '—' },
              ]}
            />
          )}
          {projects[0] ? (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Input
                placeholder="Milestone for first project"
                value={milestoneTitle}
                onChange={(_, d) => setMilestoneTitle(d.value)}
              />
              <Button
                disabled={!milestoneTitle.trim()}
                onClick={() =>
                  void createPmMilestone(auth, {
                    projectId: projects[0].id,
                    title: milestoneTitle,
                  }).then(() => {
                    setMilestoneTitle('');
                    return refresh();
                  })
                }
              >
                Add milestone
              </Button>
            </div>
          ) : null}
        </AtlasCard>
      ) : null}

      {tab === 'tasks' ? (
        <AtlasCard title="Tasks">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input
              placeholder="Task title"
              value={taskTitle}
              onChange={(_, d) => setTaskTitle(d.value)}
              style={{ flex: 1 }}
            />
            <Button
              disabled={!taskTitle.trim()}
              onClick={() =>
                void createPmTask(auth, {
                  title: taskTitle,
                  clientId,
                  clientName: title,
                  projectId: projects[0]?.id,
                  assigneeName: 'Manny Barela',
                  assigneeId: 'person-manny',
                  status: 'ready',
                }).then(() => {
                  setTaskTitle('');
                  return refresh();
                })
              }
            >
              Create task
            </Button>
          </div>
          {tasks.length === 0 ? (
            <EmptyState
              title="No open tasks for this client."
              description="Create a task with an owner and due date to drive next actions."
            />
          ) : (
            tasks.map((t) => (
              <Caption1 key={t.id} style={{ display: 'block', padding: '6px 0' }}>
                {t.title} · {t.status} · {t.assigneeName || 'Unassigned'}
                {t.dueDate ? ` · due ${t.dueDate}` : ''}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'documents' ? (
        docs.length === 0 && !busy ? (
          <EmptyState
            title="No linked documents for this client."
            description="Upload in the approved SharePoint client library, then refresh Client 360 ingest."
          />
        ) : (
          <AtlasCard
            title="Authorized document links"
            subtitle="Opens original SharePoint / OneDrive file — Atlas does not move or delete source files"
            variant="quiet"
          >
            <DataTable
              ariaLabel="Client documents"
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
              ]}
            />
          </AtlasCard>
        )
      ) : null}

      {tab === 'meetings' ? (
        meetings.length === 0 ? (
          <EmptyState
            title="No meetings linked for this client."
            description="Calendar items appear after Microsoft sync associates them to this client."
          />
        ) : (
          meetings.map((m, i) => (
            <Caption1 key={m.id || `${m.title}-${i}`} style={{ display: 'block', padding: '4px 0' }}>
              {m.title}
              {m.at ? ` · ${m.at}` : ''}
            </Caption1>
          ))
        )
      ) : null}

      {tab === 'financials' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Client360FinanceSection clientHint={client?.legalName || client?.displayName || clientId} />
          <AtlasCard title="Live balances">
            <EmptyState
              title="No verified live financial figures for this client"
              description="PENDING_LIVE_SOURCE for QBO/Plaid. Atlas does not fabricate charts or balances. CFO cadence lives in Finance workbench (/financials)."
            />
          </AtlasCard>
        </div>
      ) : null}

      {tab === 'revenue' ? (
        <Client360RevenueSection clientHint={client?.legalName || client?.displayName || clientId} />
      ) : null}

      {tab === 'migration' ? (
        <Client360MigrationSection clientHint={client?.legalName || client?.displayName || clientId} />
      ) : null}

      {tab === 'capital' ? (
        <Client360CapitalSection clientHint={client?.legalName || client?.displayName || clientId} />
      ) : null}

      {tab === 'procurement' ? (
        <Client360ProcurementSection clientHint={client?.legalName || client?.displayName || clientId} />
      ) : null}

      {tab === 'risk' ? (
        <Client360RiskSection clientHint={client?.legalName || client?.displayName || clientId} />
      ) : null}

      {tab === 'deliverables' ? (
        deliverables.length === 0 ? (
          <EmptyState title="No deliverables recorded for this client." description="Deliverables appear from project work and classified Microsoft sources." />
        ) : (
          deliverables.map((d) => (
            <Caption1 key={d.id} style={{ display: 'block', padding: '4px 0' }}>
              {d.name} ({d.status})
            </Caption1>
          ))
        )
      ) : null}

      {tab === 'approvals' ? (
        approvals.length === 0 ? (
          <EmptyState title="No pending approvals for this client." description="Owner approval tasks will appear here when flagged." />
        ) : (
          approvals.map((t) => (
            <Caption1 key={t.id} style={{ display: 'block', padding: '4px 0' }}>
              {t.title}
            </Caption1>
          ))
        )
      ) : null}

      {tab === 'notes' ? (
        <AtlasCard title="Notes">
          <Field label="Record a note">
            <Input value={noteBody} onChange={(_, d) => setNoteBody(d.value)} />
          </Field>
          <Button
            style={{ marginTop: 8 }}
            disabled={!noteBody.trim()}
            onClick={() =>
              void createPmNote(auth, {
                body: noteBody,
                clientId,
                clientName: title,
                projectId: projects[0]?.id,
              }).then(() => {
                setNoteBody('');
                return refresh();
              })
            }
          >
            Save note
          </Button>
          {notes.length === 0 ? (
            <Caption1 style={{ display: 'block', marginTop: 12 }}>No notes yet.</Caption1>
          ) : (
            notes.map((n) => (
              <Caption1 key={n.id} style={{ display: 'block', marginTop: 8 }}>
                {n.body}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'decisions' ? (
        <AtlasCard title="Decisions">
          <Field label="Record a decision">
            <Input value={decisionTitle} onChange={(_, d) => setDecisionTitle(d.value)} />
          </Field>
          <Button
            style={{ marginTop: 8 }}
            disabled={!decisionTitle.trim()}
            onClick={() =>
              void createPmDecision(auth, {
                title: decisionTitle,
                decision: decisionTitle,
                clientId,
                clientName: title,
                projectId: projects[0]?.id,
              }).then(() => {
                setDecisionTitle('');
                return refresh();
              })
            }
          >
            Save decision
          </Button>
          {decisions.length === 0 ? (
            <Caption1 style={{ display: 'block', marginTop: 12 }}>No decisions recorded.</Caption1>
          ) : (
            decisions.map((d) => (
              <Caption1 key={d.id} style={{ display: 'block', marginTop: 8 }}>
                {d.title} ({d.status})
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'activity' ? (
        hvsTimeline.length === 0 ? (
          <EmptyState
            title="No activity timeline yet"
            description="Timeline events appear after Microsoft sources are associated to this client."
          />
        ) : (
          <AtlasCard title="Activity">
            {hvsTimeline.slice(0, 40).map((t) => (
              <Caption1 key={`${t.sourceRecordId}-${t.at}`} style={{ display: 'block', padding: '4px 0' }}>
                {t.at?.slice(0, 10)} · {t.kind} · {t.title}
              </Caption1>
            ))}
          </AtlasCard>
        )
      ) : null}
    </ModuleScaffold>
  );
}
