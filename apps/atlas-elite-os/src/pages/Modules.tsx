import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  ResponsiveGrid,
  GridSpan,
  EmptyState,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1 } from '@fluentui/react-components';
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
import { projectCatalog } from '../data/projects';
export { TasksPage } from './TasksApprovalsPage';
export function FinancialsPage() {
  return (
    <ModuleScaffold
      title="Financial Performance"
      subtitle="Entity · client · period filters ready. Values display only when verified sources connect."
    >
      <FieldGrid fields={pendingExecutiveKpis} />
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

export function ClientsPage() {
  return (
    <ModuleScaffold
      title="Clients"
      subtitle="Portfolio of internal and client workspaces."
      showPendingBanner={false}
    >
      <AtlasCard title="Client portfolio">
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
      title={ws.name}
      subtitle={`${ws.kind === 'internal' ? 'Internal workspace' : 'Client workspace'} · ${ws.engagementStatus}`}
      showPendingBanner={ws.kind === 'client'}
      actions={
        <Link to="/clients">
          <Button appearance="secondary">All clients</Button>
        </Link>
      }
    >
      <ResponsiveGrid dense>
        <GridSpan span={2}>
          <AtlasCard title="Executive summary" subtitle="Relationship facts only">
            <Text>{ws.notes}</Text>
            {ws.referralSource ? (
              <Caption1 style={{ display: 'block', marginTop: 8 }}>
                Referral: {ws.referralSource}
              </Caption1>
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
        <AtlasCard title="Services">
          {ws.services.map((s) => (
            <div key={s} style={{ marginBottom: 6 }}>
              <StatusChip label={s} tone="gold" />
            </div>
          ))}
        </AtlasCard>
        <AtlasCard title="Health & owner">
          <StatusChip label={ws.health} tone="success" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>{ws.relationshipOwner}</Caption1>
        </AtlasCard>
      </ResponsiveGrid>

      <AtlasCard title="Financial KPIs" subtitle="No fabricated values">
        <FieldGrid fields={pendingExecutiveKpis} />
      </AtlasCard>

      {isCcb ? (
        <>
          <AtlasCard title="Company overview" subtitle="Relationship facts from Owner directive">
            <Text>
              Colorado Craft Beef is transitioning to HVCG. Original need involved growth capital and additional
              real estate. Prior financing discussion included non-dilutive and agricultural options.
            </Text>
          </AtlasCard>
          <AtlasCard title="Growth priorities">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                <Text size={300}>Secure verified financial package before any facility sizing</Text>
              </li>
              <li>
                <Text size={300}>Advance growth-capital discovery with Generational Group continuity</Text>
              </li>
              <li>
                <Text size={300}>Sequence real-estate financing exploration after capital package readiness</Text>
              </li>
            </ul>
          </AtlasCard>
          <AtlasCard title="Capital readiness" subtitle="Demo structure for live meeting">
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
          <AtlasCard title="Enterprise value" subtitle="No invented estimates">
            <Text>
              Current estimated value, ranges, and multiples remain Not yet calculated until a formally validated
              valuation process runs on verified inputs.
            </Text>
          </AtlasCard>
          <AtlasCard title="Active projects">
            <DataTable
              ariaLabel="CCB projects"
              getRowKey={(r) => r.id}
              rows={portfolioProjects.filter((p) => p.workspaceId === 'ws-ccb')}
              columns={[
                {
                  key: 'name',
                  header: 'Project',
                  render: (r) => (
                    <Link to={`/clients/${r.workspaceId}`} style={{ fontWeight: 600 }}>
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
          </AtlasCard>
          <AtlasCard title="Document readiness">
            <DataTable
              ariaLabel="CCB documents"
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
          <AtlasCard title="AI executive briefing" subtitle="Generated recommendations — not verified data">
            <MessageGenerated />
            <ul>
              <li>Confirm referral continuity with Generational Group (Randy Kamin).</li>
              <li>Collect verified financial package before any valuation or facility sizing.</li>
              <li>Prioritize growth-capital + real-estate needs in discovery agenda.</li>
            </ul>
          </AtlasCard>
          <AtlasCard title="Next actions">
            <ol>
              <li>Open this workspace during the client meeting.</li>
              <li>Walk relationship history and capital-readiness checklist.</li>
              <li>Do not present dollar amounts until verified sources are connected.</li>
              <li>Convert agreed actions into Tasks from the Tasks module.</li>
            </ol>
          </AtlasCard>
        </>
      ) : (
        <AtlasCard title="Internal operating focus">
          <Text>
            Use this workspace for HVCG leadership KPIs, client portfolio oversight, and capital advisory
            pipeline once verified Dataverse / SharePoint sources are bound.
          </Text>
        </AtlasCard>
      )}
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
      <AtlasCard title="Views">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['Executive Portfolio', 'My Projects', 'At Risk', 'Overdue', 'Awaiting Approval', 'Recently Updated'].map(
            (v) => (
              <StatusChip key={v} label={v} tone="neutral" />
            ),
          )}
        </div>
      </AtlasCard>
      <AtlasCard title="Active portfolio" subtitle="Repository-derived initiatives — no invented budgets">
        <DataTable
          ariaLabel="Projects"
          getRowKey={(r) => r.id}
          rows={projectCatalog}
          columns={[
            {
              key: 'name',
              header: 'Project',
              render: (r) => (
                <Link to={`/clients/${r.clientId}`} style={{ fontWeight: 600 }}>
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
              render: (r) => (
                <StatusChip
                  label={r.health}
                  tone={r.health === 'On Track' ? 'success' : r.health === 'At Risk' ? 'warning' : 'neutral'}
                />
              ),
            },
            { key: 'next', header: 'Next milestone', render: (r) => r.nextMilestone },
            { key: 'pct', header: '%', render: (r) => `${r.percentComplete}%` },
          ]}
        />
      </AtlasCard>
      <Caption1>
        Underlying catalog size: {portfolioProjects.length} repository-derived rows
      </Caption1>
    </ModuleScaffold>
  );
}

export function CapitalPage() {
  return (
    <ModuleScaffold
      title="Capital Advisory"
      subtitle="Financing workspace. Amounts and probabilities stay pending until verified."
    >
      <AtlasCard title="Funding types supported">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {fundingTypes.map((t) => (
            <StatusChip key={t} label={t} tone="gold" />
          ))}
        </div>
      </AtlasCard>
      <FieldGrid
        fields={[
          { label: 'Active capital opportunities', value: 'Data connection pending', availability: 'Data connection pending' },
          { label: 'Requested amount (aggregate)', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
          { label: 'Expected fees', value: 'Not yet calculated', availability: 'Not yet calculated' },
        ]}
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
  return (
    <ModuleScaffold
      title="Documents"
      subtitle="SharePoint-backed readiness. Confidential docs require Entra role checks."
      showPendingBanner={false}
    >
      <Pendingish />
      <AtlasCard title="Categories">
        <DataTable
          ariaLabel="Document categories"
          getRowKey={(r) => r.category}
          rows={documentCategories.map((c) => ({
            category: c,
            status: 'Data connection pending',
          }))}
          columns={[
            { key: 'c', header: 'Category', render: (r) => r.category },
            {
              key: 's',
              header: 'Status',
              render: (r) => <StatusChip label={r.status} tone="warning" />,
            },
          ]}
        />      </AtlasCard>
    </ModuleScaffold>
  );
}

export function AiInsightsPage() {
  return (
    <ModuleScaffold
      title="AI Insights"
      subtitle="Generated outputs are labeled and never silently overwrite verified data."
      showPendingBanner={false}
    >
      <AtlasCard title="Governance">
        <Text>
          Every insight must show source records, generated timestamp, confidence/verification status,
          responsible reviewer, and accept / dismiss / convert-to-task actions once live AI connectors
          are enabled.
        </Text>
      </AtlasCard>
      <AtlasCard title="Current insights">
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
    <AtlasCard>
      <Caption1>
        Document links will use SharePoint sites HVCG-CommandCenter-Dev / HVCG-Clients-Dev. Status: Data
        connection pending for item-level rows.
      </Caption1>
    </AtlasCard>
  );
}
