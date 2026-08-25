import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AccessDeniedState,
  AtlasCard,
  DataTable,
  EmptyState,
  ErrorState,
  FilterToolbar,
  LoadingState,
  StatusChip,
} from '@hvcg/atlas-design-system';
import { Button, Caption1, Input, Spinner, Text } from '@fluentui/react-components';
import { ArrowSyncRegular, SearchRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { fetchPmOpportunities, HubHttpError, type PmOpportunity } from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { ATLAS_STATUS, atlasStatusDisplay, atlasStatusTone, type AtlasStatusTone } from '../ui/statusLanguage';

type LoadFailure = { kind: 'auth' | 'forbidden' | 'error'; message: string };

const ROW_LINK: CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  display: 'block',
  minHeight: 20,
};

const OPEN_STAGES = ['Discovery', 'Assessment', 'Proposal', 'Negotiation'];

function classifyHubError(err: unknown): LoadFailure {
  const status = err instanceof HubHttpError ? err.status : (err as { status?: number }).status;
  if (status === 401) return { kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing).' };
  if (status === 403) return { kind: 'forbidden', message: 'Authenticated but not authorized for HVCG_Opportunities (403).' };
  return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
}

function dayStamp(iso?: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso.slice(0, 10);
  return new Date(t).toISOString().slice(0, 10);
}

function opportunityHref(opportunity: PmOpportunity): string {
  return `/opportunities/${encodeURIComponent(opportunity.id)}`;
}

function OpportunityRowLink({ opportunity, children }: { opportunity: PmOpportunity; children: ReactNode }) {
  return (
    <Link to={opportunityHref(opportunity)} style={ROW_LINK}>
      {children}
    </Link>
  );
}

function attentionTone(opportunity: PmOpportunity): AtlasStatusTone {
  const severity = opportunity.attention?.severity;
  if (severity === 'danger') return 'danger';
  if (severity === 'warning') return 'warning';
  if (severity === 'success') return 'success';
  return atlasStatusTone(opportunity.attention?.label || opportunity.stage);
}

function isOpenOpportunity(opportunity: PmOpportunity): boolean {
  const status = opportunity.winLossStatus || 'Open';
  return status === 'Open' && OPEN_STAGES.includes(opportunity.stage);
}

