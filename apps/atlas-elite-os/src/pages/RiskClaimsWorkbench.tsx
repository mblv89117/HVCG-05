/**
 * Risk, Claims & Liability Reduction workbench — extends Elite (no competing case shell).
 * Distinct from ops project Risks. Elevated / need-to-know. BL-C1 blocks external actions.
 * Pricing from OFF-RISK-REVIEW / OFF-TAX-UE / OFF-CLAIMS — not hard-coded.
 */
import { useState } from 'react';
import { AtlasCard, EmptyState, SectionHeader, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text, Textarea } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';

type Panel =
  | 'overview'
  | 'matters'
  | 'deadlines'
  | 'evidence'
  | 'timeline'
  | 'exposure'
  | 'agency'
  | 'ue'
  | 'insurance'
  | 'claims'
  | 'professional'
  | 'comms'
  | 'outcomes';

const DEV = {
  client: 'E2E Risk Co (Dev Fixture)',
  offer: 'OFF-TAX-UE',
  severity: 'HIGH',
  status: 'APPROVED_TO_SEND (gated)',
  disclaimer:
    'HVCG provides advisory, documentation, preparation, and coordination support. HVCG is not a law firm, CPA firm, insurance agency, or tax-resolution firm unless separately licensed and documented.',
};

export function RiskClaimsWorkbench() {
  const [panel, setPanel] = useState<Panel>('overview');
  const [toast, setToast] = useState<string | null>(null);

  const tabs: Array<[Panel, string]> = [
    ['overview', 'Overview'],
    ['matters', 'Matters'],
    ['deadlines', 'Deadlines'],
    ['evidence', 'Evidence'],
    ['timeline', 'Timeline'],
    ['exposure', 'Exposure'],
    ['agency', 'Agency / Tax'],
    ['ue', 'Unemployment / Workforce'],
    ['insurance', 'Insurance'],
    ['claims', 'Claims / Recovery'],
    ['professional', 'Professional Review'],
    ['comms', 'Communications'],
    ['outcomes', 'Outcomes'],
  ];

  return (
    <ModuleScaffold
      title="Risk & Claims"
      subtitle="Risk Matters domain — distinct from ops HVCG_Risks · elevated access · BL-C1"
      showPendingBanner={false}
    >
      {toast ? (
        <AtlasCard variant="quiet">
          <Text size={300}>{toast}</Text>
        </AtlasCard>
      ) : null}

      <Caption1 style={{ display: 'block', marginBottom: 8 }}>
        Offers {DEV.offer} / OFF-RISK-REVIEW / OFF-CLAIMS · PREMIUM_SPECIAL_PROJECT · No hard-coded fees
      </Caption1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {tabs.map(([id, label]) => (
          <Button key={id} size="small" appearance={panel === id ? 'primary' : 'secondary'} onClick={() => setPanel(id)}>
            {label}
          </Button>
        ))}
      </div>

      {panel === 'overview' ? (
        <AtlasCard title="Risk engagement" subtitle={DEV.client}>
          <StatusChip label={DEV.severity} tone="danger" />
          <StatusChip label={DEV.status} tone="warning" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Notice ≠ liability · Allegation ≠ fact · Claimed ≠ verified · APPROVED_TO_SEND ≠ auto-send
          </Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'matters' ? (
        <AtlasCard title="Risk Matters" subtitle="Structured types only — no free-text bypass">
          <Caption1>TAX_REGULATORY · UNEMPLOYMENT_WORKFORCE · INSURANCE_RISK · CLAIMS_RECOVERY · OTHER_SPECIAL</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'deadlines' ? (
        <AtlasCard title="Deadline engine" subtitle="Source · confidence · human-verified">
          <Caption1>AI may extract potential dates — not authoritative without human review.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'evidence' ? (
        <AtlasCard title="Evidence register" subtitle="Originals immutable">
          <Caption1>Truth classes: VERIFIED_FACT · CLIENT_REPRESENTATION · AGENCY_STATEMENT · AI_OBSERVATION · …</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>AI summaries never replace source evidence.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'timeline' ? (
        <AtlasCard title="Evidence-linked timeline" subtitle="Human review required">
          <EmptyState title="Timeline drafts" description="AI may assist; advisor confirms disputed events." />
        </AtlasCard>
      ) : null}

      {panel === 'exposure' ? (
        <AtlasCard title="Exposure register" subtitle="Unknown stays unknown">
          <Caption1>Do not invent dollar exposure. Risk level ≠ legal liability.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'agency' ? (
        <AtlasCard title="Tax / regulatory workflow" subtitle="AGT-TAX-APPEAL">
          <Caption1>NOTICE_RECEIVED → … → PROFESSIONAL_REVIEW → APPROVED_TO_SEND → STOP</Caption1>
          <Button style={{ marginTop: 8 }} onClick={() => setToast('Agency contact / appeal filing blocked — BL-C1')}>
            Attempt agency send (must fail)
          </Button>
        </AtlasCard>
      ) : null}

      {panel === 'ue' ? (
        <AtlasCard title="Unemployment / workforce" subtitle="AGT-UE-CLAIM · employee data restricted">
          <Caption1>No autonomous termination · no protected-class decisions · employment counsel when sensitive.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'insurance' ? (
        <AtlasCard title="Insurance review" subtitle="AGT-INS-REVIEW · questions not coverage opinions">
          <Caption1>Expired / missing limits may signal Procurement — no auto-disqualify.</Caption1>
          <Button style={{ marginTop: 8 }} onClick={() => setToast('Coverage conclusion blocked')}>
            Attempt coverage conclusion (must fail)
          </Button>
        </AtlasCard>
      ) : null}

      {panel === 'claims' ? (
        <AtlasCard title="Claims / recovery" subtitle="AGT-CLAIMS">
          <Textarea readOnly rows={5} value={`# CLAIM-SUPPORT PACKAGE (DRAFT)\nESTIMATED ≠ VERIFIED ≠ CLAIMED ≠ RECOVERED\nProfessional review required.`} />
          <Button style={{ marginTop: 8 }} onClick={() => setToast('Insurer/attorney contact blocked — BL-C1')}>
            Attempt insurer contact (must fail)
          </Button>
        </AtlasCard>
      ) : null}

      {panel === 'professional' ? (
        <AtlasCard title="Professional referral / review" subtitle="Attorney · CPA · Employment counsel · Broker">
          <Caption1>REQUIRED_BEFORE_EXTERNAL_ACTION · no auto-transmit of sensitive materials.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'comms' ? (
        <AtlasCard title="Communication log" subtitle="AI drafts remain DRAFT under BL-C1">
          <Caption1>APPROVED_TO_SEND is not autonomous permission to send.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'outcomes' ? (
        <AtlasCard title="Outcomes" subtitle="Evidence required">
          <Caption1>Verified savings · recovery stages Claimed→Offered→Approved→Paid→Collected · success fee needs agreement.</Caption1>
        </AtlasCard>
      ) : null}

      <SectionHeader title="Governance" subtitle="AI assists · humans decide · licensed professionals handle licensed work" />
      <Caption1>{DEV.disclaimer}</Caption1>
    </ModuleScaffold>
  );
}
