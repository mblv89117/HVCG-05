import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AtlasCard,
  KpiTile,
  InsightCard,
  SectionRail,
  PageLayout,
  ResponsiveGrid,
  GridSpan,
  DataTable,
  StatusChip,
  SourceBadge,
  QuickActionButton,
  LoadingState,
  SparkBars,
  FavoritePin,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { loadExecutiveHome, type ExecutiveHomeModel } from '../data/loadExecutiveHome';
import { ATLAS_BUILD } from '../buildInfo';
import { ModuleKnowledgeRail, knowledgeUserFromHost } from '../integrations/knowledge';

function alertTone(severity: string): 'danger' | 'warning' | 'neutral' | 'success' {
  if (severity === 'Critical' || severity === 'High') return 'danger';
  if (severity === 'Medium') return 'warning';
  return 'neutral';
}

export function ExecutiveDashboardPage() {
  const { account, configured, signIn } = useMicrosoftAuth();
  const { role } = useAtlasRole();
  const location = useLocation();
  const denseAnalytics = location.pathname.startsWith('/executive');
  const [model, setModel] = useState<ExecutiveHomeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinnedIds, setPinnedIds] = useState<Record<string, boolean>>({ 'ws-ccb': true });

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
      <PageLayout
        title={denseAnalytics ? 'Executive Dashboard' : 'Executive Home'}
        subtitle="Connecting to Microsoft Development…"
      >
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
    cfoOperatingSummary,
    growthOperatingSummary,
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

  const pageTitle = denseAnalytics ? 'Executive Dashboard' : 'Executive Home';
  const pageSubtitle = denseAnalytics
    ? 'Presentation-ready KPIs, cash, runway, and capital pipeline'
    : 'Enterprise command center — priorities, capital readiness, and AI insights';

  return (
    <PageLayout
      title={pageTitle}
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
          <Link to="/financials">
            <Button appearance="secondary" size="small">
              Financial Intelligence
            </Button>
          </Link>
        </div>
      }
    >
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

      <SectionRail title="Executive KPIs" subtitle="Enterprise value, cash, growth, and capital readiness">
        <ResponsiveGrid className="atlas-stagger">
          {metrics.map((m) => (
            <KpiTile
              key={m.id}
              label={m.label}
              value={m.value}
              unit={m.unit}
              trend={m.trend}
              trendLabel={m.trendLabel}
              sparkValues={m.spark}
              footer={
                <Caption1>
                  {m.source === 'Live' ? 'Live' : 'Pending'} · <SourceBadge kind={m.source} />
                </Caption1>
              }
            />
          ))}
        </ResponsiveGrid>
      </SectionRail>

      <ResponsiveGrid dense>
        <GridSpan span={2}>
          <InsightCard
            title="AI Executive Brief"
            body={`${aiBrief.whatChanged} ${aiBrief.attention}`}
            actions={
              <div style={{ display: 'grid', gap: 10, width: '100%' }}>
                <Caption1>{aiBrief.timestampLabel}</Caption1>
                <div>
                  <Text weight="semibold" size={300}>
                    Recommended actions
                  </Text>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    {aiBrief.recommendations.map((r) => (
                      <li key={r}>
                        <Text size={300}>{r}</Text>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to="/tasks">
                    <Button size="small" appearance="primary">
                      Open approvals
                    </Button>
                  </Link>
                  <Link to="/capital">
                    <Button size="small" appearance="secondary">
                      Capital roadmap
                    </Button>
                  </Link>
                </div>
              </div>
            }
          />
        </GridSpan>

        <AtlasCard title="Business health" subtitle="Capital readiness snapshot" variant="accent">
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

        <AtlasCard title="CFO operating summary" subtitle="Canonical Finance outputs · no fabricated live balances">
          <div style={{ display: 'grid', gap: 10 }}>
            {cfoOperatingSummary.map((c) => (
              <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Caption1>{c.label}</Caption1>
                <Text size={300} weight="semibold">
                  {c.value}
                </Text>
              </div>
            ))}
          </div>
          <Caption1 style={{ display: 'block', marginTop: 10 }}>
            Consumes Fractional CFO / Finance workbench — does not recalculate. PENDING_LIVE_SOURCE until adapters authorized.
          </Caption1>
        </AtlasCard>

        <AtlasCard title="Growth operating summary" subtitle="Approved Growth outputs · domain SoRs preserved">
          <div style={{ display: 'grid', gap: 10 }}>
            {growthOperatingSummary.map((c) => (
              <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Caption1>{c.label}</Caption1>
                <Text size={300} weight="semibold">
                  {c.value}
                </Text>
              </div>
            ))}
          </div>
          <Caption1 style={{ display: 'block', marginTop: 10 }}>
            Consumes Growth OS — does not duplicate Revenue/CFO/Capital/Procurement/Risk calculations.
          </Caption1>
        </AtlasCard>

        <AtlasCard title="HVCG revenue truth" subtitle="Pipeline ≠ Proposed ≠ Contracted ≠ Invoiced ≠ Collected">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Pipeline', 'Pending verified source'],
              ['Contracted', 'Engagement economics'],
              ['Invoiced', 'HVCG invoices'],
              ['Collected', 'Verified payments only'],
              ['Referral payables', 'Approved ≠ Paid'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Caption1>{k}</Caption1>
                <Text size={300}>{v}</Text>
              </div>
            ))}
          </div>
          <Caption1 style={{ display: 'block', marginTop: 10 }}>
            Development labels — fixture totals are never presented as live HVCG financials.
          </Caption1>
        </AtlasCard>

        <AtlasCard title="Today's priorities" subtitle="Upcoming deadlines">
          <div style={{ display: 'grid', gap: 12 }}>
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

        <AtlasCard title="Pinned clients" subtitle="Quick workspace access">
          <div style={{ display: 'grid', gap: 10 }}>
            {pinnedClients.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FavoritePin
                  active={Boolean(pinnedIds[c.id])}
                  onToggle={() => setPinnedIds((p) => ({ ...p, [c.id]: !p[c.id] }))}
                  label={`Pin ${c.name}`}
                />
                <Link
                  to={`/clients/${c.id}`}
                  style={{ display: 'flex', flex: 1, justifyContent: 'space-between', textDecoration: 'none' }}
                >
                  <Text>{c.name}</Text>
                  <StatusChip label={c.status} tone="gold" />
                </Link>
              </div>
            ))}
          </div>
        </AtlasCard>

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

        {denseAnalytics ? (
          <GridSpan span="full">
            <AtlasCard title="Cash & growth trends" subtitle="Spark series from verified home metrics">
              <ResponsiveGrid>
                {metrics.slice(0, 4).map((m) => (
                  <div key={`spark-${m.id}`}>
                    <Caption1>{m.label}</Caption1>
                    <Text weight="semibold" size={500}>
                      {m.value}
                      {m.unit ? ` ${m.unit}` : ''}
                    </Text>
                    <SparkBars values={m.spark} tone="emerald" aria-label={`${m.label} chart`} />
                  </div>
                ))}
              </ResponsiveGrid>
            </AtlasCard>
          </GridSpan>
        ) : null}

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
                { key: 'pct', header: '%', render: (r) => `${r.percentComplete}%` },
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

        <AtlasCard title="Quick actions" subtitle="Executive shortcuts">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link to="/documents">
              <Button size="small" appearance="secondary">
                Recent documents
              </Button>
            </Link>
            <Link to="/banking">
              <Button size="small" appearance="secondary">
                Cash position
              </Button>
            </Link>
            <Link to="/ai">
              <Button size="small" appearance="secondary">
                Owner Brief / Ask Atlas
              </Button>
            </Link>
            <Link to="/reports">
              <Button size="small" appearance="secondary">
                Reports
              </Button>
            </Link>
          </div>
          <Caption1 style={{ marginTop: 12 }}>
            Calendar and meeting sync remain Microsoft Graph–gated; use Tasks for dated priorities.
          </Caption1>
        </AtlasCard>

        <GridSpan span="full">
          <ModuleKnowledgeRail module="Executive" user={knowledgeUser} title="Executive knowledge context" />
        </GridSpan>
      </ResponsiveGrid>
    </PageLayout>
  );
}
