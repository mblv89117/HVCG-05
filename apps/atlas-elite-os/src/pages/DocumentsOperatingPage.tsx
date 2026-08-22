/**
 * Documents operating surface — honest deferred.
 * Hub SharePoint production returns 501 for GET /api/pm/documents (PM_COLLECTION_NOT_IN_MVP).
 * Do not call that route as if it were live. Do not fake a document catalog.
 */
import { Link } from 'react-router-dom';
import { AtlasCard, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text } from '@fluentui/react-components';
import { OpenRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';

const HVCG_CLIENTS_SITE = 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients';
const HVCG_COMMAND_CENTER_SITE =
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter';

export function DocumentsOperatingPage() {
  return (
    <ModuleScaffold
      title="Documents"
      subtitle="Deferred · Hub document index API is not in SharePoint production MVP"
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            appearance="primary"
            icon={<OpenRegular />}
            onClick={() => window.open(HVCG_CLIENTS_SITE, '_blank', 'noopener,noreferrer')}
          >
            Open HVCG-Clients
          </Button>
          <Button
            appearance="secondary"
            icon={<OpenRegular />}
            onClick={() => window.open(HVCG_COMMAND_CENTER_SITE, '_blank', 'noopener,noreferrer')}
          >
            Open Command Center site
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <StatusChip label="Deferred" tone="warning" />
        <StatusChip label="Not live Hub API" tone="neutral" />
        <StatusChip label="PM_COLLECTION_NOT_IN_MVP" tone="neutral" />
      </div>

      <EmptyState
        title="Document index unavailable on Hub"
        description="GET /api/pm/documents is deferred (501) for SharePoint production. Atlas does not call that route or invent a document catalog."
      />

      <AtlasCard title="Where documents actually live" variant="quiet">
        <Text size={300} style={{ display: 'block' }}>
          Authorized files remain in SharePoint / OneDrive client libraries. Open the approved site
          above. Link-first; permissions stay with Microsoft. Restricted files are not copied into
          the Elite frontend.
        </Text>
        <Caption1 style={{ display: 'block', marginTop: 10 }}>
          Client workspaces and Command-K search remain the live Atlas paths for entitled ClientCodes.
          This page is not a second document SoR.
        </Caption1>
        <div style={{ marginTop: 12 }}>
          <Link to="/clients">
            <Button appearance="secondary">Go to Clients</Button>
          </Link>
        </div>
      </AtlasCard>
    </ModuleScaffold>
  );
}
