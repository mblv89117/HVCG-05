import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  StatusChip,
  SourceBadge,
  ResponsiveGrid,
  GridSpan,
  EmptyState,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Text,
  Badge,
  Spinner,
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
import {
  fetchCommandCenter,
  patchPmTask,
  type CommandCenter,
  type PmTask,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { QuickCaptureBar } from '../components/QuickCaptureBar';
import { classifyExecutiveEvidence } from '../data/evidenceProvenance';


function priorityTone(p: string): 'danger' | 'warning' | 'info' | 'success' | 'neutral' {
  if (p === 'critical') return 'danger';
  if (p === 'high') return 'warning';
  if (p === 'low' || p === 'someday') return 'neutral';
  return 'info';
}

function TaskRow({
  task,
  onComplete,
}: {
  task: PmTask;
  onComplete?: (id: string) => void;
}) {
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
        <Text weight="semibold">{task.title}</Text>
        <Caption1 style={{ display: 'block', marginTop: 2 }}>
          {[task.clientName, task.assigneeName, task.dueDate ? `Due ${task.dueDate}` : null, task.source]
            .filter(Boolean)
            .join(' · ')}
        </Caption1>
        {task.nextAction ? (
          <Caption1 style={{ display: 'block', marginTop: 2 }}>Next: {task.nextAction}</Caption1>
        ) : null}
        {task.blocker ? (
          <Caption1 style={{ display: 'block', color: '#c50f1f' }}>Blocked: {task.blocker}</Caption1>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <StatusChip tone={priorityTone(task.priority)} label={task.priority} />
        {onComplete ? (
          <Button
            size="small"
            appearance="subtle"
            icon={<CheckboxCheckedRegular />}
            onClick={() => onComplete(task.id)}
          />
        ) : null}
      </div>
    </div>
  );
}

function ListBlock({
  title,
  items,
  empty,
  onComplete,
}: {
  title: string;
  items: PmTask[];
  empty: string;
  onComplete?: (id: string) => void;
}) {
  return (
    <AtlasCard>
      <Text weight="semibold">{title}</Text>
      <Caption1 style={{ display: 'block', marginBottom: 8 }}>{items.length} items</Caption1>
      {items.length === 0 ? (
        <EmptyState title={empty} description="" />
      ) : (
        items.slice(0, 8).map((t) => <TaskRow key={t.id} task={t} onComplete={onComplete} />)
      )}
    </AtlasCard>
  );
}

export function CommandCenterPage() {
  const auth = useHubAuth();
  const [cc, setCc] = useState<CommandCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCommandCenter(auth);
      setCc(res.commandCenter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Command Center');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setCc(null);
      setLoading(false);
      setError('Sign in with Microsoft to load Command Center (Hub Bearer required).');
      return;
    }
    void refresh();
  }, [refresh, auth.tokenReady, auth.hasBearer]);

  const completeTask = async (id: string) => {
    try {
      await patchPmTask(auth, id, { status: 'completed' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const h = cc?.businessHealth;
  const evidence = classifyExecutiveEvidence({
    authenticated: auth.hasBearer,
    loadFailed: Boolean(error),
    hasPayload: Boolean(cc),
    provenLive: false,
    origin: 'hub-snapshot',
  });

  return (
    <ModuleScaffold
      title="Daily Command Center"
      subtitle="What needs Manny’s attention — priorities, clients, team, agents, and next actions."
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
          <Button appearance="subtle" onClick={() => (window.location.href = '/my-work')}>
            My Work
          </Button>
          <Button appearance="subtle" onClick={() => (window.location.href = '/portfolio')}>
            Portfolio
          </Button>
        </div>
      }
    >
      <QuickCaptureBar auth={auth} onCreated={() => void refresh()} />

      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Command Center</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {loading && !cc ? (
        <Spinner label="Loading operating system…" />
      ) : cc ? (
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
                  Business health · generated {new Date(cc.generatedAt).toLocaleString()}
                </Caption1>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <SourceBadge status={evidence.status} label={evidence.label} detail={evidence.detail} />
                <Badge appearance="filled" color="important">
                  {h?.overdueTasks ?? 0} overdue
                </Badge>
                <Badge appearance="outline">{h?.openTasks ?? 0} open tasks</Badge>
                <Badge appearance="outline">{h?.activeProjects ?? 0} projects</Badge>
              </div>
            </div>
          </AtlasCard>

          <ResponsiveGrid>
            <GridSpan span={2}>
              <AtlasCard title="Today’s top 3 priorities">
                {(cc.topPriorities || []).length === 0 ? (
                  <Caption1>
                    No high-priority tasks in SharePoint HVCG_Tasks for your current client scope.
                  </Caption1>
                ) : (
                  cc.topPriorities.map((t, i) => (
                    <div key={t.id} style={{ display: 'flex', gap: 8, padding: '8px 0' }}>
                      <Badge appearance="filled">{i + 1}</Badge>
                      <div style={{ flex: 1 }}>
                        <Text weight="semibold">{t.title}</Text>
                        <Caption1 style={{ display: 'block' }}>
                          {t.clientName || 'HVCG'} · {t.dueDate || 'No due date'} · {t.priority}
                        </Caption1>
                      </div>
                      <Button size="small" onClick={() => void completeTask(t.id)}>
                        Done
                      </Button>
                    </div>
                  ))
                )}
              </AtlasCard>
            </GridSpan>
            <AtlasCard title="Critical alerts">
              {(cc.criticalAlerts || []).length === 0 ? (
                <Caption1>No critical alerts</Caption1>
              ) : (
                cc.criticalAlerts.slice(0, 8).map((a) => (
                  <div key={a.id} style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
                    <WarningRegular />
                    <div>
                      <Text>{a.title}</Text>
                      {a.href ? (
                        <Caption1 style={{ display: 'block' }}>
                          <Link to={a.href}>Open</Link>
                        </Caption1>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </AtlasCard>
          </ResponsiveGrid>

          <ResponsiveGrid>
            <ListBlock
              title="Overdue"
              items={cc.myDay?.overdue || []}
              empty="Nothing overdue"
              onComplete={completeTask}
            />
            <ListBlock
              title="Due today"
              items={cc.myDay?.dueToday || []}
              empty="Clear for today"
              onComplete={completeTask}
            />
            <ListBlock
              title="Critical tasks"
              items={cc.myDay?.criticalTasks || []}
              empty="No critical tasks"
              onComplete={completeTask}
            />
          </ResponsiveGrid>

          <ResponsiveGrid>
            <AtlasCard title="Meetings">
              <Caption1>Meetings are not in the SharePoint production MVP.</Caption1>
            </AtlasCard>
            <AtlasCard title="Owner decisions">
              <Caption1>Decisions are not in the SharePoint production MVP.</Caption1>
            </AtlasCard>
            <AtlasCard title="Waiting follow-ups">
              <Caption1>Waiting items are not in the SharePoint production MVP.</Caption1>
            </AtlasCard>
          </ResponsiveGrid>

          <ResponsiveGrid>
            <GridSpan span={2}>
              <AtlasCard title="Client attention">
                <Caption1 style={{ display: 'block', marginBottom: 8 }}>
                  At-risk projects from SharePoint HVCG_Projects. Client 360 opportunities are not mapped.
                </Caption1>
                {(cc.clientAttention?.atRisk || []).length === 0 ? (
                  <Caption1>No at-risk client projects in scope</Caption1>
                ) : (
                  (cc.clientAttention?.atRisk || []).slice(0, 6).map((c) => (
                    <div key={c.id} style={{ padding: '6px 0' }}>
                      <Text weight="semibold">{c.name}</Text>
                      <Caption1 style={{ display: 'block' }}>{c.reason}</Caption1>
                    </div>
                  ))
                )}
              </AtlasCard>
            </GridSpan>
            <AtlasCard title="Team & agents">
              <Caption1>Team workload and agent activity are not in the SharePoint production MVP.</Caption1>
            </AtlasCard>
          </ResponsiveGrid>

          <ResponsiveGrid>
            <AtlasCard title="At-risk projects">
              {(cc.projects.atRisk || []).length === 0 ? (
                <Caption1>No at-risk projects</Caption1>
              ) : (
                cc.projects.atRisk.map((p) => {
                  const path = projectDetailPath(p.id);
                  return (
                  <div key={p.id} style={{ padding: '6px 0' }}>
                    {path ? (
                      <Link to={path}>
                        <Text weight="semibold">{p.name}</Text>
                      </Link>
                    ) : (
                      <Text weight="semibold">{p.name}</Text>
                    )}
                    <Caption1 style={{ display: 'block' }}>
                      {p.health} · {p.progressPercent}% · {p.nextAction || 'No next action'}
                    </Caption1>
                  </div>
                  );
                })
              )}
            </AtlasCard>
            <AtlasCard title="Projects lacking next action">
              {(cc.projects.lackingNextAction || []).map((p) => {
                const path = projectDetailPath(p.id);
                return (
                <div key={p.id} style={{ padding: '6px 0' }}>
                  {path ? <Link to={path}>{p.name}</Link> : p.name}
                </div>
                );
              })}
            </AtlasCard>
            <AtlasCard title="Owner approvals">
              {(cc.ownerApprovals || []).length === 0 ? (
                <Caption1>None pending</Caption1>
              ) : (
                cc.ownerApprovals.map((t) => <TaskRow key={t.id} task={t} />)
              )}
            </AtlasCard>
          </ResponsiveGrid>
        </div>
      ) : null}
    </ModuleScaffold>
  );
}
