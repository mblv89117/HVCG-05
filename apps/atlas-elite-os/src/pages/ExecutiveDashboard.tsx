import { useEffect, useState } from 'react';
import {
  AtlasCard,
  DashboardWidget,
  SparkBars,
  PageLayout,
  ResponsiveGrid,
  GridSpan,
  GlobalAICommandPanel,
  DataTable,
  StatusChip,
  SourceBadge,
  QuickActionButton,
  LoadingState,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { loadExecutiveHome, type ExecutiveHomeModel } from '../data/loadExecutiveHome';

export function ExecutiveDashboardPage() {
  const { account, configured, signIn } = useMicrosoftAuth();
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
      <PageLayout title="Executive Dashboard" subtitle="Connecting to Microsoft Development…">
        <LoadingState rows={6} />
      </PageLayout>
    );
  }

  const { metrics, approvals, activity, deadlines, pinnedClients, aiRecommendations, connection } =
    model;

  return (
    <PageLayout
      title="Executive Dashboard"
      subtitle="Premium UX over HVCG Microsoft Development (Dataverse · Entra · Graph)."
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!account && configured ? (
            <Button appearance="primary" size="small" onClick={() => void signIn()}>
              Sign in with Microsoft
            </Button>
          ) : null}
          {!configured ? (
            <Button appearance="secondary" size="small" disabled>
              Entra SPA registration required
            </Button>
          ) : null}
          <QuickActionButton onClick={() => undefined}>Review approvals</QuickActionButton>
        </div>
      }
    >
      <MessageBar intent={connection.mode === 'dataverse' ? 'success' : 'warning'}>
        <MessageBarBody>
          <MessageBarTitle>
            {connection.mode === 'dataverse' ? 'Dataverse connected' : 'Sample fallback'}
          </MessageBarTitle>
          {connection.detail}
          {connection.error ? ` — ${connection.error}` : ''}
        </MessageBarBody>
      </MessageBar>

      <GlobalAICommandPanel />

      <ResponsiveGrid>
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

      <ResponsiveGrid dense>
        <GridSpan span={2}>
          <AtlasCard title="My Approvals" subtitle="Owner decision inbox" variant="default">
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
          </AtlasCard>
        </GridSpan>

        <AtlasCard title="AI Recommendations" subtitle="Safe Development stubs">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
            {aiRecommendations.map((line) => (
              <li key={line}>
                <Text size={300}>{line}</Text>
              </li>
            ))}
          </ul>
        </AtlasCard>

        <AtlasCard title="Upcoming Deadlines">
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

        <AtlasCard title="Pinned Clients" subtitle="Development sample until CRM client tables wired">
          <div style={{ display: 'grid', gap: 10 }}>
            {pinnedClients.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>{c.name}</Text>
                <StatusChip label={c.status} tone="gold" />
              </div>
            ))}
          </div>
        </AtlasCard>

        <AtlasCard title="Recent Activity">
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
