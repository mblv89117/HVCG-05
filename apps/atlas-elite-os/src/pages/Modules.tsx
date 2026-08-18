import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  ResponsiveGrid,
  GridSpan,
  EmptyState,
  InsightCard,
  KpiTile,
  SectionRail,
  GlobalAICommandPanel,
  FilterToolbar,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1, Input, Tab, TabList } from '@fluentui/react-components';
import { SearchRegular } from '@fluentui/react-icons';
import { ModuleScaffold, FieldGrid } from './shared/ModuleScaffold';
import {
  coloradoCraftBeefWorkspace,
  documentCategories,
  fundingTypes,
  pendingExecutiveKpis,
  pipelineStages,
  portfolioProjects,
  workspaceCatalog,
} from '../data/workspaces';
import { PortfolioPage } from './PortfolioPage';
import { CapitalCommandCenter } from './capital/CapitalCommandCenter';
import { FractionalCfoWorkbench } from './FractionalCfoWorkbench';
import { ProcurementWorkbench } from './ProcurementWorkbench';
import { RiskClaimsWorkbench } from './RiskClaimsWorkbench';
import { GrowthOsWorkbench } from './GrowthOsWorkbench';
import { RevenueTruthWorkbench } from './RevenueTruthWorkbench';
export { TasksPage } from './TasksApprovalsPage';
export { PortfolioPage as ProjectsPage };
export { ClientsPage } from './LiveClientsPage';

export function FinancialsPage() {
  // Sprint 7: Fractional CFO OS extends this surface — no second Finance SPA.
  // Live QBO/Plaid remain PENDING_LIVE_SOURCE; workbench uses Dev fixtures only.
  return <FractionalCfoWorkbench />;
}

export function RevenuePage() {
  // Sprint 12: Revenue Truth extends Revenue OS — no second billing shell.
  return <RevenueTruthWorkbench />;
}

export function ClientsPageDemoCatalog() {
  return (
    <ModuleScaffold
      title="Clients (demo catalog)"
      subtitle="Legacy static workspace catalog — superseded by live Client 360."
      showPendingBanner={false}
    >
      <FilterToolbar>
        <StatusChip label={`${workspaceCatalog.length} workspaces`} tone="info" />
        <Caption1>Open a row to enter the client workspace</Caption1>
      </FilterToolbar>
      <AtlasCard title="Client portfolio" variant="quiet">
        <DataTable
          ariaLabel="Clients"
          getRowKey={(r) => r.id}
          rows={workspaceCatalog}
          columns={[
            {
              key: 'name',
              header: 'Client',
              render: (r) => (
                <Link to={`/clients/${r.id}`} style={{ fontWeight: 600 }}>
                  {r.name}
                </Link>
              ),
            },
            { key: 'status', header: 'Engagement', render: (r) => r.engagementStatus },
            {
              key: 'health',
              header: 'Health',
              render: (r) => <StatusChip label={r.health} tone="success" />,
            },
            { key: 'owner', header: 'Owner', render: (r) => r.relationshipOwner },
            {
              key: 'referral',
              header: 'Referral',
              render: (r) => r.referralSource || '—',
            },
          ]}
        />
      </AtlasCard>
    </ModuleScaffold>
  );
}

