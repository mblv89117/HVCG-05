import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AccessDeniedState,
  AtlasCard,
  EmptyState,
  ErrorState,
  GridSpan,
  LoadingState,
  ResponsiveGrid,
  StatusChip,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Text,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  WarningRegular,
  CheckboxCheckedRegular,
} from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { projectDetailPath } from '../routing/projectId';
import { isCanonicalClientCode } from '../security/clientCode';
import {
  fetchCommandCenter,
  HubHttpError,
  patchPmTask,
  type CommandCenter,
  type PmTask,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { ATLAS_STATUS, atlasStatusTone } from '../ui/statusLanguage';
import {
  CapitalAccessError,
  isAuthorizationFailure,
  loadCommandCenter,
  type CapitalCommandCenterPayload,
  type QueueItem,
  type WorkQueue,
} from './capital/capitalApi';

const CAPITAL_ATTENTION_QUEUES: ReadonlySet<WorkQueue> = new Set([
  'NEEDS_ATTENTION',
  'AWAITING_MANNY',
  'RFI_OVERDUE',
  'COMPLIANCE_REVIEW',
]);

const CAPITAL_QUEUE_LABEL: Partial<Record<WorkQueue, string>> = {
  NEEDS_ATTENTION: ATLAS_STATUS.needsAction,
  AWAITING_CLIENT: ATLAS_STATUS.waitingClient,
  AWAITING_LENDER: ATLAS_STATUS.waitingLender,
  AWAITING_MANNY: ATLAS_STATUS.needsManny,
  READY_FOR_SUBMISSION: ATLAS_STATUS.readyForSubmission,
  RFI_OVERDUE: ATLAS_STATUS.rfiOverdue,
  OFFERS_RECEIVED: ATLAS_STATUS.termSheetReceived,
  CLOSING: ATLAS_STATUS.closing,
  FUNDED: ATLAS_STATUS.funded,
  COMPLIANCE_REVIEW: ATLAS_STATUS.complianceReview,
};

const STACK_LINE = /\n\s*at\s+/;

type CapitalStripState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'hub'; payload: CapitalCommandCenterPayload }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'unavailable'; message: string };

/** Hub extras that Elite types omit. Read if present; never invent destinations. */
type RecordRefs = {
  projectId?: string;
  clientCode?: string;
  clientId?: string;
};

type HubWaitingRow = RecordRefs & {
  id: string;
  whatIsNeeded: string;
  owedByName?: string;
};

type HubDecisionRow = RecordRefs & {
  id: string;
  title: string;
};

type HubAtRiskClient = {
  id: string;
  name: string;
  reason: string;
  clientCode?: string;
};

function operatorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  const first = raw.split('\n')[0].replace(/^Error:\s*/i, '').trim();
  if (!first || STACK_LINE.test(raw) || /^\s*at\s+/.test(first)) return fallback;
  if (first.length > 220) return fallback;
  return first;
}

function uniqueTasks(...lists: Array<PmTask[] | undefined>): PmTask[] {
  const seen = new Set<string>();
  const out: PmTask[] = [];
  for (const list of lists) {
    for (const task of list || []) {
      if (!task?.id || seen.has(task.id)) continue;
      seen.add(task.id);
      out.push(task);
    }
  }
  return out;
}

function hubTaskArrays(cc: CommandCenter): PmTask[] {
  return uniqueTasks(
    cc.topPriorities,
    cc.myDay?.overdue,
    cc.myDay?.dueToday,
    cc.myDay?.criticalTasks,
    cc.ownerApprovals,
    cc.teamAndAgents?.lateTasks,
    cc.teamAndAgents?.approvalRequests,
    cc.clientAttention?.upcomingDeadlines,
  );
}

/** Display-only: Hub already classified status / blocker on returned records. */
function blockedFromHub(cc: CommandCenter): PmTask[] {
  return hubTaskArrays(cc).filter((t) => t.status === 'blocked' || Boolean(t.blocker));
}

function waitingTasksFromHub(cc: CommandCenter): PmTask[] {
  return hubTaskArrays(cc).filter((t) => t.status === 'waiting');
}

