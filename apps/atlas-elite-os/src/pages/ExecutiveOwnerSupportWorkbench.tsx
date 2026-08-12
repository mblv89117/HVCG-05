/**
 * Executive Owner Support + Decision Intelligence (Development).
 * Extends Elite ECC / Ask Atlas — no second executive app or Owner portal.
 * DENY unless explicitly authorized · Concierge is not a superuser · BL-C1 active.
 */
import { useState } from 'react';
import { AtlasCard, EmptyState, SectionHeader, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';

type Panel = 'brief' | 'decisions' | 'matters' | 'concierge' | 'intel' | 'gates';

export function ExecutiveOwnerSupportWorkbench() {
  const [panel, setPanel] = useState<Panel>('brief');
  const [toast, setToast] = useState<string | null>(null);

  const tabs: Array<[Panel, string]> = [
    ['brief', 'Owner Brief'],
    ['decisions', 'Decisions'],
    ['matters', 'Owner Support'],
    ['concierge', 'Concierge'],
    ['intel', 'Executive Intel'],
    ['gates', 'Gates'],
  ];

  return (
    <ModuleScaffold
      title="Executive Owner Support"
      subtitle="What needs Manny's attention · AI_RECOMMENDATION ≠ OWNER_DECISION · DENY unless authorized"
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

      {panel === 'brief' ? (
        <AtlasCard title="Owner Brief" subtitle="Materiality over chronology · domain SoRs remain authoritative">
          {[
            'Decisions Required',
            'Approvals Waiting',
            'Cash / Revenue',
            'Capital',
            'Client Risks',
            'Procurement / Contract Deadlines',
            'Growth / Operating Commitments',
            'Client Success',
            'Documents / Evidence Gaps',
            'Owner Support / Private Matters',
            'Upcoming Deadlines',
            'Material Changes Since Prior Brief',
          ].map((s) => (
            <Caption1 key={s} style={{ display: 'block', marginBottom: 4 }}>
              {s}
            </Caption1>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 10 }}>
            Stale / disputed / forecast / AI-extracted evidence labeled — never presented as verified fact.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'decisions' ? (
        <AtlasCard title="Decision queue" subtitle="Extends HVCG_Decisions — not a second decision platform">
          <SectionHeader title="Lifecycle" subtitle="DRAFT → READY_FOR_OWNER → DECIDED → … → OUTCOME_REVIEWED" />
          <Button
            appearance="primary"
            style={{ marginTop: 12 }}
            onClick={() => setToast('AI cannot self-approve. Owner action required to mark DECIDED.')}
          >
            Simulate AI self-approve
          </Button>
          <Button
            appearance="secondary"
            style={{ marginLeft: 8, marginTop: 12 }}
            onClick={() => setToast('Owner decided · expected vs actual outcome loop available · original preserved.')}
          >
            Record Owner decision
          </Button>
          <Caption1 style={{ display: 'block', marginTop: 10 }}>
            ACCG $4,539/mo protected. Recommendations are not contracts. No automatic legacy repricing.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'matters' ? (
        <AtlasCard title="Owner Support matters" subtitle="Restricted · SharePoint bytes · document_os metadata">
          <StatusChip label="OWNER_SUPPORT_RESTRICTED" tone="warning" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Not in general Client Portal · Client 360 · Second Brain · or ordinary Success views.
          </Caption1>
          <EmptyState
            title="Authorized scope only"
            description="Mortgage readiness · estate/trust coordination · founder decisions · confidential projects — advisory/coordination only; not a law/CPA/broker firm."
          />
        </AtlasCard>
      ) : null}

      {panel === 'concierge' ? (
        <AtlasCard title="AGT-CONCIERGE" subtitle="FULL_DEV_RUNTIME · PRODUCTION_GATED · permission parity · not a superuser">
          <Text size={300} style={{ display: 'block' }}>
            Intake · evidence · checklists · options · drafts · approvals · internal follow-ups
          </Text>
          <Button
            appearance="secondary"
            style={{ marginTop: 12 }}
            onClick={() => setToast('BL-C1: external send BLOCKED_POLICY — draft only (APPROVED_TO_SEND ≠ AUTO_SEND).')}
          >
            Attempt external send
          </Button>
          <Caption1 style={{ display: 'block', marginTop: 10 }}>
            Cannot escalate permissions beyond the invoking human. Single Atlas governance plane.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'intel' ? (
        <AtlasCard title="Executive Intelligence" subtitle="Aggregates domain truth · does not become SoR">
          <Caption1 style={{ display: 'block' }}>
            Revenue · CFO · Capital · Procurement · Risk · Growth · Success · Documents · Approvals · Second Brain
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            PIPELINE ≠ PROPOSED ≠ CONTRACTED ≠ INVOICED ≠ COLLECTED. Drill through to canonical records.
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'gates' ? (
        <AtlasCard title="Production gates unchanged" subtitle="Dev UI ≠ Production approval">
          <StatusChip label="GATE-RISK-ELEVATED-ACL-PROD" tone="warning" />
          <StatusChip label="GATE-CLIENT-PORTAL-PROD" tone="warning" />
          <StatusChip label="GATE-M365-SECOND-BRAIN-PROD" tone="warning" />
          <Caption1 style={{ display: 'block', marginTop: 10 }}>BL-C1 · Track 1 frozen · no money movement · no live Graph RAG.</Caption1>
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}

export function Client360ExecutiveFlags({ clientHint }: { clientHint?: string }) {
  return (
    <AtlasCard title="Executive attention" subtitle="Ordinary Client 360 — Owner Support private data excluded">
      <Caption1 style={{ display: 'block', marginBottom: 6 }}>Client: {clientHint || '—'}</Caption1>
      <Text size={300}>Open decisions · pending approvals · material commitments · next actions</Text>
      <Caption1 style={{ display: 'block', marginTop: 8 }}>
        Restricted Owner Support requires explicit authorized context — not shown here by default.
      </Caption1>
    </AtlasCard>
  );
}
