/**
 * Contract Procurement & Government Readiness workbench — extends Elite shell (no second SPA).
 * Dev fixtures only. External submissions gated (BL-C1). Pricing from OFF-PROC-READY / OFF-GOV-SETUP.
 */
import { useState } from 'react';
import { AtlasCard, EmptyState, SectionHeader, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text, Textarea } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';

type Panel =
  | 'overview'
  | 'readiness'
  | 'registrations'
  | 'capability'
  | 'past'
  | 'certs'
  | 'opportunities'
  | 'pursuits'
  | 'requirements'
  | 'proposals'
  | 'awards'
  | 'postaward';

const DEV = {
  client: 'E2E Proc Co (Dev Fixture)',
  offer: 'OFF-PROC-READY',
  readiness: 'READY_WITH_GAPS',
  registration: 'APPROVED_TO_SUBMIT (gated)',
  disclaimer:
    'HVCG provides readiness, documentation, registration preparation, proposal support, and coordination. HVCG does not guarantee contract awards.',
};

export function ProcurementWorkbench() {
  const [panel, setPanel] = useState<Panel>('overview');
  const [toast, setToast] = useState<string | null>(null);

  const tabs: Array<[Panel, string]> = [
    ['overview', 'Overview'],
    ['readiness', 'Readiness'],
    ['registrations', 'Registrations'],
    ['capability', 'Capability Statement'],
    ['past', 'Past Performance'],
    ['certs', 'Certifications'],
    ['opportunities', 'Opportunities'],
    ['pursuits', 'Pursuits'],
    ['requirements', 'Requirements'],
    ['proposals', 'Proposals'],
    ['awards', 'Awards'],
    ['postaward', 'Post-Award'],
  ];

  return (
    <ModuleScaffold
      title="Contract Procurement"
      subtitle="Procurement Readiness & Government Setup — extends Elite (no second Procurement SPA)"
      showPendingBanner={false}
    >
      {toast ? (
        <AtlasCard variant="quiet">
          <Text size={300}>{toast}</Text>
        </AtlasCard>
      ) : null}

      <Caption1 style={{ display: 'block', marginBottom: 8 }}>
        Offers {DEV.offer} / OFF-GOV-SETUP · Pricing from catalog · No hard-coded fees · BL-C1 external gate active
      </Caption1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {tabs.map(([id, label]) => (
          <Button key={id} size="small" appearance={panel === id ? 'primary' : 'secondary'} onClick={() => setPanel(id)}>
            {label}
          </Button>
        ))}
      </div>

      {panel === 'overview' ? (
        <AtlasCard title="Procurement Engagement" subtitle={DEV.client}>
          <StatusChip label={DEV.readiness} tone="gold" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Registration: {DEV.registration}</Caption1>
          <Caption1 style={{ display: 'block' }}>Estimated ≠ Bid ≠ Awarded ≠ Collected · HVCG fee separate</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'readiness' ? (
        <AtlasCard title="Readiness assessment" subtitle="Status-based — no arbitrary numeric score">
          <Caption1>Entity · Registration · Insurance · Past Performance · Capability · Capacity · Proposal · Admin</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>AI observations are not authoritative compliance determinations.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'registrations' ? (
        <AtlasCard title="Government / vendor registrations" subtitle="AGT-GOV-REG · preparation only">
          <StatusChip label="SUBMISSION_GATED" tone="warning" />
          <Button style={{ marginTop: 8 }} onClick={() => setToast('SAM.gov submit blocked — BL-C1 / human gate')}>
            Attempt SAM submit (must fail)
          </Button>
        </AtlasCard>
      ) : null}

      {panel === 'capability' ? (
        <AtlasCard title="Capability statement" subtitle="Versioned · sourced claims only">
          <Caption1>AI may not invent past performance, certifications, headcount, bonding, or client relationships.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'past' ? (
        <AtlasCard title="Past performance registry" subtitle="Verified evidence required">
          <EmptyState title="No fabricated experience" description="Missing past performance is a gap — not invented." />
        </AtlasCard>
      ) : null}

      {panel === 'certs' ? (
        <AtlasCard title="Licenses / certifications / insurance" subtitle="Application ≠ certification">
          <Caption1>Insurance gaps flag for broker/advisor review — no binding coverage opinions.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'opportunities' ? (
        <AtlasCard title="Opportunity pipeline" subtitle="Source provenance required">
          <Caption1>Live external opportunity feeds require separate integration approval — not silently activated.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'pursuits' ? (
        <AtlasCard title="Bid / No-Bid" subtitle="Human approval required">
          <Caption1>PURSUE · PURSUE_WITH_CONDITIONS · HOLD · DECLINE — AI may recommend, not commit.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'requirements' ? (
        <AtlasCard title="Requirements / compliance matrix" subtitle="SOURCE ≠ INTERPRETATION ≠ CLIENT RESPONSE">
          <Caption1>Do not invent solicitation requirements absent from source.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'proposals' ? (
        <AtlasCard title="Proposal support" subtitle="Reuses AGT-PROPOSAL — no second engine">
          <Textarea readOnly rows={5} value={`# PROPOSAL DRAFT\nPricing requires human approval.\nSubmission gated.`} />
          <Button style={{ marginTop: 8 }} onClick={() => setToast('Proposal submit blocked — BL-C1')}>
            Attempt proposal submit (must fail)
          </Button>
        </AtlasCard>
      ) : null}

      {panel === 'awards' ? (
        <AtlasCard title="Awards" subtitle="Forecast ≠ Award">
          <Caption1>Awarded Contract Value ≠ Collected Client Revenue ≠ HVCG Success Fee.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'postaward' ? (
        <AtlasCard title="Post-award foundation" subtitle="Handoff to Ops / CFO / Capital / Client Success">
          <Caption1>Reuses Ops Hub — not a duplicate PM platform. Mobilization capital uses existing Capital engine.</Caption1>
        </AtlasCard>
      ) : null}

      <SectionHeader title="Governance" subtitle="AI drafts · humans decide · Production protected" />
      <Caption1>{DEV.disclaimer}</Caption1>
    </ModuleScaffold>
  );
}
