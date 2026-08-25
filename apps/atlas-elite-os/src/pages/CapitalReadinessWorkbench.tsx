/**
 * Capital Readiness + Lender-Ready Package workbench — Development UI.
 * Extends Elite /capital. Fixtures labeled Development — not live Production facts.
 * No lender submit. No fabricated FI metrics as client truth.
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

type Panel =
  | 'pipeline'
  | 'readiness'
  | 'documentation'
  | 'financial'
  | 'funding'
  | 'package'
  | 'pkgOverview'
  | 'pkgRequirements'
  | 'pkgFinancials'
  | 'pkgDebt'
  | 'pkgProjections'
  | 'pkgUof'
  | 'pkgDataRoom'
  | 'pkgMemo'
  | 'pkgQa'
  | 'pkgApproval'
  | 'pkgLender'
  | 'approval';

const DEV_CASE = {
  id: 'cap-dev-001',
  client: 'E2E Capital Co (Dev Fixture)',
  amount: 750000,
  capitalType: 'SBA',
  fundingStatus: 'Identified',
  readinessScore: 88,
  band: 'CAPITAL_READY',
  docCompleteness: 100,
  packageCompleteness: 100,
  nextStep: 'READY_FOR_LENDER_READY_PACKAGE',
  concerns: [] as string[],
  strengths: ['STRONG_REVENUE_HISTORY', 'POSITIVE_CASH_FLOW', 'DOCUMENTATION_COMPLETE'],
  fundingPath: 'SBA_7A',
  packageStatus: 'SUBMISSION_GATED',
  packageVersion: 'v1',
  qaStatus: 'PASS',
  approval: 'APPROVED_GATED',
  dataRoomStatus: 'Indexed (external sharing Off)',
  lenderPipeline: 'Handoff prepared — submit blocked',
  fiAdapter: 'PENDING_LIVE_SOURCE',
  disclaimer:
    'Financing outcomes are determined by third-party lenders and capital providers. HVCG does not guarantee approval, terms, or funding.',
};

export function CapitalReadinessWorkbench() {
  const [panel, setPanel] = useState<Panel>('pkgOverview');
  const [approval, setApproval] = useState(DEV_CASE.approval);
  const [toast, setToast] = useState<string | null>(null);
  const [memo] = useState(
    `# LENDER MEMO (DRAFT)\n\n[FACT] Capital Request: $${DEV_CASE.amount.toLocaleString()} (${DEV_CASE.capitalType})\n[CALCULATED] Readiness: ${DEV_CASE.readinessScore} ${DEV_CASE.band}\n[PROJECTION] See projections section — not historical.\n[COMPLIANCE] ${DEV_CASE.disclaimer}\n\nHuman approval mandatory. AI draft ≠ fact.`
  );

  const rows = useMemo(() => [DEV_CASE], []);

  function approvePackage() {
    setApproval('APPROVED_GATED');
    setToast('Package approved for lender submission — SUBMISSION_GATED (BL-C1). No auto-submit.');
    setPanel('pkgLender');
  }

  const tabs: Array<[Panel, string]> = [
    ['pipeline', 'Pipeline'],
    ['readiness', 'Readiness'],
    ['documentation', 'Documentation'],
    ['financial', 'Financial'],
    ['funding', 'Funding Path'],
    ['pkgOverview', 'Package Overview'],
    ['pkgRequirements', 'Requirements'],
    ['pkgFinancials', 'Pkg Financials'],
    ['pkgDebt', 'Debt'],
    ['pkgProjections', 'Projections'],
    ['pkgUof', 'Use of Funds'],
    ['pkgDataRoom', 'Data Room'],
    ['pkgMemo', 'Lender Memo'],
    ['pkgQa', 'QA'],
    ['pkgApproval', 'Pkg Approval'],
    ['pkgLender', 'Lender Pipeline'],
    ['approval', 'Readiness Approval'],
  ];

  return (
    <ModuleScaffold
      title="Capital Advisory"
      subtitle="Readiness · Lender-Ready Package · QA — Development workbench (no lender contact)"
      showPendingBanner={false}
    >
      {toast ? (
        <AtlasCard variant="quiet">
          <Text size={300}>{toast}</Text>
        </AtlasCard>
      ) : null}

      <Caption1 style={{ display: 'block', marginBottom: 8 }}>
        Development fixtures only. FI adapter: {DEV_CASE.fiAdapter}. No mock bank/QBO values presented as client fact.
      </Caption1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {tabs.map(([id, label]) => (
          <Button key={id} size="small" appearance={panel === id ? 'primary' : 'secondary'} onClick={() => setPanel(id)}>
            {label}
          </Button>
        ))}
      </div>

      {panel === 'pipeline' ? (
        <AtlasCard title="Capital opportunities" subtitle="Reuses HVCG_CapitalOpportunities">
          <DataTable
            ariaLabel="Capital pipeline"
            getRowKey={(r) => r.id}
            rows={rows}
            columns={[
              { key: 'client', header: 'Client', render: (r) => r.client },
              { key: 'type', header: 'Type', render: (r) => r.capitalType },
              { key: 'amount', header: 'Requested', render: (r) => `$${r.amount.toLocaleString()}` },
              { key: 'pkg', header: 'Package', render: (r) => r.packageStatus },
              {
                key: 'score',
                header: 'Readiness',
                render: (r) => <StatusChip label={`${r.readinessScore}`} tone="gold" />,
              },
            ]}
          />
        </AtlasCard>
      ) : null}

      {panel === 'readiness' ? (
        <AtlasCard title="Capital Readiness Score" subtitle="Advisory · not approval probability">
          <Text weight="semibold" size={600}>
            {DEV_CASE.readinessScore} / 100
          </Text>
          <StatusChip label={DEV_CASE.band} tone="success" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Next step: {DEV_CASE.nextStep}</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'documentation' ? (
        <AtlasCard title="Document completeness" subtitle="MISSING ≠ FAILED">
          <Text size={500}>Readiness docs: {DEV_CASE.docCompleteness}%</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Package completeness is separate: {DEV_CASE.packageCompleteness}%</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'financial' ? (
        <AtlasCard title="Financial signals" subtitle="Provenance required">
          <EmptyState
            title="Finance Ops / FI adapter pending live source"
            description={`Status: ${DEV_CASE.fiAdapter}. Do not insert demo metrics into lender packages.`}
          />
        </AtlasCard>
      ) : null}

      {panel === 'funding' ? (
        <AtlasCard title="Funding path" subtitle="Advisory only">
          <StatusChip label={DEV_CASE.fundingPath} tone="gold" />
        </AtlasCard>
      ) : null}

      {panel === 'pkgOverview' ? (
        <AtlasCard title="Lender-Ready Capital Package" subtitle={`OFF-CAP-PKG · version ${DEV_CASE.packageVersion}`}>
          <Text size={300}>State: {DEV_CASE.packageStatus}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Completeness {DEV_CASE.packageCompleteness}% · QA {DEV_CASE.qaStatus} · Approval {DEV_CASE.approval}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            APPROVED_FOR_LENDER_SUBMISSION ≠ automatic submission (BL-C1).
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'pkgRequirements' ? (
        <AtlasCard title="Conditional package requirements" subtitle="By financing type — not universal">
          <Caption1>SBA checklist generated via AGT-DOC-CHECKLIST / AGT-FIN-PKG. Irrelevant docs not forced.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'pkgFinancials' ? (
        <AtlasCard title="Financial summary" subtitle="Period + source + provenance on every figure">
          <Caption1>Unavailable figures shown as unavailable — never invented.</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Adjustments labeled HVCG ADVISORY ADJUSTMENT (not accounting records).</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'pkgDebt' ? (
        <AtlasCard title="Debt schedule QC" subtitle="Reconciliation vs balance sheet">
          <Caption1>Conflicts raise DEBT_RECONCILIATION_REQUIRED — both values retained.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'pkgProjections' ? (
        <AtlasCard title="Projections" subtitle="Never merged with historical actuals">
          <SectionHeader title="Historical Actual" subtitle="Separated bucket" />
          <Caption1>2025 Revenue (HISTORICAL_ACTUAL)</Caption1>
          <SectionHeader title="Forecast / Scenario" subtitle="Base · Conservative · Growth" />
          <Caption1>HVCG Scenario / Client Forecast — labeled PROJECTION</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'pkgUof' ? (
        <AtlasCard title="Use of Funds" subtitle="Must reconcile to Capital Request">
          <Caption1>Variance surfaces as USE_OF_FUNDS_VARIANCE — blocks silent QA pass.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'pkgDataRoom' ? (
        <AtlasCard title="Data Room index" subtitle="Reuses portal LenderPackage · external Off">
          <Text size={300}>Status: {DEV_CASE.dataRoomStatus}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            OWNER_ONLY / RESTRICTED / INTERNAL_ONLY excluded from lender-facing index.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'pkgMemo' ? (
        <AtlasCard title="Lender memo draft" subtitle="Truth-labeled sections">
          <Textarea value={memo} readOnly rows={12} />
        </AtlasCard>
      ) : null}

      {panel === 'pkgQa' ? (
        <AtlasCard title="Package QA" subtitle="PASS · PASS_WITH_CONDITIONS · FAIL">
          <StatusChip label={DEV_CASE.qaStatus} tone="success" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Overrides require rule, reason, advisor, date, evidence, risk acknowledgment.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'pkgApproval' ? (
        <AtlasCard title="Human approval chain" subtitle="Agent draft → Advisor → QA → Capital approval → gated">
          <Field label="Approval">
            <Input value={approval} readOnly />
          </Field>
          <Button appearance="primary" onClick={approvePackage}>
            Approve for lender submission (gates)
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => setToast('Lender submit blocked — Sprint 6 submission gate / BL-C1')}
          >
            Attempt lender submit (must fail)
          </Button>
        </AtlasCard>
      ) : null}

      {panel === 'pkgLender' ? (
        <AtlasCard title="Lender pipeline handoff" subtitle="Prepared — not submitted">
          <Text size={300}>{DEV_CASE.lenderPipeline}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Funding outcomes: Requested ≠ Submitted ≠ Approved ≠ Funded ≠ Collected HVCG revenue.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'approval' || panel === 'package' ? (
        <AtlasCard title="Readiness approval" subtitle="Prerequisite for package">
          <Caption1>Readiness human approval feeds package readinessApproval evidence.</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>{DEV_CASE.disclaimer}</Caption1>
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}
