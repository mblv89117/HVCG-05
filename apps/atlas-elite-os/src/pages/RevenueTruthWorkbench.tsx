/**
 * Revenue Truth workbench — extends Revenue OS (no second billing/Finance shell).
 * Distinguishes Pipeline · Proposed · Contracted · Invoiced · Collected.
 * Development fixtures only — not live HVCG financials.
 */
import { useState } from 'react';
import { AtlasCard, EmptyState, SectionHeader, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';

type Panel =
  | 'summary'
  | 'economics'
  | 'invoices'
  | 'payments'
  | 'reconciliation'
  | 'success'
  | 'referrals'
  | 'exceptions'
  | 'approvals'
  | 'aging';

const FIXTURE = {
  disclaimer: 'Development fixtures only — not live HVCG financials. HVCG AR ≠ client AR.',
  pipeline: '— pending verified source',
  proposed: '—',
  contracted: '$5,000/mo example engagement',
  invoiced: '$5,000',
  collected: '$2,000',
  outstanding: '$3,000',
  successEarned: '$20,000 (Capital fee — not funded capital)',
  successCollected: '$0 until HVCG payment',
  referralPayable: '$3,000 APPROVED → STOP before payout',
  referralPaid: '$0',
};

export function RevenueTruthWorkbench() {
  const [panel, setPanel] = useState<Panel>('summary');
  const [toast, setToast] = useState<string | null>(null);

  const tabs: Array<[Panel, string]> = [
    ['summary', 'Revenue Summary'],
    ['economics', 'Engagement Economics'],
    ['invoices', 'Invoices'],
    ['payments', 'Payments'],
    ['reconciliation', 'Reconciliation'],
    ['success', 'Success Fees'],
    ['referrals', 'Referrals'],
    ['exceptions', 'Exceptions'],
    ['approvals', 'Approvals'],
    ['aging', 'Aging'],
  ];

  return (
    <ModuleScaffold
      title="Revenue & Billing Truth"
      subtitle="HVCG internal money loop · not a second GL · BL-C1 active · Production payouts DISABLED"
      showPendingBanner={false}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {tabs.map(([id, label]) => (
          <Button key={id} appearance={panel === id ? 'primary' : 'secondary'} onClick={() => setPanel(id)}>
            {label}
          </Button>
        ))}
      </div>
      {toast ? <Caption1 style={{ display: 'block', marginBottom: 12 }}>{toast}</Caption1> : null}

      {panel === 'summary' ? (
        <AtlasCard title="Truth buckets" subtitle="Never collapse these states">
          {[
            ['Pipeline', FIXTURE.pipeline],
            ['Proposed', FIXTURE.proposed],
            ['Contracted', FIXTURE.contracted],
            ['Invoiced', FIXTURE.invoiced],
            ['Collected', FIXTURE.collected],
            ['Outstanding', FIXTURE.outstanding],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text weight="semibold">{k}</Text>
              <Caption1>{v}</Caption1>
            </div>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 10 }}>{FIXTURE.disclaimer}</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'economics' ? (
        <AtlasCard title="Contracted economics" subtitle="Executed agreement governs — recommended ≠ contracted">
          <Text size={300}>Setup · Retainer · Success fee · Referral relationship · Legacy protection</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>ACCG locked at $4,539/mo — V2 recommended is separate.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'invoices' ? (
        <AtlasCard title="Invoices" subtitle="DRAFT → ISSUED → DUE → PARTIALLY_PAID → PAID · Proposal accept ≠ PAID">
          <StatusChip label="PARTIALLY_PAID $2,000 / $5,000" tone="warning" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Historical invoice identifiers are immutable.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'payments' ? (
        <AtlasCard title="Payments" subtitle="Verified source provenance required">
          <Text size={300}>Bank / processor / accounting / manually verified receipt</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>AI extraction alone is not valid payment evidence.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'reconciliation' ? (
        <AtlasCard title="Reconciliation" subtitle="Exact · partial · multi-invoice · unapplied · duplicate · conflict">
          <StatusChip label="PARTIALLY_RECONCILED" tone="gold" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>SOURCE_CONFLICT requires human resolution — no silent selection.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'success' ? (
        <AtlasCard title="Success fees" subtitle="Funded capital / award / recovery ≠ HVCG collected">
          <Text size={300}>Earned: {FIXTURE.successEarned}</Text>
          <Text size={300} style={{ display: 'block', marginTop: 6 }}>
            Collected: {FIXTURE.successCollected}
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>MISSING_AGREEMENT → no earned fee.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'referrals' ? (
        <AtlasCard title="Referral economics" subtitle="Based on eligible collected HVCG revenue">
          <Text size={300}>Payable: {FIXTURE.referralPayable}</Text>
          <Text size={300} style={{ display: 'block', marginTop: 6 }}>
            Paid: {FIXTURE.referralPaid}
          </Text>
          <Button
            appearance="secondary"
            style={{ marginTop: 12 }}
            onClick={() => setToast('Payout execution DISABLED — ACH/check/transfer not authorized.')}
          >
            Attempt payout
          </Button>
        </AtlasCard>
      ) : null}

      {panel === 'exceptions' ? (
        <EmptyState title="Exceptions queue" description="Duplicates · source conflicts · unapplied payments · adjustment audits." />
      ) : null}

      {panel === 'approvals' ? (
        <AtlasCard title="Approvals" subtitle="Single HVCG_Approvals plane">
          {['SuccessFeeTrigger', 'ReferralPayout', 'Refund', 'WriteOff', 'ManualRevenueAdjustment'].map((t) => (
            <StatusChip key={t} label={t} tone="neutral" />
          ))}
        </AtlasCard>
      ) : null}

      {panel === 'aging' ? (
        <AtlasCard title="HVCG AR aging" subtitle="Distinct from client AR (CFO)">
          <SectionHeader title="Buckets" subtitle="Current · 1–30 · 31–60 · 61–90 · 90+" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Collection reminder drafts only — BL-C1 blocks send.
          </Caption1>
          <Button
            appearance="secondary"
            style={{ marginTop: 12 }}
            onClick={() => setToast('BL-C1: collection reminder send BLOCKED_POLICY.')}
          >
            Attempt send reminder
          </Button>
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}
