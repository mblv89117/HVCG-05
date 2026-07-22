import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  StatusChip,
  AtlasProgress,
  EmptyState,
  DataTable,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Text,
  Caption1,
  Spinner,
  Tab,
  TabList,
  Input,
  Field,
} from '@fluentui/react-components';
import { OpenRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import {
  createPmMilestone,
  createPmNote,
  createPmDecision,
  createPmTask,
  fetchPmProject,
  patchPmTask,
  HubHttpError,
  type OperatingDocument,
  type PmProject,
  type PmTask,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { isValidProjectId } from '../routing/projectId';

const BOARD_STATUS: Record<string, string> = {
  todo: 'ready',
  inProgress: 'in_progress',
  review: 'needs_review',
  done: 'completed',
};

export function ProjectDetailPage({
  projectId,
  invalidId,
}: {
  projectId: string;
  invalidId?: boolean;
}) {
  const auth = useHubAuth();
  const [tab, setTab] = useState('overview');
  const [project, setProject] = useState<PmProject | null>(null);
  const [tasks, setTasks] = useState<PmTask[]>([]);
  const [board, setBoard] = useState<{
    todo: PmTask[];
    inProgress: PmTask[];
    review: PmTask[];
    done: PmTask[];
  }>({ todo: [], inProgress: [], review: [], done: [] });
  const [milestones, setMilestones] = useState<
    Array<{ id: string; title: string; dueDate?: string; status: string }>
  >([]);
  const [risks, setRisks] = useState<
    Array<{ id: string; kind: string; description: string; severity: string }>
  >([]);
  const [decisions, setDecisions] = useState<Array<{ id: string; title: string; status: string }>>(
    [],
  );
  const [commitments, setCommitments] = useState<
    Array<{ id: string; description: string; status: string }>
  >([]);
  const [deliverables, setDeliverables] = useState<
    Array<{ id: string; name: string; status: string }>
  >([]);
  const [waiting, setWaiting] = useState<
    Array<{ id: string; whatIsNeeded: string; owedByName: string }>
  >([]);
  const [notes, setNotes] = useState<Array<{ id: string; body: string; title?: string }>>([]);
  const [documents, setDocuments] = useState<OperatingDocument[]>([]);
  const [loading, setLoading] = useState(!invalidId);
  const [missing, setMissing] = useState(Boolean(invalidId));
  const [authFailure, setAuthFailure] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [message, setMessage] = useState(
    invalidId
      ? 'This project link is invalid (missing, undefined, unknown, or obsolete demo id).'
      : '',
  );
  const [taskTitle, setTaskTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');

  const refresh = useCallback(async () => {
    if (!isValidProjectId(projectId)) {
      setMissing(true);
      setLoading(false);
      setAuthFailure(null);
      setMessage(
        'This project link is invalid (missing, undefined, unknown, or obsolete demo id).',
      );
      return;
    }
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setLoading(false);
      setMissing(false);
      setAuthFailure('Microsoft sign-in required (Bearer token missing)');
      return;
    }
    setLoading(true);
    setMissing(false);
    setAuthFailure(null);
    setForbidden(false);
    try {
      const res = await fetchPmProject(auth, projectId);
      setProject(res.project);
      setTasks(res.tasks || []);
      setBoard(
        res.board || {
          todo: [],
          inProgress: [],
          review: [],
          done: [],
        },
      );
      setMilestones((res.milestones as typeof milestones) || []);
      setRisks((res.risks as typeof risks) || []);
      setDecisions((res.decisions as typeof decisions) || []);
      setCommitments((res.commitments as typeof commitments) || []);
      setDeliverables((res.deliverables as typeof deliverables) || []);
      setWaiting((res.waiting as typeof waiting) || []);
      setNotes((res.notes as typeof notes) || []);
      setDocuments(res.documents || []);
      setMessage('');
    } catch (err) {
      const status = err instanceof HubHttpError ? err.status : (err as { status?: number }).status;
      if (status === 401) {
        setAuthFailure(
          err instanceof Error
            ? err.message
            : 'Microsoft sign-in required (Bearer token missing)',
        );
        setMissing(false);
        setProject(null);
      } else if (status === 403) {
        setForbidden(true);
        setMissing(false);
        setProject(null);
        setMessage('Authenticated but not authorized to view this project.');
      } else if (status === 404) {
        setMissing(true);
        setProject(null);
        setMessage(
          err instanceof Error
            ? err.message
            : 'No project exists for this id. It may be archived or never created.',
        );
      } else {
        setMissing(false);
        setProject(null);
        setMessage(err instanceof Error ? err.message : 'Server error loading project.');
      }
    } finally {
      setLoading(false);
    }
  }, [auth, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const moveTask = async (taskId: string, column: keyof typeof BOARD_STATUS) => {
    await patchPmTask(auth, taskId, { status: BOARD_STATUS[column] });
    await refresh();
  };

  if (!auth.tokenReady || loading) {
    return (
      <ModuleScaffold title="Project" subtitle="Loading…" showPendingBanner={false}>
        <Spinner />
      </ModuleScaffold>
    );
  }

  if (authFailure) {
    return (
      <ModuleScaffold
        title="Authentication required"
        subtitle="Integration Hub rejected the request (401)"
        showPendingBanner={false}
      >
        <AtlasCard title="Bearer token missing or rejected">
          <Text>{authFailure}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Your Atlas UI session is signed in, but the Hub API call did not receive a valid
            Authorization Bearer. This is not a missing project.
          </Caption1>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry with Hub bearer
            </Button>
            <Link to="/projects">
              <Button appearance="secondary">Back to projects</Button>
            </Link>
          </div>
        </AtlasCard>
      </ModuleScaffold>
    );
  }

  if (forbidden) {
    return (
      <ModuleScaffold title="Access denied" subtitle="403" showPendingBanner={false}>
        <AtlasCard title="Insufficient authorization">
          <Text>{message}</Text>
          <Link to="/projects">
            <Button appearance="primary" style={{ marginTop: 12 }}>
              Back to projects
            </Button>
          </Link>
        </AtlasCard>
      </ModuleScaffold>
    );
  }

  if (missing || !project) {
    return (
      <ModuleScaffold
        title="Project not found"
        subtitle={message || 'Authenticated request succeeded but project does not exist'}
        showPendingBanner={false}
      >
        <AtlasCard title="Recover safely">
          <Text>
            The Projects sidebar always opens the project list. Open a project only after selecting a
            valid record from Projects or Client 360.
          </Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Link to="/projects">
              <Button appearance="primary">Back to projects</Button>
            </Link>
            <Link to="/clients">
              <Button appearance="secondary">Open clients</Button>
            </Link>
            <Link to="/">
              <Button appearance="secondary">Command Center</Button>
            </Link>
          </div>
          {projectId ? (
            <Caption1 style={{ display: 'block', marginTop: 12 }}>
              Requested id: {projectId}
            </Caption1>
          ) : null}
        </AtlasCard>
      </ModuleScaffold>
    );
  }

  const BoardColumn = ({
    title,
    column,
    items,
  }: {
    title: string;
    column: keyof typeof BOARD_STATUS;
    items: PmTask[];
  }) => (
    <AtlasCard title={`${title} (${items.length})`} variant="quiet">
      {items.length === 0 ? (
        <Caption1>No tasks</Caption1>
      ) : (
        items.map((t) => (
          <div
            key={t.id}
            style={{
              padding: '8px 0',
              borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
            }}
          >
            <Text weight="semibold">{t.title}</Text>
            <Caption1 style={{ display: 'block' }}>
              {t.assigneeName || 'Unassigned'}
              {t.dueDate ? ` · due ${t.dueDate}` : ''} · {t.priority}
              {t.blocker ? ` · blocker: ${t.blocker}` : ''}
            </Caption1>
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {(
                [
                  ['todo', 'To Do'],
                  ['inProgress', 'In Progress'],
                  ['review', 'Review'],
                  ['done', 'Done'],
                ] as const
              )
                .filter(([k]) => k !== column)
                .map(([k, label]) => (
                  <Button key={k} size="small" onClick={() => void moveTask(t.id, k)}>
                    → {label}
                  </Button>
                ))}
            </div>
          </div>
        ))
      )}
    </AtlasCard>
  );

  return (
    <ModuleScaffold
      title={project.name}
      subtitle={`${project.clientName || '—'} · ${project.businessEntity} · ${project.projectType}`}
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/projects">
            <Button appearance="primary">Back to projects</Button>
          </Link>
          <Link to="/portfolio">
            <Button appearance="secondary">Portfolio</Button>
          </Link>
          {project.clientId ? (
            <Link to={`/clients/${project.clientId}`}>
              <Button appearance="secondary">Client 360</Button>
            </Link>
          ) : null}
        </div>
      }
    >
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(String(d.value))}>
        <Tab value="overview">Overview</Tab>
        <Tab value="board">Board</Tab>
        <Tab value="milestones">Milestones</Tab>
        <Tab value="documents">Documents</Tab>
        <Tab value="notes">Notes & decisions</Tab>
        <Tab value="risks">Risks & waiting</Tab>
      </TabList>

      {tab === 'overview' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12,
            }}
          >
            <AtlasCard variant="quiet">
              <Caption1>Status</Caption1>
              <StatusChip label={project.status} tone="info" />
            </AtlasCard>
            <AtlasCard variant="quiet">
              <Caption1>Health</Caption1>
              <StatusChip
                label={project.health}
                tone={
                  project.health === 'healthy'
                    ? 'success'
                    : project.health === 'at_risk' || project.health === 'critical'
                      ? 'danger'
                      : 'warning'
                }
              />
            </AtlasCard>
            <AtlasCard variant="quiet">
              <Caption1>Owner</Caption1>
              <Text weight="semibold">{project.ownerName}</Text>
            </AtlasCard>
            <AtlasCard variant="quiet">
              <Caption1>Priority</Caption1>
              <Text weight="semibold">{project.priority}</Text>
            </AtlasCard>
            <AtlasCard variant="quiet">
              <Caption1>Due</Caption1>
              <Text weight="semibold">{project.targetCompletionDate || '—'}</Text>
            </AtlasCard>
          </div>

          <AtlasCard title="Objective & next action">
            <Text>{project.objective || '—'}</Text>
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Next action: {project.nextAction || 'Define next action'}
            </Caption1>
            <div style={{ marginTop: 12 }}>
              <AtlasProgress value={project.progressPercent} label="Completion" />
            </div>
          </AtlasCard>

          <AtlasCard title="Team">
            <Text>{(project.teamMemberIds || []).join(', ') || project.ownerName}</Text>
          </AtlasCard>

          <AtlasCard title="Tasks">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Input
                placeholder="New task title"
                value={taskTitle}
                onChange={(_, d) => setTaskTitle(d.value)}
                style={{ flex: 1 }}
              />
              <Button
                onClick={() =>
                  void createPmTask(auth, {
                    title: taskTitle,
                    projectId: project.id,
                    clientId: project.clientId,
                    clientName: project.clientName,
                    status: 'ready',
                  }).then(() => {
                    setTaskTitle('');
                    return refresh();
                  })
                }
                disabled={!taskTitle.trim()}
              >
                Add task
              </Button>
            </div>
            {tasks.length === 0 ? (
              <EmptyState
                title="No tasks"
                description="Add a task or sync work from Command Center."
              />
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
                  }}
                >
                  <div>
                    <Text weight="semibold">{t.title}</Text>
                    <Caption1 style={{ display: 'block' }}>
                      {t.status} · {t.priority}
                      {t.dueDate ? ` · due ${t.dueDate}` : ''}
                      {t.blocker ? ` · blocker: ${t.blocker}` : ''}
                    </Caption1>
                  </div>
                  {t.status !== 'completed' ? (
                    <Button
                      size="small"
                      onClick={() =>
                        void patchPmTask(auth, t.id, { status: 'completed' }).then(refresh)
                      }
                    >
                      Complete
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </AtlasCard>

          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            <AtlasCard title="Deliverables">
              {deliverables.length === 0 ? (
                <Caption1>None yet</Caption1>
              ) : (
                deliverables.map((d) => (
                  <Caption1 key={d.id} style={{ display: 'block', padding: '4px 0' }}>
                    {d.name} ({d.status})
                  </Caption1>
                ))
              )}
            </AtlasCard>
            <AtlasCard title="Commitments">
              {commitments.length === 0 ? (
                <Caption1>None</Caption1>
              ) : (
                commitments.map((c) => (
                  <Caption1 key={c.id} style={{ display: 'block', padding: '4px 0' }}>
                    {c.description} ({c.status})
                  </Caption1>
                ))
              )}
            </AtlasCard>
          </div>
        </div>
      ) : null}

      {tab === 'board' ? (
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <BoardColumn title="To Do" column="todo" items={board.todo} />
          <BoardColumn title="In Progress" column="inProgress" items={board.inProgress} />
          <BoardColumn title="Review" column="review" items={board.review} />
          <BoardColumn title="Done" column="done" items={board.done} />
        </div>
      ) : null}

      {tab === 'milestones' ? (
        <AtlasCard title="Milestones">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input
              placeholder="Milestone title"
              value={milestoneTitle}
              onChange={(_, d) => setMilestoneTitle(d.value)}
              style={{ flex: 1 }}
            />
            <Button
              disabled={!milestoneTitle.trim()}
              onClick={() =>
                void createPmMilestone(auth, {
                  projectId: project.id,
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
          {milestones.length === 0 ? (
            <EmptyState title="No milestones" description="Add the next delivery checkpoint." />
          ) : (
            milestones.map((m) => (
              <Caption1 key={m.id} style={{ display: 'block', padding: '4px 0' }}>
                {m.title} · {m.status}
                {m.dueDate ? ` · ${m.dueDate}` : ''}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'documents' ? (
        documents.length === 0 ? (
          <EmptyState
            title="No linked documents for this project"
            description="Documents come from authorized SharePoint / OneDrive links for the related client. Open Client 360 or the Documents module to browse."
          />
        ) : (
          <DataTable
            ariaLabel="Project documents"
            getRowKey={(r) => r.id}
            rows={documents}
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
                    r.title
                  ),
              },
              { key: 'type', header: 'Type', render: (r) => r.classification || r.kind },
              { key: 'conf', header: 'Confidentiality', render: (r) => r.confidentiality },
              { key: 'owner', header: 'Owner', render: (r) => r.owner || '—' },
              {
                key: 'mod',
                header: 'Modified',
                render: (r) => (r.modifiedAt ? r.modifiedAt.slice(0, 10) : '—'),
              },
            ]}
          />
        )
      ) : null}

      {tab === 'notes' ? (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
          <AtlasCard title="Notes">
            <Field label="New note">
              <Input value={noteBody} onChange={(_, d) => setNoteBody(d.value)} />
            </Field>
            <Button
              style={{ marginTop: 8 }}
              disabled={!noteBody.trim()}
              onClick={() =>
                void createPmNote(auth, {
                  body: noteBody,
                  projectId: project.id,
                  clientId: project.clientId,
                  clientName: project.clientName,
                }).then(() => {
                  setNoteBody('');
                  return refresh();
                })
              }
            >
              Record note
            </Button>
            {notes.map((n) => (
              <Caption1 key={n.id} style={{ display: 'block', marginTop: 8 }}>
                {n.title ? `${n.title}: ` : ''}
                {n.body}
              </Caption1>
            ))}
          </AtlasCard>
          <AtlasCard title="Decisions">
            <Field label="Decision">
              <Input value={decisionTitle} onChange={(_, d) => setDecisionTitle(d.value)} />
            </Field>
            <Button
              style={{ marginTop: 8 }}
              disabled={!decisionTitle.trim()}
              onClick={() =>
                void createPmDecision(auth, {
                  title: decisionTitle,
                  decision: decisionTitle,
                  projectId: project.id,
                  clientId: project.clientId,
                  clientName: project.clientName,
                }).then(() => {
                  setDecisionTitle('');
                  return refresh();
                })
              }
            >
              Record decision
            </Button>
            {decisions.map((d) => (
              <Caption1 key={d.id} style={{ display: 'block', marginTop: 8 }}>
                {d.title} ({d.status})
              </Caption1>
            ))}
          </AtlasCard>
        </div>
      ) : null}

      {tab === 'risks' ? (
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          <AtlasCard title="Risks / blockers">
            {risks.length === 0 ? (
              <Caption1>None</Caption1>
            ) : (
              risks.map((r) => (
                <Caption1 key={r.id} style={{ display: 'block', padding: '4px 0' }}>
                  [{r.kind}/{r.severity}] {r.description}
                </Caption1>
              ))
            )}
          </AtlasCard>
          <AtlasCard title="Waiting on">
            {waiting.length === 0 ? (
              <Caption1>None</Caption1>
            ) : (
              waiting.map((w) => (
                <Caption1 key={w.id} style={{ display: 'block', padding: '4px 0' }}>
                  {w.whatIsNeeded} — {w.owedByName}
                </Caption1>
              ))
            )}
          </AtlasCard>
          <AtlasCard title="Approvals">
            {tasks.filter((t) => t.status === 'needs_owner_approval' || false).length === 0 ? (
              <Caption1>No pending project approvals</Caption1>
            ) : (
              tasks
                .filter((t) => t.status === 'needs_owner_approval')
                .map((t) => (
                  <Caption1 key={t.id} style={{ display: 'block', padding: '4px 0' }}>
                    {t.title}
                  </Caption1>
                ))
            )}
          </AtlasCard>
        </div>
      ) : null}
    </ModuleScaffold>
  );
}
