import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AtlasCard, DataTable, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Spinner, Tab, TabList, Text, Title3 } from '@fluentui/react-components';
import {
  fetchWorkflowCenter,
  fetchWorkflowDetail,
  postWorkflowControl,
  type WorkflowDetail,
  type WorkflowSummary,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { WorkflowTemplatesPanel } from './WorkflowTemplatesPanel';

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'FAILED') return 'danger';
  if (status === 'REQUIRES_APPROVAL') return 'warning';
  if (status === 'PAUSED' || status === 'DISABLED') return 'neutral';
  if (status === 'COMPLETE' || status === 'ACTIVE') return 'success';
  return 'info';
}

function formatWhen(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function WorkflowsPage() {
  const auth = useHubAuth();
  const [view, setView] = useState<'workflows' | 'templates'>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [counts, setCounts] = useState({ total: 0, requiresApproval: 0, failed: 0, paused: 0, running: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkflowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [controlBusy, setControlBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    if (!auth.tokenReady || !auth.hasBearer) {
      setLoading(false);
      setError('Microsoft sign-in required (Bearer token missing)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorkflowCenter(auth);
      setWorkflows(res.workflowCenter.workflows);
      setCounts(res.workflowCenter.counts);
    } catch (err) {
      setError(String(err));
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const loadDetail = useCallback(
    async (workflowId: string) => {
      if (!auth.hasBearer) return;
      setDetailLoading(true);
      setError(null);
      try {
        const res = await fetchWorkflowDetail(auth, workflowId);
        setDetail(res.workflowCenter.detail);
        setSelectedId(workflowId);
      } catch (err) {
        setError(String(err));
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [auth],
  );

  const runControl = useCallback(
    async (action: 'pause' | 'resume' | 'disable' | 'retry') => {
      if (!selectedId || !auth.hasBearer) return;
      setControlBusy(true);
      setError(null);
      try {
        await postWorkflowControl(auth, { workflowId: selectedId, action });
        await refreshList();
        await loadDetail(selectedId);
      } catch (err) {
        setError(String(err));
      } finally {
        setControlBusy(false);
      }
    },
    [auth, selectedId, refreshList, loadDetail],
  );

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const rows = useMemo(
    () =>
      workflows.map((w) => ({
        id: w.workflowId,
        ...w,
      })),
    [workflows],
  );

  return (
    <ModuleScaffold
      title="Workflows"
      subtitle="Inspect Atlas automations, approvals, sync jobs, and agent workflows from live runtime evidence — not fixtures."
      showPendingBanner={false}
      actions={
        <Button appearance="secondary" onClick={() => void refreshList()}>
          Refresh
        </Button>
      }
    >
      <TabList
        selectedValue={view}
        onTabSelect={(_, data) => setView(data.value as 'workflows' | 'templates')}
        style={{ marginBottom: 16 }}
      >
        <Tab value="workflows">All workflows</Tab>
        <Tab value="templates">Templates</Tab>
      </TabList>

      {view === 'templates' ? <WorkflowTemplatesPanel /> : null}

      {view === 'workflows' ? (
        <>
      {error ? (
        <AtlasCard title="Connection or access error">
          <Text>{error}</Text>
        </AtlasCard>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <AtlasCard title="Total workflows">
          <Text size={700}>{counts.total}</Text>
        </AtlasCard>
        <AtlasCard title="Requires approval">
          <Text size={700}>{counts.requiresApproval}</Text>
        </AtlasCard>
        <AtlasCard title="Failed">
          <Text size={700}>{counts.failed}</Text>
        </AtlasCard>
        <AtlasCard title="Paused / disabled">
          <Text size={700}>{counts.paused}</Text>
        </AtlasCard>
      </div>

      {loading ? (
        <Spinner label="Loading workflows..." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No workflows in your entitled view"
          description="Workflows appear when Atlas runtime, ledger, or scheduled jobs produce live evidence."
        />
      ) : (
        <DataTable
          ariaLabel="Workflow list"
          rows={rows}
          getRowKey={(row) => row.workflowId}
          columns={[
            {
              key: 'name',
              header: 'Workflow',
              render: (row) => (
                <Button appearance="transparent" onClick={() => void loadDetail(row.workflowId)}>
                  {row.name}
                </Button>
              ),
            },
            { key: 'type', header: 'Type', render: (row) => row.workflowType },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusChip label={row.status} tone={statusTone(row.status)} />,
            },
            { key: 'trigger', header: 'Trigger', render: (row) => row.trigger },
            { key: 'client', header: 'Client', render: (row) => row.clientCode ?? '—' },
            { key: 'lastRun', header: 'Last run', render: (row) => formatWhen(row.lastRunAt) },
            {
              key: 'provenance',
              header: 'Source',
              render: (row) => <Caption1>{row.provenance}</Caption1>,
            },
          ]}
        />
      )}

      {selectedId ? (
        <AtlasCard title="Workflow detail">
          {detailLoading ? (
            <Spinner label="Loading detail..." />
          ) : detail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Title3>{detail.name}</Title3>
                <Caption1>{detail.description}</Caption1>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusChip label={detail.status} tone={statusTone(detail.status)} />
                {detail.approvalRequired ? <StatusChip label="Approval required" tone="warning" /> : null}
                <StatusChip label={detail.provenance} tone="info" />
              </div>

              <Text>
                <strong>Why it exists:</strong> {detail.overview.whyExists}
              </Text>
              <Text>
                <strong>Current step:</strong> {detail.currentExecution?.currentStep ?? detail.currentStep ?? '—'}
              </Text>
              <Text>
                <strong>Next step:</strong> {detail.currentExecution?.nextStep ?? detail.nextStep ?? '—'}
              </Text>
              {detail.failureSummary ? (
                <Text>
                  <strong>Failure:</strong> {detail.failureSummary}
                </Text>
              ) : null}

              {detail.ownerGatedActions.length ? (
                <AtlasCard title="Owner-gated actions">
                  <ul>
                    {detail.ownerGatedActions.map((a) => (
                      <li key={a}>
                        <Caption1>{a}</Caption1>
                      </li>
                    ))}
                  </ul>
                </AtlasCard>
              ) : null}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  appearance="secondary"
                  disabled={controlBusy || detail.status === 'PAUSED'}
                  onClick={() => void runControl('pause')}
                >
                  Pause
                </Button>
                <Button
                  appearance="secondary"
                  disabled={controlBusy || detail.status !== 'PAUSED'}
                  onClick={() => void runControl('resume')}
                >
                  Resume
                </Button>
                <Button appearance="secondary" disabled={controlBusy} onClick={() => void runControl('retry')}>
                  Retry safe failure
                </Button>
                <Button appearance="secondary" disabled={controlBusy} onClick={() => void runControl('disable')}>
                  Disable overlay
                </Button>
                {detail.href ? (
                  <Link to={detail.href}>
                    <Button appearance="primary">Open related context</Button>
                  </Link>
                ) : null}
              </div>

              {detail.activity.length ? (
                <DataTable
                  ariaLabel="Workflow activity"
                  rows={detail.activity}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: 'time', header: 'Time', render: (row) => formatWhen(row.timestamp) },
                    { key: 'kind', header: 'Event', render: (row) => row.kind },
                    { key: 'agent', header: 'Agent', render: (row) => row.agent ?? '—' },
                    { key: 'result', header: 'Result', render: (row) => row.result },
                    { key: 'summary', header: 'Summary', render: (row) => row.summary },
                  ]}
                />
              ) : (
                <Caption1>No ledger activity recorded for this workflow yet.</Caption1>
              )}
            </div>
          ) : (
            <Caption1>Select a workflow to view detail.</Caption1>
          )}
        </AtlasCard>
      ) : null}
        </>
      ) : null}
    </ModuleScaffold>
  );
}