export function OpportunitiesPage() {
  const auth = useHubAuth();
  const [opportunities, setOpportunities] = useState<PmOpportunity[]>([]);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('Open');
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [busy, setBusy] = useState(true);
  const [configured, setConfigured] = useState<boolean | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setBusy(false);
      setFailure({ kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing).' });
      setOpportunities([]);
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const data = await fetchPmOpportunities(auth);
      setOpportunities(data.opportunities || []);
      setConfigured(data.configured);
    } catch (err) {
      setFailure(classifyHubError(err));
      setOpportunities([]);
    } finally {
      setBusy(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth.tokenReady) return;
    void refresh();
  }, [refresh, auth.tokenReady, auth.hasBearer]);

  const stages = useMemo(() => {
    const seen = new Set(['Open']);
    for (const row of opportunities) seen.add(row.stage || 'Discovery');
    seen.add('Won');
    seen.add('Lost');
    return Array.from(seen);
  }, [opportunities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities
      .filter((row) => {
        if (stage === 'Open' && !isOpenOpportunity(row)) return false;
        if (stage !== 'Open' && row.stage !== stage && row.winLossStatus !== stage) return false;
        if (!q) return true;
        return [
          row.title,
          row.clientCode,
          row.clientStage,
          row.ownerEmail,
          row.stage,
          row.winLossStatus,
          row.opportunityType,
          row.nextAction,
          row.attention?.label,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const severityOrder: Record<string, number> = { danger: 0, warning: 1, info: 2, success: 3, neutral: 4 };
        const aSeverity = severityOrder[a.attention?.severity || 'neutral'];
        const bSeverity = severityOrder[b.attention?.severity || 'neutral'];
        if (aSeverity !== bSeverity) return aSeverity - bSeverity;
        return (a.nextActionDate || '9999').localeCompare(b.nextActionDate || '9999') || a.title.localeCompare(b.title);
      });
  }, [opportunities, query, stage]);

  const counts = useMemo(() => {
    let open = 0;
    let exceptions = 0;
    let overdue = 0;
    for (const row of opportunities) {
      if (isOpenOpportunity(row)) open += 1;
      if (['OVERDUE', 'NO_NEXT_ACTION', 'NEEDS_ACTION', 'NEEDS_MANNY', 'ACTIVATION_REQUIRED'].includes(row.attention?.state || '')) exceptions += 1;
      if (row.attention?.state === 'OVERDUE') overdue += 1;
    }
    return { open, exceptions, overdue };
  }, [opportunities]);

  if (!auth.tokenReady || (busy && opportunities.length === 0 && !failure)) {
    return (
      <ModuleScaffold title="Opportunities" subtitle="Loading HVCG_Opportunities from Hub…" showPendingBanner={false}>
        <LoadingState rows={5} label={!auth.tokenReady ? 'Connecting to Hub' : 'Loading opportunities'} />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'auth') {
    return (
      <ModuleScaffold title="Opportunities" subtitle="Sign-in required" showPendingBanner={false}>
        <AccessDeniedState title="Authenticated access required" description={failure.message} />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'forbidden') {
    return (
      <ModuleScaffold title="Opportunities" subtitle="403" showPendingBanner={false}>
        <AccessDeniedState title="Access denied" description={failure.message} />
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title="Opportunity Pipeline"
      subtitle="Revenue work queue from HVCG_Opportunities. Prospect conversion does not provision client access."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/leads">
            <Button appearance="secondary">Leads</Button>
          </Link>
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
        </div>
      }
    >
      {failure?.kind === 'error' ? (
        <ErrorState
          title="Opportunities unavailable"
          description={failure.message || 'Hub did not return HVCG_Opportunities.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <AtlasCard variant="accent">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <Text weight="semibold" style={{ fontSize: 20 }}>
              {counts.open} open opportunities
            </Text>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              {counts.exceptions} exception states · {counts.overdue} overdue · won/lost are removed from normal open work.
            </Caption1>
          </div>
          <Caption1>Client activation remains separate from sales outcome.</Caption1>
        </div>
      </AtlasCard>

      <FilterToolbar>
        <StatusChip label={`${filtered.length} / ${opportunities.length} opportunities`} tone="info" />
        {configured === false ? <StatusChip label="HVCG_Opportunities not configured" tone="warning" /> : null}
        {counts.overdue ? <StatusChip label={`${ATLAS_STATUS.overdue} · ${counts.overdue}`} tone="danger" /> : null}
        <select aria-label="Opportunity stage filter" value={stage} onChange={(e) => setStage(e.target.value)} style={{ minHeight: 32 }}>
          {stages.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <Input
          contentBefore={<SearchRegular />}
          placeholder="Search prospect, owner, stage, next action…"
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          style={{ minWidth: 260 }}
        />
        {busy ? <Spinner size="tiny" /> : null}
      </FilterToolbar>

      {opportunities.length === 0 ? (
        <EmptyState
          title="No authorized opportunities"
          description="Hub returned no authorized HVCG_Opportunities for this Microsoft identity."
        />
      ) : (
        <AtlasCard title="Pipeline work" variant="quiet">
          <DataTable
            ariaLabel="Authorized HVCG opportunities"
            getRowKey={(r) => r.id}
            rows={filtered}
            emptyTitle="No opportunities match this view"
            emptyDescription="Adjust search or stage filter."
            columns={[
              {
                key: 'opportunity',
                header: 'Opportunity',
                sticky: 'left',
                width: 260,
                render: (r) => (
                  <OpportunityRowLink opportunity={r}>
                    <span style={{ fontWeight: 600 }}>{r.title}</span>
                    <Caption1 style={{ display: 'block' }}>{[r.clientStage || 'Prospect', r.clientCode].filter(Boolean).join(' · ')}</Caption1>
                  </OpportunityRowLink>
                ),
              },
              {
                key: 'attention',
                header: 'Attention',
                width: 150,
                render: (r) => (
                  <OpportunityRowLink opportunity={r}>
                    <StatusChip label={r.attention?.label || 'Open'} tone={attentionTone(r)} />
                  </OpportunityRowLink>
                ),
              },
              {
                key: 'stage',
                header: 'Stage',
                width: 140,
                render: (r) => {
                  const chip = atlasStatusDisplay(r.stage);
                  return (
                    <OpportunityRowLink opportunity={r}>
                      <StatusChip label={chip?.label || r.stage} tone={chip?.tone || 'info'} />
                    </OpportunityRowLink>
                  );
                },
              },
              {
                key: 'owner',
                header: 'Owner',
                width: 220,
                render: (r) => <OpportunityRowLink opportunity={r}>{r.ownerEmail || 'Unassigned'}</OpportunityRowLink>,
              },
              {
                key: 'next',
                header: 'Next action',
                width: 300,
                render: (r) => (
                  <OpportunityRowLink opportunity={r}>
                    {r.nextAction || 'No next action'}
                    <Caption1 style={{ display: 'block' }}>{r.nextActionDate ? `Due ${dayStamp(r.nextActionDate)}` : 'No due date'}</Caption1>
                  </OpportunityRowLink>
                ),
              },
              {
                key: 'outcome',
                header: 'Outcome',
                width: 140,
                render: (r) => <OpportunityRowLink opportunity={r}>{r.winLossStatus || 'Open'}</OpportunityRowLink>,
              },
            ]}
          />
        </AtlasCard>
      )}
    </ModuleScaffold>
  );
}
