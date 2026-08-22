import { Link } from 'react-router-dom';
import { AtlasCard, InsightCard, StatusChip, ResponsiveGrid } from '@hvcg/atlas-design-system';
import { MessageBar, MessageBarBody, MessageBarTitle, Text, Caption1, Button } from '@fluentui/react-components';
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
      subtitle="QuickBooks Online — professional status dashboard (Phase 1 not yet integrated)."
      showPendingBanner={false}
      actions={
        <Button appearance="secondary" size="small" disabled>
          Connect QuickBooks
        </Button>
      }
    >
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>BLOCKED — QuickBooks specialist work incomplete</MessageBarTitle>
          No completed QuickBooks integration branch was found. Atlas will not show a fake connected state.
          Bank data (Plaid) remains a separate source with distinct lineage.
        </MessageBarBody>
      </MessageBar>

      <ResponsiveGrid>
        <AtlasCard variant="glass" title="QuickBooks status">
          <StatusChip label="Not connected" tone="warning" />
          <Caption1 style={{ display: 'block', marginTop: 10 }}>Sandbox OAuth not configured</Caption1>
        </AtlasCard>
        <AtlasCard variant="glass" title="Sync health">
          <StatusChip label="Idle" tone="neutral" />
          <Caption1 style={{ display: 'block', marginTop: 10 }}>No sync jobs scheduled</Caption1>
        </AtlasCard>
        <AtlasCard variant="glass" title="Open issues">
          <Text weight="semibold" size={500}>
            1
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 6 }}>Integration blocked pending specialist</Caption1>
        </AtlasCard>
        <AtlasCard variant="glass" title="Source lineage">
          <StatusChip label="Accounting ≠ Bank" tone="info" />
          <Caption1 style={{ display: 'block', marginTop: 10 }}>Kept distinct from Plaid VerifiedBank</Caption1>
        </AtlasCard>
      </ResponsiveGrid>

      <AtlasCard title="Statements" subtitle="P&L · Balance Sheet · Cash Flow — pending verified QBO">
        <FieldGrid
          fields={[
            { label: 'Profit & Loss', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
            { label: 'Balance Sheet', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
            { label: 'Cash Flow', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
            { label: 'Reconciliation vs bank', value: 'Data connection pending', availability: 'Data connection pending' },
          ]}
        />
      </AtlasCard>

      <InsightCard
        title="AI recommendations"
        body="When QuickBooks Sandbox is connected, Atlas will surface sync exceptions, missing periods, and reconciliation gaps — never invented ledger totals."
        actions={
          <Link to="/banking">
            <Button size="small" appearance="secondary">
              Review banking lineage
            </Button>
          </Link>
        }
      />

      <AtlasCard title="Accounting timeline" subtitle="Phase roadmap">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <Text size={300}>OAuth connect to QuickBooks Sandbox (read-only)</Text>
          </li>
          <li>
            <Text size={300}>Pull chart of accounts, invoices, bills, and balances</Text>
          </li>
          <li>
            <Text size={300}>Preserve source lineage: Accounting vs VerifiedBank</Text>
          </li>
          <li>
            <Text size={300}>Reconciliation status visible next to Plaid cash</Text>
          </li>
        </ul>
        <Caption1 style={{ display: 'block', marginTop: 12 }}>
          Owner action: assign QuickBooks Integration agent when Finance model is stable.
        </Caption1>
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
