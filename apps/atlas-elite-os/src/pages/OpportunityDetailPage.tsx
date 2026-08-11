import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  StatusChip,
  SectionHeader,
  DataTable,
  ResponsiveGrid,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1, Input, Field } from '@fluentui/react-components';
import { ModuleScaffold, FieldGrid } from './shared/ModuleScaffold';
import { atlasRole, canRevenueCapability } from '../security/rbac';
import {
  PIPELINE_STAGES,
  getOpportunity,
  getOrganization,
  getContact,
  getReferralPartner,
  formatMoney,
  isStale,
  generateTasks,
  updateStage,
  recordActivity,
  scheduleFollowUp,
  prepareBlueprint,
  markWon,
  markLost,
  advanceOnboarding,
  type Opportunity,
  type PipelineStage,
} from '../data/revenuePipeline';
import { CommercialWorkbench } from './CommercialWorkbench';

export function OpportunityDetailPage({ opportunityId }: { opportunityId: string }) {
  const role = atlasRole();
  const seed = getOpportunity(opportunityId);
  const [opp, setOpp] = useState<Opportunity | undefined>(() => (seed ? { ...seed } : undefined));
  const [activitySubject, setActivitySubject] = useState('');
  const [followUpDate, setFollowUpDate] = useState('2026-07-26');
  const [followUpAction, setFollowUpAction] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const org = opp ? getOrganization(opp.organizationId) : undefined;
  const contact = opp ? getContact(opp.contactId) : undefined;
  const partner = opp ? getReferralPartner(opp.referralPartnerId) : undefined;
  const tasks = useMemo(() => (opp ? generateTasks(opp) : []), [opp]);

  if (!opp) {
    return (
      <ModuleScaffold title="Opportunity not found" subtitle={opportunityId} showPendingBanner={false}>
        <Link to="/revenue">
          <Button appearance="primary">Back to Revenue</Button>
        </Link>
      </ModuleScaffold>
    );
  }

  const canUpdate = canRevenueCapability('updateStage', role);
  const canActivity = canRevenueCapability('recordActivity', role);
  const canFollowUp = canRevenueCapability('scheduleFollowUp', role);
  const canBlueprint = canRevenueCapability('prepareBlueprint', role);
  const canWonLost = canRevenueCapability('markWonLost', role);
  const canOnboard = canRevenueCapability('initiateOnboarding', role);
  const canTasks = canRevenueCapability('generateTasks', role);

  function apply(next: Opportunity, note: string) {
    setOpp(next);
    setToast(note);
  }

  return (
    <ModuleScaffold
      title={opp.title}
      subtitle={`${org?.legalName ?? 'Organization'} · ${opp.stage}`}
      showPendingBanner={true}
      actions={
        <Link to="/revenue">
          <Button appearance="secondary">All opportunities</Button>
        </Link>
      }
    >
      {toast ? (
        <AtlasCard variant="quiet">
          <Text size={300}>{toast}</Text>
        </AtlasCard>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <AtlasCard variant="quiet">
          <Caption1>Stage</Caption1>
          <StatusChip label={opp.stage} tone="gold" />
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Probability</Caption1>
          <Text weight="semibold">{opp.probability}%</Text>
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Health</Caption1>
          <StatusChip label={isStale(opp) ? 'Stale' : 'Active'} tone={isStale(opp) ? 'warning' : 'success'} />
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Proposal</Caption1>
          <Text weight="semibold">{opp.proposalStatus}</Text>
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Blueprint</Caption1>
          <Text weight="semibold">{opp.blueprintStatus}</Text>
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Onboarding</Caption1>
          <Text weight="semibold">{opp.onboardingStatus}</Text>
        </AtlasCard>
      </div>

      <SectionHeader title="Relationship" subtitle="Verified attribution only" />
      <FieldGrid
        fields={[
          { label: 'Organization', value: org?.legalName ?? '—', availability: 'Repository-derived' },
          { label: 'Client code', value: org?.clientCode ?? '—', availability: 'Repository-derived' },
          { label: 'Contact', value: contact?.name ?? '—', availability: 'Repository-derived' },
          {
            label: 'Contact channels',
            value: contact?.email || contact?.phone || 'Pending verification',
            availability: 'Awaiting verified source',
          },
          { label: 'Opportunity owner', value: opp.owner, availability: 'Repository-derived' },
          { label: 'Referral source', value: opp.referralSource, availability: 'Repository-derived' },
          {
            label: 'Referral partner',
            value: partner ? `${partner.name} (${partner.organization})` : '—',
            availability: 'Repository-derived',
          },
          { label: 'Engagement type', value: opp.engagementType, availability: 'Repository-derived' },
          { label: 'Capital need', value: opp.capitalNeed, availability: 'Repository-derived' },
          {
            label: 'Service interests',
            value: opp.serviceInterests.join('; ') || '—',
            availability: 'Repository-derived',
          },
        ]}
      />

      <SectionHeader title="Commercial fields" subtitle="No invented fee amounts" />
      <FieldGrid
        fields={[
          { label: 'Estimated fee', value: formatMoney(opp.estimatedFee), availability: 'Awaiting verified source' },
          {
            label: 'Recurring revenue',
            value: formatMoney(opp.recurringRevenue),
            availability: 'Awaiting verified source',
          },
          {
            label: 'Success-fee potential',
            value: formatMoney(opp.successFeePotential),
            availability: 'Awaiting verified source',
          },
          {
            label: 'Expected close',
            value: opp.expectedCloseDate ?? 'Pending verification',
            availability: 'Awaiting verified source',
          },
          { label: 'Next action', value: opp.nextAction, availability: 'Repository-derived' },
          {
            label: 'Follow-up date',
            value: opp.followUpDate ?? '—',
            availability: 'Repository-derived',
          },
          {
            label: 'Last activity',
            value: opp.lastActivityAt,
            availability: 'Repository-derived',
          },
          {
            label: 'Lost reason',
            value: opp.lostReason ?? '—',
            availability: 'Repository-derived',
          },
        ]}
      />

      <AtlasCard title="Attribution chain" subtitle="Referral continuity through engagement">
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          {opp.attributionChain.map((step) => (
            <li key={step}>
              <Text size={300}>{step}</Text>
            </li>
          ))}
        </ol>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>{opp.notes}</Caption1>
      </AtlasCard>

      <ResponsiveGrid dense>
        <AtlasCard title="Stage & outcomes" subtitle={`Role ${role}`}>
          <Field label="Update stage">
            <select
              disabled={!canUpdate}
              value={opp.stage}
              onChange={(e) => {
                const stage = e.target.value as PipelineStage;
                if (!PIPELINE_STAGES.includes(stage)) return;
                apply(updateStage(opp, stage, 'Manny Barela'), `Stage updated to ${stage}`);
              }}
              style={{ minWidth: 220, padding: '6px 8px' }}
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <Button
              disabled={!canBlueprint}
              onClick={() => apply(prepareBlueprint(opp, 'Manny Barela'), 'Blueprint preparation recorded')}
            >
              Prepare Blueprint
            </Button>
            <Button
              appearance="primary"
              disabled={!canWonLost}
              onClick={() => apply(markWon(opp, 'Manny Barela'), 'Marked Won — onboarding ready')}
            >
              Mark Won
            </Button>
            <Button
              disabled={!canWonLost}
              onClick={() =>
                apply(
                  markLost(opp, 'Manny Barela', lostReason || 'Reason pending owner entry'),
                  'Marked Lost'
                )
              }
            >
              Mark Lost
            </Button>
            <Button
              disabled={!canOnboard || !['Won', 'Onboarding'].includes(opp.stage)}
              onClick={() => apply(advanceOnboarding(opp), 'Onboarding initiated')}
            >
              Initiate onboarding
            </Button>
          </div>
          <Field label="Lost reason (if marking lost)">
            <Input value={lostReason} onChange={(_, d) => setLostReason(d.value)} />
          </Field>
        </AtlasCard>

        <AtlasCard title="Activities & follow-ups">
          <Field label="Activity subject">
            <Input value={activitySubject} onChange={(_, d) => setActivitySubject(d.value)} />
          </Field>
          <Button
            style={{ marginTop: 8 }}
            disabled={!canActivity || !activitySubject.trim()}
            onClick={() => {
              apply(
                recordActivity(opp, {
                  type: 'Note',
                  subject: activitySubject.trim(),
                  detail: activitySubject.trim(),
                  owner: 'Manny Barela',
                }),
                'Activity recorded'
              );
              setActivitySubject('');
            }}
          >
            Record activity
          </Button>
          <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <Field label="Follow-up date">
              <Input type="date" value={followUpDate} onChange={(_, d) => setFollowUpDate(d.value)} />
            </Field>
            <Field label="Follow-up action">
              <Input
                value={followUpAction}
                onChange={(_, d) => setFollowUpAction(d.value)}
                placeholder={opp.nextAction}
              />
            </Field>
            <Button
              disabled={!canFollowUp}
              onClick={() =>
                apply(
                  scheduleFollowUp(opp, followUpDate, followUpAction.trim() || opp.nextAction),
                  'Follow-up scheduled'
                )
              }
            >
              Schedule follow-up
            </Button>
          </div>
        </AtlasCard>
      </ResponsiveGrid>

      <AtlasCard title="Generated tasks" subtitle={canTasks ? 'From next action, Blueprint, proposal, documents' : 'Restricted'}>
        {canTasks ? (
          <DataTable
            ariaLabel="Tasks"
            getRowKey={(r) => r.id}
            rows={tasks}
            columns={[
              { key: 'title', header: 'Task', render: (r) => r.title },
              { key: 'due', header: 'Due', render: (r) => r.due ?? '—' },
              { key: 'related', header: 'Related', render: (r) => r.related },
            ]}
          />
        ) : (
          <Text>Task generation not permitted for role {role}.</Text>
        )}
      </AtlasCard>

      <AtlasCard title="Documents" subtitle="Intake status — no fabricated files">
        <DataTable
          ariaLabel="Documents"
          getRowKey={(r) => r.id}
          rows={opp.documents}
          columns={[
            { key: 'cat', header: 'Category', render: (r) => r.category },
            { key: 'title', header: 'Document', render: (r) => r.title },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <StatusChip label={r.status} tone="neutral" />,
            },
          ]}
        />
      </AtlasCard>

      <AtlasCard title="Meeting history">
        <DataTable
          ariaLabel="Meetings"
          getRowKey={(r) => r.id}
          rows={opp.meetings}
          columns={[
            { key: 'date', header: 'Date', render: (r) => r.date },
            { key: 'title', header: 'Title', render: (r) => r.title },
            { key: 'summary', header: 'Summary', render: (r) => r.summary },
            { key: 'att', header: 'Attendees', render: (r) => r.attendees.join(', ') },
          ]}
        />
      </AtlasCard>

      <CommercialWorkbench
        opportunityId={opp.id}
        clientName={org?.legalName ?? opp.title}
        defaultClassification={
          org?.clientCode === 'ACCG' || org?.legalName?.toLowerCase().includes('american capital')
            ? 'HVS_LEGACY_CLIENT'
            : 'HVCG_NEW_CLIENT'
        }
        contractedMonthly={org?.clientCode === 'ACCG' ? 4539 : null}
        initialReferralSource={opp.referralSource}
      />

      <AtlasCard title="Activity log">
        <DataTable
          ariaLabel="Activities"
          getRowKey={(r) => r.id}
          rows={opp.activities}
          columns={[
            { key: 'when', header: 'When', render: (r) => r.occurredAt },
            { key: 'type', header: 'Type', render: (r) => r.type },
            { key: 'subject', header: 'Subject', render: (r) => r.subject },
            { key: 'detail', header: 'Detail', render: (r) => r.detail },
            { key: 'owner', header: 'Owner', render: (r) => r.owner },
          ]}
        />
      </AtlasCard>
    </ModuleScaffold>
  );
}
