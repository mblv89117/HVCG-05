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
export { TasksPage } from './TasksApprovalsPage';
export { PortfolioPage as ProjectsPage };
export { ClientsPage } from './LiveClientsPage';

export function FinancialsPage() {
  return (
    <ModuleScaffold
      title="Financial Intelligence"
      subtitle="Bloomberg-meets-Copilot density — forecasting, cash, readiness. Values only when verified."
    >
      <SectionRail title="Executive summary" subtitle="Entity · client · period filters ready">
        <ResponsiveGrid className="atlas-stagger">
          {pendingExecutiveKpis.slice(0, 4).map((f) => (
            <KpiTile key={f.label} label={f.label} value={f.value} trend="flat" trendLabel={f.availability} />
          ))}
        </ResponsiveGrid>
      </SectionRail>

      <ResponsiveGrid dense>
        <GridSpan span={2}>
          <AtlasCard title="Cash analysis & runway" subtitle="No invented balances" variant="accent">
            <FieldGrid
              fields={[
                { label: 'Cash runway', value: 'Not yet calculated', availability: 'Not yet calculated' },
                { label: 'Working-capital trend', value: 'Not yet calculated', availability: 'Not yet calculated' },
                { label: 'AR aging', value: 'Data connection pending', availability: 'Data connection pending' },
                { label: 'AP aging', value: 'Data connection pending', availability: 'Data connection pending' },
              ]}
            />
          </AtlasCard>
        </GridSpan>
        <AtlasCard title="Scenario planning" subtitle="Structure ready">
          <FieldGrid
            fields={[
              { label: 'Base case', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
              { label: 'Upside', value: 'Not yet calculated', availability: 'Not yet calculated' },
              { label: 'Downside', value: 'Not yet calculated', availability: 'Not yet calculated' },
            ]}
          />
        </AtlasCard>
        <GridSpan span={2}>
          <AtlasCard title="Statements & performance">
            <FieldGrid
              fields={[
                { label: 'Monthly revenue', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
                { label: 'Gross margin', value: 'Not yet calculated', availability: 'Not yet calculated' },
                { label: 'Operating expenses', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
                { label: 'EBITDA', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
                { label: 'Debt obligations', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
                { label: 'Budget vs actual', value: 'Data connection pending', availability: 'Data connection pending' },
                { label: 'Rolling forecast', value: 'Not yet calculated', availability: 'Not yet calculated' },
                { label: 'Debt capacity', value: 'Not yet calculated', availability: 'Not yet calculated' },
              ]}
            />
          </AtlasCard>
        </GridSpan>
        <InsightCard
          title="AI executive summary"
          body="Connect verified bank and accounting sources to unlock cash, EBITDA, and funding-readiness narratives. Recommendations will cite source records — never silent overwrites."
          actions={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/banking">
                <Button size="small" appearance="secondary">
                  Banking
                </Button>
              </Link>
              <Link to="/capital">
                <Button size="small" appearance="secondary">
                  Capital readiness
                </Button>
              </Link>
              <Link to="/enterprise-value">
                <Button size="small" appearance="secondary">
                  Enterprise value
                </Button>
              </Link>
            </div>
          }
        />
      </ResponsiveGrid>
    </ModuleScaffold>
  );
}

export function RevenuePage() {
  const stageRows = pipelineStages.map((stage, i) => ({
    id: `stage-${i}`,
    stage,
    count: '—',
    weighted: 'Awaiting verified data',
    availability: 'Awaiting verified data' as const,
  }));

  return (
    <ModuleScaffold
      title="Revenue & Pipeline"
      subtitle="Stages and referral tracking structures. No fabricated pipeline dollars."
    >
      <AtlasCard title="Pipeline stages" subtitle="Standard HVCG engagement stages">
        <DataTable
          ariaLabel="Pipeline stages"
          getRowKey={(r) => r.id}
          rows={stageRows}
          columns={[
            { key: 'stage', header: 'Stage', render: (r) => r.stage },
            { key: 'count', header: 'Opportunities', render: (r) => r.count },
            { key: 'weighted', header: 'Probability-weighted', render: (r) => r.weighted },
            {
              key: 'src',
              header: 'Source',
              render: (r) => <Caption1>{r.availability}</Caption1>,
            },
          ]}
        />
      </AtlasCard>
      <AtlasCard title="Referral partners">
        <Text>
          Generational Group (Randy Kamin) is recorded as the Colorado Craft Beef referral source.
          Opportunity records: Data connection pending.
        </Text>
      </AtlasCard>
    </ModuleScaffold>
  );
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
  return (
    <ModuleScaffold
      title="Capital Advisory"
      subtitle="Financing workspace — funding pipeline, debt capacity, and readiness. Amounts stay pending until verified."
    >
      <AtlasCard title="Funding types supported" variant="accent">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {fundingTypes.map((t) => (
            <StatusChip key={t} label={t} tone="gold" />
          ))}
        </div>
      </AtlasCard>
      <ResponsiveGrid>
        <KpiTile
          label="Active capital opportunities"
          value="—"
          trendLabel="Data connection pending"
          trend="flat"
        />
        <KpiTile
          label="Requested amount (aggregate)"
          value="—"
          trendLabel="Awaiting verified data"
          trend="flat"
        />
        <KpiTile label="Expected fees" value="—" trendLabel="Not yet calculated" trend="flat" />
        <KpiTile label="Funding readiness" value="—" trendLabel="Not yet calculated" trend="flat" />
      </ResponsiveGrid>
      <InsightCard
        title="Growth opportunities"
        body="Capital opportunities and lender packaging surfaces activate when verified financial packages and Dataverse opportunity records connect."
        actions={
          <Link to="/financials">
            <Button size="small" appearance="secondary">
              Open Financial Intelligence
            </Button>
          </Link>
        }
      />
    </ModuleScaffold>
  );
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

export function DocumentsPage() {
  const [query, setQuery] = useState('');
  const rows = documentCategories
    .map((c) => ({
      category: c,
      status: 'Data connection pending',
      folder: c.includes('Legal') ? 'Legal' : c.includes('Financial') ? 'Financial' : 'General',
    }))
    .filter(
      (r) =>
        !query.trim() ||
        r.category.toLowerCase().includes(query.trim().toLowerCase()) ||
        r.folder.toLowerCase().includes(query.trim().toLowerCase()),
    );

  return (
    <ModuleScaffold
      title="Documents"
      subtitle="Modern workspace — folders, search, preview readiness. SharePoint-backed when connected."
      showPendingBanner={false}
    >
      <FilterToolbar>
        <Input
          appearance="outline"
          contentBefore={<SearchRegular />}
          placeholder="Search categories…"
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          aria-label="Search documents"
          style={{ minWidth: 220 }}
        />
        <StatusChip label="Recent" tone="neutral" />
        <StatusChip label="Favorites" tone="gold" />
        <Caption1>Drag & drop · version history · approvals activate with SharePoint binding</Caption1>
      </FilterToolbar>

      <ResponsiveGrid dense>
        <GridSpan span={2}>
          <AtlasCard title="Library" subtitle="Categories awaiting item-level rows">
            <DataTable
              ariaLabel="Document categories"
              getRowKey={(r) => r.category}
              rows={rows}
              emptyTitle="No matching folders"
              emptyDescription="Try another search term."
              columns={[
                { key: 'folder', header: 'Folder', render: (r) => r.folder },
                { key: 'c', header: 'Category', render: (r) => r.category },
                {
                  key: 's',
                  header: 'Status',
                  render: (r) => <StatusChip label={r.status} tone="warning" />,
                },
              ]}
            />
          </AtlasCard>
        </GridSpan>
        <AtlasCard title="Preview" subtitle="Select a document when SharePoint is bound">
          <EmptyState
            title="No preview available"
            description="Document links will use SharePoint sites HVCG-CommandCenter-Dev / HVCG-Clients-Dev. AI summaries appear after item-level rows connect."
          />
        </AtlasCard>
      </ResponsiveGrid>
    </ModuleScaffold>
  );
}

export function AiInsightsPage() {
  return (
    <ModuleScaffold
      title="AI Agents"
      subtitle="Copilot experience — suggested prompts, history, and approval-ready actions."
      showPendingBanner={false}
    >
      <GlobalAICommandPanel
        title="Atlas Copilot"
        subtitle="Context-aware assistant — development stubs only; no live client actions."
        onNavigateHint={() => undefined}
      />
      <ResponsiveGrid dense>
        <AtlasCard title="Governance" variant="quiet">
          <Text>
            Every insight must show source records, generated timestamp, confidence/verification status,
            responsible reviewer, and accept / dismiss / convert-to-task actions once live AI connectors are
            enabled. Phase 1 Local AI Operations uses a mock worker only — open the AI Operations Queue for
            governed jobs.
          </Text>
          <Link to="/ai-operations">
            <Button size="small" appearance="secondary" style={{ marginTop: 12 }}>
              Open AI Operations Queue
            </Button>
          </Link>
        </AtlasCard>
        <AtlasCard title="Approval workflow">
          <Text size={300}>
            Convert Copilot recommendations into Tasks for Owner review. Live AI will never silently overwrite
            verified ledger data.
          </Text>
          <Link to="/tasks">
            <Button size="small" appearance="primary" style={{ marginTop: 12 }}>
              Open task approvals
            </Button>
          </Link>
        </AtlasCard>
        <GridSpan span="full">
          <AtlasCard title="Connected insight surfaces">
            <EmptyState
              title="No live AI insights connected"
              description="Ollama is not connected in Phase 1. Use AI Operations Queue for synthetic governed jobs labeled TEST — SYNTHETIC AI OUTPUT — DO NOT SEND."
            />
          </AtlasCard>
        </GridSpan>
      </ResponsiveGrid>
    </ModuleScaffold>
  );
}
