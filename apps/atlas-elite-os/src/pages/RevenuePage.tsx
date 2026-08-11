import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  ResponsiveGrid,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1, Input, Field } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { atlasRole } from '../security/rbac';
import { canRevenueCapability } from '../security/rbac';
import {
  PIPELINE_STAGES,
  opportunities as seedOpportunities,
  leads as seedLeads,
  referralPartners,
  stageCounts,
  forecastSummary,
  isStale,
  formatMoney,
  createLead,
  qualifyLead,
  convertLeadToOpportunity,
  type Opportunity,
  type Lead,
  type PipelineStage,
} from '../data/revenuePipeline';

function stageTone(stage: PipelineStage): 'success' | 'warning' | 'danger' | 'gold' | 'neutral' {
  if (stage === 'Lost') return 'danger';
  if (stage === 'Won' || stage === 'Active Engagement' || stage === 'Closed') return 'success';
  if (stage === 'Blueprint' || stage === 'Proposal' || stage === 'Negotiation') return 'gold';
  if (stage === 'Onboarding') return 'warning';
  return 'neutral';
}

export function RevenuePage() {
  const role = atlasRole();
  const [opps, setOpps] = useState<Opportunity[]>(() => [...seedOpportunities]);
  const [leadList, setLeadList] = useState<Lead[]>(() => [...seedLeads]);
  const [orgName, setOrgName] = useState('');
  const [contactName, setContactName] = useState('');
  const [referralSource, setReferralSource] = useState('Randy Kamin — Generational Group');
  const [message, setMessage] = useState<string | null>(null);

  const counts = useMemo(() => stageCounts(opps), [opps]);
  const forecast = useMemo(() => forecastSummary(opps), [opps]);
  const stale = useMemo(() => opps.filter((o) => isStale(o)), [opps]);

  const canCreate = canRevenueCapability('createLead', role);
  const canQualify = canRevenueCapability('qualifyLead', role);
  const canConvert = canRevenueCapability('convertLead', role);
  const canForecast = canRevenueCapability('forecastRevenue', role);
  const canViewWeighted = canRevenueCapability('viewWeightedPipeline', role);

  function onCreateLead() {
    if (!canCreate || !orgName.trim() || !contactName.trim()) {
      setMessage('Organization and contact are required to create a lead.');
      return;
    }
    const lead = createLead({
      organizationName: orgName.trim(),
      contactName: contactName.trim(),
      referralPartnerId: 'rp-generational-group',
      referralSource: referralSource.trim() || 'Direct',
      owner: 'Manny Barela',
    });
    setLeadList((prev) => [lead, ...prev]);
    setOrgName('');
    setContactName('');
    setMessage(`Lead created: ${lead.id} (status New — not auto-qualified).`);
  }

  function onQualify(id: string) {
    if (!canQualify) return;
    setLeadList((prev) => prev.map((l) => (l.id === id ? qualifyLead(l) : l)));
    setMessage(`Lead ${id} qualified.`);
  }

  function onConvert(id: string) {
    if (!canConvert) return;
    const lead = leadList.find((l) => l.id === id);
    if (!lead || lead.status !== 'Qualified') {
      setMessage('Only Qualified leads can be converted.');
      return;
    }
    const { lead: converted, opportunity } = convertLeadToOpportunity(lead);
    setLeadList((prev) => prev.map((l) => (l.id === id ? converted : l)));
    setOpps((prev) => [opportunity, ...prev]);
    setMessage(`Converted ${id} → ${opportunity.id}. Referral attribution preserved.`);
  }

  return (
    <ModuleScaffold
      title="Revenue Operating System"
      subtitle="Pipeline · referrals · forecast — fee dollars only when verified"
      showPendingBanner={true}
      actions={
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/revenue/migrations">Client Migration</Link>
          <Caption1>
            Role: {role} · Weighted view {canViewWeighted ? 'allowed' : 'restricted'}
          </Caption1>
        </div>
      }
    >
      {message ? (
        <AtlasCard variant="quiet">
          <Text size={300}>{message}</Text>
        </AtlasCard>
      ) : null}

      <ResponsiveGrid>
        <AtlasCard title="Open pipeline" subtitle="Count of active opportunities">
          <Text weight="semibold" size={600}>
            {forecast.openCount}
          </Text>
          <Caption1>Excludes Closed / Lost</Caption1>
        </AtlasCard>
        <AtlasCard title="Weighted forecast" subtitle={canForecast ? 'Probability × fee when known' : 'Restricted'}>
          <Text weight="semibold" size={500}>
            {canForecast || canViewWeighted ? forecast.weightedLabel : '—'}
          </Text>
          <Caption1>
            {forecast.pendingFeeCount} opportunit{forecast.pendingFeeCount === 1 ? 'y' : 'ies'} pending fee
            verification
          </Caption1>
        </AtlasCard>
        <AtlasCard title="Stale opportunities" subtitle="Inactive or overdue next action">
          <Text weight="semibold" size={600}>
            {forecast.staleCount}
          </Text>
          <Caption1>
            {stale.length ? stale.map((s) => s.title).join(' · ') : 'None currently stale'}
          </Caption1>
        </AtlasCard>
        <AtlasCard title="Blueprint in flight">
          <Text weight="semibold" size={600}>
            {forecast.blueprintCount}
          </Text>
          <Caption1>Referral coverage: {forecast.referralCoverage}/{forecast.openCount}</Caption1>
        </AtlasCard>
      </ResponsiveGrid>

      <AtlasCard title="Production pipeline" subtitle="Required HVCG stages">
        <DataTable
          ariaLabel="Pipeline stages"
          getRowKey={(r) => r.stage}
          rows={counts}
          columns={[
            { key: 'stage', header: 'Stage', render: (r) => r.stage },
            { key: 'count', header: 'Opportunities', render: (r) => String(r.count) },
            {
              key: 'weighted',
              header: 'Weighted',
              render: (r) => (canViewWeighted ? r.weightedLabel : '—'),
            },
          ]}
        />
      </AtlasCard>

      <AtlasCard title="Opportunities" subtitle="Open detail for full record">
          <DataTable
            ariaLabel="Opportunities"
            getRowKey={(r) => r.id}
            rows={opps}
            columns={[
              {
                key: 'title',
                header: 'Opportunity',
                render: (r) => (
                  <Link to={`/revenue/opportunities/${r.id}`} style={{ fontWeight: 600 }}>
                    {r.title}
                  </Link>
                ),
              },
              {
                key: 'stage',
                header: 'Stage',
                render: (r) => <StatusChip label={r.stage} tone={stageTone(r.stage)} />,
              },
              { key: 'owner', header: 'Owner', render: (r) => r.owner },
              { key: 'referral', header: 'Referral', render: (r) => r.referralSource },
              { key: 'prob', header: 'Prob.', render: (r) => `${r.probability}%` },
              {
                key: 'fee',
                header: 'Est. fee',
                render: (r) => formatMoney(r.estimatedFee),
              },
              {
                key: 'stale',
                header: 'Health',
                render: (r) =>
                  isStale(r) ? (
                    <StatusChip label="Stale" tone="warning" />
                  ) : (
                    <StatusChip label="Active" tone="success" />
                  ),
              },
              { key: 'next', header: 'Next action', render: (r) => r.nextAction },
            ]}
          />
        </AtlasCard>

      <ResponsiveGrid dense>
        <AtlasCard title="Leads" subtitle="Create · qualify · convert (manual qualify only)">
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Field label="Organization">
                  <Input value={orgName} onChange={(_, d) => setOrgName(d.value)} placeholder="Organization" />
                </Field>
                <Field label="Contact">
                  <Input
                    value={contactName}
                    onChange={(_, d) => setContactName(d.value)}
                    placeholder="Contact name"
                  />
                </Field>
                <Field label="Referral source">
                  <Input value={referralSource} onChange={(_, d) => setReferralSource(d.value)} />
                </Field>
              </div>
              <div>
                <Button appearance="primary" disabled={!canCreate} onClick={onCreateLead}>
                  Create lead
                </Button>
              </div>
            </div>
            <DataTable
              ariaLabel="Leads"
              getRowKey={(r) => r.id}
              rows={leadList}
              columns={[
                { key: 'org', header: 'Organization', render: (r) => r.organizationName },
                { key: 'contact', header: 'Contact', render: (r) => r.contactName },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => <StatusChip label={r.status} tone="neutral" />,
                },
                { key: 'ref', header: 'Referral', render: (r) => r.referralSource },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r) => (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {r.status === 'New' ? (
                        <Button size="small" disabled={!canQualify} onClick={() => onQualify(r.id)}>
                          Qualify
                        </Button>
                      ) : null}
                      {r.status === 'Qualified' ? (
                        <Button size="small" disabled={!canConvert} onClick={() => onConvert(r.id)}>
                          Convert
                        </Button>
                      ) : null}
                      {r.opportunityId ? (
                        <Link to={`/revenue/opportunities/${r.opportunityId}`}>
                          <Button size="small" appearance="secondary">
                            Opportunity
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  ),
                },
              ]}
            />
          </AtlasCard>

        <AtlasCard title="Referral partners" subtitle="Attribution through close">
          <DataTable
            ariaLabel="Referral partners"
            getRowKey={(r) => r.id}
            rows={referralPartners}
            columns={[
              { key: 'name', header: 'Partner', render: (r) => r.name },
              { key: 'org', header: 'Organization', render: (r) => r.organization },
              { key: 'contact', header: 'Contact', render: (r) => r.contactName },
              { key: 'attr', header: 'Attribution', render: (r) => r.attribution },
              {
                key: 'active',
                header: 'Status',
                render: (r) => (
                  <StatusChip label={r.active ? 'Active' : 'Inactive'} tone={r.active ? 'success' : 'neutral'} />
                ),
              },
            ]}
          />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Stages in catalog: {PIPELINE_STAGES.join(' → ')}
          </Caption1>
        </AtlasCard>
      </ResponsiveGrid>
    </ModuleScaffold>
  );
}
