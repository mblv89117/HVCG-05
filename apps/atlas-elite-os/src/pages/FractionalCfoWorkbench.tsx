/**
 * Fractional CFO Finance Workbench — extends Elite /financials (no second Finance SPA).
 * Development fixtures only. PENDING_LIVE_SOURCE for QBO/Plaid. BL-C1 blocks auto-send.
 * Pricing from canonical OFF-FCFO-OP — not hard-coded here.
 */
import { useState } from 'react';
import { AtlasCard, EmptyState, SectionHeader, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text, Textarea } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';

type Panel =
  | 'overview'
  | 'monthly'
  | 'cash'
  | 'ar'
  | 'ap'
  | 'budget'
  | 'wip'
  | 'kpis'
  | 'issues'
  | 'reports'
  | 'decisions'
  | 'capital';

const DEV = {
  client: 'E2E CFO Co (Dev Fixture)',
  offer: 'OFF-FCFO-OP',
  period: '2026-07',
  cycleState: 'CLIENT_REVIEW_READY',
  cash: 'Awaiting verified bank source',
  forecastEnding: 'BASE scenario — approved internally',
  ar: 'Aging present from manual upload (not QBO live)',
  ap: 'Open AP from client upload',
  wip: 'NOT_APPLICABLE',
  fiAdapter: 'PENDING_LIVE_SOURCE',
  capitalMonitor: 'Stable',
  disclaimer: 'HVCG advisory management reporting — not CPA attestation.',
};

export function FractionalCfoWorkbench() {
  const [panel, setPanel] = useState<Panel>('overview');
  const [toast, setToast] = useState<string | null>(null);

  const tabs: Array<[Panel, string]> = [
    ['overview', 'Overview'],
    ['monthly', 'Monthly Review'],
    ['cash', 'Cash Forecast'],
    ['ar', 'AR'],
    ['ap', 'AP'],
    ['budget', 'Budget'],
    ['wip', 'WIP'],
    ['kpis', 'KPIs'],
    ['issues', 'Issues'],
    ['reports', 'Reports'],
    ['decisions', 'Decisions'],
    ['capital', 'Capital Readiness'],
  ];

  return (
    <ModuleScaffold
      title="Financial Performance"
      subtitle="Fractional CFO Operating Partner cadence — extends Finance Ops / FI (no second Finance app)"
      showPendingBanner={false}
    >
      {toast ? (
        <AtlasCard variant="quiet">
          <Text size={300}>{toast}</Text>
        </AtlasCard>
      ) : null}

      <Caption1 style={{ display: 'block', marginBottom: 8 }}>
        Offer {DEV.offer} · Adapter {DEV.fiAdapter} · No hard-coded pricing · No fabricated live QBO/Plaid facts
      </Caption1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {tabs.map(([id, label]) => (
          <Button key={id} size="small" appearance={panel === id ? 'primary' : 'secondary'} onClick={() => setPanel(id)}>
            {label}
          </Button>
        ))}
      </div>

      {panel === 'overview' ? (
        <AtlasCard title="CFO Engagement overview" subtitle={DEV.client}>
          <StatusChip label={DEV.cycleState} tone="gold" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Period {DEV.period}</Caption1>
          <Caption1 style={{ display: 'block' }}>FACT / CALCULATION / AI_INFERENCE / ADVISOR_JUDGMENT kept distinct.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'monthly' ? (
        <AtlasCard title="Monthly operating cycle" subtitle="Advisory close — not CPA attestation">
          <Caption1>Waiting → Collection → Validation → Review → Forecast → KPI → Advisor → Client Review Ready → Complete</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'cash' ? (
        <AtlasCard title="13-week cash forecast" subtitle="BASE · CONSERVATIVE · GROWTH">
          <Text size={300}>{DEV.forecastEnding}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>AI-suggested inputs require human approval before becoming forecast facts.</Caption1>
          <EmptyState title="Live bank snapshot pending" description={`Status: ${DEV.fiAdapter}`} />
        </AtlasCard>
      ) : null}

      {panel === 'ar' ? (
        <AtlasCard title="AR management" subtitle="Does not modify accounting records">
          <Caption1>{DEV.ar}</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Aging buckets + concentration — evidence only.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'ap' ? (
        <AtlasCard title="AP management" subtitle="No automatic payments">
          <Caption1>{DEV.ap}</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'budget' ? (
        <AtlasCard title="Budget vs Actual" subtitle="Approved budget not overwritten by forecasts">
          <Caption1>Materiality thresholds configurable in cfo-operating-policy.json</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'wip' ? (
        <AtlasCard title="WIP" subtitle="Conditional">
          <StatusChip label={DEV.wip} tone="neutral" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Use NOT_APPLICABLE — never fake zeros for non-project firms.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'kpis' ? (
        <AtlasCard title="KPI scorecard" subtitle="Evidence-supported metrics only">
          <Caption1>Targets require visible origin (client-approved / HVCG recommendation / sourced benchmark).</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'issues' ? (
        <AtlasCard title="Financial issue register" subtitle="Internal">
          <Caption1>Cash shortfall · stale AR · AP pressure · source conflict · WIP — with evidence and owner.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'reports' ? (
        <AtlasCard title="Management report draft" subtitle="Versioned · human-approved · BL-C1">
          <Textarea
            readOnly
            rows={8}
            value={`# HVCG MONTHLY MANAGEMENT REPORT (DRAFT)\nPeriod: ${DEV.period}\n[ADVISOR_JUDGMENT] pending commentary\n${DEV.disclaimer}`}
          />
          <Button style={{ marginTop: 8 }} onClick={() => setToast('Client send blocked — BL-C1')}>
            Attempt client send (must fail)
          </Button>
        </AtlasCard>
      ) : null}

      {panel === 'decisions' ? (
        <AtlasCard title="Decision register" subtitle="Institutional knowledge">
          <Caption1>Owner decisions with supporting data, expected impact, follow-up.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'capital' ? (
        <AtlasCard title="Capital Readiness continuity" subtitle="Reuses Sprint 5–6 engines">
          <StatusChip label={DEV.capitalMonitor} tone="success" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Monitor only — no auto-regeneration of official readiness. CFO→Capital recommendation requires human approval; no lender contact.
          </Caption1>
        </AtlasCard>
      ) : null}

      <SectionHeader title="Governance" subtitle="AI assists · humans approve · Production protected" />
      <Caption1>{DEV.disclaimer}</Caption1>
    </ModuleScaffold>
  );
}