function isOwnerDecisionTask(task: PmTask): boolean {
  const status = (task.status || '').toLowerCase();
  return status === 'needs_owner_approval' || status === 'needs_review';
}

function clientRecordPath(code: string | undefined | null): string | null {
  const raw = String(code || '').trim();
  if (!isCanonicalClientCode(raw)) return null;
  return `/clients/${encodeURIComponent(raw)}`;
}

/** Named task destination. Never `/my-work`. */
function taskRecordPath(task: PmTask, asDecision = false): string | null {
  const project = projectDetailPath(task.projectId);
  if (project) return project;
  if (asDecision || isOwnerDecisionTask(task)) return '/tasks';
  return null;
}

function waitingRecordPath(row: RecordRefs): string | null {
  const project = projectDetailPath(row.projectId);
  if (project) return project;
  return clientRecordPath(row.clientCode) || clientRecordPath(row.clientId);
}

function decisionNeededPath(row: RecordRefs): string {
  return projectDetailPath(row.projectId) || '/tasks';
}

function atRiskClientPath(c: HubAtRiskClient): string | null {
  return clientRecordPath(c.clientCode) || clientRecordPath(c.id);
}

/**
 * Hub href is a named record only for project, client, capital opportunity, or Decisions.
 * `/my-work`, `/clients`, `/projects`, `/portfolio`, `/capital` (no opportunity) are module entries — not row links.
 */
function namedRecordHref(href: string | undefined): string | null {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return null;
  const qIndex = href.indexOf('?');
  const path = (qIndex >= 0 ? href.slice(0, qIndex) : href).replace(/\/+$/, '') || '/';
  const query = qIndex >= 0 ? href.slice(qIndex + 1) : '';
  if (path === '/tasks') return '/tasks';
  if (path === '/capital' && /(?:^|&)opportunity=/.test(query)) return href;
  if (path.startsWith('/projects/') && path !== '/projects') return href;
  if (path.startsWith('/clients/') && path !== '/clients') return href;
  return null;
}

function atlasTaskLabel(task: PmTask, fallback: string): string {
  const status = (task.status || '').toLowerCase();
  if (status === 'blocked') return ATLAS_STATUS.blocked;
  if (status === 'waiting') return ATLAS_STATUS.waiting;
  if (status === 'completed') return ATLAS_STATUS.complete;
  if (status === 'needs_owner_approval' || status === 'needs_review') return ATLAS_STATUS.decisionRequired;
  return fallback;
}

function RecordTitle({ to, children }: { to: string | null | undefined; children: ReactNode }) {
  if (to) {
    return (
      <Link to={to}>
        <Text weight="semibold">{children}</Text>
      </Link>
    );
  }
  return <Text weight="semibold">{children}</Text>;
}

function TaskRow({
  task,
  label,
  onComplete,
  asDecision,
}: {
  task: PmTask;
  label: string;
  onComplete?: (task: PmTask) => void;
  asDecision?: boolean;
}) {
  const path = taskRecordPath(task, asDecision);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 8,
        padding: '10px 0',
        borderBottom: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
      }}
    >
      <div>
        <RecordTitle to={path}>{task.title}</RecordTitle>
        <Caption1 style={{ display: 'block', marginTop: 2 }}>
          {[task.clientName, task.assigneeName, task.dueDate ? `Due ${task.dueDate}` : null, task.source]
            .filter(Boolean)
            .join(' · ')}
        </Caption1>
        {task.nextAction ? (
          <Caption1 style={{ display: 'block', marginTop: 2 }}>Next: {task.nextAction}</Caption1>
        ) : null}
        {task.blocker ? (
          <Caption1 style={{ display: 'block', color: '#c50f1f' }}>
            {ATLAS_STATUS.blocked}: {task.blocker}
          </Caption1>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <StatusChip tone={atlasStatusTone(label)} label={label} />
        {onComplete ? (
          <Button
            size="small"
            appearance="subtle"
            icon={<CheckboxCheckedRegular />}
            onClick={() => onComplete(task)}
            aria-label={`Complete ${task.title}`}
          />
        ) : null}
      </div>
    </div>
  );
}

