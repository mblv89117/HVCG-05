import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  StatusChip,
  AtlasProgress,
  EmptyState,
  DataTable,
  LoadingState,
  ErrorState,
  AccessDeniedState,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Text,
  Caption1,
  Tab,
  TabList,
  Input,
  Field,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
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
import { displayHealth, displayLastActivity, displayNextAction, isBootstrapNextAction } from '../operating/projectDisplay';
import { isCanonicalClientCode } from '../security/clientCode';
import { ATLAS_STATUS, atlasStatusDisplay, atlasStatusTone } from '../ui/statusLanguage';

const BOARD_STATUS: Record<string, string> = {
  todo: 'ready',
  inProgress: 'in_progress',
  review: 'needs_review',
  done: 'completed',
};

const KNOWN_ATLAS = new Set<string>(Object.values(ATLAS_STATUS));

function titleCaseUnknown(raw: string): string {
  return raw
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function atlasChip(raw: string | undefined | null): { label: string; tone: ReturnType<typeof atlasStatusTone> } {
  if (!raw || !String(raw).trim()) return { label: '—', tone: 'neutral' };
  const mapped = atlasStatusDisplay(raw);
  if (mapped && KNOWN_ATLAS.has(mapped.label)) return mapped;
  return { label: titleCaseUnknown(mapped?.label || raw), tone: mapped?.tone || 'neutral' };
}

function healthChip(health: string, nextAction?: string): { label: string; tone: ReturnType<typeof atlasStatusTone> } {
  const raw = displayHealth(health, {
    treatHealthyAsUnassessed: isBootstrapNextAction(nextAction),
  });
  if (raw === 'Not assessed') return { label: ATLAS_STATUS.unverified, tone: 'neutral' };
  return atlasChip(raw);
}

function clientPath(code?: string | null): string | null {
  const id = String(code || '').trim();
  if (!isCanonicalClientCode(id)) return null;
  return `/clients/${encodeURIComponent(id)}`;
}

function taskNeedsOwner(task: PmTask): boolean {
  return task.status === 'needs_owner_approval' || task.status === 'needs_review';
}

function safeErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function DeferredClosed({ label }: { label: string }) {
  return (
    <AtlasCard title={label}>
      <Caption1>
        {label} is not in the SharePoint production MVP. Hub marked this collection deferred —
        Atlas will not treat missing rows as “none yet.”
      </Caption1>
    </AtlasCard>
  );
}

function RecordRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
      }}
    >
      <Caption1 style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
        {label}
      </Caption1>
      <div>{children}</div>
    </div>
  );
}