export function ClientDetailPage({ workspaceId }: { workspaceId: string }) {
  const [tab, setTab] = useState('overview');
  const ws = workspaceCatalog.find((w) => w.id === workspaceId);
  if (!ws) {
    return (
      <ModuleScaffold title="Client not found" subtitle="Unknown workspace id" showPendingBanner={false}>
        <Link to="/clients">
          <Button appearance="primary">Back to clients</Button>
        </Link>
      </ModuleScaffold>
    );
  }

  const isCcb = ws.id === coloradoCraftBeefWorkspace.id;

  return (
    <ModuleScaffold
      title={`${ws.name} (demo catalog)`}
      subtitle={`DEMO ONLY · not live Client 360 · ${ws.engagementStatus}`}
      showPendingBanner={true}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusChip label="DEMO DATA" tone="warning" />
          <Link to="/clients">
            <Button appearance="primary" size="small">
              Live clients
            </Button>
          </Link>
        </div>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <StatusChip label={ws.health} tone="success" />
        <Caption1>Owner · {ws.relationshipOwner}</Caption1>
        {ws.referralSource ? <Caption1>Referral · {ws.referralSource}</Caption1> : null}
      </div>

      <TabList
        selectedValue={tab}
        onTabSelect={(_, d) => setTab(String(d.value))}
        aria-label="Client workspace sections"
      >
        <Tab value="overview">Overview</Tab>
        <Tab value="funding">Funding</Tab>
        <Tab value="financials">Financials</Tab>
        <Tab value="projects">Projects</Tab>
        <Tab value="documents">Documents</Tab>
        <Tab value="connections">Connections</Tab>
        <Tab value="ai">AI & notes</Tab>
      </TabList>

      {tab === 'overview' ? (
        <ResponsiveGrid dense>
          <GridSpan span={2}>
            <AtlasCard title="Executive summary" subtitle="Relationship facts only" variant="accent">
              <Text>{ws.notes}</Text>
              <ul style={{ marginTop: 12 }}>
                {ws.relationshipHistory.map((h) => (
                  <li key={h}>
                    <Text size={300}>{h}</Text>
                  </li>
                ))}
              </ul>
            </AtlasCard>
          </GridSpan>
          <AtlasCard title="Services">
            {ws.services.map((s) => (
              <div key={s} style={{ marginBottom: 6 }}>
                <StatusChip label={s} tone="gold" />
              </div>
            ))}
          </AtlasCard>
          <AtlasCard title="Health score">
            <StatusChip label={ws.health} tone="success" />
            <Caption1 style={{ display: 'block', marginTop: 8 }}>{ws.relationshipOwner}</Caption1>
          </AtlasCard>
          {isCcb ? (
            <GridSpan span="full">
              <AtlasCard title="Company overview" subtitle="Relationship facts from Owner directive">
                <Text>
                  Colorado Craft Beef is transitioning to HVCG. Original need involved growth capital and
                  additional real estate. Prior financing discussion included non-dilutive and agricultural
                  options.
                </Text>
              </AtlasCard>
            </GridSpan>
          ) : (
            <GridSpan span="full">
              <AtlasCard title="Internal operating focus">
                <Text>
                  Use this workspace for HVCG leadership KPIs, client portfolio oversight, and capital
                  advisory pipeline once verified Dataverse / SharePoint sources are bound.
                </Text>
              </AtlasCard>
            </GridSpan>
          )}
        </ResponsiveGrid>
      ) : null}

      {tab === 'funding' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <AtlasCard title="Funding status" subtitle="Capital readiness">
            <FieldGrid
              fields={
                isCcb
                  ? [
                      { label: 'Readiness score', value: 'Not yet calculated', availability: 'Not yet calculated' },
                      {
                        label: 'Financial-document completion',
                        value: 'Data connection pending',
                        availability: 'Data connection pending',
                      },
                      {
                        label: 'Legal-document completion',
                        value: 'Data connection pending',
                        availability: 'Data connection pending',
                      },
                      {
                        label: 'Lender-package status',
                        value: 'Awaiting verified data',
                        availability: 'Awaiting verified data',
                      },
                      {
                        label: 'Underwriting gaps',
                        value: 'Awaiting verified data',
                        availability: 'Awaiting verified data',
                      },
                      {
                        label: 'Next financing milestone',
                        value: 'Confirm verified financial package intake',
                        availability: 'Repository-derived',
                      },
                    ]
                  : pendingExecutiveKpis.slice(0, 4)
              }
            />
          </AtlasCard>
          <AtlasCard title="Capital roadmap">
            <Text>
              {isCcb
                ? 'Explore non-dilutive and agricultural financing options consistent with prior discussion. Specific facility sizing: Awaiting verified data.'
                : 'Capital roadmap activates when client funding opportunities are bound to Dataverse.'}
            </Text>
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Eligible funding-type catalog includes: {fundingTypes.slice(0, 6).join(', ')}, …
            </Caption1>
          </AtlasCard>
        </div>
      ) : null}

      {tab === 'financials' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <AtlasCard title="Financial overview" subtitle="No fabricated values">
            <FieldGrid fields={pendingExecutiveKpis} />
          </AtlasCard>
          <AtlasCard title="Enterprise value" subtitle="No invented estimates">
            <Text>
              Current estimated value, ranges, and multiples remain Not yet calculated until a formally
              validated valuation process runs on verified inputs.
            </Text>
          </AtlasCard>
        </div>
      ) : null}

      {tab === 'projects' ? (
        <AtlasCard title="Projects & tasks" subtitle="Active initiatives">
          <DataTable
            ariaLabel="Client projects"
            getRowKey={(r) => r.id}
            rows={portfolioProjects.filter((p) => p.workspaceId === ws.id)}
            emptyTitle="No projects in this workspace"
            emptyDescription="Projects appear when bound to this client workspace."
            columns={[
              {
                key: 'name',
                header: 'Project',
                render: (r) => (
                  <Link to={`/projects`} style={{ fontWeight: 600 }}>
                    {r.name}
                  </Link>
                ),
              },
              {
                key: 'st',
                header: 'Status',
                render: (r) => <StatusChip label={r.health} tone="gold" />,
              },
              { key: 'next', header: 'Next', render: (r) => r.nextMilestone },
            ]}
          />
          <div style={{ marginTop: 12 }}>
            <Link to="/tasks">
              <Button size="small" appearance="secondary">
                Open tasks
              </Button>
            </Link>
          </div>
        </AtlasCard>
      ) : null}

      {tab === 'documents' ? (
        <AtlasCard title="Documents" subtitle="Readiness by category">
          <DataTable
            ariaLabel="Client documents"
            getRowKey={(r) => r.category}
            rows={documentCategories.map((c) => ({
              category: c,
              status: 'Awaiting verified data',
            }))}
            columns={[
              { key: 'cat', header: 'Category', render: (r) => r.category },
              {
                key: 'st',
                header: 'Status',
                render: (r) => <StatusChip label={r.status} tone="warning" />,
              },
            ]}
          />
        </AtlasCard>
      ) : null}

      {tab === 'connections' ? (
        <ResponsiveGrid dense>
          <AtlasCard title="Bank connections" subtitle="Plaid lineage">
            <StatusChip label="See Banking module" tone="info" />
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Institution health and verified cash live under Banking for this workspace.
            </Caption1>
            <Link to="/banking">
              <Button size="small" appearance="secondary" style={{ marginTop: 12 }}>
                Open banking
              </Button>
            </Link>
          </AtlasCard>
          <AtlasCard title="Accounting status" subtitle="QuickBooks">
            <StatusChip label="Not connected" tone="warning" />
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              QBO Phase 1 blocked until specialist integration lands.
            </Caption1>
            <Link to="/accounting">
              <Button size="small" appearance="secondary" style={{ marginTop: 12 }}>
                Open accounting
              </Button>
            </Link>
          </AtlasCard>
          <AtlasCard title="Timeline" subtitle="Communication & meetings">
            <Text size={300}>
              Meeting notes and communication history bind to Graph / Dataverse when connectors are
              enabled. Until then, use relationship history on Overview.
            </Text>
          </AtlasCard>
        </ResponsiveGrid>
      ) : null}

      {tab === 'ai' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {isCcb ? (
            <InsightCard
              title="AI recommendations"
              body="Confirm referral continuity with Generational Group (Randy Kamin). Collect verified financial package before any valuation or facility sizing. Prioritize growth-capital + real-estate needs in discovery agenda."
              actions={
                <Link to="/tasks">
                  <Button size="small" appearance="primary">
                    Convert to tasks
                  </Button>
                </Link>
              }
            />
          ) : (
            <InsightCard
              title="AI recommendations"
              body="No client-specific AI brief until verified sources and insight entities are connected for this workspace."
            />
          )}
          <AtlasCard title="Meeting notes & next actions">
            {isCcb ? (
              <ol>
                <li>Open this workspace during the client meeting.</li>
                <li>Walk relationship history and capital-readiness checklist.</li>
                <li>Do not present dollar amounts until verified sources are connected.</li>
                <li>Convert agreed actions into Tasks from the Tasks module.</li>
              </ol>
            ) : (
              <Text>Meeting notes appear when Graph calendar / notes connectors are enabled.</Text>
            )}
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Label: AI-generated recommendations · not verified financial data · reviewer: HVCG Owner
            </Caption1>
          </AtlasCard>
        </div>
      ) : null}
    </ModuleScaffold>
  );
}

