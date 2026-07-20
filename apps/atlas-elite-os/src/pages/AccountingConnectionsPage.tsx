import { Link } from 'react-router-dom';
import { AtlasCard } from '@hvcg/atlas-design-system';
import { MessageBar, MessageBarBody, MessageBarTitle, Text, Caption1 } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';

/**
 * QuickBooks Phase 1 — integration surface only.
 * No specialist QuickBooks implementation branch exists in the repository.
 * Do not fabricate connection success or accounting figures.
 */
export function AccountingConnectionsPage() {
  return (
    <ModuleScaffold
      title="Accounting Connections"
      subtitle="QuickBooks Online — read-only Phase 1 (not yet integrated)."
      showPendingBanner={false}
    >
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>BLOCKED — QuickBooks specialist work incomplete</MessageBarTitle>
          No completed QuickBooks integration branch was found. Atlas will not show a fake connected
          state. Bank data (Plaid) remains a separate source with distinct lineage.
        </MessageBarBody>
      </MessageBar>

      <AtlasCard title="Phase 1 target (read-only)" subtitle="When specialist work lands">
        <ul>
          <li>OAuth connect to QuickBooks Sandbox (read-only)</li>
          <li>Pull chart of accounts, invoices, bills, and balances</li>
          <li>Preserve source lineage: Accounting vs VerifiedBank</li>
          <li>Reconciliation status visible next to Plaid cash</li>
        </ul>
        <Caption1>Owner action: assign QuickBooks Integration agent when Finance model is stable.</Caption1>
      </AtlasCard>

      <AtlasCard title="Related surfaces">
        <Text>
          Use <Link to="/banking">Banking Connections</Link> for Plaid Sandbox. Financial Intelligence
          at <Link to="/financials">/financials</Link> shows pending labels until verified sources
          connect.
        </Text>
      </AtlasCard>
    </ModuleScaffold>
  );
}
