import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  ResponsiveGrid,
  GridSpan,
  EmptyState,
  KpiTile,
  LazyAreaChart,
  LazyBarChart,
  GlobalAICommandPanel,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1 } from '@fluentui/react-components';
import { ModuleScaffold, FieldGrid, WorkspaceTabs } from './shared/ModuleScaffold';
import {
  coloradoCraftBeefWorkspace,
  documentCategories,
  fundingTypes,
  pendingExecutiveKpis,
  pipelineStages,
  portfolioProjects,
  workspaceCatalog,
} from '../data/workspaces';
import { projectCatalog } from '../data/projects';
export { TasksPage } from './TasksApprovalsPage';

const pendingSeries = [
  { name: 'Jan', value: 0 },
  { name: 'Feb', value: 0 },
  { name: 'Mar', value: 0 },
  { name: 'Apr', value: 0 },
  { name: 'May', value: 0 },
  { name: 'Jun', value: 0 },
];

export function FinancialsPage() {
  return (
    <ModuleScaffold
      title="Financial Intelligence"
      subtitle="Entity · client · period filters ready. Values display only when verified sources connect."
    >
      <ResponsiveGrid>
        {pendingExecutiveKpis.slice(0, 4).map((k) => (
          <KpiTile key={k.label} label={k.label} value={k.value} trend="flat" trendLabel={k.availability} />
        ))}
      </ResponsiveGrid>
      <ResponsiveGrid dense>
        <GridSpan span={2}>
          <AtlasCard title="Cash flow" subtitle="Verified series only" variant="glass">
            <LazyAreaChart
              data={pendingSeries}
              pending
              pendingLabel="Cash-flow chart awaits verified bank and accounting feeds."
              ariaLabel="Cash flow"
            />
          </AtlasCard>
        </GridSpan>
        <AtlasCard title="Revenue trend" subtitle="No fabricated dollars" variant="accent">
          <LazyBarChart
            data={pendingSeries}
            pending
            pendingLabel="Revenue chart awaits verified source import."
            ariaLabel="Revenue"
          />
        </AtlasCard>
      </ResponsiveGrid>
      <AtlasCard title="Statements & aging" subtitle="Structure ready — no invented balances">
        <FieldGrid
          fields={[
            { label: 'Monthly revenue', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
            { label: 'Gross margin', value: 'Not yet calculated', availability: 'Not yet calculated' },
            { label: 'Operating expenses', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
            { label: 'Cash runway', value: 'Not yet calculated', availability: 'Not yet calculated' },
            { label: 'AR aging', value: 'Data connection pending', availability: 'Data connection pending' },
            { label: 'AP aging', value: 'Data connection pending', availability: 'Data connection pending' },
            { label: 'Debt obligations', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
            { label: 'Budget vs actual', value: 'Data connection pending', availability: 'Data connection pending' },
            { label: 'Rolling forecast', value: 'Not yet calculated', availability: 'Not yet calculated' },
            { label: 'Working-capital trend', value: 'Not yet calculated', availability: 'Not yet calculated' },
          ]}
        />
      </AtlasCard>
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
      <AtlasCard title="Pipeline stages" subtitle="Standard HVCG engagement stages" variant="glass">
        <DataTable
          ariaLabel="Pipeline stages"
          searchable
          getRowKey={(r) => r.id}
          rows={stageRows}
          columns={[
            {
              key: 'stage',
              header: 'Stage',
              sortable: true,
              getSortValue: (r) => r.stage,
              getFilterValue: (r) => r.stage,
              render: (r) => r.stage,
            },
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
      <AtlasCard title="Referral partners" variant="accent">
        <Text>
          Generational Group (Randy Kamin) is recorded as the Colorado Craft Beef referral source. Opportunity
          records: Data connection pending.
        </Text>
      </AtlasCard>
    </ModuleScaffold>
  );
}

export function ClientsPage() {
  return (
    <ModuleScaffold
      title="Clients"
      subtitle="Portfolio of internal and client workspaces."
      showPendingBanner={false}
    >
      <AtlasCard title="Client portfolio" variant="glass">
        <DataTable
          ariaLabel="Clients"
          searchable
          selectable
          savedViews={[
            { id: 'all', label: 'All clients' },
            { id: 'active', label: 'Active engagements' },
          ]}
          activeViewId="all"
          getRowKey={(r) => r.id}
          rows={workspaceCatalog}
          columns={[
            {
              key: 'name',
              header: 'Client',
              sortable: true,
              pinned: 'left',
              getSortValue: (r) => r.name,
              getFilterValue: (r) => r.name,
              render: (r) => (
                <Link to={`/clients/${r.id}`} style={{ fontWeight: 600 }}>
                  {r.name}
                </Link>
              ),
            },
            {
              key: 'status',
              header: 'Engagement',
              filterable: true,
              getFilterValue: (r) => r.engagementStatus,
              render: (r) => r.engagementStatus,
            },
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

const CLIENT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'financials', label: 'Financials' },
  { id: 'documents', label: 'Documents' },
  { id: 'projects', label: 'Projects' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'funding', label: 'Funding' },
  { id: 'banking', label: 'Banking' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'ai', label: 'AI' },
  { id: 'roadmap', label: 'Capital roadmap' },
];

export function ClientDetailPage({ workspaceId }: { workspaceId: string }) {
  const ws = workspaceCatalog.find((w) => w.id === workspaceId);
  const [tab, setTab] = useState('overview');

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
      title={ws.name}
      subtitle={`${ws.kind === 'internal' ? 'Internal workspace' : 'Client operating system'} · ${ws.engagementStatus}`}
      showPendingBanner={ws.kind === 'client'}
      actions={
        <Link to="/clients">
          <Button appearance="secondary">All clients</Button>
        </Link>
      }
    >
      <WorkspaceTabs tabs={CLIENT_TABS} active={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <ResponsiveGrid dense>
          <GridSpan span={2}>
            <AtlasCard title="Executive summary" subtitle="Relationship facts only" variant="glass">
              <Text>{ws.notes}</Text>
              {ws.referralSource ? (
                <Caption1 style={{ display: 'block', marginTop: 8 }}>Referral: {ws.referralSource}</Caption1>
              ) : null}
              <ul style={{ marginTop: 12 }}>
                {ws.relationshipHistory.map((h) => (
                  <li key={h}>
                    <Text size={300}>{h}</Text>
                  </li>
                ))}
              </ul>
            </AtlasCard>
          </GridSpan>
          <AtlasCard title="Services" variant="accent">
            {ws.services.map((s) => (
              <div key={s} style={{ marginBottom: 6 }}>
                <StatusChip label={s} tone="gold" />
              </div>
            ))}
          </AtlasCard>
          <AtlasCard title="Health & owner" variant="glass">
            <StatusChip label={ws.health} tone="success" />
            <Caption1 style={{ display: 'block', marginTop: 8 }}>{ws.relationshipOwner}</Caption1>
          </AtlasCard>
          {isCcb ? (
            <GridSpan span="full">
              <AtlasCard title="Company overview" subtitle="Relationship facts from Owner directive">
                <Text>
                  Colorado Craft Beef is transitioning to HVCG. Original need involved growth capital and additional
                  real estate. Prior financing discussion included non-dilutive and agricultural options.
                </Text>
              </AtlasCard>
            </GridSpan>
          ) : (
            <GridSpan span="full">
              <AtlasCard title="Internal operating focus">
                <Text>
                  Use this workspace for HVCG leadership KPIs, client portfolio oversight, and capital advisory
                  pipeline once verified Dataverse / SharePoint sources are bound.
                </Text>
              </AtlasCard>
            </GridSpan>
          )}
        </ResponsiveGrid>
      ) : null}

      {tab === 'financials' ? (
        <AtlasCard title="Financial KPIs" subtitle="No fabricated values" variant="glass">
          <FieldGrid fields={pendingExecutiveKpis} />
        </AtlasCard>
      ) : null}

      {tab === 'documents' ? (
        <AtlasCard title="Document readiness" variant="glass">
          <DataTable
            ariaLabel="Documents"
            searchable
            getRowKey={(r) => r.category}
            rows={documentCategories.map((c) => ({
              category: c,
              status: 'Awaiting verified data',
            }))}
            columns={[
              {
                key: 'cat',
                header: 'Category',
                sortable: true,
                getSortValue: (r) => r.category,
                getFilterValue: (r) => r.category,
                render: (r) => r.category,
              },
              {
                key: 'st',
                header: 'Status',
                render: (r) => <StatusChip label={r.status} tone="warning" />,
              },
            ]}
          />
        </AtlasCard>
      ) : null}

      {tab === 'projects' ? (
        <AtlasCard title="Active projects" variant="glass">
          <DataTable
            ariaLabel="Projects"
            searchable
            getRowKey={(r) => r.id}
            rows={portfolioProjects.filter((p) => p.workspaceId === ws.id)}
            columns={[
              {
                key: 'name',
                header: 'Project',
                render: (r) => <Text weight="semibold">{r.name}</Text>,
              },
              {
                key: 'st',
                header: 'Status',
                render: (r) => <StatusChip label={r.health} tone="gold" />,
              },
              { key: 'next', header: 'Next', render: (r) => r.nextMilestone },
            ]}
            emptyTitle="No projects for this workspace"
            emptyDescription="Projects appear when repository-derived initiatives are linked."
          />
        </AtlasCard>
      ) : null}

      {tab === 'timeline' ? (
        <AtlasCard title="Relationship timeline" variant="quiet">
          <div style={{ display: 'grid', gap: 12 }}>
            {ws.relationshipHistory.map((h, i) => (
              <div key={h} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <StatusChip label={`${i + 1}`} tone="info" />
                <Text size={300}>{h}</Text>
              </div>
            ))}
          </div>
        </AtlasCard>
      ) : null}

      {tab === 'funding' || tab === 'roadmap' ? (
        <>
          <AtlasCard title="Capital readiness" subtitle="Demo structure for live meeting" variant="accent">
            <FieldGrid
              fields={[
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
              ]}
            />
          </AtlasCard>
          <AtlasCard title="Financing roadmap">
            <Text>
              Explore non-dilutive and agricultural financing options consistent with prior discussion. Specific
              facility sizing: Awaiting verified data.
            </Text>
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Eligible funding-type catalog includes: {fundingTypes.slice(0, 6).join(', ')}, …
            </Caption1>
          </AtlasCard>
        </>
      ) : null}

      {tab === 'banking' ? (
        <AtlasCard title="Banking" subtitle="Plaid lineage" variant="glass">
          <Text>
            Open <Link to="/banking">Banking Connections</Link> for institution connect, sync health, and verified
            cash. This workspace tab does not invent balances.
          </Text>
        </AtlasCard>
      ) : null}

      {tab === 'accounting' ? (
        <AtlasCard title="Accounting" subtitle="QuickBooks status" variant="glass">
          <Text>
            QuickBooks Phase 1 is blocked pending specialist integration. See{' '}
            <Link to="/accounting">Accounting Connections</Link>.
          </Text>
        </AtlasCard>
      ) : null}

      {tab === 'tasks' ? (
        <AtlasCard title="Tasks" variant="glass">
          <Text>
            Convert agreed actions into Tasks from the <Link to="/tasks">Tasks</Link> module. Live Dataverse approvals
            require Microsoft sign-in.
          </Text>
        </AtlasCard>
      ) : null}

      {tab === 'notes' || tab === 'meetings' ? (
        <AtlasCard title={tab === 'notes' ? 'Notes' : 'Meetings'} variant="quiet">
          <EmptyState
            title={tab === 'notes' ? 'Notes awaiting SharePoint bind' : 'Meetings awaiting Graph calendar bind'}
            description="UI shell is ready. No fabricated notes or meeting content is shown."
          />
        </AtlasCard>
      ) : null}

      {tab === 'ai' ? (
        <AtlasCard title="AI recommendations" variant="ai">
          <MessageGenerated />
          {isCcb ? (
            <ul>
              <li>Confirm referral continuity with Generational Group (Randy Kamin).</li>
              <li>Collect verified financial package before any valuation or facility sizing.</li>
              <li>Prioritize growth-capital + real-estate needs in discovery agenda.</li>
            </ul>
          ) : (
            <Text>Labeled recommendations appear when Copilot connectors are enabled for this workspace.</Text>
          )}
          <div style={{ marginTop: 16 }}>
            <GlobalAICommandPanel title="Client Copilot" subtitle="Workspace-scoped stubs — no live client actions." />
          </div>
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}

function MessageGenerated() {
  return (
    <Caption1 style={{ display: 'block', marginBottom: 8 }}>
      Label: AI-generated recommendations · not verified financial data · reviewer: HVCG Owner
    </Caption1>
  );
}

export function ProjectsPage() {
  return (
    <ModuleScaffold
      title="Projects & Initiatives"
      subtitle="Portfolio views ready. Project financials pending verified sources."
      showPendingBanner={false}
    >
      <AtlasCard title="Views" variant="quiet">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['Executive Portfolio', 'My Projects', 'At Risk', 'Overdue', 'Awaiting Approval', 'Recently Updated'].map(
            (v) => (
              <StatusChip key={v} label={v} tone="neutral" />
            ),
          )}
        </div>
      </AtlasCard>
      <AtlasCard title="Active portfolio" subtitle="Repository-derived initiatives — no invented budgets" variant="glass">
        <DataTable
          ariaLabel="Projects"
          searchable
          selectable
          getRowKey={(r) => r.id}
          rows={projectCatalog}
          columns={[
            {
              key: 'name',
              header: 'Project',
              sortable: true,
              pinned: 'left',
              getSortValue: (r) => r.name,
              getFilterValue: (r) => r.name,
              render: (r) => (
                <Link to={`/projects/${r.id}`} style={{ fontWeight: 600 }}>
                  {r.name}
                </Link>
              ),
            },
            { key: 'client', header: 'Client', render: (r) => r.clientName },
            { key: 'sponsor', header: 'Sponsor', render: (r) => r.sponsor },
            { key: 'pm', header: 'PM', render: (r) => r.projectManager },
            {
              key: 'health',
              header: 'Health',
              filterable: true,
              getFilterValue: (r) => r.health,
              render: (r) => (
                <StatusChip
                  label={r.health}
                  tone={r.health === 'On Track' ? 'success' : r.health === 'At Risk' ? 'warning' : 'neutral'}
                />
              ),
            },
            { key: 'next', header: 'Next milestone', render: (r) => r.nextMilestone },
            {
              key: 'pct',
              header: '%',
              sortable: true,
              getSortValue: (r) => r.percentComplete,
              render: (r) => `${r.percentComplete}%`,
            },
          ]}
        />
      </AtlasCard>
      <Caption1>Underlying catalog size: {portfolioProjects.length} repository-derived rows</Caption1>
    </ModuleScaffold>
  );
}

export function CapitalPage() {
  return (
    <ModuleScaffold
      title="Capital Advisory"
      subtitle="Financing workspace. Amounts and probabilities stay pending until verified."
    >
      <AtlasCard title="Funding types supported" variant="accent">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {fundingTypes.map((t) => (
            <StatusChip key={t} label={t} tone="gold" />
          ))}
        </div>
      </AtlasCard>
      <AtlasCard title="Funding pipeline" subtitle="Presentation shell — pending amounts" variant="glass">
        <LazyBarChart
          data={pendingSeries}
          pending
          pendingLabel="Funding pipeline amounts await verified opportunity records."
          ariaLabel="Funding pipeline"
        />
      </AtlasCard>
      <FieldGrid
        fields={[
          {
            label: 'Active capital opportunities',
            value: 'Data connection pending',
            availability: 'Data connection pending',
          },
          {
            label: 'Requested amount (aggregate)',
            value: 'Awaiting verified data',
            availability: 'Awaiting verified data',
          },
          { label: 'Expected fees', value: 'Not yet calculated', availability: 'Not yet calculated' },
        ]}
      />
    </ModuleScaffold>
  );
}

export function EnterpriseValuePage() {
  return (
    <ModuleScaffold title="Enterprise Value" subtitle="Estimates labeled preliminary until formally validated.">
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
      <AtlasCard title="Disclosure" variant="quiet">
        <Text>
          Any future estimate shown in Atlas will be labeled preliminary or indicative unless formally validated by an
          approved valuation process.
        </Text>
      </AtlasCard>
    </ModuleScaffold>
  );
}

export function DocumentsPage() {
  const [dragging, setDragging] = useState(false);

  return (
    <ModuleScaffold
      title="Documents"
      subtitle="SharePoint-backed readiness. Confidential docs require Entra role checks."
      showPendingBanner={false}
    >
      <AtlasCard
        title="Upload"
        subtitle="Drag & drop chrome — uploads bind when SharePoint connectors are live"
        variant={dragging ? 'ai' : 'glass'}
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          style={{
            border: '1.5px dashed rgba(37,99,235,0.35)',
            borderRadius: 14,
            padding: 28,
            textAlign: 'center',
            background: dragging ? 'rgba(37,99,235,0.06)' : 'transparent',
          }}
        >
          <Text weight="semibold">Drop files here</Text>
          <Caption1 style={{ display: 'block', marginTop: 6 }}>
            AI summaries, version history, preview, favorites, approvals, and sharing activate after SharePoint bind.
            No files are uploaded in this Development shell.
          </Caption1>
        </div>
      </AtlasCard>
      <Pendingish />
      <AtlasCard title="Categories" variant="glass">
        <DataTable
          ariaLabel="Document categories"
          searchable
          selectable
          bulkActions={<Button size="small">Request approval</Button>}
          getRowKey={(r) => r.category}
          rows={documentCategories.map((c) => ({
            category: c,
            status: 'Data connection pending',
          }))}
          columns={[
            {
              key: 'c',
              header: 'Category',
              sortable: true,
              getSortValue: (r) => r.category,
              getFilterValue: (r) => r.category,
              render: (r) => r.category,
            },
            {
              key: 's',
              header: 'Status',
              render: (r) => <StatusChip label={r.status} tone="warning" />,
            },
          ]}
        />
      </AtlasCard>
    </ModuleScaffold>
  );
}

export function AiInsightsPage() {
  return (
    <ModuleScaffold
      title="AI Agents"
      subtitle="Generated outputs are labeled and never silently overwrite verified data."
      showPendingBanner={false}
    >
      <ResponsiveGrid dense>
        <GridSpan span={2}>
          <GlobalAICommandPanel />
        </GridSpan>
        <AtlasCard title="Governance" variant="quiet">
          <Text>
            Every insight must show source records, generated timestamp, confidence/verification status, responsible
            reviewer, and accept / dismiss / convert-to-task actions once live AI connectors are enabled.
          </Text>
        </AtlasCard>
      </ResponsiveGrid>
      <AtlasCard title="Current insights" variant="ai">
        <EmptyState
          title="No live AI insights connected"
          description="Connect approved AI pipeline to Dataverse insight entities. Until then, only labeled recommendations appear on Home / CCB."
        />
      </AtlasCard>
    </ModuleScaffold>
  );
}

function Pendingish() {
  return (
    <AtlasCard variant="quiet">
      <Caption1>
        Document links will use SharePoint sites HVCG-CommandCenter-Dev / HVCG-Clients-Dev. Status: Data connection
        pending for item-level rows.
      </Caption1>
    </AtlasCard>
  );
}