export function CapitalPage() {
  return <CapitalCommandCenter />;
}

export function ProcurementPage() {
  return <ProcurementWorkbench />;
}

export function RiskPage() {
  return <RiskClaimsWorkbench />;
}

export function GrowthPage() {
  return <GrowthOsWorkbench />;
}

export function EnterpriseValuePage() {
  return (
    <ModuleScaffold
      title="Enterprise Value"
      subtitle="Estimates labeled preliminary until formally validated."
    >
      <FieldGrid
        fields={[
          {
            label: 'Current estimated value',
            value: 'Not yet calculated — preliminary/indicative only when available',
            availability: 'Not yet calculated',
          },
          { label: 'Valuation range', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
          { label: 'Methodology', value: 'Data connection pending', availability: 'Data connection pending' },
          { label: 'EBITDA multiple', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
          { label: 'Target future value', value: 'Not yet calculated', availability: 'Not yet calculated' },
        ]}
      />
      <AtlasCard title="Disclosure">
        <Text>
          Any future estimate shown in Atlas will be labeled preliminary or indicative unless formally
          validated by an approved valuation process.
        </Text>
      </AtlasCard>
    </ModuleScaffold>
  );
}

export { DocumentsOperatingPage as DocumentsPage } from './DocumentsOperatingPage';
export { DocumentLifecycleWorkbench } from './DocumentLifecycleWorkbench';
import { DocumentLifecycleWorkbench as DocumentLifecycleWorkbenchPage } from './DocumentLifecycleWorkbench';

/** Sprint 13 — Documents hub extends request center + portal Dev over existing operating surfaces. */
export function DocumentsHubPage() {
  return <DocumentLifecycleWorkbenchPage />;
}

export { AiOrchestrationWorkbench as AiInsightsPage } from './AiOrchestrationWorkbench';
export { ExecutiveOwnerSupportWorkbench } from './ExecutiveOwnerSupportWorkbench';
