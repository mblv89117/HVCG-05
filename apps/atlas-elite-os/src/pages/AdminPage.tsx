import { PageLayout, AtlasCard, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Text, Link } from '@fluentui/react-components';
import { microsoftConfig } from '../microsoft/config';
import { useAtlasRole } from '../security/RoleProvider';
import { ATLAS_BUILD } from '../buildInfo';

const MODEL_DRIVEN =
  'https://org1131a2b0.crm.dynamics.com/main.aspx?appid=dea8a490-4b82-f111-ab0e-6045bd0193e8';

export function AdminPage() {
  const { role, can } = useAtlasRole();
  if (!can('viewAdmin')) {
    return (
      <PageLayout title="Administration" subtitle="Access restricted">
        <AtlasCard title="Insufficient role">
          <Text>
            Current role <strong>{role}</strong> cannot open administration.
          </Text>
        </AtlasCard>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Administration"
      subtitle="Model-driven Power App remains the Dataverse administration surface."
    >
      <AtlasCard title="HVCG Development Dataverse" subtitle={microsoftConfig.dataverseUrl}>
        <div style={{ display: 'grid', gap: 12 }}>
          <Text>
            The premium Fluent UI is the executive experience layer. Use the published model-driven
            app for table administration, advanced grids, and maker tooling.
          </Text>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusChip label={microsoftConfig.environment} tone="gold" />
            <StatusChip label={`Role: ${role}`} tone="neutral" />
            <StatusChip label={`Build ${ATLAS_BUILD.shortSha}`} tone="info" />
            <StatusChip label="No Production writes" tone="danger" />
          </div>
          <Button appearance="primary" onClick={() => window.open(MODEL_DRIVEN, '_blank', 'noopener,noreferrer')}>
            Open model-driven admin app
          </Button>
          <Text size={200}>
            Deployed SHA: <code>{ATLAS_BUILD.sha}</code> · Built {ATLAS_BUILD.builtAt}
          </Text>
          <Link href={MODEL_DRIVEN} target="_blank" rel="noreferrer">
            {MODEL_DRIVEN}
          </Link>
        </div>
      </AtlasCard>
    </PageLayout>
  );
}
