import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AtlasCard, DataTable, StatusChip, EmptyState } from '@hvcg/atlas-design-system';
import { Button, Caption1, Dropdown, Option, Spinner, Text } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { workspaceCatalog } from '../data/workspaces';
import { fetchPortfolio, type PortfolioProject } from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import type { AtlasHubAuthHeaders } from '../integrations/hub/api';


export function PortfolioPage() {
  const auth = useHubAuth();
  const [rows, setRows] = useState<PortfolioProject[]>([]);
  const [entity, setEntity] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPortfolio(auth);
      setRows(res.portfolio || []);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered =
    entity === 'all' ? rows : rows.filter((r) => String(r.businessEntity) === entity);

  return (
    <ModuleScaffold
      title="Projects Portfolio"
      subtitle="All active work across HVCG and HVS — health, blockers, overdue tasks, next milestones."
      showPendingBanner={false}
      actions={
        <Button appearance="secondary" onClick={() => void refresh()}>
          Refresh
        </Button>
      }
    >
      <AtlasCard>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text weight="semibold">Filter</Text>
          <Dropdown
            value={entity === 'all' ? 'All entities' : entity}
            selectedOptions={[entity]}
            onOptionSelect={(_, d) => setEntity(String(d.optionValue || 'all'))}
          >
            <Option value="all">All entities</Option>
            <Option value="HVCG">HVCG</Option>
            <Option value="HVS">HVS</Option>
          </Dropdown>
          <Caption1>{filtered.length} projects</Caption1>
        </div>
      </AtlasCard>
      {loading ? (
        <Spinner label="Loading portfolio…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Open Daily Command Center and click Initialize from Microsoft + Client 360."
        />
      ) : (
        <DataTable<PortfolioProject>
          columns={[
            {
              key: 'name',
              header: 'Project',
              render: (r) => <Link to={`/projects/${r.id}`}>{r.name}</Link>,
            },
            { key: 'client', header: 'Client', render: (r) => r.clientName || '—' },
            { key: 'owner', header: 'Owner', render: (r) => r.ownerName },
            { key: 'entity', header: 'Entity', render: (r) => r.businessEntity },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <StatusChip tone="info" label={r.status} />,
            },
            {
              key: 'health',
              header: 'Health',
              render: (r) => (
                <StatusChip
                  tone={
                    r.health === 'critical' || r.health === 'at_risk'
                      ? 'danger'
                      : r.health === 'watch'
                        ? 'warning'
                        : 'success'
                  }
                  label={r.health}
                />
              ),
            },
            { key: 'pct', header: '%', render: (r) => `${r.progressPercent}%` },
            { key: 'due', header: 'Target', render: (r) => r.targetCompletionDate || '—' },
            { key: 'overdue', header: 'Overdue', render: (r) => String(r.overdueTaskCount) },
            { key: 'blockers', header: 'Blockers', render: (r) => String(r.blockerCount) },
            { key: 'next', header: 'Next milestone', render: (r) => r.nextMilestone || '—' },
            { key: 'action', header: 'Next action', render: (r) => r.nextAction || '—' },
          ]}
          rows={filtered}
          getRowKey={(r) => r.id}
        />
      )}
    </ModuleScaffold>
  );
}
