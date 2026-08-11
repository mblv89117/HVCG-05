/**
 * Capital Readiness workbench — Development UI extending Elite /capital.
 * Scores/docs are illustrative Dev fixtures bound to BA-C engine contracts.
 * No lender contact. No fabricated live client financials as facts.
 */
import { useMemo, useState } from 'react';
import {
  AtlasCard,
  DataTable,
  EmptyState,
  SectionHeader,
  StatusChip,
} from '@hvcg/atlas-design-system';
import { Button, Caption1, Field, Input, Text, Textarea } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';

type Panel = 'pipeline' | 'readiness' | 'documentation' | 'financial' | 'funding' | 'package' | 'approval';

/** Dev-only demo case — labeled Development fixture, not live Production data. */
const DEV_CASE = {
  id: 'cap-dev-001',
  client: 'E2E Capital Co (Dev Fixture)',
  amount: 600000,
  capitalType: 'SBA',
  fundingStatus: 'Identified',
  readinessScore: 88,
  band: 'CAPITAL_READY',
  docCompleteness: 100,
  nextStep: 'READY_FOR_LENDER_READY_PACKAGE',
  concerns: [] as string[],
  strengths: ['STRONG_REVENUE_HISTORY', 'POSITIVE_CASH_FLOW', 'DOCUMENTATION_COMPLETE'],
  fundingPath: 'SBA_7A',
  packageStatus: 'READY_FOR_PACKAGE_BUILD',
  approval: 'PENDING',
  disclaimer:
    'Financing outcomes are determined by third-party lenders and capital providers. HVCG does not guarantee approval, terms, or funding.',
};

export function CapitalReadinessWorkbench() {
  const [panel, setPanel] = useState<Panel>('readiness');
  const [approval, setApproval] = useState(DEV_CASE.approval);
  const [toast, setToast] = useState<string | null>(null);
  const [memo] = useState(
    `# CAPITAL READINESS SUMMARY (DRAFT)\n\nClient: ${DEV_CASE.client}\nScore: ${DEV_CASE.readinessScore} (${DEV_CASE.band})\nNext step: ${DEV_CASE.nextStep}\n\nHuman review required. Not a lender commitment.\n\n${DEV_CASE.disclaimer}`
  );

  const rows = useMemo(() => [DEV_CASE], []);

  function approve() {
    setApproval('APPROVED');
    setToast('Human approval recorded — package handoff READY_FOR_PACKAGE_BUILD; lender submit blocked');
    setPanel('package');
  }

  return (
    <ModuleScaffold
      title="Capital Advisory"
      subtitle="Pipeline · Readiness · Documentation · Funding path — Development workbench (no lender contact)"
      showPendingBanner={false}
    >
      {toast ? (
        <AtlasCard variant="quiet">
          <Text size={300}>{toast}</Text>
        </AtlasCard>
      ) : null}

      <Caption1 style={{ display: 'block', marginBottom: 8 }}>
        Demo fixtures are labeled Development only. Live SharePoint capital books bind when authorized sources connect.
      </Caption1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {(
          [
            ['pipeline', 'Pipeline'],
            ['readiness', 'Readiness'],
            ['documentation', 'Documentation'],
            ['financial', 'Financial'],
            ['funding', 'Funding Path'],
            ['package', 'Package'],
            ['approval', 'Approval'],
          ] as Array<[Panel, string]>
        ).map(([id, label]) => (
          <Button key={id} size="small" appearance={panel === id ? 'primary' : 'secondary'} onClick={() => setPanel(id)}>
            {label}
          </Button>
        ))}
      </div>

      {panel === 'pipeline' ? (
        <AtlasCard title="Capital opportunities" subtitle="Reuses HVCG_CapitalOpportunities contract">
          <DataTable
            ariaLabel="Capital pipeline"
            getRowKey={(r) => r.id}
            rows={rows}
            columns={[
              { key: 'client', header: 'Client', render: (r) => r.client },
              { key: 'type', header: 'Type', render: (r) => r.capitalType },
              {
                key: 'amount',
                header: 'Requested',
                render: (r) => `$${r.amount.toLocaleString()}`,
              },
              { key: 'status', header: 'Funding status', render: (r) => r.fundingStatus },
              {
                key: 'score',
                header: 'Readiness',
                render: (r) => <StatusChip label={`${r.readinessScore} ${r.band}`} tone="gold" />,
              },
            ]}
          />
        </AtlasCard>
      ) : null}

      {panel === 'readiness' ? (
        <AtlasCard title="Capital Readiness Score" subtitle="Explainable · advisory · not approval probability">
          <Text weight="semibold" size={600}>
            {DEV_CASE.readinessScore} / 100
          </Text>
          <StatusChip label={DEV_CASE.band} tone="success" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Next step: {DEV_CASE.nextStep}</Caption1>
          <SectionHeader title="Dimensions (policy-weighted)" subtitle="Weights live in capital-readiness-scoring.json" />
          <Caption1>Financial 25% · Documentation 20% · Debt/Cashflow 20% · Stability 15% · Request clarity 10% · Lender/Txn 10%</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Evidence kinds: FACT · CALCULATED · AI INFERENCE · ADVISOR JUDGMENT — kept distinct.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'documentation' ? (
        <AtlasCard title="Document completeness" subtitle="MISSING ≠ FAILED · conditional by financing type">
          <Text size={500}>{DEV_CASE.docCompleteness}% complete</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Completeness is not lender readiness. Checklist generated via AGT-DOC-CHECKLIST for {DEV_CASE.capitalType}.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'financial' ? (
        <AtlasCard title="Financial signals" subtitle="Provenance required — no mock facts as client truth">
          <EmptyState
            title="Bind Finance Ops / FI adapters when authorized"
            description="Until verified sources connect, signals remain pending. DSCR shows INSUFFICIENT_DATA when inputs are missing."
          />
        </AtlasCard>
      ) : null}

      {panel === 'funding' ? (
        <AtlasCard title="Funding path recommendation" subtitle="Advisory · human-approved · no securities automation">
          <StatusChip label={DEV_CASE.fundingPath} tone="gold" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Paths are recommendations only — not lender commitments.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'package' ? (
        <AtlasCard title="Lender-Ready Capital Package handoff" subtitle="AGT-FIN-PKG contract · submit blocked">
          <Text size={300}>Status: {DEV_CASE.packageStatus}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            canSubmitToLender = false · BL-C1 active · no automated lender submission
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'approval' ? (
        <AtlasCard title="Human approval" subtitle="Required for conclusion, path, and package handoff">
          <Field label="Approval state">
            <Input value={approval} readOnly />
          </Field>
          <Field label="Memo draft (review)">
            <Textarea value={memo} readOnly rows={12} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button appearance="primary" onClick={approve}>
              Approve readiness conclusion
            </Button>
            <Button onClick={() => setToast('Lender contact blocked — not authorized in Sprint 5')}>
              Attempt lender contact (must fail)
            </Button>
          </div>
          <Caption1 style={{ display: 'block', marginTop: 12 }}>{DEV_CASE.disclaimer}</Caption1>
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}
