import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AtlasCard,
  KpiTile,
  InsightCard,
  PageLayout,
  ResponsiveGrid,
  GridSpan,
  DataTable,
  StatusChip,
  SourceBadge,
  QuickActionButton,
  LoadingState,
  HeroGreeting,
  PriorityList,
  LazyAreaChart,
  LazyBarChart,
  seriesFromSpark,
  FavoritePin,
  SectionRail,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { loadExecutiveHome, type ExecutiveHomeModel } from '../data/loadExecutiveHome';
import { executiveHomeData, pendingHomeMetrics } from '../data/executiveHomeDefaults';
import { sanitizeFinancialDisplay } from '../data/financeGuard';

function pendingModel(): ExecutiveHomeModel {
  return {
    ...executiveHomeData,
    metrics: pendingHomeMetrics.map((m) => ({
      ...m,
      value: sanitizeFinancialDisplay(m.value, 'Awaiting verified data'),
      source: 'Unavailable' as const,
    })),
    aiRecommendations: executiveHomeData.aiBrief.recommendations,
    connection: {
      mode: 'pending-fallback',
      detail: 'Pending-safe fallback — no fabricated financial figures.',
      lastRefresh: new Date().toISOString(),
      reportingPeriod: 'Current month (pending ledger)',
      verificationStatus: 'Awaiting verified data',
      dataSource: 'None — pending verified Dataverse / ledger connection',
    },
  };
}
import { ATLAS_BUILD } from '../buildInfo';
import { ModuleKnowledgeRail, knowledgeUserFromHost } from '../integrations/knowledge';

