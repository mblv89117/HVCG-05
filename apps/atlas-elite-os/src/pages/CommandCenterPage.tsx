import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  StatusChip,
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
  FlashRegular,
  WarningRegular,
  CheckboxCheckedRegular,
} from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { workspaceCatalog } from '../data/workspaces';
import { projectDetailPath } from '../routing/projectId';
import {
  fetchCommandCenter,
  initializePm,
  patchPmTask,
  type CommandCenter,
  type PmTask,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import type { AtlasHubAuthHeaders } from '../integrations/hub/api';
import { QuickCaptureBar } from '../components/QuickCaptureBar';


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
  const auth = useHubAuth() as AtlasHubAuthHeaders;
  const [cc, setCc] = useState<CommandCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
    if (!auth.accessToken) {
      setCc(null);
      setLoading(false);
      setError('Sign in with Microsoft to load Command Center.');
      return;
    }
    void refresh();
  }, [refresh, auth.accessToken]);

  const initialize = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await initializePm(auth);
      setCc(res.commandCenter);
      setInfo(
        `Populated from Microsoft: ${String((res.populate as { realClientsSelected?: number })?.realClientsSelected ?? '—')} clients · ${String((res.populate as { projectsTotal?: number })?.projectsTotal ?? '—')} projects · ${String((res.populate as { tasksOpen?: number })?.tasksOpen ?? '—')} open tasks · ${String((res.populate as { deliverablesTotal?: number })?.deliverablesTotal ?? '—')} deliverables.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialize failed');
    } finally {
      setBusy(false);
    }
  };

  const completeTask = async (id: string) => {
    try {
      await patchPmTask(auth, id, { status: 'completed' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const h = cc?.businessHealth;

  return (
    <ModuleScaffold
      title="Daily Command Center"
      subtitle="What needs Manny’s attention — priorities, clients, team, agents, and next actions."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            appearance="primary"
            icon={<FlashRegular />}
            disabled={busy}
            onClick={() => void initialize()}
          >
            Initialize / refresh from Microsoft
          </Button>
          <Button
            appearance="secondary"
            icon={<ArrowSyncRegular />}
            disabled={busy || loading}
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
      {info ? (
        <MessageBar intent="success">
          <MessageBarBody>{info}</MessageBarBody>
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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge appearance="filled" color="important">
                  {h?.overdueTasks ?? 0} overdue
                </Badge>
                <Badge appearance="outline">{h?.openTasks ?? 0} open tasks</Badge>
                <Badge appearance="outline">{h?.activeProjects ?? 0} projects</Badge>
                <Badge appearance="outline">{h?.decisionsNeeded ?? 0} decisions</Badge>
                <Badge appearance="outline">
                  Client 360 avg {h?.avgClientCompleteness ?? '—'}%
                </Badge>
              </div>
            </div>
          </AtlasCard>

          <ResponsiveGrid>
            <GridSpan span={2}>
              <AtlasCard title="Today’s top 3 priorities">
                {(cc.topPriorities || []).length === 0 ? (
                  <Caption1>
                    No priorities yet — click <strong>Initialize</strong> to seed projects and extract
                    work from connected Microsoft accounts.
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
              items={cc.myDay.overdue}
              empty="Nothing overdue"
              onComplete={completeTask}
            />
            <ListBlock
              title="Due today"
              items={cc.myDay.dueToday}
              empty="Clear for today"
              onComplete={completeTask}
            />
            <ListBlock
              title="Critical tasks"
              items={cc.myDay.criticalTasks}
              empty="No critical tasks"
              onComplete={completeTask}
            />
          </ResponsiveGrid>

          <ResponsiveGrid>
            <AtlasCard title="Meetings">
              {(cc.myDay.meetings || []).length === 0 ? (
                <Caption1>No upcoming meetings indexed</Caption1>
              ) : (
                cc.myDay.meetings.slice(0, 8).map((m) => (
                  <div key={m.id} style={{ padding: '6px 0' }}>
                    <Text weight="semibold">{m.title}</Text>
                    <Caption1 style={{ display: 'block' }}>
                      {m.at ? new Date(m.at).toLocaleString() : '—'}
                    </Caption1>
                  </div>
                ))
              )}
            </AtlasCard>
            <AtlasCard title="Owner decisions">
              {(cc.myDay.decisionsNeeded || []).length === 0 ? (
                <Caption1>No open decisions</Caption1>
              ) : (
                cc.myDay.decisionsNeeded.map((d) => (
                  <div key={d.id} style={{ padding: '6px 0' }}>
                    <Text>{d.title}</Text>
                  </div>
                ))
              )}
            </AtlasCard>
            <AtlasCard title="Waiting follow-ups">
              {(cc.myDay.waitingFollowUps || []).length === 0 ? (
                <Caption1>No follow-ups due</Caption1>
              ) : (
                cc.myDay.waitingFollowUps.map((w) => (
                  <div key={w.id} style={{ padding: '6px 0' }}>
                    <Text weight="semibold">{w.whatIsNeeded}</Text>
                    <Caption1 style={{ display: 'block' }}>Owed by {w.owedByName}</Caption1>
                  </div>
                ))
              )}
            </AtlasCard>
          </ResponsiveGrid>

          <ResponsiveGrid>
            <GridSpan span={2}>
              <AtlasCard title="Client attention">
                <Caption1 style={{ display: 'block', marginBottom: 8 }}>
                  At risk · waiting · opportunities
                </Caption1>
                {(cc.clientAttention.atRisk || []).slice(0, 6).map((c) => (
                  <div key={c.id} style={{ padding: '6px 0' }}>
                    <Text weight="semibold">{c.name}</Text>
                    <Caption1 style={{ display: 'block' }}>{c.reason}</Caption1>
                  </div>
                ))}
                {(cc.clientAttention.opportunities || []).slice(0, 4).map((o) => (
                  <div key={o.id} style={{ padding: '6px 0' }}>
                    <Badge appearance="tint" color="success">
                      Opportunity
                    </Badge>{' '}
                    <Text>{o.name}</Text>
                    <Caption1 style={{ display: 'block' }}>{o.detail}</Caption1>
                  </div>
                ))}
              </AtlasCard>
            </GridSpan>
            <AtlasCard title="Team & agents">
              {(cc.teamAndAgents.teamWorkload || []).map((t) => (
                <div key={t.id} style={{ padding: '6px 0' }}>
                  <Text weight="semibold">{t.name}</Text>
                  <Caption1 style={{ display: 'block' }}>
                    {t.openTasks} open · {t.overdue} overdue · {t.blocked} blocked
                  </Caption1>
                </div>
              ))}
              <Caption1 style={{ display: 'block', marginTop: 12 }}>Agents</Caption1>
              {(cc.teamAndAgents.agentActivity || []).map((a) => (
                <div key={a.id} style={{ padding: '4px 0' }}>
                  <Text>
                    {a.agentName} — {a.status}
                  </Text>
                  <Caption1 style={{ display: 'block' }}>
                    {a.output || a.nextPlannedAction || '—'}
                  </Caption1>
                </div>
              ))}
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