export function ProjectDetailPage({
  projectId,
  invalidId,
}: {
  projectId: string;
  invalidId?: boolean;
}) {
  const auth = useHubAuth();
  const [tab, setTab] = useState('record');
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
  const [activity, setActivity] = useState<Array<{ id: string; at?: string; action?: string; detail?: string }>>(
    [],
  );
  const [documents, setDocuments] = useState<OperatingDocument[]>([]);
  const [loading, setLoading] = useState(!invalidId);
  const [missing, setMissing] = useState(Boolean(invalidId));
  const [authFailure, setAuthFailure] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState(
    invalidId
      ? 'This project link is invalid (missing, undefined, unknown, or obsolete demo id).'
      : '',
  );
  const [taskTitle, setTaskTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [deferred, setDeferred] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isValidProjectId(projectId)) {
      setMissing(true);
      setLoading(false);
      setAuthFailure(null);
      setLoadError(null);
      setMessage(
        'This project link is invalid (missing, undefined, unknown, or obsolete demo id).',
      );
      return;
    }
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setLoading(false);
      setMissing(false);
      setLoadError(null);
      setAuthFailure(
        auth.bootstrapStatus === 'interaction_required'
          ? auth.bootstrapMessage || 'Authorize Atlas Integration Hub'
          : auth.bootstrapMessage || 'Microsoft sign-in required (Bearer token missing)',
      );
      return;
    }
    setLoading(true);
    setMissing(false);
    setAuthFailure(null);
    setForbidden(false);
    setLoadError(null);
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
      setActivity((res.activity as typeof activity) || []);
      setDocuments(res.documents || []);
      setDeferred(res.deferred || {});
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
        setLoadError(null);
        setProject(null);
      } else if (status === 403) {
        setForbidden(true);
        setMissing(false);
        setLoadError(null);
        setProject(null);
        setMessage('Authenticated but not authorized to view this project.');
      } else if (status === 404) {
        setMissing(true);
        setLoadError(null);
        setProject(null);
        setMessage(
          err instanceof Error
            ? err.message
            : 'No project exists for this id. It may be archived or never created.',
        );
      } else {
        setMissing(false);
        setProject(null);
        setLoadError(safeErrorMessage(err, 'Server error loading project.'));
      }
    } finally {
      setLoading(false);
    }
  }, [auth, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const moveTask = async (task: PmTask, column: keyof typeof BOARD_STATUS) => {
    setActionError(null);
    try {
      await patchPmTask(auth, task.id, {
        status: BOARD_STATUS[column],
        ...(task.etag ? { etag: task.etag } : {}),
      });
      await refresh();
    } catch (err) {
      setActionError(safeErrorMessage(err, 'Could not update this task.'));
    }
  };

  if (!auth.tokenReady) {
    return (
      <ModuleScaffold title="Project" subtitle="Preparing Microsoft session…" showPendingBanner={false}>
        <LoadingState rows={6} label="Acquiring Hub access token…" />
      </ModuleScaffold>
    );
  }

  if (loading) {
    return (
      <ModuleScaffold title="Project" subtitle="Loading record…" showPendingBanner={false}>
        <LoadingState rows={8} label="Loading project from Integration Hub…" />
      </ModuleScaffold>
    );
  }

  if (authFailure) {
    return (
      <ModuleScaffold
        title="Project"
        subtitle={
          auth.bootstrapStatus === 'interaction_required'
            ? 'Hub authorization required'
            : 'Sign-in required'
        }
        showPendingBanner={false}
      >
        <AccessDeniedState
          title={
            auth.bootstrapStatus === 'interaction_required'
              ? 'Authorize Atlas Integration Hub'
              : 'Bearer token missing or rejected'
          }
          description={`${authFailure} Your Atlas UI session may be signed in, but the Hub API call did not receive a valid access token. This is not a missing project.`}
          actions={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {auth.bootstrapStatus === 'interaction_required' ? (
                <Button appearance="primary" onClick={() => void auth.authorizeHub()}>
                  Authorize Atlas Integration Hub
                </Button>
              ) : (
                <Button appearance="primary" onClick={() => void refresh()}>
                  Retry with Hub bearer
                </Button>
              )}
              <Link to="/projects">
                <Button appearance="secondary">Back to projects</Button>
              </Link>
            </div>
          }
        />
      </ModuleScaffold>
    );
  }

  if (forbidden) {
    return (
      <ModuleScaffold title="Access denied" subtitle="403" showPendingBanner={false}>
        <AccessDeniedState
          title="Insufficient authorization"
          description={message || 'Authenticated but not authorized to view this project.'}
          actions={
            <Link to="/projects">
              <Button appearance="primary">Back to projects</Button>
            </Link>
          }
        />
      </ModuleScaffold>
    );
  }

  if (loadError) {
    return (
      <ModuleScaffold title="Project unavailable" subtitle="Hub request failed" showPendingBanner={false}>
        <ErrorState
          title="Could not load this project"
          description={`${loadError} This is not a missing project. Retry after Hub access is restored, or return to the project list.`}
          actions={
            <Link to="/projects">
              <Button appearance="primary">Back to projects</Button>
            </Link>
          }
        />
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
            {taskNeedsOwner(t) ? (
              <Link to="/tasks">
                <Text weight="semibold">{t.title}</Text>
              </Link>
            ) : (
              <Text weight="semibold">{t.title}</Text>
            )}
            <Caption1 style={{ display: 'block' }}>
              {t.assigneeName || 'Unassigned'}
              {t.dueDate ? ` · due ${t.dueDate}` : ''} · {atlasChip(t.priority).label}
              {t.blocker ? ` · ${ATLAS_STATUS.blocked}: ${t.blocker}` : ''}
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
                  <Button key={k} size="small" onClick={() => void moveTask(t, k)}>
                    → {label}
                  </Button>
                ))}
            </div>
          </div>
        ))
      )}
    </AtlasCard>
  );

  const status = atlasChip(project.status);
  const health = healthChip(project.health, project.nextAction);
  const priority = atlasChip(project.priority);
  const relatedClientHref = clientPath(project.clientCode || project.clientId);
  const taskBlockers = tasks.filter((t) => t.blocker || t.status === 'blocked');
  const ownerDecisions = tasks.filter(taskNeedsOwner);

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
          <Link to="/projects">
            <Button appearance="secondary">Projects</Button>
          </Link>
          {relatedClientHref ? (
            <Link to={relatedClientHref}>
              <Button appearance="secondary">Client</Button>
            </Link>
          ) : null}
          {ownerDecisions.length ? (
            <Link to="/tasks">
              <Button appearance="secondary">Decisions</Button>
            </Link>
          ) : null}
        </div>
      }
    >
      {actionError ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Change was not saved</MessageBarTitle>
            {actionError}
          </MessageBarBody>
        </MessageBar>
      ) : null}
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(String(d.value))}>
        <Tab value="record">Record</Tab>
        <Tab value="board">Board</Tab>
        <Tab value="milestones">Milestones</Tab>
        <Tab value="documents">Documents</Tab>
        <Tab value="notes">Notes & decisions</Tab>
        <Tab value="risks">Risks & waiting</Tab>
      </TabList>

      {tab === 'record' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <AtlasCard title="Project record">
            <RecordRow label="What">
              <Text weight="semibold">{project.name}</Text>
              <Caption1 style={{ display: 'block' }}>
                {project.objective || 'No objective recorded'}
              </Caption1>
            </RecordRow>
            <RecordRow label="State">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusChip
                  label={status.label}
                  tone={status.tone === 'neutral' ? 'info' : status.tone}
                />
                <StatusChip label={health.label} tone={health.tone} />
                <Caption1>Priority {priority.label}</Caption1>
              </div>
            </RecordRow>
            <RecordRow label="Next">
              <Text>{displayNextAction(project.nextAction)}</Text>
            </RecordRow>
            <RecordRow label="Owner">
              <Text weight="semibold">{project.ownerName || '—'}</Text>
              <Caption1 style={{ display: 'block' }}>
                {(project.teamMemberIds || []).join(', ') || 'No additional team on this record'}
              </Caption1>
            </RecordRow>
            <RecordRow label="Blocker">
              {deferred.risks ? (
                <Caption1>
                  Risk/blocker register is not in the SharePoint production MVP. Showing task-level
                  blockers only.
                </Caption1>
              ) : null}
              {taskBlockers.length === 0 && !deferred.risks ? (
                <Caption1>No blockers on Hub tasks for this project.</Caption1>
              ) : null}
              {taskBlockers.map((t) => (
                <div key={t.id} style={{ padding: '4px 0' }}>
                  {taskNeedsOwner(t) ? (
                    <Link to="/tasks">{t.title}</Link>
                  ) : (
                    <Text>{t.title}</Text>
                  )}
                  <Caption1 style={{ display: 'block' }}>
                    {ATLAS_STATUS.blocked}
                    {t.blocker ? ` — ${t.blocker}` : ''}
                  </Caption1>
                </div>
              ))}
            </RecordRow>
            <RecordRow label="Related">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {relatedClientHref ? (
                  <Link to={relatedClientHref}>{project.clientName || project.clientCode || project.clientId}</Link>
                ) : (
                  <Caption1>{project.clientName || 'No client on this record'}</Caption1>
                )}
                {ownerDecisions.length ? <Link to="/tasks">Decisions</Link> : null}
                <Caption1>
                  {project.businessEntity} · {project.projectType}
                  {project.targetCompletionDate ? ` · due ${project.targetCompletionDate}` : ''}
                </Caption1>
              </div>
            </RecordRow>
            <RecordRow label="Changed">
              <Text>{displayLastActivity(project.lastActivityAt)}</Text>
              {deferred.activity ? (
                <Caption1 style={{ display: 'block' }}>
                  Activity feed is not in the SharePoint production MVP. Hub did not send a change
                  summary — only lastActivityAt.
                </Caption1>
              ) : activity.length === 0 ? (
                <Caption1 style={{ display: 'block' }}>No activity events on this record.</Caption1>
              ) : (
                activity.slice(0, 5).map((a) => (
                  <Caption1 key={a.id} style={{ display: 'block' }}>
                    {a.at ? String(a.at).slice(0, 10) : ''} {a.action || a.detail || ''}
                  </Caption1>
                ))
              )}
            </RecordRow>
            <RecordRow label="Requires me">
              {deferred.decisions ? (
                <Caption1>
                  Decisions register is not in the SharePoint production MVP. Showing Hub task
                  approvals on this project only.
                </Caption1>
              ) : null}
              {ownerDecisions.length === 0 ? (
                <Caption1>Nothing on this project requires you right now.</Caption1>
              ) : (
                ownerDecisions.map((t) => (
                  <div key={t.id} style={{ padding: '4px 0' }}>
                    <StatusChip
                      tone={atlasStatusTone(ATLAS_STATUS.needsManny)}
                      label={ATLAS_STATUS.needsManny}
                    />{' '}
                    <Link to="/tasks">{t.title}</Link>
                  </div>
                ))
              )}
            </RecordRow>
            <div style={{ marginTop: 12 }}>
              <AtlasProgress value={project.progressPercent} label="Completion" />
            </div>
          </AtlasCard>

          {deferred.deliverables ? (
            <DeferredClosed label="Deliverables" />
          ) : (
            <AtlasCard title="Deliverables">
              {deliverables.length === 0 ? (
                <Caption1>None yet</Caption1>
              ) : (
                deliverables.map((d) => (
                  <Caption1 key={d.id} style={{ display: 'block', padding: '4px 0' }}>
                    {d.name} ({atlasChip(d.status).label})
                  </Caption1>
                ))
              )}
            </AtlasCard>
          )}

          {deferred.commitments ? (
            <DeferredClosed label="Commitments" />
          ) : (
            <AtlasCard title="Commitments">
              {commitments.length === 0 ? (
                <Caption1>None</Caption1>
              ) : (
                commitments.map((c) => (
                  <Caption1 key={c.id} style={{ display: 'block', padding: '4px 0' }}>
                    {c.description} ({atlasChip(c.status).label})
                  </Caption1>
                ))
              )}
            </AtlasCard>
          )}
        </div>
      ) : null}

      {tab === 'board' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <AtlasCard title="Add work">
            <div style={{ display: 'flex', gap: 8 }}>
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
                  })
                    .then(() => {
                      setTaskTitle('');
                      setActionError(null);
                      return refresh();
                    })
                    .catch((err) => {
                      setActionError(safeErrorMessage(err, 'Could not add this task.'));
                    })
                }
                disabled={!taskTitle.trim()}
              >
                Add task
              </Button>
            </div>
          </AtlasCard>
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
                })
                  .then(() => {
                    setMilestoneTitle('');
                    setActionError(null);
                    return refresh();
                  })
                  .catch((err) => {
                    setActionError(safeErrorMessage(err, 'Could not add this milestone.'));
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
                {m.title} · {atlasChip(m.status).label}
                {m.dueDate ? ` · ${m.dueDate}` : ''}
              </Caption1>
            ))
          )}
        </AtlasCard>
      ) : null}

      {tab === 'documents' ? (
        deferred.documents ? (
          <DeferredClosed label="Documents" />
        ) : documents.length === 0 ? (
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
        deferred.notes || deferred.decisions ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {deferred.notes ? <DeferredClosed label="Notes" /> : null}
            {deferred.decisions ? <DeferredClosed label="Decisions" /> : null}
          </div>
        ) : (
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
                })
                  .then(() => {
                    setNoteBody('');
                    setActionError(null);
                    return refresh();
                  })
                  .catch((err) => {
                    setActionError(safeErrorMessage(err, 'Could not record this note.'));
                  })
              }
            >
              Record note
            </Button>
            {notes.length === 0 ? (
              <Caption1 style={{ display: 'block', marginTop: 8 }}>No notes on this record.</Caption1>
            ) : (
              notes.map((n) => (
                <Caption1 key={n.id} style={{ display: 'block', marginTop: 8 }}>
                  {n.title ? `${n.title}: ` : ''}
                  {n.body}
                </Caption1>
              ))
            )}
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
                })
                  .then(() => {
                    setDecisionTitle('');
                    setActionError(null);
                    return refresh();
                  })
                  .catch((err) => {
                    setActionError(safeErrorMessage(err, 'Could not record this decision.'));
                  })
              }
            >
              Record decision
            </Button>
            {decisions.length === 0 ? (
              <Caption1 style={{ display: 'block', marginTop: 8 }}>No decisions on this record.</Caption1>
            ) : (
              decisions.map((d) => (
                <Caption1 key={d.id} style={{ display: 'block', marginTop: 8 }}>
                  {d.title} ({atlasChip(d.status).label})
                </Caption1>
              ))
            )}
          </AtlasCard>
        </div>
        )
      ) : null}

      {tab === 'risks' ? (
        deferred.risks || deferred.waiting ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {deferred.risks ? <DeferredClosed label="Risks" /> : null}
            {deferred.waiting ? <DeferredClosed label="Waiting" /> : null}
            {deferred.commitments ? <DeferredClosed label="Commitments" /> : null}
          </div>
        ) : (
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
            {ownerDecisions.length === 0 ? (
              <Caption1>No pending project approvals</Caption1>
            ) : (
              ownerDecisions.map((t) => (
                <Caption1 key={t.id} style={{ display: 'block', padding: '4px 0' }}>
                  <Link to="/tasks">{t.title}</Link> · {atlasChip(t.status).label}
                </Caption1>
              ))
            )}
          </AtlasCard>
        </div>
        )
      ) : null}
    </ModuleScaffold>
  );
}
