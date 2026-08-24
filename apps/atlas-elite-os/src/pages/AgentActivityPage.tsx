import { useCallback, useEffect, useMemo, useState } from 'react';
import { AtlasCard, DataTable, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Spinner, Text } from '@fluentui/react-components';

import { fetchOperatorDesk, runFabricSync, type OperatorDeskActivity } from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { ModuleScaffold } from './shared/ModuleScaffold';

function activityRows(activity?: OperatorDeskActivity | null) {
  return activity
    ? [
        {
          id: `${activity.missionKey}:${activity.timestamp}`,
          ...activity,
          toolsLabel: activity.tools.join(', '),
        },
      ]
    : [];
}

export function AgentActivityPage() {
  const auth = useHubAuth();
  const [activity, setActivity] = useState<OperatorDeskActivity | null>(null);
  const [askItemCount, setAskItemCount] = useState(0);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    indexed: { mailThreads: number; meetings: number; contacts: number; files: number; skipped: number; restricted: number };
    notes: string[];
    checkpoint: { mailMode?: string; mailDeltaReady?: boolean; lastRunAt?: string; counts?: Record<string, number> };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setLoading(false);
      setError('Microsoft sign-in required (Bearer token missing)');
      setActivity(null);
      setAskItemCount(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOperatorDesk(auth);
      setActivity(res.operatorDesk.askAtlas?.activity || null);
      setAskItemCount(res.operatorDesk.askAtlas?.items?.length || 0);
    } catch (err) {
      setError(String(err));
      setActivity(null);
      setAskItemCount(0);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const runSync = useCallback(async () => {
    if (!auth.hasBearer) {
      setError('Microsoft sign-in required (Bearer token missing)');
      return;
    }
    setSyncBusy(true);
    setError(null);
    try {
      const res = await runFabricSync(auth);
      setSyncResult(res.fabric);
    } catch (err) {
      setError(String(err));
      setSyncResult(null);
    } finally {
      setSyncBusy(false);
    }
  }, [auth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rows = useMemo(() => activityRows(activity), [activity]);

  return (
    <ModuleScaffold
      title="Agent Activity"
      subtitle="Signed Atlas activity, tool use, and Ask Atlas outcomes. External owner-gated actions remain blocked."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button appearance="primary" disabled={syncBusy} onClick={() => void runSync()}>
            {syncBusy ? 'Running M365 sync...' : 'Run M365 sync'}
          </Button>
          <Button appearance="secondary" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
      }
    >
      {error ? (
        <AtlasCard title="Access or connection error">
          <Text>{error}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Agent Activity is visible only through the signed Hub operator contract.
          </Caption1>
        </AtlasCard>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <AtlasCard title="Ask Atlas items">
          <Text size={700}>{askItemCount}</Text>
          <Caption1 style={{ display: 'block' }}>Ranked attention items in the latest operator picture.</Caption1>
        </AtlasCard>
        <AtlasCard title="Owner-gated external actions">
          <StatusChip label="Blocked by policy" tone="warning" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Agent Activity does not authorize send, lender submission, money movement, signatures, or paid outbound.
          </Caption1>
        </AtlasCard>
      </div>

      {syncResult ? (
        <AtlasCard title="M365 sync checkpoint">
          <Text>
            Mail {syncResult.indexed.mailThreads} · meetings {syncResult.indexed.meetings} · contacts{' '}
            {syncResult.indexed.contacts} · files {syncResult.indexed.files} · skipped{' '}
            {syncResult.indexed.skipped} · restricted {syncResult.indexed.restricted}
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Mail mode {syncResult.checkpoint.mailMode || 'unknown'} · delta ready{' '}
            {syncResult.checkpoint.mailDeltaReady ? 'yes' : 'no'} · last run{' '}
            {syncResult.checkpoint.lastRunAt || 'not recorded'}
          </Caption1>
          {syncResult.notes.length ? (
            <ul>
              {syncResult.notes.slice(0, 5).map((note) => (
                <li key={note}>
                  <Caption1>{note}</Caption1>
                </li>
              ))}
            </ul>
          ) : null}
        </AtlasCard>
      ) : null}

      {loading ? (
        <Spinner label="Loading agent activity..." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No signed agent activity yet"
          description="Ask Atlas activity appears after the operator desk produces a grounded attention answer."
        />
      ) : (
        <DataTable
          ariaLabel="Agent activity"
          rows={rows}
          getRowKey={(row) => row.id}
          columns={[
            { key: 'agent', header: 'Agent', render: (row) => row.agent },
            { key: 'mission', header: 'Mission', render: (row) => row.missionKey },
            { key: 'trigger', header: 'Trigger', render: (row) => row.trigger },
            { key: 'classification', header: 'Classification', render: (row) => row.classification },
            { key: 'result', header: 'Result', render: (row) => <StatusChip label={row.result} tone="info" /> },
            { key: 'tools', header: 'Tools', render: (row) => row.toolsLabel },
            { key: 'timestamp', header: 'Timestamp', render: (row) => row.timestamp },
          ]}
        />
      )}
    </ModuleScaffold>
  );
}
