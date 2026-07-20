import { Link } from 'react-router-dom';
import { AtlasCard, EmptyState } from '@hvcg/atlas-design-system';
import { Text, Caption1 } from '@fluentui/react-components';
import { BotRegular, DocumentDataRegular } from '@fluentui/react-icons';
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
      <AtlasCard title="Knowledge Platform status">
        <Text>
          Knowledge catalog and rail are integrated into Elite OS. Full SharePoint / Copilot grounding
          remains gated on Entra configuration and Knowledge Platform track completion.
        </Text>
      </AtlasCard>
    </ModuleScaffold>
  );
}

export function AutomationsPage() {
  return (
    <ModuleScaffold
      title="Automations"
      subtitle="Power Automate and Atlas orchestration — status surfaces only."
      showPendingBanner={false}
    >
      <AtlasCard>
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
      <AtlasCard title="Available report surfaces">
        <ul>
          <li>
            <Link to="/">Executive Dashboard (Home)</Link>
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
        <EmptyState
          title="Export & scheduled reports"
          description="Scheduled PDF/Excel export is not yet integrated. Values remain pending until verified data sources connect."
          icon={<DocumentDataRegular />}
        />
      </AtlasCard>
    </ModuleScaffold>
  );
}
