import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DashboardWidget,
  SparkBars,
  PageLayout,
  ResponsiveGrid,
  GridSpan,
  DataTable,
  StatusChip,
  SourceBadge,
  QuickActionButton,
  LoadingState,
  FilterToolbar,
  SectionHeader,
  AtlasProgress,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Text,
  Caption1,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { loadExecutiveHome, type ExecutiveHomeModel } from '../data/loadExecutiveHome';
import { useWorkspaceContext } from '../state/WorkspaceContext';
import { workspaceCatalog } from '../data/workspaces';
import { reportingPeriods } from '../data/projects';
import { useAtlasRole } from '../security/RoleProvider';

function alertTone(severity: string): 'danger' | 'warning' | 'neutral' | 'success' {
  if (severity === 'Critical' || severity === 'High') return 'danger';
  if (severity === 'Medium') return 'warning';
  return 'neutral';
}

export function ExecutiveDashboardPage() {
  const { account, configured, signIn } = useMicrosoftAuth();
  const { role } = useAtlasRole();
  const { workspaceId, setWorkspaceId, workspaceName, periodId, setPeriodId, periodLabel } =
    useWorkspaceContext();
  const [model, setModel] = useState<ExecutiveHomeModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadExecutiveHome(Boolean(account))
      .then((m) => {
        if (!cancelled) setModel(m);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

  if (loading || !model) {
    return (
      <PageLayout title="Executive Home" subtitle="Connecting to Microsoft Development…">
        <LoadingState rows={6} />
      </PageLayout>
    );
  }

  const {
    metrics,
    approvals,
    activity,
    deadlines,
    pinnedClients,
    alerts,
    initiatives,
    capitalReadiness,
    aiBrief,
    connection,
  } = model;

  const roleLabel = account ? `${role} · signed in` : `${role} · signed out`;

  return (
    <PageLayout
      title="Executive Home"
      subtitle="HVCG command center — calm, low-click, pending-safe financials"
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!account && configured ? (
            <Button appearance="primary" size="small" onClick={() => void signIn()}>
              Sign in with Microsoft
            </Button>
          ) : null}
          <Link to="/tasks">
            <QuickActionButton onClick={() => undefined}>Open tasks</QuickActionButton>
          </Link>
          <Link to="/clients/ws-ccb">
            <Button appearance="secondary" size="small">
              Colorado Craft Beef
            </Button>
          </Link>
          <Link to="/notifications">
            <Button appearance="subtle" size="small">
              Notifications
            </Button>
          </Link>
        </div>
      }
    >
      <FilterToolbar>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 200 }}>
          <Caption1>Organization / client</Caption1>
          <Dropdown
            value={workspaceName}
            selectedOptions={[workspaceId]}
            onOptionSelect={(_, d) => {
              if (d.optionValue) setWorkspaceId(d.optionValue);
            }}
            style={{ minWidth: 220 }}
          >
            {workspaceCatalog.map((w) => (
              <Option key={w.id} value={w.id} text={w.name}>
                {w.name}
              </Option>
            ))}
          </Dropdown>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 180 }}>
          <Caption1>Reporting period</Caption1>
          <Dropdown
            value={periodLabel}
            selectedOptions={[periodId]}
            onOptionSelect={(_, d) => {
              if (d.optionValue) setPeriodId(d.optionValue as typeof periodId);
            }}
            style={{ minWidth: 180 }}
          >
            {reportingPeriods.map((p) => (
              <Option key={p.id} value={p.id} text={p.label}>
                {p.label}
              </Option>
            ))}
          </Dropdown>
        </div>
        <div>
          <Caption1>Last refresh</Caption1>
          <Text weight="semibold" style={{ display: 'block' }}>
            {connection.lastRefresh}
          </Text>
        </div>
        <div>
          <Caption1>Operating status</Caption1>
          <div style={{ marginTop: 4 }}>
            <StatusChip label="On Track" tone="success" />
          </div>
        </div>
        <div>
          <Caption1>Profile</Caption1>
          <Text weight="semibold" style={{ display: 'block' }}>
            {account?.name || 'Manny Barela'} · {roleLabel}
          </Text>
        </div>
        {workspaceId === 'ws-ccb' ? (
          <Link to="/clients/ws-ccb" style={{ marginLeft: 'auto' }}>
            <Button appearance="primary" size="small">
              Open client workspace
            </Button>
          </Link>
        ) : null}
      </FilterToolbar>

      <MessageBar intent={connection.mode === 'dataverse' ? 'success' : 'warning'}>
        <MessageBarBody>
          <MessageBarTitle>
            {connection.mode === 'dataverse' ? 'Dataverse connected' : 'Pending-safe mode'}
          </MessageBarTitle>
          {connection.detail}
          {connection.error ? ` — ${connection.error}` : ''} Context: {workspaceName} · {periodLabel}.
        </MessageBarBody>
      </MessageBar>

      <SectionHeader title="Key performance" subtitle="Values appear only when verified sources connect" />
      <ResponsiveGrid className="atlas-stagger">
        {metrics.map((m) => (
          <AtlasCard key={m.id} variant="glass">
            <DashboardWidget
              label={m.label}
              value={m.value}
              unit={m.unit}
              trend={m.trend}
              trendLabel={m.trendLabel}
              source={m.source}
            >
              <SparkBars values={m.spark} aria-label={`${m.label} trend`} />
            </DashboardWidget>
          </AtlasCard>
        ))}
      </ResponsiveGrid>

      <ResponsiveGrid dense className="atlas-stagger">
        <GridSpan span={2}>
          <AtlasCard title="Executive alerts" subtitle="Prioritized by severity">
            <DataTable
              ariaLabel="Alerts"
              getRowKey={(r) => r.id}
              rows={alerts}
              columns={[
                { key: 'title', header: 'Alert', render: (r) => r.title },
                {
                  key: 'sev',
                  header: 'Severity',
                  render: (r) => <StatusChip label={r.severity} tone={alertTone(r.severity)} />,
                },
                { key: 'cat', header: 'Category', render: (r) => r.category },
              ]}
            />
          </AtlasCard>
        </GridSpan>

        <AtlasCard title="AI Executive Brief" subtitle="Generated recommendations — not verified ledger data">
          <Caption1>{aiBrief.timestampLabel}</Caption1>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <Text weight="semibold">What changed</Text>
            <Text size={300}>{aiBrief.whatChanged}</Text>
            <Text weight="semibold">Requires attention</Text>
            <Text size={300}>{aiBrief.attention}</Text>
            <Text weight="semibold">Recommended actions</Text>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {aiBrief.recommendations.map((r) => (
                <li key={r}>
                  <Text size={300}>{r}</Text>
                </li>
              ))}
            </ul>
            <Text weight="semibold">Material risks</Text>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {aiBrief.risks.map((r) => (
                <li key={r}>
                  <Text size={300}>{r}</Text>
                </li>
              ))}
            </ul>
            <Text weight="semibold">Top opportunities</Text>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {aiBrief.opportunities.map((r) => (
                <li key={r}>
                  <Text size={300}>{r}</Text>
                </li>
              ))}
            </ul>
          </div>
        </AtlasCard>

        <GridSpan span={2}>
          <AtlasCard title="Growth initiatives">
            <DataTable
              ariaLabel="Initiatives"
              getRowKey={(r) => r.id}
              rows={initiatives}
              columns={[
                { key: 'name', header: 'Initiative', render: (r) => r.name },
                {
                  key: 'st',
                  header: 'Status',
                  render: (r) => <StatusChip label={r.status} tone="gold" />,
                },
                { key: 'owner', header: 'Owner', render: (r) => r.owner },
                { key: 'due', header: 'Due', render: (r) => r.due },
                {
                  key: 'pct',
                  header: 'Progress',
                  render: (r) => <AtlasProgress value={r.percentComplete} />,
                },
                { key: 'block', header: 'Blocker', render: (r) => r.blocker },
                { key: 'next', header: 'Next', render: (r) => r.nextAction },
              ]}
            />
          </AtlasCard>
        </GridSpan>

        <AtlasCard title="Capital readiness">
          <div style={{ display: 'grid', gap: 8 }}>
            {capitalReadiness.map((c) => (
              <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Caption1>{c.label}</Caption1>
                <Text size={300}>{c.value}</Text>
              </div>
            ))}
          </div>
        </AtlasCard>

        <AtlasCard title="Upcoming priorities">
          <div style={{ display: 'grid', gap: 10 }}>
            {deadlines.map((d) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <Text weight="semibold">{d.title}</Text>
                  <Caption1>{d.due}</Caption1>
                </div>
                <StatusChip
                  label={d.severity}
                  tone={d.severity === 'High' ? 'danger' : d.severity === 'Medium' ? 'warning' : 'neutral'}
                />
              </div>
            ))}
          </div>
        </AtlasCard>

        <GridSpan span={2}>
          <AtlasCard
            title="Decisions requiring attention"
            subtitle="Owner decision inbox"
            headerAction={
              <Link to="/tasks">
                <Button size="small" appearance="subtle">
                  Action center
                </Button>
              </Link>
            }
          >
            <DataTable
              ariaLabel="Approvals"
              getRowKey={(r) => r.id}
              rows={approvals}
              columns={[
                { key: 'title', header: 'Title', render: (r) => r.title },
                {
                  key: 'risk',
                  header: 'Risk',
                  render: (r) => (
                    <StatusChip
                      label={r.risk}
                      tone={r.risk === 'High' ? 'danger' : r.risk === 'Medium' ? 'warning' : 'success'}
                    />
                  ),
                },
                { key: 'track', header: 'Track', render: (r) => r.track },
                {
                  key: 'source',
                  header: 'Source',
                  render: (r) => <SourceBadge kind={r.source} />,
                },
              ]}
            />
            <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>
              {aiBrief.decisionsAwaiting.map((r) => (
                <li key={r}>
                  <Text size={300}>{r}</Text>
                </li>
              ))}
            </ul>
          </AtlasCard>
        </GridSpan>

        <AtlasCard title="Workspaces" subtitle="HVCG + clients">
          <div style={{ display: 'grid', gap: 10 }}>
            {pinnedClients.map((c) => (
              <Link
                key={c.id}
                to={`/clients/${c.id}`}
                style={{ display: 'flex', justifyContent: 'space-between' }}
                onClick={() => setWorkspaceId(c.id)}
              >
                <Text>{c.name}</Text>
                <StatusChip label={c.status} tone="gold" />
              </Link>
            ))}
          </div>
        </AtlasCard>

        <AtlasCard title="Recent activity">
          <div style={{ display: 'grid', gap: 10 }}>
            {activity.map((a) => (
              <div key={a.id}>
                <Text weight="semibold">{a.title}</Text>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <Caption1>{a.when}</Caption1>
                  <SourceBadge kind={a.source} />
                </div>
              </div>
            ))}
          </div>
        </AtlasCard>
      </ResponsiveGrid>
    </PageLayout>
  );
}
