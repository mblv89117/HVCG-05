import { Link } from 'react-router-dom';
import { AtlasCard, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import { Text, Caption1 } from '@fluentui/react-components';
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
      <AtlasCard title="Knowledge operating surface" variant="ai" headerAction={<BookRegular />}>
        <ModuleKnowledgeRail module="Knowledge" user={user} clientCode={clientCode} />
      </AtlasCard>
      <AtlasCard title="Knowledge Platform status" variant="glass">
        <Text>
          Knowledge catalog and rail are integrated into Elite OS. Full SharePoint / Copilot grounding remains gated on
          Entra configuration and Knowledge Platform track completion.
        </Text>
      </AtlasCard>
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <StatusChip label="Catalog linked" tone="info" />
        <StatusChip label="Runtime: gated" tone="warning" />
      </div>
      <AtlasCard variant="glass">
        <EmptyState
          title="Automation catalog linked"
          description="Flow packages live under src/power-automate. Runtime activation requires Power Platform environment and owner connection references. No fake run success is shown."
          icon={<BotRegular />}
        />
      </AtlasCard>
      <Caption1>
        See DEPLOYMENT_GUIDE.md and Power Platform Prod NO-GO report before enabling production flows.
      </Caption1>
    </ModuleScaffold>
  );
}

export function ReportsPage() {
  return (
    <ModuleScaffold
      title="Reports"
      subtitle="Executive and operational report entry points."
      showPendingBanner={false}
    >
      <AtlasCard title="Available report surfaces" variant="glass">
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
          <li>
            <Link to="/">Executive Command Center</Link>
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
        <div style={{ marginTop: 16 }}>
          <EmptyState
            title="Export & scheduled reports"
            description="Scheduled PDF/Excel export is not yet integrated. Values remain pending until verified data sources connect."
            icon={<DocumentDataRegular />}
          />
        </div>
      </AtlasCard>
    </ModuleScaffold>
  );
}
