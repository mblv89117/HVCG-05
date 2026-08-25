/**
 * Document Request Center + Client Portal (Development).
 * Extends DocumentsOperatingPage surfaces — no second SharePoint / portal product.
 */
import { useState } from 'react';
import { AtlasCard, EmptyState, SectionHeader, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';

type Panel = 'requests' | 'registry' | 'portal' | 'ops' | 'gates';

export function DocumentLifecycleWorkbench() {
  const [panel, setPanel] = useState<Panel>('requests');
  const [toast, setToast] = useState<string | null>(null);

  const tabs: Array<[Panel, string]> = [
    ['requests', 'Request Center'],
    ['registry', 'Document Registry'],
    ['portal', 'Client Portal (Dev)'],
    ['ops', 'Ops Dashboard'],
    ['gates', 'Production Gates'],
  ];

  return (
    <ModuleScaffold
      title="Documents & Client Portal"
      subtitle="One lifecycle · SharePoint file foundation · RECEIVED ≠ ACCEPTED · BL-C1 active"
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

      {panel === 'requests' ? (
        <AtlasCard title="Document Request Center" subtitle="Open · Awaiting · Review · Replacement · Overdue · Complete · Expiring">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {['Open', 'Awaiting Client', 'Review Required', 'Needs Replacement', 'Overdue'].map((s) => (
              <StatusChip key={s} label={s} tone="neutral" />
            ))}
          </div>
          <Text size={300}>Filter: client · domain · engagement · owner · due date · status</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Checklist items ≠ document records. Internal notes never leak to portal.
          </Caption1>
          <Button
            appearance="secondary"
            style={{ marginTop: 12 }}
            onClick={() => setToast('BL-C1: document request email BLOCKED_POLICY (draft only).')}
          >
            Attempt send request
          </Button>
        </AtlasCard>
      ) : null}

      {panel === 'registry' ? (
        <AtlasCard title="Canonical Document Registry" subtitle="Metadata SoR · bytes remain in SharePoint client libraries">
          <SectionHeader title="Taxonomy 00–13" subtitle="Copy-first · no bulk destructive migration" />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Versioning · hash/duplicate flags · period/as-of · freshness · visibility · Risk/HR/Owner restrictions.
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 6 }}>Originals immutable. Derived AI extracts are separate artifacts.</Caption1>
        </AtlasCard>
      ) : null}

      {panel === 'portal' ? (
        <>
          <AtlasCard title="Client Portal Home (Dev)" subtitle="Extends existing portal/data-room architecture — not a new product">
            {['Open Requests', 'Recently Uploaded', 'Needs Replacement', 'Approved Deliverables', 'Deadlines'].map((x) => (
              <Caption1 key={x} style={{ display: 'block', marginBottom: 4 }}>
                {x}
              </Caption1>
            ))}
            <Caption1 style={{ display: 'block', marginTop: 10 }}>
              Hidden: pricing strategy · referral economics · Risk strategy · AI reasoning · approval comments · margins.
            </Caption1>
          </AtlasCard>
          <AtlasCard title="Upload" subtitle="Authenticate → client context → RECEIVED (not ACCEPTED)">
            <Button appearance="primary" onClick={() => setToast('Dev upload → RECEIVED · audit recorded · not auto-accepted.')}>
              Simulate portal upload
            </Button>
            <Button
              appearance="secondary"
              style={{ marginLeft: 8 }}
              onClick={() => setToast('Cross-client access BLOCKED_PERMISSION — no metadata leakage.')}
            >
              Attempt Client B document
            </Button>
          </AtlasCard>
        </>
      ) : null}

      {panel === 'ops' ? (
        <AtlasCard title="Document operations" subtitle="No fabricated counts">
          <EmptyState
            title="Material signals only"
            description="Open/overdue requests · missing critical docs · stale financials · expiring insurance · portal uploads · classification exceptions — when sources bound."
          />
        </AtlasCard>
      ) : null}

      {panel === 'gates' ? (
        <AtlasCard title="Production gates" subtitle="Dev UI ≠ Production approval">
          <StatusChip label="GATE-CLIENT-PORTAL-PROD" tone="warning" />
          <StatusChip label="GATE-M365-SECOND-BRAIN-PROD" tone="warning" />
          <StatusChip label="GATE-RISK-ELEVATED-ACL-PROD" tone="warning" />
          <Caption1 style={{ display: 'block', marginTop: 10 }}>BL-C1 remains active. No autonomous publish or client email.</Caption1>
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}

export function Client360DocumentsSection({ clientHint }: { clientHint?: string }) {
  return (
    <AtlasCard title="Documents" subtitle="Internal Client 360 · canonical registry">
      <Caption1 style={{ display: 'block', marginBottom: 8 }}>Client: {clientHint || '—'}</Caption1>
      <Text size={300} style={{ display: 'block' }}>
        Open requests · Recent · Missing · Accepted · Replacements · Final deliverables · Stale warnings
      </Text>
      <Caption1 style={{ display: 'block', marginTop: 8 }}>
        Restricted count visible only when authorized. Risk/HR/Owner Support remain gated.
      </Caption1>
    </AtlasCard>
  );
}
