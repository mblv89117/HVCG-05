import { Link } from 'react-router-dom';
import { AtlasCard, EmptyState, InsightCard, ResponsiveGrid } from '@hvcg/atlas-design-system';
import { Text, Caption1, Button } from '@fluentui/react-components';
import { BotRegular, DocumentDataRegular, BookRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { ModuleKnowledgeRail, knowledgeUserFromHost } from '../integrations/knowledge';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { useWorkspaceContext } from '../state/WorkspaceContext';

export function KnowledgePage() {
  const { account } = useMicrosoftAuth();
  const { role } = useAtlasRole();
  const { workspaceId } = useWorkspaceContext();
  const user = knowledgeUserFromHost({
    id: account?.localAccountId || 'local-dev',
    name: account?.name,
    email: account?.username,
    role,
    organizationId: 'org-hvcg',
  });
  const clientCode = workspaceId === 'ws-ccb' ? 'CCB' : workspaceId === 'ws-hvcg' ? 'HVCG' : undefined;

  return (
    <ModuleScaffold
      title="Knowledge"
      subtitle="Contextual guidance and repository-derived knowledge for the active module."
      showPendingBanner={false}
    >
      <ModuleKnowledgeRail module="Knowledge" user={user} clientCode={clientCode} />
      <ResponsiveGrid dense>
        <AtlasCard title="Knowledge Platform status" variant="quiet">
          <Text>
            Knowledge catalog and rail are integrated into Elite OS. Full SharePoint / Copilot grounding
            remains gated on Entra configuration and Knowledge Platform track completion.
          </Text>
        </AtlasCard>
        <InsightCard
          title="AI-assisted retrieval"
          body="Ask Atlas Copilot (⌘J) for module-aware guidance. Grounded answers require Knowledge Platform connectors."
          actions={
            <Button size="small" appearance="secondary" icon={<BookRegular />} disabled>
              Browse catalog
            </Button>
          }
        />
      </ResponsiveGrid>
    </ModuleScaffold>
  );
}

export function AutomationsPage() {
  return (
    <ModuleScaffold
      title="Automation"
      subtitle="Power Automate and Atlas orchestration — status surfaces only."
      showPendingBanner={false}
    >
      <AtlasCard variant="quiet">
        <EmptyState
          title="Not yet configured"
          description="Intended source: Power Automate packages under src/power-automate on HVCG-CommandCenter. MissingDocumentReminders, RenewalReminders, and Eva intake remain Off. No fake run success is shown."
          icon={<BotRegular />}
        />
      </AtlasCard>
      <Caption1>
        Owner setup: review flow packages in Power Platform after security gates — do not enable client email reminders.
      </Caption1>
    </ModuleScaffold>
  );
}

export function ReportsPage() {
  return (
    <ModuleScaffold
      title="Reports"
      subtitle="Executive and operational report entry points — presentation-ready surfaces."
      showPendingBanner={false}
    >
      <AtlasCard title="Available report surfaces" variant="accent">
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
          <li>
            <Link to="/">Executive Home</Link>
          </li>
          <li>
            <Link to="/executive">Executive Dashboard</Link>
          </li>
          <li>
            <Link to="/financials">Financial Intelligence</Link>
          </li>
          <li>
            <Link to="/revenue">Revenue & Pipeline</Link>
          </li>
          <li>
            <Link to="/capital">Capital Advisory</Link>
          </li>
          <li>
            <Link to="/enterprise-value">Enterprise Value</Link>
          </li>
        </ul>
      </AtlasCard>
      <EmptyState
        title="Export & scheduled reports"
        description="Scheduled PDF/Excel export is not yet integrated. Values remain pending until verified data sources connect."
        icon={<DocumentDataRegular />}
      />
    </ModuleScaffold>
  );
}
