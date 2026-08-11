/**
 * Client Migration operational workflow — Development UI.
 * REPRICE never mutates contracted pricing. BL-C1 gates client contact.
 */
import { useMemo, useState } from 'react';
import { AtlasCard, DataTable, StatusChip, SectionHeader } from '@hvcg/atlas-design-system';
import { Button, Caption1, Field, Input, Text, Textarea } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import {
  migrationRecords,
  recommendPricing,
  type MigrationAction,
  type MigrationRecord,
  type MigrationState,
  ACCG_LOCKED_MONTHLY,
  CURRENT_RATE_CARD_ID,
  BL_C1_ACTIVE,
} from '../commercial/baV2Commercial';

const ACTIONS: MigrationAction[] = ['Retain', 'Reprice', 'Upsell', 'Re-engage', 'Archive', 'Transition', 'Decline'];
const STATES: MigrationState[] = [
  'NOT_REVIEWED',
  'REVIEW_IN_PROGRESS',
  'RECOMMENDATION_READY',
  'OWNER_REVIEW',
  'OWNER_APPROVED',
  'PROPOSAL_DRAFTED',
  'CLIENT_CONTACT_GATED',
  'CLIENT_REVIEW',
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
  'ARCHIVED',
];

export function ClientMigrationPage() {
  const [rows, setRows] = useState<MigrationRecord[]>(() =>
    migrationRecords().map((r) => {
      if (r.clientName.includes('American Capital') || r.classification.includes('LEGACY')) {
        const rec = recommendPricing({
          offerCode: r.recommendedOffer ?? 'OFF-FCFO-OP',
          commercialClass: 'RECURRING_RETAINER',
          clientClassification: 'HVS_LEGACY_CLIENT',
          contractedCurrent: r.contractedCurrent ?? ACCG_LOCKED_MONTHLY,
        });
        return {
          ...r,
          contractedCurrent: r.contractedCurrent ?? ACCG_LOCKED_MONTHLY,
          recommendedFuture: rec.recommendedFuture,
          recommendedOffer: r.recommendedOffer ?? 'OFF-FCFO-OP',
        };
      }
      return r;
    })
  );
  const [selected, setSelected] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const current = rows[selected];

  const canAdvanceClientContact = useMemo(() => {
    return current?.migrationState === 'OWNER_APPROVED' || current?.migrationState === 'PROPOSAL_DRAFTED';
  }, [current]);

  function update(patch: Partial<MigrationRecord>) {
    setRows((prev) => prev.map((r, i) => (i === selected ? { ...r, ...patch } : r)));
  }

  function applyAction(action: MigrationAction) {
    if (action === 'Reprice') {
      update({
        migrationAction: action,
        migrationState: 'RECOMMENDATION_READY',
        notes: `${current.notes}\nREPRICE is recommendation-only — contracted pricing unchanged (${current.contractedCurrent ?? 'n/a'}).`,
      });
      setToast('REPRICE recorded as recommendation only — contracted price not mutated');
      return;
    }
    update({
      migrationAction: action,
      migrationState: action === 'Archive' || action === 'Decline' ? 'ARCHIVED' : 'RECOMMENDATION_READY',
    });
    setToast(`Migration action ${action} set (pending owner approval where required)`);
  }

  function setState(state: MigrationState) {
    if ((state === 'CLIENT_REVIEW' || state === 'CLIENT_CONTACT_GATED') && BL_C1_ACTIVE && !current.ownerApproval) {
      setToast('BL-C1 / owner gate: client contact blocked until OWNER_APPROVED');
      update({ migrationState: 'CLIENT_CONTACT_GATED' });
      return;
    }
    update({ migrationState: state });
    setToast(`Migration state → ${state}`);
  }

  if (!current) {
    return (
      <ModuleScaffold title="Client Migration" subtitle="No seed records" showPendingBanner={false}>
        <Caption1>No migration records available.</Caption1>
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title="Client Migration"
      subtitle="Operational workflow · recommendations until approved · no Production mutation · internal only"
      showPendingBanner={false}
    >
      {toast ? (
        <AtlasCard variant="quiet">
          <Text size={300}>{toast}</Text>
        </AtlasCard>
      ) : null}

      <SectionHeader title="Migration queue" subtitle={`Rate card reference ${CURRENT_RATE_CARD_ID}`} />
      <DataTable
        ariaLabel="Migrations"
        getRowKey={(r) => r.clientName}
        rows={rows}
        columns={[
          {
            key: 'client',
            header: 'Client',
            render: (r) => (
              <Button
                appearance="transparent"
                onClick={() => setSelected(rows.findIndex((x) => x.clientName === r.clientName))}
              >
                {r.clientName}
              </Button>
            ),
          },
          { key: 'class', header: 'Class', render: (r) => r.classification },
          {
            key: 'contracted',
            header: 'Contracted',
            render: (r) => (r.contractedCurrent != null ? `$${r.contractedCurrent.toLocaleString()}` : '—'),
          },
          { key: 'action', header: 'Action', render: (r) => r.migrationAction },
          {
            key: 'state',
            header: 'State',
            render: (r) => <StatusChip label={r.migrationState} tone="gold" />,
          },
        ]}
      />

      <AtlasCard title={current.clientName} subtitle="Migration record">
        <div style={{ display: 'grid', gap: 8, maxWidth: 640 }}>
          <Text size={300}>Classification: {current.classification}</Text>
          <Text size={300}>
            Current Contracted Pricing:{' '}
            {current.contractedCurrent != null ? `$${current.contractedCurrent.toLocaleString()}/mo` : 'REQUIRES_VERIFICATION'}
          </Text>
          <Text size={300}>
            Recommended Future Pricing:{' '}
            {current.recommendedFuture != null ? `$${current.recommendedFuture.toLocaleString()}/mo` : '—'} (NOT CONTRACTED)
          </Text>
          <Text size={300}>Recommended Offer: {current.recommendedOffer ?? '—'}</Text>
          <Text size={300}>Agreement / proposal status: {current.clientProposalStatus}</Text>
          <Text size={300}>Source evidence: {current.sourceEvidence}</Text>
          <Field label="Notes">
            <Textarea value={current.notes} onChange={(_, d) => update({ notes: d.value })} rows={4} />
          </Field>
          <Field label="Migration action">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ACTIONS.map((a) => (
                <Button key={a} size="small" onClick={() => applyAction(a)}>
                  {a.toUpperCase()}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Migration state">
            <select
              value={current.migrationState}
              onChange={(e) => setState(e.target.value as MigrationState)}
              style={{ padding: '6px 8px' }}
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Button
              appearance="primary"
              onClick={() =>
                update({
                  ownerApproval: true,
                  migrationState: 'OWNER_APPROVED',
                })
              }
            >
              Owner approve recommendation
            </Button>
            <Button
              disabled={!canAdvanceClientContact}
              onClick={() => setState('CLIENT_CONTACT_GATED')}
            >
              Queue client contact (gated)
            </Button>
            <Button
              onClick={() =>
                update({
                  migrationState: 'PROPOSAL_DRAFTED',
                  clientProposalStatus: 'Draft (internal)',
                })
              }
            >
              Draft migration proposal (internal)
            </Button>
          </div>
          <Caption1>
            Owner approval: {current.ownerApproval ? 'Yes' : 'No'} · BL-C1 prevents unauthorized external transition
          </Caption1>
        </div>
      </AtlasCard>
    </ModuleScaffold>
  );
}
