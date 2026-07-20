import { Link } from 'react-router-dom';
import { AtlasCard, StatusChip } from '@hvcg/atlas-design-system';
import { MessageBar, MessageBarBody, MessageBarTitle, Text, Caption1 } from '@fluentui/react-components';
import { ModuleScaffold, FieldGrid } from './shared/ModuleScaffold';

/**
 * QuickBooks Phase 1 — integration surface only.
 * No specialist QuickBooks implementation branch exists in the repository.
 * Do not fabricate connection success or accounting figures.
 */
export function AccountingConnectionsPage() {
  return (
    <ModuleScaffold
      title="Accounting"
      subtitle="QuickBooks Online — modern workspace shell. Phase 1 integration not yet live."
      showPendingBanner={false}
    >
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>BLOCKED — QuickBooks specialist work incomplete</MessageBarTitle>
          No completed QuickBooks integration branch was found. Atlas will not show a fake connected state. Bank data
          (Plaid) remains a separate source with distinct lineage.
        </MessageBarBody>
      </MessageBar>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <StatusChip label="QBO status: Not connected" tone="warning" />
        <StatusChip label="Sync health: N/A" tone="neutral" />
        <StatusChip label="Source lineage: Accounting vs Bank" tone="info" />
      </div>

      <AtlasCard title="Financial statement shells" subtitle="Structure only — no invented balances" variant="glass">
        <FieldGrid
          fields={[
            { label: 'Profit & Loss', value: 'Awaiting QuickBooks bind', availability: 'Data connection pending' },
            { label: 'Balance Sheet', value: 'Awaiting QuickBooks bind', availability: 'Data connection pending' },
            { label: 'Cash Flow statement', value: 'Awaiting QuickBooks bind', availability: 'Data connection pending' },
            { label: 'Sync errors', value: 'None — connector offline', availability: 'Repository-derived' },
          ]}
        />
      </AtlasCard>

      <AtlasCard title="Phase 1 target (read-only)" subtitle="When specialist work lands" variant="accent">
        <ul>
          <li>OAuth connect to QuickBooks Sandbox (read-only)</li>
          <li>Pull chart of accounts, invoices, bills, and balances</li>
          <li>Preserve source lineage: Accounting vs VerifiedBank</li>
          <li>Reconciliation status visible next to Plaid cash</li>
          <li>AI recommendations on variance and close readiness</li>
        </ul>
        <Caption1>Owner action: assign QuickBooks Integration agent when Finance model is stable.</Caption1>
      </AtlasCard>

      <AtlasCard title="Related surfaces" variant="quiet">
        <Text>
          Use <Link to="/banking">Banking</Link> for Plaid Sandbox. Financial Intelligence at{' '}
          <Link to="/financials">/financials</Link> shows pending labels until verified sources connect.
        </Text>
      </AtlasCard>
    </ModuleScaffold>
  );
}