function ExceptionCard({
  title,
  count,
  empty,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  href: string;
  hrefLabel: string;
  children: ReactNode;
}) {
  return (
    <AtlasCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <Text weight="semibold">{title}</Text>
        <Link to={href}>
          <Caption1>{hrefLabel}</Caption1>
        </Link>
      </div>
      <Caption1 style={{ display: 'block', marginBottom: 8 }}>{count}</Caption1>
      {count === 0 ? <EmptyState title={empty} description="" /> : children}
    </AtlasCard>
  );
}

function CapitalAttentionStrip({ state }: { state: CapitalStripState }) {
  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <AtlasCard>
        <Text weight="semibold">Capital · {ATLAS_STATUS.needsAction}</Text>
        <Caption1 style={{ display: 'block', marginTop: 4 }}>
          {state.kind === 'loading' ? 'Checking Hub capital…' : 'Capital strip not loaded.'}
        </Caption1>
      </AtlasCard>
    );
  }

  if (state.kind === 'unauthorized') {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Capital · Sign-in required</MessageBarTitle>
          {state.message} Capital items are not shown.
        </MessageBarBody>
      </MessageBar>
    );
  }

  if (state.kind === 'unavailable') {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Capital · Hub unavailable</MessageBarTitle>
          {state.message} Home is not substituting demonstration capital data.{' '}
          <Link to="/capital">Open Capital</Link>
        </MessageBarBody>
      </MessageBar>
    );
  }

  const items = (state.payload.items || []).filter((item) => CAPITAL_ATTENTION_QUEUES.has(item.queue));
  return (
    <AtlasCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Text weight="semibold">Capital · {ATLAS_STATUS.needsAction}</Text>
        <Link to="/capital">Open Capital</Link>
      </div>
      <Caption1 style={{ display: 'block', marginBottom: 8 }}>
        Hub capital command center · {items.length} attention queue items
      </Caption1>
      {items.length === 0 ? (
        <Caption1>
          No Hub capital items in {ATLAS_STATUS.needsAction} / {ATLAS_STATUS.needsManny} / {ATLAS_STATUS.rfiOverdue} /{' '}
          {ATLAS_STATUS.complianceReview}.
        </Caption1>
      ) : (
        items.slice(0, 6).map((item) => <CapitalAttentionRow key={item.opportunityId} item={item} />)
      )}
    </AtlasCard>
  );
}

function CapitalAttentionRow({ item }: { item: QueueItem }) {
  const label = CAPITAL_QUEUE_LABEL[item.queue] || ATLAS_STATUS.needsAction;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 8,
        padding: '8px 0',
        borderBottom: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
      }}
    >
      <div>
        <Link to={`/capital?opportunity=${encodeURIComponent(item.opportunityId)}`}>
          <Text weight="semibold">{item.title}</Text>
        </Link>
        <Caption1 style={{ display: 'block' }}>
          {[item.clientCode || item.companyName, item.nextAction, item.due ? `Due ${item.due}` : null]
            .filter(Boolean)
            .join(' · ')}
        </Caption1>
        {item.blocker ? (
          <Caption1 style={{ display: 'block', color: '#c50f1f' }}>
            {ATLAS_STATUS.blocked}: {item.blocker}
          </Caption1>
        ) : null}
      </div>
      <StatusChip tone={atlasStatusTone(label)} label={label} />
    </div>
  );
}

function capitalFailureState(err: unknown): CapitalStripState {
  if (err instanceof CapitalAccessError || isAuthorizationFailure(err)) {
    return {
      kind: 'unauthorized',
      message: operatorMessage(err, 'Authenticated access required before Capital can load.'),
    };
  }
  return {
    kind: 'unavailable',
    message: operatorMessage(err, 'Hub capital is not available.'),
  };
}

