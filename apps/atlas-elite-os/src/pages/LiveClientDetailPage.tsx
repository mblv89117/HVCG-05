/**
 * Client operations record-detail — SharePoint HVCG_Clients.ClientCode.
 * Hub client workspace payload only (`/api/pm/clients/:code/workspace`).
 * Client 360 is fail-closed / deferred. GCC stays financial intelligence (not pulled here).
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AccessDeniedState,
  AtlasCard,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusChip,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { ArrowSyncRegular, OpenRegular } from '@fluentui/react-icons';
import { contactsListHonesty } from './contactsListHonesty';
import { decisionsRisksChipLabel, decisionsRisksListHonesty } from './decisionsRisksListHonesty';
import { deliverablesChipLabel, deliverablesListHonesty } from './deliverablesListHonesty';
import { engagementsChipLabel, engagementsListHonesty } from './engagementsListHonesty';
import { meetingsListHonesty } from './meetingsListHonesty';
import { tasksListHonesty } from './tasksListHonesty';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import {
  createPmProject,
  createPmTask,
  fetchClientCommercialContext,
  fetchClientPmWorkspace,
  HubHttpError,
  type ClientPmWorkspace,
  type OperatorCommercialContext,
  type PmProject,
  type PmTask,
  type WorkspaceSection,
} from '../integrations/hub/pmApi';
import { CommercialContextPanel } from '../components/CommercialContextPanel';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { projectDetailPath } from '../routing/projectId';
import { isCanonicalClientCode } from '../security/clientCode';
import { displayNextAction, isBootstrapNextAction } from '../operating/projectDisplay';
import { ATLAS_STATUS, atlasStatusDisplay } from '../ui/statusLanguage';

function dayStamp(iso?: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso.slice(0, 10) || null;
  return new Date(t).toISOString().slice(0, 10);
}

function hubStatus(err: unknown): number | null {
  if (err instanceof HubHttpError) return err.status;
  const status = (err as { status?: number })?.status;
  return typeof status === 'number' ? status : null;
}

function isOverdueTask(task: PmTask): boolean {
  if (task.status === 'completed' || task.status === 'cancelled' || !task.dueDate) return false;
  const due = dayStamp(task.dueDate);
  const today = new Date().toISOString().slice(0, 10);
  return Boolean(due && due < today);
}

function taskStatusLabel(task: PmTask) {
  if (isOverdueTask(task)) {
    return { label: ATLAS_STATUS.overdue, tone: 'danger' as const };
  }
  return atlasStatusDisplay(task.status) || { label: task.status, tone: 'neutral' as const };
}

function needsOwnerTask(task: PmTask): boolean {
  const status = (task.status || '').toLowerCase().replace(/[_-]+/g, ' ');
  return (
    status === 'needs owner approval' ||
    status === 'needs review' ||
    status === 'needs manny' ||
    status === 'decision required'
  );
}

function taskWorkPath(task: PmTask): string {
  return projectDetailPath(task.projectId) || '/tasks';
}

function evidencePath(
  ev: { kind: string; id: string },
  tasks: PmTask[],
): string | null {
  const kind = (ev.kind || '').toLowerCase();
  if (kind.includes('project')) return projectDetailPath(ev.id);
  if (kind.includes('task')) {
    const task = tasks.find((t) => t.id === ev.id);
    return task ? taskWorkPath(task) : '/tasks';
  }
  return null;
}

function RecordRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 12,
        padding: '12px 0',
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

function StatusOrDash({ raw }: { raw?: string | null }) {
  const chip = atlasStatusDisplay(raw || undefined);
  if (chip) return <StatusChip label={chip.label} tone={chip.tone} />;
  if (raw) return <StatusChip label={raw} tone="neutral" />;
  return <Caption1>—</Caption1>;
}

function workspaceErrorSubtitle(message: string): string {
  if (/list walk stopped before the list was complete/i.test(message)) {
    return 'SharePoint list walk incomplete';
  }
  return 'Sign in required';
}

function sectionHonesty(section?: WorkspaceSection): string {
  if (!section) return 'Hub did not include this source on the workspace payload.';
  if (section.status === 'SOURCE_UNAVAILABLE') {
    return section.reason || 'This source walk did not complete. It is not an empty list.';
  }
  if (!section.queried) {
    return (
      section.reason ||
      'Source not queried. The Hub Graph allowlist did not grant this list — not treated as empty.'
    );
  }
  if (!section.items.length) return 'Queried source returned no entitled rows.';
  return `${section.items.length} entitled row${section.items.length === 1 ? '' : 's'}.`;
}

function timelineKindChip(kind: string) {
  const token = kind.trim() || 'event';
  const mapped = atlasStatusDisplay(token);
  if (mapped) return mapped;
  const lower = token.toLowerCase();
  if (lower.includes('risk') || lower.includes('decision')) return { label: token, tone: 'warning' as const };
  if (lower.includes('task') || lower.includes('meeting')) return { label: token, tone: 'info' as const };
  if (lower.includes('project')) return { label: token, tone: 'gold' as const };
  return { label: token, tone: 'neutral' as const };
}

function timelineEventPath(
  ev: { kind: string; id: string },
  tasks: PmTask[],
): string | null {
  const kind = (ev.kind || '').toLowerCase();
  if (kind.includes('project')) return projectDetailPath(ev.id);
  if (kind.includes('task')) {
    const task = tasks.find((t) => t.id === ev.id);
    return task ? taskWorkPath(task) : '/tasks';
  }
  return null;
}

export function LiveClientDetailPage({ clientId }: { clientId: string }) {
  const { account, ready, signIn } = useMicrosoftAuth();
  const auth = useHubAuth();
  const [workspace, setWorkspace] = useState<ClientPmWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [codeRejected, setCodeRejected] = useState(false);
  const [unauthorized, setUnauthorized] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [commercial, setCommercial] = useState<OperatorCommercialContext | null>(null);
  const [commercialError, setCommercialError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCodeRejected(false);
    setUnauthorized(null);
    setForbidden(null);
    try {
      if (!isCanonicalClientCode(clientId)) {
        setWorkspace(null);
        setCodeRejected(true);
        return;
      }
      if (!auth.hasBearer) {
        setWorkspace(null);
        setUnauthorized(
          auth.bootstrapMessage || 'Microsoft sign-in required (Bearer token missing)',
        );
        return;
      }
      const scoped = { ...auth, clientIds: [clientId] };
      const detail = await fetchClientPmWorkspace(scoped, clientId);
      setWorkspace(detail.workspace || null);
      try {
        const ctx = await fetchClientCommercialContext(scoped, clientId);
        setCommercial(ctx.commercialContext);
        setCommercialError(null);
      } catch (err) {
        setCommercial(null);
        setCommercialError(err instanceof Error ? err.message : String(err));
      }
    } catch (err) {
      const status = hubStatus(err);
      const message = err instanceof Error ? err.message : String(err);
      setWorkspace(null);
      if (status === 401) {
        setUnauthorized(message);
      } else if (status === 403) {
        setForbidden(message);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }, [auth, clientId]);

  useEffect(() => {
    if (!ready) return;
    if (!account) {
      setWorkspace(null);
      setError(null);
      setUnauthorized(null);
      setForbidden(null);
      setBusy(false);
      return;
    }
    if (!auth.tokenReady) return;
    void refresh();
  }, [refresh, ready, account, auth.tokenReady, auth.hasBearer]);

  const overview = workspace?.overview;
  const meetingsHonesty = useMemo(
    () => meetingsListHonesty(workspace?.meetings, clientId),
    [workspace, clientId],
  );
  const contactsHonesty = useMemo(
    () => contactsListHonesty(workspace?.contacts, clientId),
    [workspace, clientId],
  );
  const tasksHonesty = useMemo(
    () =>
      tasksListHonesty(
        workspace
          ? { tasks: workspace.tasks, availability: workspace.completeness?.tasks }
          : undefined,
        clientId,
      ),
    [workspace, clientId],
  );
  const engagementsHonesty = useMemo(
    () => engagementsListHonesty(workspace?.engagements, clientId),
    [workspace, clientId],
  );
  const deliverablesHonesty = useMemo(
    () => deliverablesListHonesty(workspace?.deliverables, clientId),
    [workspace, clientId],
  );
  const decisionsRisksHonesty = useMemo(
    () => decisionsRisksListHonesty(workspace?.decisionsRisks, clientId),
    [workspace, clientId],
  );
  const projects = workspace?.projects || [];
  const tasks = workspace?.tasks || [];
  const nextActions = workspace?.nextActions || [];
  const capitalLinked = useMemo(
    () =>
      projects.some((p) => /capital/i.test(`${p.projectType || ''} ${p.name || ''}`)) ||
      /capital/i.test(overview?.engagementType || ''),
    [projects, overview?.engagementType],
  );

  const ownerNames = useMemo(
    () => [...new Set(projects.map((p) => p.ownerName).filter(Boolean))],
    [projects],
  );

  const blockers = useMemo(() => {
    return tasks.filter((t) => t.blocker || t.status === 'blocked' || isOverdueTask(t));
  }, [tasks]);

  const requiresMe = useMemo(() => {
    const fromTasks = tasks.filter((t) => needsOwnerTask(t) || isOverdueTask(t) || t.status === 'blocked');
    const fromProjects = projects.filter(
      (p) => isBootstrapNextAction(p.nextAction) || p.health === 'at_risk' || p.health === 'critical',
    );
    return { tasks: fromTasks, projects: fromProjects };
  }, [tasks, projects]);

  const backToClients = (
    <Link to="/clients">
      <Button appearance="secondary">Back to clients</Button>
    </Link>
  );

  if (!ready || (account && !auth.tokenReady && !unauthorized && !forbidden && !error && !codeRejected)) {
    return (
      <ModuleScaffold title="Client" subtitle="Preparing Microsoft session…" showPendingBanner={false}>
        <LoadingState rows={6} label="Loading session…" />
      </ModuleScaffold>
    );
  }

  if (!account) {
    return (
      <ModuleScaffold title="Client" subtitle="Sign in required" showPendingBanner={false}>
        <EmptyState
          title="Sign in required"
          description="Client operations requires a Microsoft session. This is not a missing client and not a Hub error."
          actions={
            <Button appearance="primary" onClick={() => void signIn()}>
              Sign in with Microsoft
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  if (codeRejected && !busy) {
    return (
      <ModuleScaffold title="Client" subtitle="Client 360 deferred" showPendingBanner={false}>
        <AtlasCard title="Client 360 mapping is deferred">
          <Text>
            This route only opens canonical HVCG_Clients.ClientCode values. Client 360 identifiers are not
            mapped. Fail-closed — the Clients directory is not blocked.
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            GCC financial intelligence stays on GCC. It is not substituted here.
          </Caption1>
          <Link to="/clients">
            <Button appearance="primary" style={{ marginTop: 12 }}>
              Back to SharePoint clients
            </Button>
          </Link>
        </AtlasCard>
      </ModuleScaffold>
    );
  }

  if (unauthorized && !workspace) {
    return (
      <ModuleScaffold
        title="Authenticated access required"
        subtitle={
          auth.bootstrapStatus === 'interaction_required'
            ? 'Hub API authorization required'
            : 'Integration Hub rejected the request (401)'
        }
        showPendingBanner={false}
      >
        <AccessDeniedState
          title="Authenticated access required"
          description={
            unauthorized ||
            'Hub returned 401. Client workspace is not shown. This is not an empty client record.'
          }
          actions={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {auth.bootstrapStatus === 'interaction_required' ? (
                <Button appearance="primary" onClick={() => void auth.authorizeHub()}>
                  Authorize Atlas Integration Hub
                </Button>
              ) : (
                <Button appearance="primary" onClick={() => void refresh()}>
                  Retry
                </Button>
              )}
              {backToClients}
            </div>
          }
        />
      </ModuleScaffold>
    );
  }

  if (forbidden && !workspace) {
    return (
      <ModuleScaffold title="Access denied" subtitle="403" showPendingBanner={false}>
        <AccessDeniedState
          title="Access denied"
          description={
            forbidden ||
            'You are signed in but not entitled to this ClientCode. Client workspace is not shown.'
          }
          actions={backToClients}
        />
      </ModuleScaffold>
    );
  }

  if (error && !workspace && !busy) {
    return (
      <ModuleScaffold title="Client" subtitle={workspaceErrorSubtitle(error)} showPendingBanner={false}>
        <ErrorState
          title="Client workspace unavailable"
          description={error}
          actions={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button appearance="primary" onClick={() => void refresh()}>
                Retry
              </Button>
              {backToClients}
            </div>
          }
        />
      </ModuleScaffold>
    );
  }

  if (!workspace) {
    if (busy) {
      return (
        <ModuleScaffold title="Client" subtitle="Loading Hub workspace…" showPendingBanner={false}>
          <LoadingState rows={6} label="Loading client workspace…" />
        </ModuleScaffold>
      );
    }
    return (
      <ModuleScaffold title="Client" subtitle="Sign in required" showPendingBanner={false}>
        <EmptyState
          title="No client workspace returned"
          description="Hub responded without a workspace for this ClientCode. This is not a 401 and not a Client 360 record."
          actions={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button appearance="primary" onClick={() => void refresh()}>
                Retry
              </Button>
              {backToClients}
            </div>
          }
        />
      </ModuleScaffold>
    );
  }

  const title = overview?.displayName || workspace.client.displayName || 'Client';
  const libraryUrl = overview?.sharePointLibraryUrl;
  const identityBits = [
    overview?.clientCode || clientId,
    overview?.dba ? `DBA ${overview.dba}` : null,
    overview?.industry || null,
    overview?.engagementType || null,
    overview?.sourceOrg || null,
  ].filter(Boolean);
  const stageChip = atlasStatusDisplay(overview?.clientStage);
  const healthChip = atlasStatusDisplay(overview?.overallHealth);
  const primaryNext =
    nextActions[0]?.text ||
    projects.map((p) => displayNextAction(p.nextAction)).find((t) => t && t !== 'Next action required') ||
    (projects.length ? ATLAS_STATUS.needsAction : 'No evidenced next action on this workspace.');

  return (
    <ModuleScaffold
      title={title}
      subtitle={`${overview?.clientCode || clientId} · ${workspace.writePolicy === 'read_only' ? 'read-only operator record' : 'operator record'}${workspace.liveClientPilot?.operatingPosture ? ` · ${workspace.liveClientPilot.operatingPosture.replace(/_/g, ' ')}` : ''}`}
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
          {libraryUrl ? (
            <Button
              appearance="secondary"
              icon={<OpenRegular />}
              onClick={() => window.open(libraryUrl, '_blank', 'noopener,noreferrer')}
            >
              Open client library
            </Button>
          ) : null}
          {capitalLinked ? (
            <Link to="/capital">
              <Button appearance="secondary">Capital desk</Button>
            </Link>
          ) : null}
          {backToClients}
        </div>
      }
    >
      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Refresh failed</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {busy ? <Spinner size="tiny" label="Refreshing…" /> : null}

      <AtlasCard
        title="Client record"
        subtitle="Hub workspace — not Client 360. GCC financial dashboards stay in GCC; recorded value signals appear below."
      >
        <RecordRow label="What is this">
          <Text weight="semibold">{title}</Text>
          <Caption1 style={{ display: 'block' }}>{identityBits.join(' · ')}</Caption1>
          {overview?.website ? (
            <Caption1 style={{ display: 'block' }}>
              <a href={overview.website} target="_blank" rel="noreferrer">
                {overview.website}
              </a>
            </Caption1>
          ) : null}
          {overview?.lastMeaningfulContact ? (
            <Caption1 style={{ display: 'block' }}>
              Last contact {dayStamp(overview.lastMeaningfulContact) || overview.lastMeaningfulContact}
            </Caption1>
          ) : (
            <Caption1 style={{ display: 'block' }}>Last contact not recorded on HVCG_Clients.</Caption1>
          )}
          <Caption1 style={{ display: 'block', marginTop: 4 }}>{contactsHonesty.sentence}</Caption1>
        </RecordRow>
      </AtlasCard>

      <CommercialContextPanel
        context={commercial}
        error={commercialError}
        pilot={workspace.liveClientPilot || commercial?.liveClientPilot}
      />

      <AtlasCard title="State" subtitle="Recorded Hub workspace only">

        <RecordRow label="State">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {stageChip ? (
              <StatusChip label={stageChip.label} tone={stageChip.tone} />
            ) : overview?.clientStage ? (
              <StatusChip label={overview.clientStage} tone="info" />
            ) : (
              <Caption1>Stage not recorded</Caption1>
            )}
            {healthChip ? (
              <StatusChip label={healthChip.label} tone={healthChip.tone} />
            ) : overview?.overallHealth && overview.overallHealth !== 'unknown' ? (
              <StatusChip
                label={overview.overallHealth}
                tone={overview.overallHealth === 'healthy' ? 'success' : 'neutral'}
              />
            ) : (
              <Caption1>Health not assessed</Caption1>
            )}
            <StatusChip label={`${projects.length} projects`} tone="gold" />
            <StatusChip label={`${tasks.length} open tasks`} tone="info" />
            <StatusChip
              label={engagementsChipLabel(engagementsHonesty.kind)}
              tone={engagementsHonesty.kind === 'indexed' ? 'info' : 'neutral'}
            />
            <StatusChip
              label={deliverablesChipLabel(deliverablesHonesty.kind)}
              tone={deliverablesHonesty.kind === 'indexed' ? 'info' : 'neutral'}
            />
            <StatusChip
              label={decisionsRisksChipLabel(decisionsRisksHonesty.kind)}
              tone={decisionsRisksHonesty.kind === 'indexed' ? 'warning' : 'neutral'}
            />
            <StatusChip label={`${workspace.timeline.length} timeline`} tone="gold" />
          </div>
        </RecordRow>

        <RecordRow label="Next">
          {nextActions.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {nextActions.map((a, i) => {
                const ev = a.evidence[0];
                const path = ev ? evidencePath(ev, tasks) : null;
                return (
                  <li key={`${a.text}-${i}`}>
                    {path ? <Link to={path}>{a.text}</Link> : <Text size={300}>{a.text}</Text>}
                    {ev ? (
                      <Caption1 style={{ display: 'block' }}>
                        {ev.source}
                        {ev.field ? ` · ${ev.field}` : ''}
                      </Caption1>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Text>{primaryNext}</Text>
          )}
        </RecordRow>

        <RecordRow label="Owner">
          {ownerNames.length ? (
            <>
              <Text weight="semibold">{ownerNames.join(', ')}</Text>
              <Caption1 style={{ display: 'block' }}>
                Derived from entitled HVCG_Projects on this ClientCode. HVCG_Clients has no owner field
                on this payload.
              </Caption1>
            </>
          ) : (
            <Caption1>No project owner on entitled HVCG_Projects for this client.</Caption1>
          )}
        </RecordRow>

        <RecordRow label="Blocker">
          {blockers.length === 0 ? (
            <Caption1>No blocked or overdue Hub tasks on this client.</Caption1>
          ) : (
            <div>
              {blockers.map((t) => {
                const path = taskWorkPath(t);
                const chip = taskStatusLabel(t);
                return (
                  <div key={t.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
                    <StatusChip label={chip.label} tone={chip.tone} />
                    <Link to={path}>{t.title}</Link>
                    {t.blocker ? <Caption1>{t.blocker}</Caption1> : null}
                  </div>
                );
              })}
            </div>
          )}
        </RecordRow>

        <RecordRow label="Related work">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {projects.length === 0 ? (
              <Caption1>No entitled projects on this ClientCode.</Caption1>
            ) : (
              <>
                {projects.slice(0, 6).map((p) => {
                  const path = projectDetailPath(p.id);
                  return path ? (
                    <Link key={p.id} to={path}>
                      {p.name}
                    </Link>
                  ) : (
                    <Caption1 key={p.id}>{p.name}</Caption1>
                  );
                })}
                {projects.length > 6 ? <Caption1>+{projects.length - 6} more</Caption1> : null}
              </>
            )}
          </div>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Documents: {sectionHonesty(workspace.documents)} · Communications:{' '}
            {sectionHonesty(workspace.communications)}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>{tasksHonesty.sentence}</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>{contactsHonesty.sentence}</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>{meetingsHonesty.sentence}</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>{engagementsHonesty.sentence}</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>{deliverablesHonesty.sentence}</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>{decisionsRisksHonesty.sentence}</Caption1>
          {capitalLinked ? (
            <Caption1 style={{ display: 'block' }}>
              Capital engagement is already on this payload — open the Capital desk, not GCC.
            </Caption1>
          ) : null}
        </RecordRow>

        <RecordRow label="What requires me">
          {requiresMe.tasks.length === 0 && requiresMe.projects.length === 0 ? (
            <Caption1>Nothing on this Hub workspace currently requires you.</Caption1>
          ) : (
            <div>
              {requiresMe.tasks.map((t) => {
                const chip = taskStatusLabel(t);
                const ownerChip = needsOwnerTask(t)
                  ? atlasStatusDisplay(t.status) || { label: ATLAS_STATUS.decisionRequired, tone: 'warning' as const }
                  : chip;
                return (
                  <div key={t.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
                    <StatusChip label={ownerChip.label} tone={ownerChip.tone} />
                    <Link to={taskWorkPath(t)}>{t.title}</Link>
                  </div>
                );
              })}
              {requiresMe.projects
                .filter((p) => !requiresMe.tasks.some((t) => t.projectId === p.id))
                .map((p) => {
                  const path = projectDetailPath(p.id);
                  const label = isBootstrapNextAction(p.nextAction)
                    ? ATLAS_STATUS.needsAction
                    : atlasStatusDisplay(p.health)?.label || p.health;
                  return (
                    <div key={p.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
                      <StatusChip
                        label={label}
                        tone={atlasStatusDisplay(label)?.tone || 'warning'}
                      />
                      {path ? <Link to={path}>{p.name}</Link> : <Text>{p.name}</Text>}
                    </div>
                  );
                })}
            </div>
          )}
        </RecordRow>
      </AtlasCard>

      <AtlasCard title="Related projects" subtitle="Deep-link to the project record">
        {workspace.writePolicy === 'read_only' ? (
          <Caption1 style={{ display: 'block', marginBottom: 12 }}>
            This ClientCode is read-only on Hub. Create is hidden until an approved write window exists.
          </Caption1>
        ) : (
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
                ClientCode: clientId,
                clientCode: clientId,
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
        )}
        {projects.length === 0 ? (
          <EmptyState
            title="No projects for this client"
            description="Queried HVCG_Projects returned no entitled rows. Create a project to track next actions."
          />
        ) : (
          <DataTable
            ariaLabel="Client projects"
            getRowKey={(r: PmProject) => r.id}
            rows={projects}
            columns={[
              {
                key: 'name',
                header: 'Project',
                sticky: 'left',
                render: (r) => {
                  const path = projectDetailPath(r.id);
                  return path ? <Link to={path}>{r.name}</Link> : r.name;
                },
              },
              { key: 'owner', header: 'Owner', render: (r) => r.ownerName || '—' },
              {
                key: 'status',
                header: 'Status',
                render: (r) => <StatusOrDash raw={r.status} />,
              },
              {
                key: 'health',
                header: 'Health',
                render: (r) => {
                  if (r.health === 'healthy') return <StatusChip label="healthy" tone="success" />;
                  return <StatusOrDash raw={r.health === 'healthy' ? undefined : r.health} />;
                },
              },
              {
                key: 'next',
                header: 'Next action',
                render: (r) =>
                  isBootstrapNextAction(r.nextAction) ? ATLAS_STATUS.needsAction : displayNextAction(r.nextAction),
              },
            ]}
          />
        )}
      </AtlasCard>

      <AtlasCard
        title="Related tasks"
        subtitle="Open HVCG_Tasks on this ClientCode — the Hub payload. Read-only titles, plus status or due when the row already has them."
        headerAction={
          <StatusChip
            label={
              tasksHonesty.kind === 'indexed'
                ? 'tasks=INDEXED'
                : tasksHonesty.kind === 'missing'
                  ? 'tasks=MISSING'
                  : tasksHonesty.kind === 'source_unavailable'
                    ? 'tasks=SOURCE_UNAVAILABLE'
                    : 'Not queried'
            }
            tone={tasksHonesty.kind === 'indexed' ? 'info' : 'neutral'}
            size="sm"
          />
        }
      >
        {workspace.writePolicy === 'read_only' ? (
          <Caption1 style={{ display: 'block', marginBottom: 12 }}>
            Task create is hidden for this read-only ClientCode.
          </Caption1>
        ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Input
            placeholder="Task title"
            value={taskTitle}
            onChange={(_, d) => setTaskTitle(d.value)}
            style={{ flex: 1 }}
          />
          <Button
            disabled={!taskTitle.trim() || busy}
            onClick={() =>
              void createPmTask(auth, {
                title: taskTitle,
                clientId,
                clientName: title,
                projectId: projects[0]?.id,
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
        )}
        {tasksHonesty.kind === 'indexed' ? (
          <>
            <Caption1 style={{ display: 'block', marginBottom: 8 }}>{tasksHonesty.sentence}</Caption1>
            {tasksHonesty.slice.map((row) => (
              <div key={row.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
                <Link to={projectDetailPath(row.projectId) || '/tasks'}>{row.title}</Link>
                {row.status ? <Caption1>{row.status}</Caption1> : null}
                {row.dueDate ? <Caption1>{row.dueDate}</Caption1> : null}
              </div>
            ))}
            {tasksHonesty.count > tasksHonesty.slice.length ? (
              <Caption1 style={{ display: 'block', marginTop: 8 }}>
                +{tasksHonesty.count - tasksHonesty.slice.length} more
              </Caption1>
            ) : null}
          </>
        ) : (
          <EmptyState
            title={
              tasksHonesty.kind === 'missing'
                ? 'No entitled open tasks'
                : tasksHonesty.kind === 'source_unavailable'
                  ? 'Tasks source unavailable'
                  : 'Tasks not queried'
            }
            description={tasksHonesty.sentence}
            density="compact"
            align="start"
          />
        )}
      </AtlasCard>

      <AtlasCard
        title="Engagements"
        subtitle="HVCG_Engagements on this ClientCode — the Hub payload. Read-only titles, plus status when the row already has it. EngagementTypePrimary is not this list."
        density="compact"
        headerAction={
          <StatusChip
            label={engagementsChipLabel(engagementsHonesty.kind)}
            tone={engagementsHonesty.kind === 'indexed' ? 'info' : 'neutral'}
            size="sm"
          />
        }
      >
        {engagementsHonesty.kind === 'indexed' ? (
          <>
            <Caption1 style={{ display: 'block', marginBottom: 8 }}>{engagementsHonesty.sentence}</Caption1>
            {engagementsHonesty.slice.map((row) => (
              <div key={row.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
                <Text weight="semibold">{row.title}</Text>
                {row.status ? <Caption1>{row.status}</Caption1> : null}
              </div>
            ))}
            {engagementsHonesty.count > engagementsHonesty.slice.length ? (
              <Caption1 style={{ display: 'block', marginTop: 8 }}>
                +{engagementsHonesty.count - engagementsHonesty.slice.length} more
              </Caption1>
            ) : null}
          </>
        ) : (
          <EmptyState
            title={
              engagementsHonesty.kind === 'missing'
                ? 'No entitled engagements'
                : engagementsHonesty.kind === 'source_unavailable'
                  ? 'Engagements source unavailable'
                  : 'Engagements not queried'
            }
            description={engagementsHonesty.sentence}
            density="compact"
            align="start"
          />
        )}
      </AtlasCard>

      <AtlasCard
        title="Decisions / risks"
        subtitle="HVCG_Decisions and HVCG_Risks on this ClientCode — the Hub payload. Read-only titles, plus status when the row already has it. Owner approvals are not this list."
        density="compact"
        headerAction={
          <StatusChip
            label={decisionsRisksChipLabel(decisionsRisksHonesty.kind)}
            tone={decisionsRisksHonesty.kind === 'indexed' ? 'warning' : 'neutral'}
            size="sm"
          />
        }
      >
        {decisionsRisksHonesty.kind === 'indexed' ? (
          <>
            <Caption1 style={{ display: 'block', marginBottom: 8 }}>{decisionsRisksHonesty.sentence}</Caption1>
            {decisionsRisksHonesty.slice.map((row) => (
              <div key={row.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
                <Text weight="semibold">
                  {row.kind === 'risk' ? 'Risk' : 'Decision'}: {row.title}
                </Text>
                {row.status ? <Caption1>{row.status}</Caption1> : null}
              </div>
            ))}
            {decisionsRisksHonesty.count > decisionsRisksHonesty.slice.length ? (
              <Caption1 style={{ display: 'block', marginTop: 8 }}>
                +{decisionsRisksHonesty.count - decisionsRisksHonesty.slice.length} more
              </Caption1>
            ) : null}
          </>
        ) : decisionsRisksHonesty.kind === 'mixed' ? (
          <>
            <Caption1 style={{ display: 'block', marginBottom: 8 }}>{decisionsRisksHonesty.sentence}</Caption1>
            {decisionsRisksHonesty.slice.map((row) => (
              <div key={row.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
                <Text weight="semibold">
                  {row.kind === 'risk' ? 'Risk' : 'Decision'}: {row.title}
                </Text>
                {row.status ? <Caption1>{row.status}</Caption1> : null}
              </div>
            ))}
          </>
        ) : (
          <EmptyState
            title={
              decisionsRisksHonesty.kind === 'missing'
                ? 'No entitled decisions or risks'
                : decisionsRisksHonesty.kind === 'source_unavailable'
                  ? 'Decisions / risks source unavailable'
                  : 'Decisions / risks not queried'
            }
            description={decisionsRisksHonesty.sentence}
            density="compact"
            align="start"
          />
        )}
      </AtlasCard>

      <AtlasCard
        title="Deliverables"
        subtitle="HVCG_Deliverables on this ClientCode — the Hub payload. Read-only titles, plus status when the row already has it. The document index is not this list."
        density="compact"
        headerAction={
          <StatusChip
            label={deliverablesChipLabel(deliverablesHonesty.kind)}
            tone={deliverablesHonesty.kind === 'indexed' ? 'info' : 'neutral'}
            size="sm"
          />
        }
      >
        {deliverablesHonesty.kind === 'indexed' ? (
          <>
            <Caption1 style={{ display: 'block', marginBottom: 8 }}>{deliverablesHonesty.sentence}</Caption1>
            {deliverablesHonesty.slice.map((row) => (
              <div key={row.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
                <Text weight="semibold">{row.title}</Text>
                {row.status ? <Caption1>{row.status}</Caption1> : null}
              </div>
            ))}
            {deliverablesHonesty.count > deliverablesHonesty.slice.length ? (
              <Caption1 style={{ display: 'block', marginTop: 8 }}>
                +{deliverablesHonesty.count - deliverablesHonesty.slice.length} more
              </Caption1>
            ) : null}
          </>
        ) : (
          <EmptyState
            title={
              deliverablesHonesty.kind === 'missing'
                ? 'No entitled deliverables'
                : deliverablesHonesty.kind === 'source_unavailable'
                  ? 'Deliverables source unavailable'
                  : 'Deliverables not queried'
            }
            description={deliverablesHonesty.sentence}
            density="compact"
            align="start"
          />
        )}
      </AtlasCard>

      <AtlasCard
        title="Contacts"
        subtitle="HVCG_Contacts on this ClientCode — the Hub payload. Read-only. Not proposed contact candidates."
        density="compact"
        headerAction={
          <StatusChip
            label={
              contactsHonesty.kind === 'indexed'
                ? `${contactsHonesty.count} entitled`
                : contactsHonesty.kind === 'missing'
                  ? 'contacts=MISSING'
                  : contactsHonesty.kind === 'source_unavailable'
                    ? 'contacts=SOURCE_UNAVAILABLE'
                    : 'Not queried'
            }
            tone={contactsHonesty.kind === 'indexed' ? 'info' : 'neutral'}
            size="sm"
          />
        }
      >
        {contactsHonesty.kind === 'indexed' ? (
          <>
            {contactsHonesty.slice.map((row) => (
              <div
                key={row.id}
                style={{
                  display: 'grid',
                  gap: 2,
                  padding: '8px 0',
                  borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
                }}
              >
                <Text weight="semibold">{row.title}</Text>
                <Caption1>{row.email ? `<${row.email}>` : 'email not recorded'}</Caption1>
                {row.jobTitle ? <Caption1>{row.jobTitle}</Caption1> : null}
              </div>
            ))}
            {contactsHonesty.count > contactsHonesty.slice.length ? (
              <Caption1 style={{ display: 'block', marginTop: 8 }}>
                +{contactsHonesty.count - contactsHonesty.slice.length} more
              </Caption1>
            ) : null}
          </>
        ) : (
          <EmptyState
            title={
              contactsHonesty.kind === 'missing'
                ? 'No entitled contacts'
                : contactsHonesty.kind === 'source_unavailable'
                  ? 'Contacts source unavailable'
                  : 'Contacts not queried'
            }
            description={contactsHonesty.sentence}
            density="compact"
            align="start"
          />
        )}
      </AtlasCard>

      <AtlasCard
        title="Meetings"
        subtitle="HVCG_Meetings on this ClientCode — the Hub payload, not the timeline. Read-only."
        density="compact"
        headerAction={
          <StatusChip
            label={
              meetingsHonesty.kind === 'indexed'
                ? `${meetingsHonesty.count} entitled`
                : meetingsHonesty.kind === 'missing'
                  ? 'meetings=MISSING'
                  : meetingsHonesty.kind === 'source_unavailable'
                    ? 'meetings=SOURCE_UNAVAILABLE'
                    : 'Not queried'
            }
            tone={meetingsHonesty.kind === 'indexed' ? 'info' : 'neutral'}
            size="sm"
          />
        }
      >
        {meetingsHonesty.kind === 'indexed' ? (
          <>
            {meetingsHonesty.slice.map((row) => (
              <div
                key={row.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
                }}
              >
                <Text weight="semibold">{row.title}</Text>
                <Caption1>{row.date || 'date not recorded'}</Caption1>
              </div>
            ))}
            {meetingsHonesty.count > meetingsHonesty.slice.length ? (
              <Caption1 style={{ display: 'block', marginTop: 8 }}>
                +{meetingsHonesty.count - meetingsHonesty.slice.length} more entitled rows
              </Caption1>
            ) : null}
          </>
        ) : (
          <EmptyState
            title={
              meetingsHonesty.kind === 'missing'
                ? 'No entitled meetings'
                : meetingsHonesty.kind === 'source_unavailable'
                  ? 'Meetings source unavailable'
                  : 'Meetings not queried'
            }
            description={meetingsHonesty.sentence}
            density="compact"
            align="start"
          />
        )}
      </AtlasCard>

      <AtlasCard
        title="Timeline"
        subtitle="Hub workspace timeline — projects, tasks, meetings, communications. Read-only."
        density="compact"
        headerAction={
          <StatusChip
            label={`${workspace.timeline.length} events`}
            tone={workspace.timeline.length ? 'gold' : 'neutral'}
            size="sm"
          />
        }
      >
        {workspace.timeline.length === 0 ? (
          <EmptyState
            title="No timeline events"
            description="Hub workspace timeline is empty for this ClientCode. This is not Client 360 history."
            density="compact"
            align="start"
          />
        ) : (
          workspace.timeline.map((ev) => {
            const chip = timelineKindChip(ev.kind);
            const path = timelineEventPath(ev, tasks);
            return (
              <div
                key={`${ev.kind}-${ev.id}-${ev.at}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <StatusChip label={chip.label} tone={chip.tone} size="sm" />
                    {path ? (
                      <Link to={path}>{ev.title}</Link>
                    ) : (
                      <Text weight="semibold">{ev.title}</Text>
                    )}
                  </div>
                  <Caption1 style={{ display: 'block' }}>{ev.source}</Caption1>
                </div>
                <Caption1>{dayStamp(ev.at) || ev.at || '—'}</Caption1>
              </div>
            );
          })
        )}
      </AtlasCard>

      {workspace.documents.status !== 'SOURCE_UNAVAILABLE' &&
      workspace.documents.queried &&
      workspace.documents.items.length > 0 ? (
        <AtlasCard
          title="Authorized document links"
          subtitle="Opens original SharePoint / OneDrive file — Atlas does not move or delete source files"
          variant="quiet"
        >
          <DataTable
            ariaLabel="Client documents"
            getRowKey={(r) => r.id}
            rows={workspace.documents.items}
            columns={[
              {
                key: 'title',
                header: 'File',
                sticky: 'left',
                render: (r) =>
                  r.webUrl ? (
                    <a href={r.webUrl} target="_blank" rel="noreferrer">
                      {r.title} <OpenRegular />
                    </a>
                  ) : (
                    r.title
                  ),
              },
              { key: 'kind', header: 'Kind', render: (r) => r.kind || '—' },
              { key: 'source', header: 'Source', render: (r) => r.source || '—' },
            ]}
          />
        </AtlasCard>
      ) : (
        <Caption1>{sectionHonesty(workspace.documents)}</Caption1>
      )}

      <AtlasCard title="Client 360" subtitle="Deferred — fail-closed">
        <Text>
          Client 360 mapping to HVCG_Clients.ClientCode is not trusted. Revenue, finance, migration,
          capital package, procurement, risk, and growth Client 360 sections are not rendered from
          invented snapshots. GCC financial dashboards stay on GCC — they are not pulled into this
          operator record.
        </Text>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>
          Operating truth for this client is the Hub workspace above (identity, owners from projects,
          tasks, next actions). Capital opportunities live on the Capital desk when a capital
          engagement is already on the payload.
        </Caption1>
      </AtlasCard>
    </ModuleScaffold>
  );
}
