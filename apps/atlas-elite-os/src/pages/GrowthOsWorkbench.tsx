/**
 * Growth Operating System workbench — extends Elite (no second CRM/PM/Client 360 shell).
 * Consumes Revenue/CFO/Capital/Procurement/Risk/Ops as SoRs. Pricing from OFF-GROWTH-OS.
 */
import { useState } from 'react';
import { AtlasCard, EmptyState, SectionHeader, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text, Textarea } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';

type Panel =
  | 'overview'
  | 'plan'
  | 'scorecard'
  | 'priorities'
  | 'initiatives'
  | 'meetings'
  | 'commitments'
  | 'issues'
  | 'decisions'
  | 'sops'
  | 'processes'
  | 'automations';

const DEV = {
  client: 'E2E Growth Co (Dev Fixture)',
  offer: 'OFF-GROWTH-OS',
  plan: '90-Day Plan v1 ACTIVE',
  kpiHealth: 'WATCH — variance explained',
  disclaimer:
    'Growth OS connects strategy to accountable execution. Domain SoRs remain Revenue, CFO, Capital, Procurement, Risk, and Ops. Not a second task manager or CRM.',
};

export function GrowthOsWorkbench() {
  const [panel, setPanel] = useState<Panel>('overview');
  const [toast, setToast] = useState<string | null>(null);

  const tabs: Array<[Panel, string]> = [
    ['overview', 'Overview'],
    ['plan', '90-Day Plan'],
    ['scorecard', 'Scorecard'],
    ['priorities', 'Priorities'],
    ['initiatives', 'Initiatives'],
    ['meetings', 'Meetings'],
    ['commitments', 'Commitments'],
    ['issues', 'Issues'],
    ['decisions', 'Decisions'],
    ['sops', 'SOPs'],
    ['processes', 'Processes'],
    ['automations', 'Automations'],
  ];

  return (
    <ModuleScaffold
      title="Growth Operating System"
      subtitle="Strategy → Priorities → KPIs → Initiatives → Ops execution — extends Elite / Ops Hub"
      showPendingBanner={false}
    >
      {toast ? (
        <AtlasCard variant="quiet">
          <Text size={300}>{toast}</Text>
        </AtlasCard>
      ) : null}

      <Caption1 style={{ display: 'block', marginBottom: 8 }}>
        Offer {DEV.offer} · Pricing from catalog · No hard-coded fees · BL-C1 · Default 3–5 priorities
      </Caption1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {tabs.map(([id, label]) => (
          <Button key={id} size="small" appearance={panel === id ? 'primary' : 'secondary'} onClick={() => setPanel(id)}>
            {label}
          </Button>
        ))}
      </div>

      {panel === 'overview' ? (
        <AtlasCard title="Growth Engagement" subtitle={DEV.client}>
          <StatusChip label={DEV.plan} tone="gold" />
          <StatusChip label={DEV.kpiHealth} tone="warning" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Cash→CFO · Pipeline→Revenue · Readiness→Capital · Pursuit→Procurement · Risk→Risk · Tasks→Ops</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'plan' ? (
        <AtlasCard title="90-Day Growth Plan" subtitle="Versioned — do not rewrite history">
          <Caption1>Focus warning when &gt;5 priorities. Missed priorities are not silently moved forward.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'scorecard' ? (
        <AtlasCard title="KPI scorecard" subtitle="Definitions · sources · target origins required">
          <Caption1>ON_TRACK / WATCH / OFF_TRACK / NO_DATA — explained by thresholds. No fabricated metrics.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'priorities' ? (
        <AtlasCard title="Priorities" subtitle="3–5 recommended">
          <Caption1>Outcome · Owner · Success measure · Related KPI · Confidence</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'initiatives' ? (
        <AtlasCard title="Initiatives" subtitle="Reuse Ops Hub projects/tasks">
          <EmptyState title="No duplicate task engine" description="Initiatives bind to existing project/task infrastructure." />
        </AtlasCard>
      ) : null}

      {panel === 'meetings' ? (
        <AtlasCard title="Weekly Operating Review" subtitle="Reusable meeting records">
          <Caption1>Scorecard → Commitments → Issues → Decisions → New commitments</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'commitments' ? (
        <AtlasCard title="Accountability" subtitle="Carryovers visible — not HR judgments">
          <Caption1>Repeated carryovers raise execution flags. No autonomous employee discipline.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'issues' ? (
        <AtlasCard title="Issue routing" subtitle="Orchestrates visibility — does not recreate domains">
          <Caption1>Cash→CFO · Capital→Capital · Insurance→Risk · Contract→Procurement · Pipeline→Revenue · Process→Ops</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'decisions' ? (
        <AtlasCard title="Decision register" subtitle="Institutional knowledge">
          <Caption1>Reuse HVCG_Decisions patterns. Options · evidence · review date · outcomes.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'sops' ? (
        <AtlasCard title="SOP Library" subtitle="SharePoint architecture — no disconnected repo">
          <Caption1>DRAFT → IN_REVIEW → APPROVED → ACTIVE. AI drafts cannot auto-activate.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'processes' ? (
        <AtlasCard title="Process / workflow maps" subtitle="Bridge to AI">
          <Caption1>Trigger · Steps · Owner · SLA · Automation class · Human-required gate</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'automations' ? (
        <AtlasCard title="Automation opportunities" subtitle="Possible ≠ should">
          <Caption1>Candidates feed later Agent orchestration. No automatic deployment in Sprint 10.</Caption1>
          <Button style={{ marginTop: 8 }} onClick={() => setToast('Client status send blocked — BL-C1')}>
            Attempt client status send (must fail)
          </Button>
        </AtlasCard>
      ) : null}

      <SectionHeader title="Governance" subtitle="AI assists · humans decide · domain SoRs preserved" />
      <Caption1>{DEV.disclaimer}</Caption1>
      <Textarea
        readOnly
        rows={4}
        style={{ marginTop: 8 }}
        value={`# INTERNAL CLIENT STATUS (DRAFT)\nHuman approval before client delivery.\nAGT-SUCCESS / AGT-CRM support only.`}
      />
    </ModuleScaffold>
  );
}
