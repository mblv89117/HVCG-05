import { useCallback, useEffect, useMemo, useState } from 'react';
import { AtlasCard, DataTable, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Spinner, Text } from '@fluentui/react-components';

import {
  fetchOperatorRuntime,
  type AskAtlasActivity,
} from '../integrations/hub/askAtlas';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { ModuleScaffold } from './shared/ModuleScaffold';

function activityRows(activity?: AskAtlasActivity | null) {
  if (!activity) return [];
  const tools = Array.isArray(activity.tools) ? activity.tools.filter((tool) => typeof tool === 'string') : [];
  return [
    {
      id: `${activity.missionKey || activity.agent || 'atlas'}:${activity.timestamp || 'unsigned'}`,
      agent: activity.agent || 'Atlas',
      missionKey: activity.missionKey || '—',
      trigger: activity.trigger || '—',
      timestamp: activity.timestamp || '—',
      classification: activity.classification || '—',
      result: activity.result || '—',
      toolsLabel: tools.join(', ') || '—',
    },
  ];
}

export function AgentActivityPage() {
  const auth = useHubAuth();
  const [activity, setActivity] = useState<AskAtlasActivity | null>(null);
  const [askItemCount, setAskItemCount] = useState(0);
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
      const envelope = await fetchOperatorRuntime(auth);
      const items = Array.isArray(envelope.askAtlas?.items) ? envelope.askAtlas.items : [];
      setActivity(envelope.askAtlas?.activity || null);
      setAskItemCount(items.length);
    } catch (err) {
      setError(String(err));
      setActivity(null);
      setAskItemCount(0);
    } finally {
      setLoading(false);
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
        <Button appearance="secondary" onClick={() => void refresh()}>
          Refresh
        </Button>
      }
    >
      {error ? (
        <AtlasCard title="Access or connection error">
          <Text>{error}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Agent Activity is visible only through the signed Hub operator runtime. Atlas does not invent activity rows.
          </Caption1>
        </AtlasCard>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <AtlasCard title="Ask Atlas items">
          <Text size={700}>{askItemCount}</Text>
          <Caption1 style={{ display: 'block' }}>Ranked attention items in the latest signed runtime picture.</Caption1>
        </AtlasCard>
        <AtlasCard title="Owner-gated external actions">
          <StatusChip label="Blocked by policy" tone="warning" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Agent Activity does not authorize send, lender submission, money movement, signatures, or paid outbound.
          </Caption1>
        </AtlasCard>
      </div>

      {loading ? (
        <Spinner label="Loading agent activity..." />
      ) : rows.length === 0 ? (
        <EmptyState
          title={error ? 'Agent Activity unavailable' : 'No signed agent activity yet'}
          description="Ask Atlas activity appears after the signed operator runtime produces a grounded attention answer. Atlas does not invent work."
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