export function CommandCenterPage() {
  const auth = useHubAuth();
  const navigate = useNavigate();
  const [cc, setCc] = useState<CommandCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [capitalStrip, setCapitalStrip] = useState<CapitalStripState>({ kind: 'idle' });

  const refresh = useCallback(async () => {
    setError(null);
    setUnauthorized(null);
    setActionError(null);
    setCapitalStrip({ kind: 'loading' });
    setLoading(true);

    const pmPromise = fetchCommandCenter(auth);
    const capitalPromise = loadCommandCenter(auth);

    try {
      const pm = await pmPromise;
      setCc(pm.commandCenter);
    } catch (reason) {
      setCc(null);
      if (isAuthorizationFailure(reason) || (reason instanceof HubHttpError && (reason.status === 401 || reason.status === 403))) {
        setUnauthorized(
          operatorMessage(
            reason,
            reason instanceof HubHttpError && reason.status === 403
              ? 'You are signed in but not entitled to Command Center. Hub data is not shown.'
              : 'Authenticated access required. Sign in with Microsoft to load Command Center.',
          ),
        );
      } else {
        setError(operatorMessage(reason, 'Command Center could not be loaded from Hub.'));
      }
    } finally {
      setLoading(false);
    }

    try {
      const payload = await capitalPromise;
      if (payload.source === 'hub') {
        setCapitalStrip({ kind: 'hub', payload });
      } else {
        setCapitalStrip({
          kind: 'unavailable',
          message:
            payload.fallbackReason ||
            'Hub capital is not available. Demonstration data is not shown on Home.',
        });
      }
    } catch (reason) {
      setCapitalStrip(capitalFailureState(reason));
    }
  }, [auth]);

  useEffect(() => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setCc(null);
      setLoading(false);
      setError(null);
      setUnauthorized('Authenticated access required. Sign in with Microsoft to load Command Center.');
      setCapitalStrip({
        kind: 'unauthorized',
        message: 'Authenticated access required before Capital can load. Synthetic data is not shown.',
      });
      return;
    }
    void refresh();
  }, [refresh, auth.tokenReady, auth.hasBearer]);

  const completeTask = async (task: PmTask) => {
    try {
      setActionError(null);
      await patchPmTask(auth, task.id, { status: 'completed', ...(task.etag ? { etag: task.etag } : {}) });
      await refresh();
    } catch (err) {
      setActionError(operatorMessage(err, 'Update failed. The Hub record was not changed.'));
    }
  };

  const h = cc?.businessHealth;

  const needsAction = cc
    ? uniqueTasks(cc.topPriorities, cc.myDay?.dueToday, cc.myDay?.criticalTasks)
    : [];
  const overdue = cc?.myDay?.overdue || [];
  const blocked = cc ? blockedFromHub(cc) : [];
  const waitingTasks = cc ? waitingTasksFromHub(cc) : [];
  const waitingFollowUps = (cc?.myDay?.waitingFollowUps || []) as HubWaitingRow[];
  const waitingOnUs = (cc?.clientAttention?.waitingOnUs || []) as HubWaitingRow[];
  const waitingOnClient = (cc?.clientAttention?.waitingOnClient || []) as HubWaitingRow[];
  const waitingCount = waitingTasks.length + waitingFollowUps.length + waitingOnUs.length + waitingOnClient.length;
  const decisions = cc ? uniqueTasks(cc.ownerApprovals) : [];
  const decisionsNeeded = (cc?.myDay?.decisionsNeeded || []) as HubDecisionRow[];
  const atRiskClients = (cc?.clientAttention?.atRisk || []) as HubAtRiskClient[];
  const atRiskProjects = cc?.projects?.atRisk || [];
  const alerts = cc?.criticalAlerts || [];

  const showLoading = (!auth.tokenReady || loading) && !cc;
  const showUnauthorized = Boolean(unauthorized) && !cc;
  const showError = Boolean(error) && !cc && !unauthorized;

  return (
    <ModuleScaffold
      title="Daily Command Center"
      subtitle="What needs Manny in 30 seconds — exceptions, not a browse dashboard."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            appearance="secondary"
            icon={<ArrowSyncRegular />}
            disabled={loading}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
          <Button appearance="subtle" onClick={() => navigate('/my-work')}>
            My Work
          </Button>
          <Button appearance="subtle" onClick={() => navigate('/capital')}>
            Capital
          </Button>
        </div>
      }
    >
      {actionError ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Action did not complete</MessageBarTitle>
            {actionError}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {showLoading ? <LoadingState rows={6} label={!auth.tokenReady ? 'Connecting to Hub' : 'Loading Command Center'} /> : null}

      {showUnauthorized ? (
        <AccessDeniedState
          title="Authenticated access required"
          description={unauthorized || 'Sign in with Microsoft to load Command Center. Hub data is not shown.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      ) : null}

      {showError ? (
        <ErrorState
          title="Command Center could not load"
          description={error || 'The Hub request failed. This is not an empty exception scan.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      ) : null}

      {cc ? (
        <div style={{ display: 'grid', gap: 16 }} className="atlas-stagger">
          <AtlasCard variant="accent">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'baseline',
              }}
            >
              <div>
                <Text weight="semibold" style={{ fontSize: 22 }}>
                  {cc.date}
                </Text>
                <Caption1 style={{ display: 'block' }}>
                  {[
                    `${h?.overdueTasks ?? overdue.length} ${ATLAS_STATUS.overdue}`,
                    `${h?.atRiskProjects ?? atRiskProjects.length} ${ATLAS_STATUS.atRisk}`,
                    `${h?.waitingItems ?? waitingCount} ${ATLAS_STATUS.waiting}`,
                    `${h?.decisionsNeeded ?? decisions.length + decisionsNeeded.length} ${ATLAS_STATUS.decisionRequired}`,
                  ].join(' · ')}
                </Caption1>
              </div>
            </div>
          </AtlasCard>

          <CapitalAttentionStrip state={capitalStrip} />

          <ResponsiveGrid>
            <GridSpan span={2}>
              <AtlasCard>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Text weight="semibold">What changed</Text>
                  <Link to="/my-work">
                    <Caption1>Open queues</Caption1>
                  </Link>
                </div>
                <Caption1 style={{ display: 'block', marginBottom: 8 }}>
                  Hub critical alerts — not a reconstructed activity feed
                </Caption1>
                {alerts.length === 0 ? (
                  <Caption1>Hub returned no critical alerts.</Caption1>
                ) : (
                  alerts.slice(0, 8).map((a) => {
                    const href = namedRecordHref(a.href);
                    return (
                      <div key={a.id} style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
                        <WarningRegular />
                        <div>
                          {href ? (
                            <Link to={href}>
                              <Text>{a.title}</Text>
                            </Link>
                          ) : (
                            <Text>{a.title}</Text>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </AtlasCard>
            </GridSpan>
            <ExceptionCard
              title={ATLAS_STATUS.needsAction}
              count={needsAction.length}
              empty="Hub returned no top priorities, due-today, or critical tasks."
              href="/my-work"
              hrefLabel="My Work"
            >
              {needsAction.slice(0, 8).map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  label={atlasTaskLabel(t, ATLAS_STATUS.needsAction)}
                  onComplete={completeTask}
                />
              ))}
            </ExceptionCard>
          </ResponsiveGrid>

          <ResponsiveGrid>
            <ExceptionCard
              title={ATLAS_STATUS.overdue}
              count={overdue.length}
              empty="Hub returned no overdue tasks."
              href="/my-work"
              hrefLabel="My Work"
            >
              {overdue.slice(0, 8).map((t) => (
                <TaskRow key={t.id} task={t} label={ATLAS_STATUS.overdue} onComplete={completeTask} />
              ))}
            </ExceptionCard>
            <ExceptionCard
              title={ATLAS_STATUS.blocked}
              count={blocked.length}
              empty="Hub payload has no blocked tasks among returned records."
              href="/my-work"
              hrefLabel="My Work"
            >
              {blocked.slice(0, 8).map((t) => (
                <TaskRow key={t.id} task={t} label={ATLAS_STATUS.blocked} onComplete={completeTask} />
              ))}
            </ExceptionCard>
            <ExceptionCard
              title={ATLAS_STATUS.waiting}
              count={waitingCount}
              empty={
                (h?.waitingItems || 0) > 0
                  ? `Hub reports ${h?.waitingItems} waiting items, but follow-up records are not in this payload.`
                  : 'Hub returned no waiting work.'
              }
              href="/my-work"
              hrefLabel="My Work"
            >
              {waitingTasks.slice(0, 6).map((t) => (
                <TaskRow key={t.id} task={t} label={ATLAS_STATUS.waiting} />
              ))}
              {waitingFollowUps.slice(0, 4).map((w) => (
                <div key={w.id} style={{ padding: '8px 0' }}>
                  <RecordTitle to={waitingRecordPath(w)}>{w.whatIsNeeded}</RecordTitle>
                  <Caption1 style={{ display: 'block' }}>
                    {ATLAS_STATUS.waiting} · {w.owedByName}
                  </Caption1>
                </div>
              ))}
              {waitingOnUs.slice(0, 3).map((w) => (
                <div key={`us-${w.id}`} style={{ padding: '8px 0' }}>
                  <RecordTitle to={waitingRecordPath(w)}>{w.whatIsNeeded}</RecordTitle>
                  <Caption1 style={{ display: 'block' }}>{ATLAS_STATUS.waitingInternal}</Caption1>
                </div>
              ))}
              {waitingOnClient.slice(0, 3).map((w) => (
                <div key={`client-${w.id}`} style={{ padding: '8px 0' }}>
                  <RecordTitle to={waitingRecordPath(w)}>{w.whatIsNeeded}</RecordTitle>
                  <Caption1 style={{ display: 'block' }}>{ATLAS_STATUS.waitingClient}</Caption1>
                </div>
              ))}
            </ExceptionCard>
          </ResponsiveGrid>

          <ResponsiveGrid>
            <ExceptionCard
              title={ATLAS_STATUS.decisionRequired}
              count={decisions.length + decisionsNeeded.length}
              empty="Hub returned no owner approvals or open decisions."
              href="/my-work"
              hrefLabel="My Work"
            >
              {decisions.slice(0, 8).map((t) => (
                <TaskRow key={t.id} task={t} label={ATLAS_STATUS.decisionRequired} asDecision />
              ))}
              {decisionsNeeded.slice(0, 4).map((d) => (
                <div key={d.id} style={{ padding: '8px 0' }}>
                  <RecordTitle to={decisionNeededPath(d)}>{d.title}</RecordTitle>
                  <Caption1 style={{ display: 'block' }}>{ATLAS_STATUS.decisionRequired}</Caption1>
                </div>
              ))}
            </ExceptionCard>
            <GridSpan span={2}>
              <AtlasCard>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Text weight="semibold">{ATLAS_STATUS.atRisk}</Text>
                  <Link to="/projects">
                    <Caption1>Projects</Caption1>
                  </Link>
                </div>
                <Caption1 style={{ display: 'block', marginBottom: 8 }}>
                  Hub clientAttention.atRisk and projects.atRisk
                </Caption1>
                {atRiskClients.length === 0 && atRiskProjects.length === 0 ? (
                  <EmptyState title="Hub returned no at-risk clients or projects." description="" />
                ) : (
                  <>
                    {atRiskClients
                      .filter((c) => {
                        if (atRiskClientPath(c)) return true;
                        return !atRiskProjects.some((p) => p.id === c.id);
                      })
                      .slice(0, 6)
                      .map((c) => (
                        <div key={`client-${c.id}`} style={{ padding: '6px 0' }}>
                          <RecordTitle to={atRiskClientPath(c)}>{c.name}</RecordTitle>
                          <Caption1 style={{ display: 'block' }}>
                            {ATLAS_STATUS.atRisk} · {c.reason}
                          </Caption1>
                        </div>
                      ))}
                    {atRiskProjects.slice(0, 6).map((p) => (
                      <div key={`project-${p.id}`} style={{ padding: '6px 0' }}>
                        <RecordTitle to={projectDetailPath(p.id)}>{p.name}</RecordTitle>
                        <Caption1 style={{ display: 'block' }}>
                          {ATLAS_STATUS.atRisk} · {p.health}
                          {p.nextAction ? ` · ${p.nextAction}` : ''}
                        </Caption1>
                      </div>
                    ))}
                  </>
                )}
              </AtlasCard>
            </GridSpan>
          </ResponsiveGrid>
        </div>
      ) : null}
    </ModuleScaffold>
  );
}
