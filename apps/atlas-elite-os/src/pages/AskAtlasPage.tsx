import { Button } from '@fluentui/react-components';
import { ArrowSyncRegular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { AskAtlasPanel } from '../components/AskAtlasPanel';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { ModuleScaffold } from './shared/ModuleScaffold';

export function AskAtlasPage() {
  const navigate = useNavigate();
  const auth = useHubAuth();

  return (
    <ModuleScaffold
      title="Ask Atlas"
      subtitle="Ask a question. Atlas answers from the signed Hub runtime only and does not invent work, amounts, lenders, or Hub-MI rows."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button appearance="subtle" onClick={() => navigate('/')}>
            Command Center
          </Button>
          <Button
            appearance="secondary"
            icon={<ArrowSyncRegular />}
            disabled={!auth.hasBearer}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      }
    >
      <AskAtlasPanel />
    </ModuleScaffold>
  );
}