function alertTone(severity: string): 'danger' | 'warning' | 'neutral' | 'success' {
  if (severity === 'Critical' || severity === 'High') return 'danger';
  if (severity === 'Medium') return 'warning';
  return 'neutral';
}

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function ExecutiveDashboardPage() {
  const { account, configured, signIn } = useMicrosoftAuth();
  const { role } = useAtlasRole();
  const location = useLocation();
  const denseAnalytics = location.pathname.startsWith('/executive');
  const [model, setModel] = useState<ExecutiveHomeModel | null>(() => pendingModel());
  const [loading, setLoading] = useState(true);
  const [pinnedIds, setPinnedIds] = useState<Record<string, boolean>>({ 'ws-ccb': true });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadExecutiveHome(Boolean(account))
      .then((m) => {
        if (!cancelled) setModel(m);
      })
      .catch(async () => {
        if (cancelled) return;
        try {
          const fallback = await loadExecutiveHome(false);
          setModel(fallback);
        } catch {
          /* keep skeleton only if both paths fail */
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

  if (loading && !model) {
    return (
      <PageLayout
        title={denseAnalytics ? 'Executive Dashboard' : 'Executive Command Center'}
        subtitle="Connecting to Microsoft Development…"
      >
        <LoadingState rows={6} />
      </PageLayout>
    );
  }

  if (!model) {
    return (
      <PageLayout title="Executive Command Center" subtitle="Unable to load executive model">
        <LoadingState rows={4} />
      </PageLayout>
    );
  }

  const chartSeries = seriesFromSpark(
    model.metrics[0]?.spark ?? [0, 0, 0, 0, 0, 0, 0],
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  );

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

  const roleLabel = role;
  const knowledgeUser = knowledgeUserFromHost({
    role,
    name: account?.name ?? roleLabel,
    email: account?.username,
    assignedClients: ['CCB'],
    organizationId: 'HVCG',
  });

  const displayName = account?.name?.split(' ')[0] || (role === 'Unauthenticated' ? 'Guest' : String(role));
  const pageTitle = denseAnalytics ? 'Executive Dashboard' : 'Executive Command Center';
  const pageSubtitle = denseAnalytics
    ? 'Presentation-ready KPIs, cash, runway, and capital pipeline'
    : 'Priorities, capital readiness, client health, and AI insights — no fabricated figures.';

  const pendingCharts = !chartSeries.some((p) => p.value !== 0);

  return (
    <PageLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      hideTitle
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!account && configured ? (
            <Button appearance="primary" size="small" onClick={() => void signIn()}>
              Sign in with Microsoft
            </Button>
          ) : null}
          <Link to="/tasks">
            <QuickActionButton onClick={() => undefined}>Today&apos;s priorities</QuickActionButton>
          </Link>
          <Link to="/clients/ws-ccb">
            <Button appearance="secondary" size="small">
              Colorado Craft Beef
            </Button>
          </Link>
          <Link to="/financials">
            <Button appearance="secondary" size="small">
              Financial Intelligence
            </Button>
          </Link>
        </div>
      }
    >
      <div className="atlas-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <HeroGreeting
          greeting={greetingForNow()}
          name={displayName}
          subtitle={pageSubtitle}
          actions={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!account && configured ? (
                <Button appearance="primary" size="small" onClick={() => void signIn()}>
                  Sign in with Microsoft
                </Button>
              ) : null}
              <Link to="/tasks">
                <QuickActionButton onClick={() => undefined}>Today&apos;s priorities</QuickActionButton>
              </Link>
              <Link to="/clients/ws-ccb">
                <Button appearance="secondary" size="small">
                  Colorado Craft Beef
                </Button>
              </Link>
            </div>
          }
        />

        <AtlasCard variant="quiet">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 20,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <Caption1>Organization</Caption1>
              <Text weight="semibold">High Value Capital Group</Text>
            </div>
            <div>
              <Caption1>Reporting period</Caption1>
              <Text weight="semibold">{connection.reportingPeriod}</Text>
            </div>
            <div>
              <Caption1>Last refresh</Caption1>
              <Text weight="semibold">{connection.lastRefresh}</Text>
            </div>
            <div>
              <Caption1>Verification</Caption1>
              <Text weight="semibold">{connection.verificationStatus}</Text>
            </div>
            <div>
              <Caption1>Data source</Caption1>
              <Text weight="semibold" size={200}>
                {connection.dataSource}
              </Text>
            </div>
            <div>
              <Caption1>Build</Caption1>
              <Text weight="semibold">
                {ATLAS_BUILD.shortSha} · {roleLabel}
              </Text>
            </div>
          </div>
        </AtlasCard>

        <MessageBar intent={connection.mode === 'dataverse' ? 'success' : 'warning'}>
          <MessageBarBody>
            <MessageBarTitle>
              {connection.mode === 'dataverse' ? 'Dataverse connected' : 'Pending-safe mode'}
            </MessageBarTitle>
            {connection.detail}
            {connection.error ? ` — ${connection.error}` : ''}
          </MessageBarBody>
        </MessageBar>

        <ResponsiveGrid>
          {metrics.map((m) => (
            <KpiTile
              key={m.id}
              label={m.label}
              value={m.value}
              unit={m.unit}
              trend={m.trend}
              trendLabel={m.trendLabel}
              source={m.source}
              spark={m.spark}
            />
          ))}
        </ResponsiveGrid>

        <ResponsiveGrid dense>
          <GridSpan span={2}>
            <InsightCard
              timestampLabel={aiBrief.timestampLabel}
              whatChanged={aiBrief.whatChanged}
              attention={aiBrief.attention}
              recommendations={aiBrief.recommendations}
              risks={aiBrief.risks}
              opportunities={aiBrief.opportunities}
              decisionsAwaiting={aiBrief.decisionsAwaiting}
            />
          </GridSpan>

          <AtlasCard title="Today's priorities" subtitle="Approvals & deadlines" variant="glass">
            <PriorityList
              items={[
                ...approvals.slice(0, 3).map((a) => ({
                  id: a.id,
                  title: a.title,
                  meta: `${a.track} · ${a.decision}`,
                  tone: (a.risk === 'High' ? 'danger' : a.risk === 'Medium' ? 'warning' : 'success') as
                    | 'danger'
                    | 'warning'
                    | 'success',
                })),
                ...deadlines.slice(0, 2).map((d) => ({
                  id: d.id,
                  title: d.title,
                  meta: d.due,
                  tone: (d.severity === 'High' ? 'danger' : 'warning') as 'danger' | 'warning',
                })),
              ]}
            />
          </AtlasCard>

          <GridSpan span={denseAnalytics ? 2 : 1}>
            <AtlasCard
              title="Revenue & cash signal"
              subtitle="Series from connected metrics only — pending until verified"
              variant="glass"
            >
              <LazyAreaChart
                data={chartSeries}
                pending={pendingCharts}
                ariaLabel="Cash and revenue trend"
                pendingLabel="Verified cash/revenue series not connected. No fabricated chart values are shown."
              />
            </AtlasCard>
          </GridSpan>

          {denseAnalytics ? (
            <>
              <AtlasCard title="Funding pipeline" subtitle="Awaiting verified pipeline amounts" variant="accent">
                <LazyBarChart
                  data={chartSeries}
                  pending={pendingCharts}
                  ariaLabel="Funding pipeline"
                  pendingLabel="Funding pipeline chart awaits verified opportunity amounts."
                />
              </AtlasCard>
              <AtlasCard title="Client health" subtitle="Workspace status — qualitative only" variant="glass">
                <div style={{ display: 'grid', gap: 10 }}>
                  {pinnedClients.map((c) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Text>{c.name}</Text>
                      <StatusChip label={c.status} tone="gold" />
                    </div>
                  ))}
                </div>
                <Caption1 style={{ marginTop: 8 }}>
                  Health scores await verified operational feeds. Status labels are relationship states only.
                </Caption1>
              </AtlasCard>
            </>
          ) : null}

          <GridSpan span={2}>
            <AtlasCard title="Executive alerts" subtitle="Prioritized by severity">
              <DataTable
                ariaLabel="Alerts"
                searchable
                getRowKey={(r) => r.id}
                rows={alerts}
                columns={[
                  {
                    key: 'title',
                    header: 'Alert',
                    sortable: true,
                    pinned: 'left',
                    getSortValue: (r) => r.title,
                    getFilterValue: (r) => r.title,
                    render: (r) => r.title,
                  },
                  {
                    key: 'sev',
                    header: 'Severity',
                    sortable: true,
                    filterable: true,
                    getSortValue: (r) => r.severity,
                    getFilterValue: (r) => r.severity,
                    render: (r) => <StatusChip label={r.severity} tone={alertTone(r.severity)} />,
                  },
                  { key: 'cat', header: 'Category', render: (r) => r.category },
                ]}
              />
            </AtlasCard>
          </GridSpan>

          <AtlasCard title="Capital readiness" variant="accent">
            <div style={{ display: 'grid', gap: 10 }}>
              {capitalReadiness.map((c) => (
                <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Caption1>{c.label}</Caption1>
                  <Text size={300} weight="semibold">
                    {c.value}
                  </Text>
                </div>
              ))}
            </div>
          </AtlasCard>

          <AtlasCard title="Pinned clients" subtitle="Client health & workspace access" variant="glass">
            <div style={{ display: 'grid', gap: 10 }}>
              {pinnedClients.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <Link to={`/clients/${c.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Text weight="semibold">{c.name}</Text>
                    <Caption1>Open workspace</Caption1>
                  </Link>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <StatusChip label={c.status} tone="gold" />
                    <FavoritePin
                      active={Boolean(pinnedIds[c.id])}
                      onToggle={() => setPinnedIds((p) => ({ ...p, [c.id]: !p[c.id] }))}
                      label={`Pin ${c.name}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AtlasCard>

          <GridSpan span={2}>
            <AtlasCard title="Growth initiatives">
              <DataTable
                ariaLabel="Initiatives"
                searchable
                getRowKey={(r) => r.id}
                rows={initiatives}
                columns={[
                  {
                    key: 'name',
                    header: 'Initiative',
                    sortable: true,
                    getSortValue: (r) => r.name,
                    getFilterValue: (r) => r.name,
                    render: (r) => r.name,
                  },
                  {
                    key: 'st',
                    header: 'Status',
                    render: (r) => <StatusChip label={r.status} tone="gold" />,
                  },
                  { key: 'owner', header: 'Owner', render: (r) => r.owner },
                  { key: 'due', header: 'Due', render: (r) => r.due },
                  { key: 'pct', header: '%', sortable: true, getSortValue: (r) => r.percentComplete, render: (r) => `${r.percentComplete}%` },
                  { key: 'block', header: 'Blocker', render: (r) => r.blocker },
                  { key: 'next', header: 'Next', render: (r) => r.nextAction },
                ]}
              />
            </AtlasCard>
          </GridSpan>

          <GridSpan span={2}>
            <AtlasCard title="My Approvals" subtitle="Owner decision inbox">
              <DataTable
                ariaLabel="Approvals"
                searchable
                selectable
                bulkActions={<Button size="small">Bulk review</Button>}
                getRowKey={(r) => r.id}
                rows={approvals}
                columns={[
                  {
                    key: 'title',
                    header: 'Title',
                    sortable: true,
                    getSortValue: (r) => r.title,
                    getFilterValue: (r) => r.title,
                    render: (r) => r.title,
                  },
                  {
                    key: 'risk',
                    header: 'Risk',
                    filterable: true,
                    getFilterValue: (r) => r.risk,
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

          <AtlasCard title="Recent activity">
            <SectionRail title="Latest">
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
            </SectionRail>
          </AtlasCard>

          <AtlasCard title="Upcoming deadlines" variant="glass">
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

          <GridSpan span="full">
            <ModuleKnowledgeRail module="Executive" user={knowledgeUser} title="Executive knowledge context" />
          </GridSpan>
        </ResponsiveGrid>
      </div>
    </PageLayout>
  );
}
