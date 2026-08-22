import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AtlasCard, DataTable, StatusChip, EmptyState, LoadingState, ErrorState, AccessDeniedState } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
} from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import {
  fetchCommandCenter,
  patchPmTask,
  HubHttpError,
  type CommandCenter,
  type DeskCommercialContext,
  type PmTask,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { projectDetailPath } from '../routing/projectId';
import { isCanonicalClientCode } from '../security/clientCode';
import { ATLAS_STATUS, atlasStatusDisplay, atlasStatusTone } from '../ui/statusLanguage';
import { CommercialContextPanel } from '../components/CommercialContextPanel';

type CommandCenterWithDeferred = CommandCenter & { deferred?: Record<string, string> };

/** Hub may send extra identity fields on ownerApprovals; typed PmTask omits them. */
type DecisionTask = PmTask & {
  clientId?: string;
  clientCode?: string;
  projectName?: string;
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

function decisionLabel(task: DecisionTask): string {
  if (task.status === 'needs_owner_approval' || task.status === 'needs_review') {
    return ATLAS_STATUS.decisionRequired;
  }
  return atlasChip(task.status).label;
}

function clientPath(task: DecisionTask): string | null {
  const code = String(task.clientCode || task.clientId || '').trim();
  if (!isCanonicalClientCode(code)) return null;
  return `/clients/${encodeURIComponent(code)}`;
}

function clientLabel(task: DecisionTask): string {
  return task.clientName || task.clientCode || task.clientId || '—';
}

function hubStatus(err: unknown): number | undefined {
  if (err instanceof HubHttpError) return err.status;
  return (err as { status?: number }).status;
}

function safeErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

/**
 * /tasks — labeled Decisions in nav. Owner decisions and Hub-classified
 * approvals only. Not a generic task manager. Route stays /tasks.
 */
export function TasksPage() {
  const auth = useHubAuth();
  const [queue, setQueue] = useState<DecisionTask[]>([]);
  const [deferred, setDeferred] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [authFailure, setAuthFailure] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [commercial, setCommercial] = useState<DeskCommercialContext | null>(null);

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setLoading(false);
      setForbidden(false);
      setLoadError(null);
      setAuthFailure('Microsoft sign-in required (Bearer token missing)');
      setQueue([]);
      setCommercial(null);
      return;
    }
    setLoading(true);
    setAuthFailure(null);
    setForbidden(false);
    setLoadError(null);
    try {
      const res = await fetchCommandCenter(auth);
      const cc = res.commandCenter as CommandCenterWithDeferred;
      setDeferred(cc.deferred || {});
      setCommercial(cc.commercialContext || null);
      const approvals = cc.ownerApprovals || [];
      const extra = cc.teamAndAgents?.approvalRequests || [];
      const seen = new Set<string>();
      const merged: DecisionTask[] = [];
      for (const t of [...approvals, ...extra]) {
        if (!t?.id || seen.has(t.id)) continue;
        seen.add(t.id);
        merged.push(t);
      }
      setQueue(merged);
    } catch (err) {
      const status = hubStatus(err);
      setQueue([]);
      setCommercial(null);
      if (status === 401) {
        setAuthFailure(
          safeErrorMessage(err, 'Microsoft sign-in required (Bearer token missing)'),
        );
      } else if (status === 403) {
        setForbidden(true);
      } else {
        setLoadError(safeErrorMessage(err, 'Hub request failed loading owner decisions.'));
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pending = useMemo(
    () => queue.filter((t) => t.status !== 'completed' && t.status !== 'cancelled'),
    [queue],
  );

  const decide = async (task: DecisionTask, status: 'completed' | 'needs_review') => {
    setBusyId(task.id);
    setActionError(null);
    try {
      await patchPmTask(auth, task.id, {
        status,
        ...(task.etag ? { etag: task.etag } : {}),
      });
      await refresh();
    } catch (err) {
      setActionError(safeErrorMessage(err, 'Could not save this decision.'));
    } finally {
      setBusyId(null);
    }
  };

  if (!auth.tokenReady) {
    return (
      <ModuleScaffold title="Decisions" subtitle="Preparing Microsoft session…" showPendingBanner={false}>
        <LoadingState rows={6} label="Acquiring Hub access token…" />
      </ModuleScaffold>
    );
  }

  if (auth.bootstrapStatus === 'interaction_required') {
    return (
      <ModuleScaffold
        title="Decisions"
        subtitle="Integration Hub authorization required"
        showPendingBanner={false}
      >
        <AccessDeniedState
          title="Authorize Atlas Integration Hub"
          description={
            auth.bootstrapMessage ||
            'Your Microsoft session is active, but Atlas still needs a Hub API access token.'
          }
          actions={
            <Button appearance="primary" onClick={() => void auth.authorizeHub()}>
              Authorize Atlas Integration Hub
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  if (!auth.hasBearer || authFailure) {
    return (
      <ModuleScaffold title="Decisions" subtitle="Sign-in required" showPendingBanner={false}>
        <AccessDeniedState
          title="Microsoft sign-in required"
          description={
            authFailure ||
            auth.bootstrapMessage ||
            'Atlas could not acquire an Integration Hub access token. Owner decisions stay on Hub command-center ownerApprovals.'
          }
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  if (forbidden) {
    return (
      <ModuleScaffold title="Decisions" subtitle="403" showPendingBanner={false}>
        <AccessDeniedState
          title="Insufficient authorization"
          description="Authenticated but not authorized for owner decisions."
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  if (loading && queue.length === 0) {
    return (
      <ModuleScaffold title="Decisions" subtitle="Loading owner decisions…" showPendingBanner={false}>
        <LoadingState rows={8} label="Loading owner decisions from Integration Hub…" />
      </ModuleScaffold>
    );
  }

  if (loadError) {
    return (
      <ModuleScaffold title="Decisions" subtitle="Hub request failed" showPendingBanner={false}>
        <ErrorState
          title="Owner decisions are unavailable"
          description={`${loadError} This is not an empty decision queue. Retry after Hub access is restored.`}
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  const decisionsRegisterDeferred = Boolean(deferred.decisions);

  return (
    <ModuleScaffold
      title="Decisions"
      subtitle="Owner decisions and approvals waiting on you. Route /tasks is unchanged."
      showPendingBanner={false}
      actions={
        <Button appearance="secondary" onClick={() => void refresh()} disabled={loading}>
          Refresh
        </Button>
      }
    >
      {actionError ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Decision was not saved</MessageBarTitle>
            {actionError}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <CommercialContextPanel context={commercial} />

      {decisionsRegisterDeferred ? (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>Decisions register is not in MVP</MessageBarTitle>
            Hub deferred the decisions register. This page shows Hub-classified owner approvals from
            command-center ownerApprovals — not a standalone decision ledger and not Dataverse.
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {pending.length === 0 ? (
        <EmptyState
          title="No owner decisions waiting"
          description={
            decisionsRegisterDeferred
              ? 'No Hub-classified owner approvals in your scope. The decisions register is not in the SharePoint production MVP.'
              : 'Hub returned no ownerApprovals. Nothing needs a Manny decision right now.'
          }
        />
      ) : (
        <AtlasCard
          title="Owner approvals"
          subtitle={`${pending.length} Hub-classified items · ${ATLAS_STATUS.decisionRequired}`}
        >
          <DataTable
            ariaLabel="Owner decisions and approvals"
            getRowKey={(r) => r.id}
            rows={pending}
            columns={[
              {
                key: 'what',
                header: 'What',
                sticky: 'left',
                render: (r) => {
                  const path = projectDetailPath(r.projectId);
                  return path ? (
                    <Link to={path} title={r.title}>
                      {r.title}
                    </Link>
                  ) : (
                    <Text weight="semibold">{r.title}</Text>
                  );
                },
              },
              {
                key: 'state',
                header: 'State',
                render: (r) => {
                  const label = decisionLabel(r);
                  return <StatusChip tone={atlasStatusTone(label)} label={label} />;
                },
              },
              {
                key: 'next',
                header: 'Next',
                render: (r) => r.nextAction || '—',
              },
              {
                key: 'owner',
                header: 'Owner',
                render: (r) => r.assigneeName || '—',
              },
              {
                key: 'blocker',
                header: 'Blocker',
                render: (r) =>
                  r.blocker ? (
                    <div>
                      <StatusChip tone={atlasStatusTone(ATLAS_STATUS.blocked)} label={ATLAS_STATUS.blocked} />
                      <Caption1 style={{ display: 'block' }}>{r.blocker}</Caption1>
                    </div>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'related',
                header: 'Related',
                render: (r) => {
                  const projectPath = projectDetailPath(r.projectId);
                  const href = clientPath(r);
                  const name = clientLabel(r);
                  return (
                    <div style={{ display: 'grid', gap: 2 }}>
                      {projectPath ? (
                        <Link to={projectPath}>{r.projectName || 'Project'}</Link>
                      ) : (
                        <Caption1>{r.projectName || 'No project on this record'}</Caption1>
                      )}
                      {href && name !== '—' ? (
                        <Link to={href}>{name}</Link>
                      ) : (
                        <Caption1>{name === '—' ? 'No client on this record' : name}</Caption1>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'requires',
                header: 'Requires me',
                render: () => (
                  <StatusChip
                    tone={atlasStatusTone(ATLAS_STATUS.needsManny)}
                    label={ATLAS_STATUS.needsManny}
                  />
                ),
              },
              {
                key: 'actions',
                header: 'Act',
                render: (r) => (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      appearance="primary"
                      disabled={busyId === r.id}
                      onClick={() => void decide(r, 'completed')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      disabled={busyId === r.id}
                      onClick={() => void decide(r, 'needs_review')}
                    >
                      Return
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Approve maps to Hub task status completed. Return maps to needs_review. Hub has no
            rejected status on this payload.
          </Caption1>
        </AtlasCard>
      )}

      <Text>
        Open a project record from Projects when you need context. This page does not create tasks.
      </Text>
    </ModuleScaffold>
  );
}
